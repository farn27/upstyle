//! Bizgrow Desktop — jendela native untuk aplikasi web Bizgrow.
//!
//! Dulu mode produksi menjalankan server SvelteKit (Node.js) di komputer pengguna: butuh Node
//! terpasang, build server yang tidak pernah ikut dibundel, serta kredensial database di PC
//! pengguna — sehingga aplikasi tidak pernah bisa terbuka. Sekarang aplikasi membuka server
//! Bizgrow yang sama dengan web & Android (default: produksi), dengan:
//!   • layar pembuka lokal (dist/index.html) yang menangani offline + tombol coba lagi;
//!   • tautan luar (WhatsApp, invoice, Midtrans, dll.) dibuka di browser bawaan;
//!   • unduhan (Excel/PDF) disimpan ke folder Unduhan + notifikasi;
//!   • tray: tampilkan, muat ulang, buka di browser, keluar.

use std::path::PathBuf;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    webview::{DownloadEvent, NewWindowResponse},
    AppHandle, Manager, Url, WebviewUrl, WebviewWindowBuilder,
};
use tauri_plugin_notification::NotificationExt;
use tauri_plugin_opener::OpenerExt;

/// Server bawaan (bisa diganti saat build lewat env BIZGROW_SERVER_URL).
const SERVER_BAWAAN: &str = match option_env!("BIZGROW_SERVER_URL") {
    Some(u) => u,
    None => "https://bizgrows-ten.vercel.app",
};

/// Alamat server yang dipakai: file `server_url.txt` di folder konfigurasi aplikasi (opsional,
/// untuk server sendiri) → env BIZGROW_DEV_URL saat debug → server bawaan.
fn alamat_server(app: &AppHandle) -> Url {
    let dari_file = app
        .path()
        .app_config_dir()
        .ok()
        .map(|d| d.join("server_url.txt"))
        .and_then(|p| std::fs::read_to_string(p).ok())
        .map(|s| s.trim().trim_end_matches('/').to_string())
        .filter(|s| !s.is_empty());
    let dev = if cfg!(debug_assertions) { std::env::var("BIZGROW_DEV_URL").ok() } else { None };
    let mentah = dari_file.or(dev).unwrap_or_else(|| SERVER_BAWAAN.to_string());
    match Url::parse(&mentah) {
        Ok(u) if u.scheme() == "https" || u.scheme() == "http" => u,
        _ => Url::parse(SERVER_BAWAAN).expect("SERVER_BAWAAN harus URL valid"),
    }
}

/// Apakah URL masih bagian dari aplikasi (server Bizgrow atau layar pembuka lokal)?
fn milik_aplikasi(url: &Url, server: &Url) -> bool {
    url.origin() == server.origin()
        || url.scheme() == "tauri"
        || url.host_str() == Some("tauri.localhost")
        || url.scheme() == "about"
        || url.scheme() == "data"
        || url.scheme() == "blob"
}

/// Hanya skema aman yang boleh dibuka ke aplikasi lain.
fn boleh_dibuka_luar(url: &Url) -> bool {
    matches!(url.scheme(), "https" | "http" | "mailto" | "tel" | "whatsapp")
}

fn buka_di_luar(app: &AppHandle, url: &Url) {
    if boleh_dibuka_luar(url) {
        let _ = app.opener().open_url(url.as_str(), None::<&str>);
    }
}

fn notifikasi(app: &AppHandle, judul: &str, isi: &str) {
    let _ = app.notification().builder().title(judul).body(isi).show();
}

fn tampilkan(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
    }
}

/// Nama file unik di folder Unduhan (tidak menimpa file yang sudah ada).
fn tujuan_unduhan(app: &AppHandle, usulan: &PathBuf, url: &Url) -> PathBuf {
    // folder Unduhan sistem → ~/Downloads (dibuat bila belum ada) → folder sementara
    let folder = app
        .path()
        .download_dir()
        .ok()
        .filter(|d| d.is_dir())
        .or_else(|| {
            let d = app.path().home_dir().ok()?.join("Downloads");
            std::fs::create_dir_all(&d).ok().map(|_| d)
        })
        .unwrap_or_else(std::env::temp_dir);
    let nama = usulan
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .filter(|n| !n.is_empty())
        .or_else(|| url.path_segments().and_then(|s| s.last().map(|x| x.to_string())).filter(|n| !n.is_empty()))
        .unwrap_or_else(|| "bizgrow-unduhan".to_string());
    let mut tujuan = folder.join(&nama);
    let (stem, ext) = match nama.rsplit_once('.') {
        Some((a, b)) => (a.to_string(), format!(".{b}")),
        None => (nama.clone(), String::new()),
    };
    let mut i = 1;
    while tujuan.exists() {
        tujuan = folder.join(format!("{stem} ({i}){ext}"));
        i += 1;
    }
    tujuan
}

