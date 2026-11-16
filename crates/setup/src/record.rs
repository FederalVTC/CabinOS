//! What CabinOS setup did, kept between runs (`setup.json`): the ETS2 install it configured and whether onboarding
//! was completed. Inherited ATS entries are ignored and removed from CabinOS's own setup record.

use std::io;
use std::path::{Path, PathBuf};

use crate::game::{Game, Kind};

/// The file, in CabinOS's config folder.
pub const FILE_NAME: &str = "setup.json";

#[derive(Clone, Debug, Default, PartialEq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Record {
    /// The games CabinOS is set up in (their plugin, their mod, their maps), once it is.
    pub games: Vec<SetUp>,
    /// The onboarding was gone through to its end: the companion opens on its own pages from then on.
    pub finished: bool,
    /// The record as CabinOS kept it before ATS (one game): read into `games`, never written.
    #[serde(skip_serializing)]
    game: Option<PathBuf>,
    #[serde(skip_serializing)]
    version: Option<String>,
}

/// A game CabinOS is set up in.
#[derive(Clone, Debug, PartialEq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetUp {
    /// The game's folder.
    pub dir: PathBuf,
    /// The version of CabinOS that put its plugin and mod into that game: another one's (an update since) are
    /// put in again.
    pub version: Option<String>,
}

impl Record {
    /// The record in `dir`: none yet (a first run), or one that can't be read, is a fresh one.
    pub fn load(dir: &Path) -> Self {
        let mut record: Self = std::fs::read_to_string(dir.join(FILE_NAME))
            .ok()
            .and_then(|text| serde_json::from_str(&text).ok())
            .unwrap_or_default();
        if let Some(dir) = record.game.take()
            && record.games.is_empty()
        {
            record.games.push(SetUp { dir, version: record.version.take() });
        }
        record.version = None;
        // A CabinOS setup record must never retain or act on an inherited ATS installation.
        record.games.retain(|set_up| {
            Game::recognise(&set_up.dir).is_some_and(|game| game.kind == Kind::Ets2)
                || !set_up.dir.join(Kind::Ats.executable()).is_file()
        });
        record
    }

    /// Keeps the record in `dir`, written beside the one there first, then moved over it.
    pub fn save(&self, dir: &Path) -> io::Result<()> {
        std::fs::create_dir_all(dir)?;
        let partial = dir.join(format!("{FILE_NAME}.partial"));
        std::fs::write(&partial, serde_json::to_string_pretty(self).map_err(io::Error::other)?)?;
        std::fs::rename(&partial, dir.join(FILE_NAME))
    }

    /// The games set up that are still there, as found now.
    pub fn games(&self) -> Vec<Game> {
        self.games.iter().filter_map(|set_up| Game::recognise(&set_up.dir)).collect()
    }

    /// The game `kind` set up, if it is and it's still there.
    pub fn game(&self, kind: Kind) -> Option<Game> {
        self.games().into_iter().find(|game| game.kind == kind)
    }

    /// The version of CabinOS that set `game` up (`None`: it isn't, or set up before versions were kept).
    pub fn version_of(&self, game: &Game) -> Option<&str> {
        self.games.iter().find(|set_up| set_up.dir == game.dir)?.version.as_deref()
    }

    /// `game` set up by CabinOS `version`: in place of the install of its game set up before (another of the
    /// same game's, or itself), the others kept.
    pub fn set_up(&mut self, game: &Game, version: &str) {
        if game.kind != Kind::Ets2 {
            return;
        }
        self.games.retain(|set_up| {
            set_up.dir != game.dir && Game::recognise(&set_up.dir).is_none_or(|other| other.kind != game.kind)
        });
        self.games.push(SetUp { dir: game.dir.clone(), version: Some(version.to_owned()) });
    }

