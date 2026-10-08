use once_cell::sync::Lazy;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{command, State};
use tauri_plugin_dialog::DialogExt;
use walkdir::WalkDir;

static WIKI_LINK_REGEX: Lazy<Regex> = Lazy::new(|| Regex::new(r"\[\[([^\]]+)\]\]").unwrap());

#[derive(Debug, Serialize, Deserialize)]
pub struct ParsedMarkdown {
    pub html: String,
    pub links: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VaultInfo {
    pub path: String,
    pub files: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LinkMap {
    pub forward: HashMap<String, Vec<String>>,
    pub backlinks: HashMap<String, Vec<String>>,
}

struct VaultState {
    path: Mutex<Option<PathBuf>>,
    link_map: Mutex<Option<LinkMap>>,
}

impl Default for VaultState {
    fn default() -> Self {
        Self {
            path: Mutex::new(None),
            link_map: Mutex::new(None),
        }
    }
}

fn normalize_name(name: &str) -> String {
    name.trim().to_lowercase()
}

fn get_stem(path: &Path) -> String {
    path.file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_string()
}

fn scan_vault_files(vault_path: &Path) -> Vec<String> {
    WalkDir::new(vault_path)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .filter(|e| e.path().extension().map_or(false, |ext| ext == "md"))
        .map(|e| {
            e.path()
                .strip_prefix(vault_path)
                .unwrap_or(e.path())
                .to_string_lossy()
                .to_string()
        })
        .collect()
}

fn scan_vault_folders(vault_path: &Path) -> Vec<String> {
    WalkDir::new(vault_path)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_dir())
        .filter_map(|e| {
            let rel = e.path().strip_prefix(vault_path).ok()?;
            let s = rel.to_string_lossy().to_string();
            if s.is_empty() { None } else { Some(s) }
        })
        .collect()
}

fn extract_wiki_links(content: &str) -> Vec<String> {
    WIKI_LINK_REGEX
        .captures_iter(content)
        .filter_map(|cap| cap.get(1))
        .map(|m| normalize_name(m.as_str()))
        .collect()
}

fn parse_markdown(text: &str) -> ParsedMarkdown {
    let links = extract_wiki_links(text);
    let parser = pulldown_cmark::Parser::new_ext(text, pulldown_cmark::Options::all());
    let mut html = String::new();
    pulldown_cmark::html::push_html(&mut html, parser);
    ParsedMarkdown { html, links }
}

fn build_link_map(vault_path: &Path, files: &[String]) -> LinkMap {
    let mut forward: HashMap<String, Vec<String>> = HashMap::new();
    let mut backlinks: HashMap<String, Vec<String>> = HashMap::new();

    for file_rel in files {
        let file_path = vault_path.join(file_rel);
        let content = fs::read_to_string(&file_path).unwrap_or_default();
        let stems: Vec<String> = extract_wiki_links(&content)
            .into_iter()
            .map(|link| {
                let candidates: Vec<String> = files
                    .iter()
                    .filter(|f| normalize_name(&get_stem(Path::new(f))) == link)
                    .cloned()
                    .collect();
                candidates.first().cloned().unwrap_or(link)
            })
            .collect();

        let current_stem = normalize_name(&get_stem(Path::new(file_rel)));
        forward.insert(current_stem.clone(), stems.clone());

        for target in stems {
            let target_norm = normalize_name(&get_stem(Path::new(&target)));
            backlinks
                .entry(target_norm)
                .or_default()
                .push(file_rel.clone());
        }
    }

    LinkMap { forward, backlinks }
}

#[command]
async fn read_vault(state: State<'_, VaultState>, path: String) -> Result<VaultInfo, String> {
    let vault_path = PathBuf::from(&path);
    if !vault_path.exists() || !vault_path.is_dir() {
        return Err("Invalid vault path".into());
    }

    let files = scan_vault_files(&vault_path);
    let link_map = build_link_map(&vault_path, &files);

    *state.path.lock().unwrap() = Some(vault_path.clone());
    *state.link_map.lock().unwrap() = Some(link_map);

    Ok(VaultInfo {
        path: path.clone(),
        files,
    })
}

#[command]
async fn read_file(state: State<'_, VaultState>, name: String) -> Result<String, String> {
    let vault_path = state
        .path
        .lock()
        .unwrap()
        .clone()
        .ok_or("No vault opened")?;
    let file_path = vault_path.join(&name);
    fs::read_to_string(&file_path).map_err(|e| e.to_string())
}

#[command]
async fn write_file(state: State<'_, VaultState>, name: String, content: String) -> Result<(), String> {
    let vault_path = state
        .path
        .lock()
        .unwrap()
        .clone()
        .ok_or("No vault opened")?;
    let file_path = vault_path.join(&name);

    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    fs::write(&file_path, content).map_err(|e| e.to_string())?;

    let files = scan_vault_files(&vault_path);
    let link_map = build_link_map(&vault_path, &files);
    *state.link_map.lock().unwrap() = Some(link_map);

    Ok(())
}

#[command]
async fn parse_markdown_cmd(text: String) -> Result<ParsedMarkdown, String> {
    Ok(parse_markdown(&text))
}

#[command]
async fn get_backlinks(state: State<'_, VaultState>, name: String) -> Result<Vec<String>, String> {
    let link_map = state
        .link_map
        .lock()
        .unwrap()
        .clone()
        .ok_or("No vault loaded")?;

    let stem = normalize_name(&get_stem(Path::new(&name)));
    Ok(link_map.backlinks.get(&stem).cloned().unwrap_or_default())
}

#[command]
async fn get_all_files(state: State<'_, VaultState>) -> Result<Vec<String>, String> {
    let vault_path = state
        .path
        .lock()
        .unwrap()
        .clone()
        .ok_or("No vault opened")?;
    Ok(scan_vault_files(&vault_path))
}

#[command]
async fn get_all_folders(state: State<'_, VaultState>) -> Result<Vec<String>, String> {
    let vault_path = state
        .path
        .lock()
        .unwrap()
        .clone()
        .ok_or("No vault opened")?;
    Ok(scan_vault_folders(&vault_path))
}

#[command]
async fn create_file(state: State<'_, VaultState>, name: String) -> Result<(), String> {
    let vault_path = state
        .path
        .lock()
        .unwrap()
        .clone()
        .ok_or("No vault opened")?;
    let file_path = vault_path.join(&name);

    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    if file_path.exists() {
        return Err("File already exists".into());
    }

    fs::write(&file_path, "").map_err(|e| e.to_string())?;

    let files = scan_vault_files(&vault_path);
    let link_map = build_link_map(&vault_path, &files);
    *state.link_map.lock().unwrap() = Some(link_map);

    Ok(())
}

#[command]
async fn delete_file(state: State<'_, VaultState>, name: String) -> Result<(), String> {
    let vault_path = state
        .path
        .lock()
        .unwrap()
        .clone()
        .ok_or("No vault opened")?;
    let file_path = vault_path.join(&name);

    if !file_path.exists() {
        return Err("File does not exist".into());
    }

    fs::remove_file(&file_path).map_err(|e| e.to_string())?;

    let files = scan_vault_files(&vault_path);
    let link_map = build_link_map(&vault_path, &files);
    *state.link_map.lock().unwrap() = Some(link_map);

    Ok(())
}

#[command]
async fn rename_file(state: State<'_, VaultState>, old: String, new: String) -> Result<(), String> {
    let vault_path = state
        .path
        .lock()
        .unwrap()
        .clone()
        .ok_or("No vault opened")?;

    // Yol kaçışlarına karşı koruma: mutlak yol ve `..` yasak, sonuç vault içinde kalmalı.
    let resolve = |p: &str| -> Result<PathBuf, String> {
        if p.trim().is_empty() {
            return Err("Invalid file name".into());
        }
        let rel = Path::new(p);
        if rel.is_absolute() || p.split('/').any(|seg| seg == "..") {
            return Err("Invalid path".into());
        }
        let abs = vault_path.join(rel);
        if !abs.starts_with(&vault_path) {
            return Err("Invalid path".into());
        }
        Ok(abs)
    };

    let from = resolve(&old)?;
    let to = resolve(&new)?;

    if !from.exists() {
        return Err("File does not exist".into());
    }
    if to.exists() {
        return Err("A file with that name already exists".into());
    }
    if let Some(parent) = to.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::rename(&from, &to).map_err(|e| e.to_string())?;

    let files = scan_vault_files(&vault_path);
    let link_map = build_link_map(&vault_path, &files);
    *state.link_map.lock().unwrap() = Some(link_map);

    Ok(())
}
#[command]
async fn create_folder(state: State<'_, VaultState>, name: String) -> Result<(), String> {
    let vault_path = state
        .path
        .lock()
        .unwrap()
        .clone()
        .ok_or("No vault opened")?;
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err("Invalid folder name".into());
    }
    let rel = Path::new(trimmed);
    if rel.is_absolute() || trimmed.split('/').any(|seg| seg == ".." || seg.is_empty()) {
        return Err("Invalid path".into());
    }
    let abs = vault_path.join(rel);
    if !abs.starts_with(&vault_path) {
        return Err("Invalid path".into());
    }
    if abs.exists() {
        return Err("Folder already exists".into());
    }
    fs::create_dir_all(&abs).map_err(|e| e.to_string())?;
    Ok(())
}

