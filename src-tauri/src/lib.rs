use std::path::{Path, PathBuf};
use std::process::Command;
use serde::Serialize;

// Escolhe a pasta de destino: a que o utilizador definiu no botão "Guardar",
// ou (por defeito) a pasta onde está o ficheiro original.
fn resolve_output_dir(file_path: &Path, output_dir: &Option<String>) -> PathBuf {
    if let Some(dir) = output_dir {
        let p = PathBuf::from(dir);
        if p.is_dir() {
            return p;
        }
    }
    file_path
        .parent()
        .unwrap_or_else(|| Path::new("."))
        .to_path_buf()
}

// Devolve um caminho de saída que não colide com ficheiros existentes.
// Primeiro tenta `{stem}_compressed.{ext}`; se existir, tenta `_v2`, `_v3`, etc.
fn unique_output_path(parent: &Path, stem: &str, ext: &str) -> PathBuf {
    let first = parent.join(format!("{}_compressed.{}", stem, ext));
    if !first.exists() {
        return first;
    }
    let mut n = 2u32;
    loop {
        let candidate = parent.join(format!("{}_compressed_v{}.{}", stem, n, ext));
        if !candidate.exists() {
            return candidate;
        }
        n += 1;
    }
}

#[derive(Debug, Serialize)]
struct FileInfo {
    name: String,
    size: u64,
    path: String,
    format: String,
}

#[derive(Debug, Serialize)]
struct CompressResult {
    path: String,
    /// Caminho do ficheiro criado (usado pelo botão "Ver pasta").
    output_path: String,
    original_size: u64,
    compressed_size: u64,
    success: bool,
    error: Option<String>,
}

#[tauri::command]
fn get_file_info(path: String) -> Result<FileInfo, String> {
    let file_path = Path::new(&path);

    if !file_path.exists() {
        return Err(format!("File not found: {}", path));
    }

    let metadata = std::fs::metadata(&path)
        .map_err(|e| format!("Error reading metadata: {}", e))?;

    let name = file_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("Unknown")
        .to_string();

    let extension = file_path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    Ok(FileInfo {
        name,
        size: metadata.len(),
        path,
        format: extension,
    })
}

#[tauri::command]
fn read_file_to_bytes(path: String) -> Result<Vec<u8>, String> {
    std::fs::read(&path).map_err(|e| format!("Failed to read source file: {}", e))
}

#[tauri::command]
async fn save_compressed_file(
    path: String,
    bytes: Vec<u8>,
    extension: String,
    output_dir: Option<String>,
) -> Result<CompressResult, String> {
    let file_path = Path::new(&path);

    let original_size = match std::fs::metadata(file_path) {
        Ok(m) => m.len(),
        Err(_) => 0,
    };

    let file_stem = file_path.file_stem().unwrap_or_default().to_string_lossy();
    let parent = resolve_output_dir(file_path, &output_dir);
    let output_path = unique_output_path(&parent, &file_stem, &extension);

    match std::fs::write(&output_path, &bytes) {
        Ok(_) => Ok(CompressResult {
            path,
            output_path: output_path.to_string_lossy().to_string(),
            original_size,
            compressed_size: bytes.len() as u64,
            success: true,
            error: None,
        }),
        Err(e) => Err(format!("Failed to write compressed file: {}", e)),
    }
}

#[tauri::command]
async fn compress_video_ffmpeg(app: tauri::AppHandle, path: String, output_dir: Option<String>) -> Result<CompressResult, String> {
    use tauri_plugin_shell::ShellExt;

    let file_path = Path::new(&path);
    if !file_path.exists() {
        return Err(format!("Video file not found: {}", path));
    }

    let original_size = std::fs::metadata(file_path)
        .map(|m| m.len())
        .unwrap_or(0);

    let file_stem = file_path.file_stem().unwrap_or_default().to_string_lossy();
    let parent = resolve_output_dir(file_path, &output_dir);
    let output_path = unique_output_path(&parent, &file_stem, "mkv");
    let output_path_str = output_path.to_string_lossy().to_string();

    // Spawn the bundled FFmpeg sidecar
    // Command: ffmpeg -i <input> -c:v libx264 -preset fast -crf 23 -c:a copy <output.mkv>
    let sidecar_cmd = app
        .shell()
        .sidecar("ffmpeg")
        .map_err(|e| format!("Failed to create FFmpeg sidecar command: {}", e))?
        .args(vec![
            "-y", // Overwrite output files without asking
            "-i", &path, // Input file
            "-c:v", "libx264", // Video codec
            "-preset", "fast", // Fast encoding
            "-crf", "23", // Good quality/size balance
            "-c:a", "copy", // Copy audio stream without re-encoding
            &output_path_str, // Output file
        ]);

    let output = sidecar_cmd
        .output()
        .await
        .map_err(|e| format!("Failed to execute FFmpeg: {}", e))?;

    if !output.status.success() {
        let err_msg = String::from_utf8_lossy(&output.stderr);
        return Err(format!("FFmpeg error (code {}): {}", output.status.code().unwrap_or(-1), err_msg));
    }

    let compressed_size = std::fs::metadata(&output_path)
        .map(|m| m.len())
        .unwrap_or(0);

    Ok(CompressResult {
        path: path.clone(),
        output_path: output_path_str,
        original_size,
        compressed_size,
        success: true,
        error: None,
    })
}