    /// The games' folders, for the maps (`maps::SetUpGame`).
    pub fn dirs(&self) -> Vec<PathBuf> {
        self.games
            .iter()
            .filter(|set_up| Game::recognise(&set_up.dir).is_some_and(|game| game.kind == Kind::Ets2))
            .map(|set_up| set_up.dir.clone())
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keeps_what_setup_did() {
        let dir = std::env::temp_dir().join(format!("westplay-record-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        assert_eq!(Record::load(&dir), Record::default());

        let record = Record {
            games: vec![
                SetUp { dir: PathBuf::from(r"D:\SteamLibrary\steamapps\common\ETS2"), version: Some("1.0.0".into()) },
                SetUp { dir: PathBuf::from(r"D:\SteamLibrary\steamapps\common\ATS"), version: Some("2.2.0".into()) },
            ],
            finished: true,
            ..Record::default()
        };
        record.save(&dir).unwrap();
        assert_eq!(Record::load(&dir), record);

        // One it can't read starts again.
        std::fs::write(dir.join(FILE_NAME), "{ not json").unwrap();
        assert_eq!(Record::load(&dir), Record::default());
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn reads_a_record_from_before_ats_as_its_one_game() {
        let dir = std::env::temp_dir().join(format!("westplay-record-old-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        std::fs::write(dir.join(FILE_NAME), r#"{ "game": "D:\\Games\\ETS2", "version": "2.1.4", "finished": true }"#)
            .unwrap();
        let record = Record::load(&dir);
        assert_eq!(record.games, [SetUp { dir: PathBuf::from(r"D:\Games\ETS2"), version: Some("2.1.4".into()) }]);
        assert!(record.finished);
        // Written again in the new form only.
        record.save(&dir).unwrap();
        let text = std::fs::read_to_string(dir.join(FILE_NAME)).unwrap();
        assert!(text.contains("\"games\"") && !text.contains("\"game\""), "{text}");
        assert_eq!(Record::load(&dir), record);
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn only_ets2_can_be_kept_in_the_setup_record() {
        let root = std::env::temp_dir().join(format!("cabinos-record-games-{}", std::process::id()));
        let install_ets2 = |name: &str| {
            let dir = root.join(name);
            std::fs::create_dir_all(dir.join("bin").join("win_x64")).unwrap();
            std::fs::write(dir.join("base.scs"), b"").unwrap();
            std::fs::write(dir.join("bin").join("win_x64").join("eurotrucks2.exe"), b"").unwrap();
            Game::recognise(&dir).unwrap()
        };
        let ets2 = install_ets2("ets2");
        let ets2_elsewhere = install_ets2("ets2-b");
        let ats = root.join("ats");
        std::fs::create_dir_all(ats.join("bin").join("win_x64")).unwrap();
        std::fs::write(ats.join("base.scs"), b"").unwrap();
        std::fs::write(ats.join("bin").join("win_x64").join("amtrucks.exe"), b"").unwrap();
        assert!(Game::recognise(&ats).is_none(), "ATS must not be recognised by CabinOS");

        let mut record = Record::default();
        record.set_up(&ets2, "2.1.4");
        assert_eq!(record.games().iter().map(|game| game.kind).collect::<Vec<_>>(), [Kind::Ets2]);
        assert_eq!(record.games.len(), 1);
        assert_eq!(record.version_of(&ets2), Some("2.1.4"));
        // Set up again: its version now.
        record.set_up(&ets2, "2.2.0");
        assert_eq!(record.version_of(&ets2), Some("2.2.0"));
        assert_eq!(record.games.len(), 1);
        // Another install of ETS2 replaces the previous ETS2 install; ATS never enters the record.
        record.set_up(&ets2_elsewhere, "2.2.0");
        assert_eq!(record.game(Kind::Ets2).map(|game| game.dir), Some(ets2_elsewhere.dir.clone()));
        assert_eq!(record.game(Kind::Ats), None);
        assert_eq!(record.dirs(), [ets2_elsewhere.dir.clone()]);
        let _ = std::fs::remove_dir_all(&root);
    }
}
