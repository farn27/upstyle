use tauri::{AppHandle, Runtime};
use tauri_plugin_notification::NotificationExt;

use crate::AppState;

/// Ambil port server yang sedang berjalan
#[tauri::command]
pub fn get_server_port(state: tauri::State<AppState>) -> u16 {
    *state.server_port.lock().unwrap()
}

/// Buka URL di browser default sistem
#[tauri::command]
pub async fn open_in_browser(url: String) -> Result<(), String> {
    // Pakai std::process::Command untuk buka browser di Windows
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/c", "start", &url])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&url)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&url)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Ambil versi app
#[tauri::command]
pub fn get_app_version(app: AppHandle<impl Runtime>) -> String {
    app.package_info().version.to_string()
}

/// Kirim native notification
#[tauri::command]
pub fn show_notification<R: Runtime>(
    app: AppHandle<R>,
    title: String,
    body: String,
) -> Result<(), String> {
    app.notification()
        .builder()
        .title(&title)
        .body(&body)
        .show()
        .map_err(|e| e.to_string())
}
