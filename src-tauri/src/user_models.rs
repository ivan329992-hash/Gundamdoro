use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{collections::BTreeMap, fs, io::{Read, Write}, path::Path};
use tauri::Manager;

const MAX_IMAGE_BYTES: usize = 8 * 1024 * 1024;
const MAX_TOTAL_BYTES: usize = 64 * 1024 * 1024;
const IMPORT_PENDING: &str = ".import-pending";
const IMPORT_COMPLETE: &str = ".import-complete";

#[derive(Deserialize)]
pub struct ImportedImage {
    name: String,
    bytes: Vec<u8>,
}

#[derive(Serialize)]
pub struct StoredModel {
    manifest: Value,
    assets: BTreeMap<String, String>,
}

fn valid_id(id: &str) -> bool {
    let suffix = id.strip_prefix("user-").unwrap_or("");
    !suffix.is_empty()
        && suffix.len() <= 80
        && suffix.as_bytes()[0].is_ascii_alphanumeric()
        && suffix.bytes().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == b'-')
}

fn image_name(name: &str, prefix: &str) -> bool {
    ["png", "jpg", "webp"].iter().any(|ext| name == format!("{prefix}.{ext}"))
}

fn valid_text(value: Option<&Value>, limit: usize) -> bool {
    value.and_then(Value::as_str).is_some_and(|text| !text.trim().is_empty() && text.chars().count() <= limit)
}

fn model_files(manifest: &Value) -> Result<Vec<String>, String> {
    let invalid = || "用户机型清单无效。".to_string();
    let id = manifest["id"].as_str().ok_or_else(invalid)?;
    let stages = manifest["stages"].as_array().ok_or_else(invalid)?;
    let final_asset = manifest["finalAsset"].as_str().ok_or_else(invalid)?;
    if !valid_id(id) || !valid_text(manifest.get("name"), 40) || stages.is_empty() || stages.len() > 32
        || !image_name(final_asset, "final") || manifest.get("legacyParts").is_some()
        || manifest.get("description").is_some_and(|v| v.as_str().is_none_or(|s| s.chars().count() > 200))
    { return Err(invalid()); }
    let mut names = vec![final_asset.to_string()];
    for (index, part) in stages.iter().enumerate() {
        let asset = part["asset"].as_str().ok_or_else(invalid)?;
        let key = format!("part-{}", index + 1);
        if part["stage"].as_u64() != Some((index + 1) as u64) || !valid_text(part.get("name"), 40)
            || part["partId"].as_str() != Some(key.as_str()) || part.get("slot").is_some() || !image_name(asset, &key)
        { return Err(invalid()); }
        names.push(asset.to_string());
    }
    Ok(names)
}

fn valid_image(name: &str, bytes: &[u8]) -> bool {
    if bytes.is_empty() || bytes.len() > MAX_IMAGE_BYTES { return false; }
    if name.ends_with(".png") { return bytes.starts_with(&[137, 80, 78, 71, 13, 10, 26, 10]); }
    if name.ends_with(".jpg") { return bytes.starts_with(&[255, 216, 255]); }
    name.ends_with(".webp") && bytes.len() >= 12 && &bytes[..4] == b"RIFF" && &bytes[8..12] == b"WEBP"
}