/// Vault içine hapsedilmiş yol çözümü: mutlak yol ve `..` reddedilir.
fn resolve_in_vault(vault_path: &Path, p: &str) -> Result<PathBuf, String> {
    let trimmed = p.trim();
    if trimmed.is_empty() {
        return Err("Invalid path".into());
    }
    let rel = Path::new(trimmed);
    if rel.is_absolute()
        || trimmed
            .split(['/', '\\'])
            .any(|seg| seg == ".." || (seg.is_empty() && trimmed != "/"))
    {
        return Err("Invalid path".into());
    }
    let abs = vault_path.join(rel);
    if !abs.starts_with(vault_path) {
        return Err("Invalid path".into());
    }
    Ok(abs)
}

#[command]
async fn delete_folder(state: State<'_, VaultState>, name: String) -> Result<(), String> {
    let vault_path = state
        .path
        .lock()
        .unwrap()
        .clone()
        .ok_or("No vault opened")?;
    let abs = resolve_in_vault(&vault_path, &name)?;
    // Vault kökü ASLA silinemez.
    if abs == vault_path {
        return Err("Cannot delete the vault root".into());
    }
    if !abs.is_dir() {
        return Err("Folder does not exist".into());
    }
    fs::remove_dir_all(&abs).map_err(|e| e.to_string())?;

    let files = scan_vault_files(&vault_path);
    let link_map = build_link_map(&vault_path, &files);
    *state.link_map.lock().unwrap() = Some(link_map);
    Ok(())
}

