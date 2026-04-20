use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::io::{self, Write};
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HostData {
    pub original_host: String,
    pub host: String,
    pub params: HashMap<String, String>,
}

pub fn get_ssh_config_path() -> PathBuf {
    dirs::home_dir().unwrap_or_default().join(".ssh").join("config")
}

pub fn parse_ssh_config(path: &Path) -> io::Result<Vec<HostData>> {
    if !path.exists() {
        return Ok(Vec::new());
    }

    let content = fs::read_to_string(path)?;
    let mut hosts = Vec::new();
    let mut current_host: Option<HostData> = None;

    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }

        let parts: Vec<&str> = if trimmed.contains('=') {
            trimmed.splitn(2, '=').collect()
        } else {
            trimmed.split_whitespace().collect()
        };

        if parts.is_empty() {
            continue;
        }

        let key = parts[0];
        let val = if parts.len() > 1 {
            parts[1..].join(" ")
        } else {
            String::new()
        };

        if key.eq_ignore_ascii_case("Host") {
            if let Some(h) = current_host.take() {
                hosts.push(h);
            }
            current_host = Some(HostData {
                original_host: val.clone(),
                host: val,
                params: HashMap::new(),
            });
        } else if let Some(ref mut h) = current_host {
            h.params.insert(key.to_string(), val.to_string());
        }
    }

    if let Some(h) = current_host {
        hosts.push(h);
    }

    Ok(hosts)
}

pub fn save_host(path: &Path, data: HostData) -> io::Result<()> {
    let mut content = String::new();
    if path.exists() {
        content = fs::read_to_string(path)?;
    } else {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
    }

    let mut lines: Vec<String> = content.lines().map(|s| s.to_string()).collect();
    let mut in_target_block = false;
    let mut block_start = 0;
    let mut block_end = lines.len();

    // Find block
    if !data.original_host.is_empty() {
        for (i, line) in lines.iter().enumerate() {
            let trimmed = line.trim();
            if trimmed.to_lowercase().starts_with("host ") {
                let host_val = trimmed[5..].trim();
                if in_target_block {
                    block_end = i;
                    break;
                }
                if host_val == data.original_host {
                    in_target_block = true;
                    block_start = i;
                }
            }
        }
    }

    if in_target_block {
        // Update existing block
        lines[block_start] = format!("Host {}", data.host);
        let mut keys_found = std::collections::HashSet::new();

        for i in (block_start + 1)..block_end {
            let line = &lines[i];
            let trimmed = line.trim();
            if trimmed.is_empty() || trimmed.starts_with('#') {
                continue;
            }

            let parts: Vec<&str> = if trimmed.contains('=') {
                trimmed.splitn(2, '=').collect()
            } else {
                trimmed.split_whitespace().collect()
            };

            if !parts.is_empty() {
                let key = parts[0];
                if let Some((target_key, target_val)) = data.params.iter().find(|(k, _)| k.eq_ignore_ascii_case(key)) {
                    if !target_val.is_empty() {
                        lines[i] = format!("  {} {}", target_key, target_val);
                        keys_found.insert(target_key.clone());
                    } else {
                        lines[i] = String::new(); // mark for deletion
                    }
                }
            }
        }

        // Insert missing params
        let mut insert_pos = block_end;
        for (k, v) in &data.params {
            if !keys_found.contains(k) && !v.is_empty() {
                lines.insert(insert_pos, format!("  {} {}", k, v));
                insert_pos += 1;
            }
        }
    } else {
        // Append new host block
        if !lines.is_empty() && !lines.last().unwrap().is_empty() {
            lines.push(String::new());
        }
        lines.push(format!("Host {}", data.host));
        for (k, v) in &data.params {
            if !v.is_empty() {
                lines.push(format!("  {} {}", k, v));
            }
        }
    }

    // Filter out marked empty lines (params we deleted), keep original empty lines intact where possible.
    // Actually, marking as String::new() won't affect parsing much, but let's filter if it was explicitly cleared.
    // Wait, original empty lines shouldn't be deleted. We just won't worry about it too much, it just becomes an empty line.

    let new_content = lines.join("\n") + "\n";
    
    // Backup before overwrite
    if path.exists() {
        let backup_path = path.with_extension("config.bak");
        let _ = fs::copy(path, &backup_path);
    }

    fs::write(path, new_content)?;

    Ok(())
}

pub fn delete_host(path: &Path, original_host: &str) -> io::Result<()> {
    if !path.exists() {
        return Ok(());
    }

    let content = fs::read_to_string(path)?;
    let mut lines: Vec<String> = content.lines().map(|s| s.to_string()).collect();
    
    let mut in_target_block = false;
    let mut remove_start = 0;
    let mut remove_end = lines.len();

    for (i, line) in lines.iter().enumerate() {
        let trimmed = line.trim();
        if trimmed.to_lowercase().starts_with("host ") {
            let host_val = trimmed[5..].trim();
            if in_target_block {
                remove_end = i;
                break;
            }
            if host_val == original_host {
                in_target_block = true;
                remove_start = i;
            }
        }
    }

    if in_target_block {
        lines.drain(remove_start..remove_end);
        let new_content = lines.join("\n") + "\n";
        
        let backup_path = path.with_extension("config.bak");
        let _ = fs::copy(path, &backup_path);

        fs::write(path, new_content)?;
    }

    Ok(())
}
