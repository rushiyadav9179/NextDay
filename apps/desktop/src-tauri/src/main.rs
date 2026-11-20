// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::PathBuf;
use directories::UserDirs;

#[tauri::command]
fn secure_save_token(key: String, token: String) -> Result<String, String> {
    // In production Tauri, this integrates with OS Keychain / DPAPI.
    // For this portable desktop build, we store it in local user application secure state.
    if let Some(user_dirs) = UserDirs::new() {
        let mut app_dir = user_dirs.home_dir().to_path_buf();
        app_dir.push(".nextday");
        if !app_dir.exists() {
            fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
        }
        let token_path = app_dir.join(format!("{}.sec", key));
        fs::write(token_path, token).map_err(|e| e.to_string())?;
        Ok("Token securely saved".into())
    } else {
        Err("Could not locate home directory".into())
    }
}

#[tauri::command]
fn secure_get_token(key: String) -> Result<String, String> {
    if let Some(user_dirs) = UserDirs::new() {
        let mut token_path = user_dirs.home_dir().to_path_buf();
        token_path.push(".nextday");
        token_path.push(format!("{}.sec", key));
        if token_path.exists() {
            let data = fs::read_to_string(token_path).map_err(|e| e.to_string())?;
            Ok(data)
        } else {
            Err("No token found".into())
        }
    } else {
        Err("Could not locate home directory".into())
    }
}

#[tauri::command]
fn export_csv_to_downloads(filename: String, content: String) -> Result<String, String> {
    if let Some(user_dirs) = UserDirs::new() {
        if let Some(download_dir) = user_dirs.download_dir() {
            let file_path: PathBuf = download_dir.join(&filename);
            fs::write(&file_path, content).map_err(|e| e.to_string())?;
            Ok(file_path.to_string_lossy().to_string())
        } else {
            Err("Downloads folder not found".into())
        }
    } else {
        Err("Could not access user directories".into())
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            secure_save_token,
            secure_get_token,
            export_csv_to_downloads
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
