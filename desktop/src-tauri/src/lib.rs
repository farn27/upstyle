use std::sync::Mutex;
use tauri::{
    Manager,
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
};

mod server;
mod commands;

pub use commands::*;

/// Global state: port yang dipakai SvelteKit server
pub struct AppState {
    pub server_port: Mutex<u16>,
    pub server_handle: Mutex<Option<server::ServerHandle>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            server_port: Mutex::new(5173),
            server_handle: Mutex::new(None),
        }
    }
}

/// Setup tray icon dengan menu
fn setup_tray(app: &tauri::App) -> tauri::Result<()> {
    let quit = MenuItem::with_id(app, "quit", "Quit Upstyle", true, None::<&str>)?;
    let show = MenuItem::with_id(app, "show", "Tampilkan", true, None::<&str>)?;
    let hide = MenuItem::with_id(app, "hide", "Sembunyikan", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&show, &hide, &quit])?;

    let _tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .show_menu_on_left_click(false)
        .tooltip("Upstyle - Business Management")
        .on_menu_event(|app, event| match event.id.as_ref() {
            "quit" => {
                if let Some(state) = app.try_state::<AppState>() {
                    let mut handle = state.server_handle.lock().unwrap();
                    if let Some(h) = handle.take() {
                        h.shutdown();
                    }
                }
                app.exit(0);
            }
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "hide" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                }
            }
            _ => {}
        })
        .build(app)?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_http::init())
        .manage(AppState::default())
        .setup(|app| {
            setup_tray(app)?;

            #[cfg(not(debug_assertions))]
            {
                let port = server::find_available_port(4173);
                let state = app.state::<AppState>();
                *state.server_port.lock().unwrap() = port;

                let app_handle = app.handle().clone();
                let handle = server::spawn_sveltekit_server(app_handle.clone(), port);
                *state.server_handle.lock().unwrap() = Some(handle);

                tauri::async_runtime::spawn(async move {
                    server::wait_for_server(port).await;
                    if let Some(window) = app_handle.get_webview_window("main") {
                        let url = format!("http://localhost:{}", port);
                        let _ = window.navigate(url.parse().unwrap());
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                });
            }

            #[cfg(debug_assertions)]
            {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_server_port,
            commands::open_in_browser,
            commands::get_app_version,
            commands::show_notification,
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                window.hide().unwrap();
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Upstyle desktop app");
}