/// Göreli yolu mutlak yola çevirir (yolu kopyalama / pano).
#[command]
async fn absolute_path(state: State<'_, VaultState>, name: String) -> Result<String, String> {
    let vault_path = state
        .path
        .lock()
        .unwrap()
        .clone()
        .ok_or("No vault opened")?;
    Ok(resolve_in_vault(&vault_path, &name)?
        .to_string_lossy()
        .to_string())
}

/// Hedefi işletim sisteminin dosya yöneticisinde açar.
/// Klasör → kendisi, dosya → üst klasör (macOS/Windows'ta seçili).
#[command]
async fn reveal_in_file_manager(state: State<'_, VaultState>, name: String) -> Result<(), String> {
    use std::process::Command;

    let vault_path = state
        .path
        .lock()
        .unwrap()
        .clone()
        .ok_or("No vault opened")?;
    let abs = resolve_in_vault(&vault_path, &name)?;
    if !abs.exists() {
        return Err("Path does not exist".into());
    }
    let target = abs.to_string_lossy().to_string();
    let parent = abs
        .parent()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| target.clone());

    #[cfg(target_os = "linux")]
    {
        // Sırayla dene: xdg-open (dosya seçimi yok), gio open (seçim var),
        // sonra masaüstü yöneticilerinin kendi komutları.
        let attempts: Vec<Vec<String>> = vec![
            if abs.is_dir() {
                vec!["xdg-open".into(), target.clone()]
            } else {
                vec!["gio".into(), "open".into(), target.clone()]
            },
            if abs.is_dir() {
                vec!["gio".into(), "open".into(), target.clone()]
            } else {
                vec!["xdg-open".into(), parent.clone()]
            },
            vec!["nautilus".into(), target.clone()],
            vec!["dolphin".into(), target.clone()],
            vec!["thunar".into(), target.clone()],
        ];
        for args in attempts {
            let (bin, rest) = args.split_first().unwrap();
            if which(bin).is_none() {
                continue;
            }
            if Command::new(bin).args(rest).spawn().is_ok() {
                return Ok(());
            }
        }
        return Err("No file manager found (xdg-open, gio, nautilus, dolphin)".into());
    }

    #[cfg(target_os = "macos")]
    {
        let _ = parent;
        let args: Vec<String> = if abs.is_dir() {
            vec![target.clone()]
        } else {
            vec!["-R".into(), target.clone()]
        };
        return Command::new("open")
            .args(&args)
            .spawn()
            .map(|_| ())
            .map_err(|e| e.to_string());
    }

    #[cfg(target_os = "windows")]
    {
        let _ = parent;
        let arg = if abs.is_dir() {
            target.clone()
        } else {
            format!("/select,{}", target)
        };
        return Command::new("explorer")
            .arg(arg)
            .spawn()
            .map(|_| ())
            .map_err(|e| e.to_string());
    }

    #[allow(unreachable_code)]
    {
        let _ = (parent, target);
        Ok(())
    }
}

/// Komutun PATH'te var olup olmadığını kontrol eder (küçük, bağımlılıksız).
fn which(bin: &str) -> Option<PathBuf> {
    if bin.contains('/') {
        let p = PathBuf::from(bin);
        return if p.exists() { Some(p) } else { None };
    }
    let path = std::env::var_os("PATH")?;
    for dir in std::env::split_paths(&path) {
        let candidate = dir.join(bin);
        if candidate.is_file() {
            return Some(candidate);
        }
    }
    None
}

#[command]
async fn select_vault_folder(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use std::sync::mpsc;

    let (tx, rx) = mpsc::channel();
    app.dialog()
        .file()
        .set_title("Select Vault Folder")
        .pick_folder(move |path| {
            let _ = tx.send(path.map(|p| p.to_string()));
        });

    match rx.recv() {
        Ok(Some(path)) => Ok(Some(path)),
        Ok(None) => Ok(None),
        Err(_) => Err("Dialog cancelled".into()),
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(VaultState::default())
        .invoke_handler(tauri::generate_handler![
            read_vault,
            read_file,
            write_file,
            parse_markdown_cmd,
            get_backlinks,
            get_all_files,
            create_file,
            create_folder,
            get_all_folders,
            delete_file,
            delete_folder,
            absolute_path,
            reveal_in_file_manager,
            rename_file,
            select_vault_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}