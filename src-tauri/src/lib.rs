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
async fn compress_files(
    app: tauri::AppHandle,
    files: Vec<String>,
    quality: u8,
    true_tone: bool,
) -> Result<Vec<CompressResult>, String> {
    println!("🎬 Starting compression with FFmpeg/SVT-AV1 (Sidecar)");
    
    let mut results = Vec::new();

    for path_str in files {
        let path = Path::new(&path_str);
        
        let original_size = match std::fs::metadata(path) {
            Ok(m) => m.len(),
            Err(_) => 0,
        };

        let compression_future = if true_tone {
            compress_with_mozjpeg(&app, path, quality).await
        } else {
            compress_with_ffmpeg(&app, path, quality, false).await
        };

        match compression_future {
            Ok((_new_path, new_size)) => {
                results.push(CompressResult {
                    path: path_str.clone(),
                    original_size,
                    compressed_size: new_size,
                    success: true,
                    error: None,
                });
            },
            Err(e) => {
                results.push(CompressResult {
                    path: path_str.clone(),
                    original_size,
                    compressed_size: 0,
                    success: false,
                    error: Some(e),
                });
            }
        }
    }

    Ok(results)
}

#[tauri::command]
async fn compress_single_file(
    app: tauri::AppHandle,
    path: String,
    quality: u8,
    true_tone: bool,
) -> Result<CompressResult, String> {
    let file_path = Path::new(&path);
    
    let original_size = match std::fs::metadata(file_path) {
        Ok(m) => m.len(),
        Err(_) => 0,
    };

    let compression_future = if true_tone {
        compress_with_mozjpeg(&app, file_path, quality).await
    } else {
        compress_with_ffmpeg(&app, file_path, quality, false).await
    };

    match compression_future {
        Ok((_new_path, new_size)) => {
            Ok(CompressResult {
                path: path.clone(),
                original_size,
                compressed_size: new_size,
                success: true,
                error: None,
            })
        },
        Err(e) => {
            Ok(CompressResult {
                path: path.clone(),
                original_size,
                compressed_size: 0,
                success: false,
                error: Some(e),
            })
        }
    }
}

async fn compress_with_ffmpeg(
    app: &tauri::AppHandle,
    input_path: &Path,
    quality: u8,
    true_tone: bool,
) -> Result<(String, u64), String> {
    use tauri_plugin_shell::ShellExt;
    
    println!("📝 Processing: {:?}", input_path.file_name().unwrap_or_default());
    
    let crf = 51 - ((quality as f32 / 100.0) * 36.0) as u8;
    let file_stem = input_path.file_stem().unwrap_or_default().to_string_lossy();
    let parent = input_path.parent().unwrap_or_else(|| Path::new("."));
    let output_path = parent.join(format!("{}_compressed.avif", file_stem));

    let preset = if true_tone { "4" } else { "10" };

    let mut args = vec![
        "-i".to_string(), input_path.to_str().unwrap().to_string(),
        "-c:v".to_string(), "libsvtav1".to_string(),
        "-preset".to_string(), preset.to_string(),
        "-crf".to_string(), crf.to_string(),
    ];

    if true_tone {
        args.push("-pix_fmt".to_string());
        args.push("yuv444p".to_string());
        args.push("-color_range".to_string());
        args.push("pc".to_string());
    }

    args.push("-y".to_string());
    args.push(output_path.to_str().unwrap().to_string());
    
    let sidecar_command = app.shell().sidecar("ffmpeg")
        .map_err(|e| format!("Failed to create sidecar: {}", e))?
        .args(args);

    let output = sidecar_command.output()
        .await
        .map_err(|e| format!("FFmpeg sidecar execution failed: {}", e))?;

    if !output.status.success() {
        let error_msg = String::from_utf8_lossy(&output.stderr);
        return Err(format!("FFmpeg sidecar error: {}", error_msg));
    }

    let size = std::fs::metadata(&output_path)
        .map_err(|e| format!("Failed to read output file: {}", e))?
        .len();
    
    Ok((output_path.to_string_lossy().to_string(), size))
}

async fn compress_with_mozjpeg(
    app: &tauri::AppHandle,
    input_path: &Path,
    quality: u8,
) -> Result<(String, u64), String> {
    use tauri_plugin_shell::ShellExt;
    
    println!("📝 Processing with MozJPEG: {:?}", input_path.file_name().unwrap_or_default());
    
    let file_stem = input_path.file_stem().unwrap_or_default().to_string_lossy();
    let parent = input_path.parent().unwrap_or_else(|| Path::new("."));
    let output_path = parent.join(format!("{}_compressed.jpg", file_stem));
    
    let sidecar_command = app.shell().sidecar("cjpeg")
        .map_err(|e| format!("Failed to create sidecar: {}", e))?
        .args(&[
            "-quality", &quality.to_string(),
            "-outfile", output_path.to_str().unwrap(),
            input_path.to_str().unwrap()
        ]);

    let output = sidecar_command.output()
        .await
        .map_err(|e| format!("MozJPEG sidecar execution failed: {}", e))?;

    if !output.status.success() {
        let error_msg = String::from_utf8_lossy(&output.stderr);
        println!("❌ MozJPEG Error details: {}", error_msg);
        return Err(format!("MozJPEG sidecar error: {}", error_msg));
    }

    let size = std::fs::metadata(&output_path)
        .map_err(|e| format!("Failed to read output file: {}", e))?
        .len();
    
    Ok((output_path.to_string_lossy().to_string(), size))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![get_file_info, compress_files, compress_single_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
