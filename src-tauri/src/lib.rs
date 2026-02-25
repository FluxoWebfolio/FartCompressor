use std::path::Path;
use std::process::Command;
use serde::Serialize;

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
) -> Result<CompressResult, String> {
    let file_path = Path::new(&path);
    
    let original_size = match std::fs::metadata(file_path) {
        Ok(m) => m.len(),
        Err(_) => 0,
    };

    let file_stem = file_path.file_stem().unwrap_or_default().to_string_lossy();
    let parent = file_path.parent().unwrap_or_else(|| Path::new("."));
    let output_path = parent.join(format!("{}_compressed.{}", file_stem, extension));

    match std::fs::write(&output_path, &bytes) {
        Ok(_) => Ok(CompressResult {
            path,
            original_size,
            compressed_size: bytes.len() as u64,
            success: true,
            error: None,
        }),
        Err(e) => Err(format!("Failed to write compressed file: {}", e)),
    }
}

#[tauri::command]
async fn compress_video_ffmpeg(app: tauri::AppHandle, path: String) -> Result<CompressResult, String> {
    use tauri_plugin_shell::ShellExt;
    
    let file_path = Path::new(&path);
    if !file_path.exists() {
        return Err(format!("Video file not found: {}", path));
    }

    let original_size = std::fs::metadata(file_path)
        .map(|m| m.len())
        .unwrap_or(0);

    let file_stem = file_path.file_stem().unwrap_or_default().to_string_lossy();
    let parent = file_path.parent().unwrap_or_else(|| Path::new("."));
    // Output MKV file alongside original
    let output_path = parent.join(format!("{}_compressed.mkv", file_stem));
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
        .invoke_handler(tauri::generate_handler![get_file_info, save_compressed_file, read_file_to_bytes, compress_video_ffmpeg])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