fn read_model(directory: &Path) -> Result<StoredModel, String> {
    let metadata_path = directory.join("manifest.json");
    if fs::metadata(&metadata_path).map_err(|e| e.to_string())?.len() > 64 * 1024 { return Err("用户机型清单过大。".into()); }
    let record: Value = serde_json::from_slice(&fs::read(metadata_path).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    if record["version"].as_u64() != Some(1) { return Err("用户机型库版本不受支持。".into()); }
    let manifest = &record["manifest"];
    let names = model_files(manifest)?;
    if directory.file_name().and_then(|v| v.to_str()) != manifest["id"].as_str() { return Err("用户机型目录与标识不一致。".into()); }
    let mut assets = BTreeMap::new();
    let mut total = 0;
    for name in names {
        let path = directory.join(&name);
        let metadata = fs::symlink_metadata(&path).map_err(|e| e.to_string())?;
        total += metadata.len();
        if !metadata.file_type().is_file() || metadata.len() == 0 || metadata.len() > MAX_IMAGE_BYTES as u64 || total > MAX_TOTAL_BYTES as u64 {
            return Err("用户机型图片无效或超过容量限制。".into());
        }
        let mut signature = [0; 12];
        let count = fs::File::open(&path).and_then(|mut file| file.read(&mut signature)).map_err(|e| e.to_string())?;
        if !valid_image(&name, &signature[..count]) { return Err("用户机型图片格式损坏。".into()); }
        assets.insert(name, path.to_string_lossy().into_owned());
    }
    Ok(StoredModel { manifest: manifest.clone(), assets })
}

fn copy_committed_model(pending: &Path, destination: &Path, names: &[String]) -> Result<(), String> {
    // 部分 Windows 文件系统不支持目录重命名，完成标记必须晚于所有素材与清单。
    fs::create_dir(destination).map_err(|e| e.to_string())?;
    let result = (|| -> Result<(), String> {
        fs::File::create_new(destination.join(IMPORT_PENDING)).map_err(|e| e.to_string())?;
        for name in names.iter().map(String::as_str).chain(std::iter::once("manifest.json")) {
            let bytes = fs::read(pending.join(name)).map_err(|e| e.to_string())?;
            let mut file = fs::File::create_new(destination.join(name)).map_err(|e| e.to_string())?;
            file.write_all(&bytes).and_then(|_| file.sync_all()).map_err(|e| e.to_string())?;
        }
        read_model(destination)?;
        fs::File::create_new(destination.join(IMPORT_COMPLETE)).map_err(|e| e.to_string())?;
        Ok(())
    })();
    if result.is_err() { let _ = fs::remove_dir_all(destination); }
    result
}

fn load_from(root: &Path) -> Result<Vec<StoredModel>, String> {
    let entries = match fs::read_dir(root) {
        Ok(entries) => entries,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(vec![]),
        Err(error) => return Err(error.to_string()),
    };
    let mut records = Vec::new();
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        if !entry.file_type().map_err(|e| e.to_string())?.is_dir() || !valid_id(&entry.file_name().to_string_lossy()) { continue; }
        let directory = entry.path();
        if directory.join(IMPORT_PENDING).try_exists().map_err(|e| e.to_string())?
            && !directory.join(IMPORT_COMPLETE).try_exists().map_err(|e| e.to_string())? { continue; }
        // 目录创建到事务标记之间发生退出时，会留下无清单的空目录。
        if !directory.join("manifest.json").try_exists().map_err(|e| e.to_string())? { continue; }
        records.push(read_model(&directory)?);
    }
    records.sort_by_key(|record| record.manifest["id"].as_str().unwrap_or("").to_string());
    Ok(records)
}

fn save_to(root: &Path, manifest: Value, images: Vec<ImportedImage>) -> Result<StoredModel, String> {
    let names = model_files(&manifest)?;
    if names.len() != images.len() || images.iter().map(|image| image.bytes.len()).sum::<usize>() > MAX_TOTAL_BYTES
        || names.iter().any(|name| images.iter().filter(|image| &image.name == name && valid_image(name, &image.bytes)).count() != 1)
    { return Err("用户机型素材不完整或无效。".into()); }
    let id = manifest["id"].as_str().unwrap();
    fs::create_dir_all(root).map_err(|e| format!("创建机型库 {} 失败：{e}", root.display()))?;
    let destination = root.join(id);
    if destination.exists() { return Err("机型已存在，不能覆盖。".into()); }
    let pending = root.join(format!(".pending-{id}"));
    fs::create_dir(&pending).map_err(|e| format!("创建临时机型目录 {} 失败：{e}", pending.display()))?;
    let result = (|| -> Result<(), String> {
        for image in images {
            let path = pending.join(image.name);
            let mut file = fs::OpenOptions::new().write(true).create_new(true).open(&path).map_err(|e| format!("创建素材 {} 失败：{e}", path.display()))?;
            file.write_all(&image.bytes).and_then(|_| file.sync_all()).map_err(|e| format!("写入素材 {} 失败：{e}", path.display()))?;
        }
        let bytes = serde_json::to_vec(&json!({ "version": 1, "manifest": manifest })).map_err(|e| e.to_string())?;
        let mut file = fs::OpenOptions::new().write(true).create_new(true).open(pending.join("manifest.json")).map_err(|e| e.to_string())?;
        file.write_all(&bytes).and_then(|_| file.sync_all()).map_err(|e| e.to_string())?;
        drop(file);
        match fs::rename(&pending, &destination) {
            Ok(()) => Ok(()),
            Err(error) if error.kind() == std::io::ErrorKind::CrossesDevices => {
                copy_committed_model(&pending, &destination, &names)?;
                let _ = fs::remove_dir_all(&pending);
                Ok(())
            }
            Err(error) => Err(format!("提交机型 {} → {} 失败：{error}", pending.display(), destination.display())),
        }
    })();
    if result.is_err() { let _ = fs::remove_dir_all(&pending); }
    result?;
    read_model(&destination)
}

#[tauri::command]
pub async fn load_user_models(app: tauri::AppHandle, window: tauri::WebviewWindow) -> Result<Vec<StoredModel>, String> {
    if window.label() != "main" { return Err("仅主窗口可读取机型库。".into()); }
    let root = app.path().app_local_data_dir().map_err(|e| e.to_string())?.join("user-models");
    load_from(&root)
}

#[tauri::command]
pub async fn save_user_model(app: tauri::AppHandle, window: tauri::WebviewWindow, manifest: Value, images: Vec<ImportedImage>) -> Result<StoredModel, String> {
    if window.label() != "main" { return Err("仅主窗口可导入机型。".into()); }
    let root = app.path().app_local_data_dir().map_err(|e| e.to_string())?.join("user-models");
    save_to(&root, manifest, images)
}
