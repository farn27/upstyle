use std::net::TcpListener;
use std::process::{Child, Command, Stdio};
use std::time::Duration;
use tauri::{AppHandle, Manager, Runtime};

/// Handle untuk SvelteKit Node.js server process
pub struct ServerHandle {
    child: Child,
}

impl ServerHandle {
    pub fn shutdown(mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

/// Cari port yang tersedia mulai dari `start_port`
pub fn find_available_port(start_port: u16) -> u16 {
    let mut port = start_port;
    loop {
        if TcpListener::bind(("127.0.0.1", port)).is_ok() {
            return port;
        }
        port += 1;
        if port > 65535 {
            panic!("Tidak ada port tersedia!");
        }
    }
}

/// Spawn SvelteKit server (adapter-node build output)
/// Server ada di `resources/server/` di dalam bundle
pub fn spawn_sveltekit_server<R: Runtime>(
    app: AppHandle<R>,
    port: u16,
) -> ServerHandle {
    // Path ke server bundle di dalam resources
    let resource_dir = app
        .path()
        .resource_dir()
        .expect("Gagal mendapat resource dir");

    let server_path = resource_dir.join("server").join("index.js");

    // Cari Node.js di system
    let node_bin = if cfg!(target_os = "windows") {
        "node.exe"
    } else {
        "node"
    };

    let child = Command::new(node_bin)
        .arg(&server_path)
        .env("PORT", port.to_string())
        .env("HOST", "127.0.0.1")
        .env("NODE_ENV", "production")
        .env("ORIGIN", format!("http://localhost:{}", port))
        // Baca .env dari data dir jika ada (untuk config produksi)
        .env(
            "ENV_FILE",
            app.path()
                .app_data_dir()
                .unwrap_or_default()
                .join(".env")
                .to_string_lossy()
                .to_string(),
        )
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .expect("Gagal menjalankan SvelteKit server. Pastikan Node.js terinstall.");

    ServerHandle { child }
}

/// Poll sampai server siap menerima koneksi (max 30 detik)
pub async fn wait_for_server(port: u16) {
    let url = format!("http://127.0.0.1:{}/health", port);
    let client = reqwest::Client::new();

    for _ in 0..60 {
        tokio::time::sleep(Duration::from_millis(500)).await;
        if client.get(&url).send().await.is_ok() {
            return;
        }
    }

    eprintln!("[Upstyle] Server tidak merespons setelah 30 detik.");
}