#[tauri::command]
async fn compress_pdf_ghostscript(app: tauri::AppHandle, path: String, quality: u32, output_dir: Option<String>) -> Result<CompressResult, String> {
    use tauri_plugin_shell::ShellExt;
    use tauri::Manager;

    let file_path = Path::new(&path);
    if !file_path.exists() {
        return Err(format!("PDF file not found: {}", path));
    }

    let original_size = std::fs::metadata(file_path)
        .map(|m| m.len())
        .unwrap_or(0);

    let file_stem = file_path.file_stem().unwrap_or_default().to_string_lossy();
    let parent = resolve_output_dir(file_path, &output_dir);
    let output_path = unique_output_path(&parent, &file_stem, "pdf");
    let output_path_str = output_path.to_string_lossy().to_string();

    // Slider de qualidade (0-100) -> preset Ghostscript + resolução das imagens.
    // Texto e vetores ficam sempre intactos; só as imagens são reamostradas.
    let (preset, color_dpi) = match quality {
        0..=35 => ("/screen", 100u32),
        36..=70 => ("/ebook", 150),
        71..=90 => ("/printer", 225),
        _ => ("/prepress", 300),
    };
    let mono_dpi = (color_dpi * 2).min(600);

    let pdf_settings = format!("-dPDFSETTINGS={}", preset);
    let color_res = format!("-dColorImageResolution={}", color_dpi);
    let gray_res = format!("-dGrayImageResolution={}", color_dpi);
    let mono_res = format!("-dMonoImageResolution={}", mono_dpi);
    let out_arg = format!("-sOutputFile={}", output_path_str);

    let mut sidecar_cmd = app
        .shell()
        .sidecar("gs")
        .map_err(|e| format!("Failed to create Ghostscript sidecar command: {}", e))?
        .args(vec![
            "-sDEVICE=pdfwrite",
            "-dCompatibilityLevel=1.5",
            &pdf_settings,
            "-dNOPAUSE",
            "-dBATCH",
            "-dQUIET",
            "-dSAFER",
            "-dAutoRotatePages=/None",
            "-dDetectDuplicateImages=true",
            "-dCompressFonts=true",
            "-dSubsetFonts=true",
            "-dDownsampleColorImages=true",
            &color_res,
            "-dColorImageDownsampleType=/Bicubic",
            "-dDownsampleGrayImages=true",
            &gray_res,
            "-dGrayImageDownsampleType=/Bicubic",
            "-dDownsampleMonoImages=true",
            &mono_res,
            &out_arg,
            &path,
        ]);

    // O binário gs (macOS) não tem os ficheiros de init embutidos — aponta GS_LIB
    // para os recursos bundled (gs_resources), tal como a app antiga fazia.
    if let Ok(res_dir) = app.path().resource_dir() {
        let gs_base = res_dir.join("gs_resources");
        if gs_base.exists() {
            let b = gs_base.to_string_lossy();
            let sep = if cfg!(windows) { ";" } else { ":" };
            let gs_lib = [
                format!("{}/Resource/Init", b),
                format!("{}/lib", b),
                format!("{}/Resource", b),
                format!("{}/iccprofiles", b),
                format!("{}/fonts", b),
            ]
            .join(sep);
            sidecar_cmd = sidecar_cmd.env("GS_LIB", gs_lib);
        }
    }

    let output = sidecar_cmd
        .output()
        .await
        .map_err(|e| format!("Failed to execute Ghostscript: {}", e))?;

    if !output.status.success() {
        let err_msg = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Ghostscript error (code {}): {}", output.status.code().unwrap_or(-1), err_msg));
    }

    let compressed_size = std::fs::metadata(&output_path)
        .map(|m| m.len())
        .unwrap_or(0);

    Ok(CompressResult {
        path: path.clone(),
        output_path: output_path_str,
        original_size,
        compressed_size,
        success: true,
        error: None,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![get_file_info, save_compressed_file, read_file_to_bytes, compress_video_ffmpeg, compress_pdf_ghostscript])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