fn buat_jendela(app: &AppHandle) -> tauri::Result<()> {
    let server = alamat_server(app);
    let server_nav = server.clone();
    let app_nav = app.clone();
    let app_baru = app.clone();
    let app_unduh = app.clone();

    WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
        .title("Bizgrow")
        .inner_size(1280.0, 820.0)
        .min_inner_size(1024.0, 640.0)
        .center()
        .resizable(true)
        .visible(true)
        // tautan di luar server Bizgrow → buka di browser bawaan, jangan pindahkan jendela aplikasi
        .on_navigation(move |url| {
            if milik_aplikasi(url, &server_nav) {
                true
            } else {
                buka_di_luar(&app_nav, url);
                false
            }
        })
        // target="_blank" / window.open → browser bawaan (WebView tidak membuka jendela baru)
        .on_new_window(move |url, _fitur| {
            buka_di_luar(&app_baru, &url);
            NewWindowResponse::Deny
        })
        // ekspor Excel/PDF → folder Unduhan
        .on_download(move |_webview, event| {
            match event {
                DownloadEvent::Requested { url, destination } => {
                    *destination = tujuan_unduhan(&app_unduh, destination, &url);
                    true
                }
                DownloadEvent::Finished { path, success, .. } => {
                    if success {
                        let nama = path.as_ref().and_then(|p| p.file_name()).map(|n| n.to_string_lossy().to_string()).unwrap_or_default();
                        notifikasi(&app_unduh, "Unduhan selesai", &format!("{nama} tersimpan di folder Unduhan"));
                    } else {
                        notifikasi(&app_unduh, "Unduhan gagal", "File tidak berhasil diunduh. Coba lagi.");
                    }
                    true
                }
                _ => true,
            }
        })
        .build()?;
    Ok(())
}

fn pasang_tray(app: &tauri::App) -> tauri::Result<()> {
    let tampil = MenuItem::with_id(app, "tampil", "Tampilkan Bizgrow", true, None::<&str>)?;
    let muat = MenuItem::with_id(app, "muat", "Muat ulang", true, None::<&str>)?;
    let browser = MenuItem::with_id(app, "browser", "Buka di browser", true, None::<&str>)?;
    let keluar = MenuItem::with_id(app, "keluar", "Keluar", true, None::<&str>)?;
    let pemisah = PredefinedMenuItem::separator(app)?;
    let menu = Menu::with_items(app, &[&tampil, &muat, &browser, &pemisah, &keluar])?;

    let mut tray = TrayIconBuilder::with_id("utama")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .tooltip("Bizgrow")
        .on_menu_event(|app, event| match event.id.as_ref() {
            "tampil" => tampilkan(app),
            "muat" => {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.eval("location.reload()");
                    tampilkan(app);
                }
            }
            "browser" => {
                let server = alamat_server(app);
                buka_di_luar(app, &server);
            }
            "keluar" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                tampilkan(tray.app_handle());
            }
        });
    if let Some(ikon) = app.default_window_icon() {
        tray = tray.icon(ikon.clone());
    }
    tray.build(app)?;
    Ok(())
}

// ── perintah untuk layar pembuka & halaman web ─────────────────────────────

/// Alamat server Bizgrow yang harus dibuka layar pembuka.
#[tauri::command]
fn server_url(app: AppHandle) -> String {
    alamat_server(&app).to_string()
}

#[tauri::command]
fn app_version(app: AppHandle) -> String {
    app.package_info().version.to_string()
}

/// Buka tautan di browser/aplikasi bawaan (hanya http, https, mailto, tel, whatsapp).
#[tauri::command]
fn open_external(app: AppHandle, url: String) -> Result<(), String> {
    let u = Url::parse(&url).map_err(|_| "URL tidak valid".to_string())?;
    if !boleh_dibuka_luar(&u) {
        return Err("Skema URL tidak diizinkan".into());
    }
    app.opener().open_url(u.as_str(), None::<&str>).map_err(|e| e.to_string())
}

#[tauri::command]
fn show_notification(app: AppHandle, title: String, body: String) {
    notifikasi(&app, &title, &body);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // buka aplikasi kedua kali → fokuskan jendela yang sudah ada, jangan buat instance baru
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| tampilkan(app)))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .setup(|app| {
            pasang_tray(app)?;
            buat_jendela(app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![server_url, app_version, open_external, show_notification])
        .on_window_event(|window, event| {
            // tutup jendela = sembunyikan ke tray (notifikasi & sesi tetap jalan); keluar lewat tray
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
                use std::sync::atomic::{AtomicBool, Ordering};
                static SUDAH: AtomicBool = AtomicBool::new(false);
                if !SUDAH.swap(true, Ordering::Relaxed) {
                    notifikasi(window.app_handle(), "Bizgrow tetap berjalan", "Aplikasi diperkecil ke tray. Klik ikon Bizgrow untuk membuka lagi, atau pilih Keluar.");
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("Bizgrow desktop gagal dijalankan");
}
