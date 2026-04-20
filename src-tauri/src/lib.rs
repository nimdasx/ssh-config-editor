pub mod ssh_config_parser;

use ssh_config_parser::{HostData, get_ssh_config_path, parse_ssh_config, save_host, delete_host};

#[tauri::command]
fn get_ssh_config() -> Result<Vec<HostData>, String> {
    let path = get_ssh_config_path();
    parse_ssh_config(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_ssh_host(data: HostData) -> Result<(), String> {
    let path = get_ssh_config_path();
    save_host(&path, data).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_ssh_host(original_host: String) -> Result<(), String> {
    let path = get_ssh_config_path();
    delete_host(&path, &original_host).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_ssh_config,
            save_ssh_host,
            delete_ssh_host
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
