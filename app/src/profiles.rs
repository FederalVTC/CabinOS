//! CabinOS per-truck profiles. Kept in the app's local-data directory, never in the game folder.

use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use tauri::State;

const SCHEMA_VERSION: u32 = 1;
static NEXT_ID: AtomicU64 = AtomicU64::new(1);

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VehicleIdentity {
    pub model_id: String,
    pub brand_id: String,
    pub brand: String,
    pub model: String,
    pub fingerprint: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct ProfileAppearance {
    pub theme: String,
    pub wallpaper: Option<String>,
    pub accent_color: String,
}

impl Default for ProfileAppearance {
    fn default() -> Self {
        Self {
            theme: "electric".into(),
            wallpaper: None,
            accent_color: "#35D9FF".into(),
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TruckProfile {
    pub schema_version: u32,
    pub id: String,
    pub name: String,
    pub vehicle: Option<VehicleIdentity>,
    pub appearance: ProfileAppearance,
    pub applications: Vec<serde_json::Value>,
    pub shortcuts: Vec<serde_json::Value>,
    pub layout: serde_json::Value,
    pub created_at: u64,
    pub updated_at: u64,
}

impl TruckProfile {
    fn new(id: String, name: String, vehicle: Option<VehicleIdentity>, now: u64) -> Self {
        Self {
            schema_version: SCHEMA_VERSION,
            id,
            name,
            vehicle,
            appearance: ProfileAppearance::default(),
            applications: Vec::new(),
            shortcuts: Vec::new(),
            layout: serde_json::json!({}),
            created_at: now,
            updated_at: now,
        }
    }
}

/// The profile store's directory and a lock serialising changes and reads.
pub struct Profiles {
    dir: PathBuf,
    lock: Mutex<()>,
}

impl Profiles {
    pub fn load(dir: &Path) -> std::io::Result<Self> {
        std::fs::create_dir_all(dir)?;
        let store = Self { dir: dir.to_path_buf(), lock: Mutex::new(()) };
        let default_path = store.path("default");
        if !default_path.exists() {
            store.write(&TruckProfile::new(
                "default".into(),
                "Predeterminado".into(),
                None,
                now(),
            ))?;
        }
        Ok(store)
    }

    fn path(&self, id: &str) -> PathBuf {
        self.dir.join(format!("{id}.json"))
    }

    fn read_all(&self) -> Result<Vec<TruckProfile>, String> {
        let mut profiles = Vec::new();
        let entries = std::fs::read_dir(&self.dir).map_err(|e| e.to_string())?;
        for entry in entries {
            let entry = entry.map_err(|e| e.to_string())?;
            let path = entry.path();
            if path.extension().and_then(|ext| ext.to_str()) != Some("json") {
                continue;
            }
            let text = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
            let profile: TruckProfile = serde_json::from_str(&text)
                .map_err(|e| format!("Perfil inválido {}: {e}", path.display()))?;
            if valid_id(&profile.id) && path == self.path(&profile.id) {
                profiles.push(profile);
            }
        }
        profiles.sort_by(|a, b| {
            (a.id != "default", a.name.to_lowercase()).cmp(&(b.id != "default", b.name.to_lowercase()))
        });
        Ok(profiles)
    }

    fn write(&self, profile: &TruckProfile) -> std::io::Result<()> {
        let path = self.path(&profile.id);
        let partial = self.dir.join(format!("{}.json.partial", profile.id));
        let json = serde_json::to_string_pretty(profile).map_err(std::io::Error::other)?;
        std::fs::write(&partial, json)?;
        std::fs::rename(partial, path)
    }
}

fn now() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs()
}

fn new_id() -> String {
    let ticks = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    let counter = NEXT_ID.fetch_add(1, Ordering::Relaxed);
    format!("p-{:032x}-{:x}-{:x}", ticks, std::process::id(), counter)
}

fn valid_id(id: &str) -> bool {
    !id.is_empty() && id.len() <= 96 && id.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_')
}

fn validate_name(name: String) -> Result<String, String> {
    let name = name.trim().to_owned();
    if name.is_empty() || name.chars().count() > 48 || name.chars().any(char::is_control) {
        return Err("El nombre del perfil debe tener entre 1 y 48 caracteres.".into());
    }
    Ok(name)
}

fn validate_vehicle(vehicle: &VehicleIdentity) -> Result<(), String> {
    let fields = [&vehicle.model_id, &vehicle.brand_id, &vehicle.brand, &vehicle.model];
    if vehicle.model_id.trim().is_empty() || fields.iter().any(|field| field.len() > 128) {
        return Err("La identidad del camión no es válida.".into());
    }
    if let Some(fingerprint) = &vehicle.fingerprint
        && (fingerprint.len() > 64 || !fingerprint.bytes().all(|b| b.is_ascii_hexdigit()))
    {
        return Err("La huella del camión no es válida.".into());
    }
    Ok(())
}

#[tauri::command]
pub fn profiles_list(store: State<'_, Profiles>) -> Result<Vec<TruckProfile>, String> {
    let _guard = store.lock.lock().unwrap_or_else(|e| e.into_inner());
    store.read_all()
}

#[tauri::command]
pub fn profiles_create(
    name: String,
    vehicle: Option<VehicleIdentity>,
    store: State<'_, Profiles>,
) -> Result<TruckProfile, String> {
    let name = validate_name(name)?;
    if let Some(vehicle) = &vehicle {
        validate_vehicle(vehicle)?;
    }
    let _guard = store.lock.lock().unwrap_or_else(|e| e.into_inner());
    let profile = TruckProfile::new(new_id(), name, vehicle, now());
    store.write(&profile).map_err(|e| e.to_string())?;
    Ok(profile)
}

#[tauri::command]
pub fn profiles_update(
    mut profile: TruckProfile,
    store: State<'_, Profiles>,
) -> Result<TruckProfile, String> {
    if !valid_id(&profile.id) || profile.id == "default" {
        return Err("No se puede modificar este perfil.".into());
    }
    profile.name = validate_name(profile.name)?;
    if let Some(vehicle) = &profile.vehicle {
        validate_vehicle(vehicle)?;
    }
    if profile.applications.len() > 100 || profile.shortcuts.len() > 100 {
        return Err("El perfil supera el límite de aplicaciones o accesos directos.".into());
    }
    if !profile.layout.is_object() {
        return Err("La distribución del perfil no es válida.".into());
    }
    let _guard = store.lock.lock().unwrap_or_else(|e| e.into_inner());
    let path = store.path(&profile.id);
    if !path.is_file() {
        return Err("El perfil ya no existe.".into());
    }
    let existing: TruckProfile = serde_json::from_str(
        &std::fs::read_to_string(&path).map_err(|e| e.to_string())?,
    ).map_err(|e| e.to_string())?;
    profile.schema_version = SCHEMA_VERSION;
    profile.created_at = existing.created_at;
    profile.updated_at = now();
    store.write(&profile).map_err(|e| e.to_string())?;
    Ok(profile)
}

#[tauri::command]
pub fn profiles_delete(id: String, store: State<'_, Profiles>) -> Result<(), String> {
    if !valid_id(&id) || id == "default" {
        return Err("No se puede eliminar el perfil predeterminado.".into());
    }
    let _guard = store.lock.lock().unwrap_or_else(|e| e.into_inner());
    let path = store.path(&id);
    if !path.is_file() {
        return Err("El perfil ya no existe.".into());
    }
    std::fs::remove_file(path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn profiles_assign(
    id: String,
    vehicle: VehicleIdentity,
    store: State<'_, Profiles>,
) -> Result<TruckProfile, String> {
    if !valid_id(&id) || id == "default" {
        return Err("Selecciona un perfil de camión válido.".into());
    }
    validate_vehicle(&vehicle)?;
    let _guard = store.lock.lock().unwrap_or_else(|e| e.into_inner());
    let path = store.path(&id);
    let text = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let mut profile: TruckProfile = serde_json::from_str(&text).map_err(|e| e.to_string())?;
    profile.vehicle = Some(vehicle);
    profile.updated_at = now();
    store.write(&profile).map_err(|e| e.to_string())?;
    Ok(profile)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn profile_store_creates_default_and_keeps_profiles_separate() {
        let dir = std::env::temp_dir().join(format!("cabinos-profiles-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        let store = Profiles::load(&dir).unwrap();
        let default = store.read_all().unwrap();
        assert_eq!(default.len(), 1);
        assert_eq!(default[0].id, "default");
        let profile = TruckProfile::new(new_id(), "Mi Scania".into(), None, now());
        store.write(&profile).unwrap();
        let all = store.read_all().unwrap();
        assert_eq!(all.len(), 2);
        assert_eq!(all.iter().find(|p| p.id == profile.id).unwrap().name, "Mi Scania");
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn profile_ids_cannot_escape_the_profiles_folder() {
        assert!(valid_id("p-123-456"));
        assert!(!valid_id("../settings"));
        assert!(!valid_id("a/b"));
    }

    #[test]
    fn vehicle_fingerprint_validation_is_strict() {
        let valid = VehicleIdentity {
            model_id: "vehicle.scania.s_2016".into(),
            brand_id: "scania".into(),
            brand: "Scania".into(),
            model: "S".into(),
            fingerprint: Some("0123456789abcdef".into()),
        };
        assert!(validate_vehicle(&valid).is_ok());
        let invalid = VehicleIdentity { fingerprint: Some("../secret".into()), ..valid };
        assert!(validate_vehicle(&invalid).is_err());
    }
}
