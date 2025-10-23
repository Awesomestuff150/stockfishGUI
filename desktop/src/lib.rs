use anyhow::{anyhow, Context, Result};
use std::path::{Path, PathBuf};

/// Returns the directory containing the current executable.
///
/// This helper mirrors [`std::env::current_exe`] but converts the
/// resulting path into the directory containing the binary.  The
/// conversion is fallible if the executable path has no parent (which
/// should not happen in normal operation).
pub fn current_exe_dir() -> Result<PathBuf> {
    let exe_path = std::env::current_exe().context("Unable to read executable path")?;
    directory_of(&exe_path)
}

/// Locates the application's `index.html` by searching in and above `start_dir`.
///
/// The search first checks the provided directory and then walks up the
/// filesystem hierarchy (up to six levels) until a matching file is found.
/// The relatively small search depth prevents infinite loops when the
/// executable lives inside deeply nested temporary directories while still
/// supporting the layout used by the packaged application.
pub fn locate_entry_html(start_dir: &Path) -> Result<PathBuf> {
    if let Some(found) = find_index_near(start_dir) {
        return Ok(found);
    }

    let mut cursor = start_dir.to_path_buf();
    for _ in 0..6 {
        if let Some(parent) = cursor.parent() {
            if let Some(found) = find_index_near(parent) {
                return Ok(found);
            }
            cursor = parent.to_path_buf();
        } else {
            break;
        }
    }

    Err(anyhow!(
        "Unable to locate index.html next to the executable. Ensure the assets shipped with the app are kept together."
    ))
}

/// Converts a filesystem path to a `file://` URL.
pub fn file_url_from_path(path: &Path) -> Result<url::Url> {
    url::Url::from_file_path(path)
        .map_err(|_| anyhow!("Failed to convert {:?} to a file:// URL", path))
}

fn directory_of(path: &Path) -> Result<PathBuf> {
    path
        .parent()
        .filter(|parent| !parent.as_os_str().is_empty())
        .map(Path::to_path_buf)
        .ok_or_else(|| anyhow!("Executable must reside within a directory"))
}

fn find_index_near(dir: &Path) -> Option<PathBuf> {
    let candidate = dir.join("index.html");
    if candidate.exists() {
        Some(candidate)
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn locate_entry_html_prefers_start_dir() {
        let temp = tempfile::tempdir().unwrap();
        let index = temp.path().join("index.html");
        fs::write(&index, "<html></html>").unwrap();

        let found = locate_entry_html(temp.path()).unwrap();
        assert_eq!(found, index);
    }

    #[test]
    fn locate_entry_html_walks_up_hierarchy() {
        let temp = tempfile::tempdir().unwrap();
        let nested = temp.path().join("a/b/c");
        fs::create_dir_all(&nested).unwrap();
        let index = temp.path().join("index.html");
        fs::write(&index, "test").unwrap();

        let found = locate_entry_html(&nested).unwrap();
        assert_eq!(found, index);
    }

    #[test]
    fn locate_entry_html_reports_error_when_missing() {
        let temp = tempfile::tempdir().unwrap();
        let error = locate_entry_html(temp.path()).unwrap_err();
        assert!(error
            .to_string()
            .contains("Unable to locate index.html"));
    }

    #[test]
    fn file_url_from_path_generates_file_scheme() {
        let temp = tempfile::tempdir().unwrap();
        let file = temp.path().join("index.html");
        fs::write(&file, "").unwrap();

        let url = file_url_from_path(&file).unwrap();
        assert_eq!(url.scheme(), "file");
        assert!(url.as_str().ends_with("index.html"));
    }

    #[test]
    fn file_url_from_path_rejects_relative_paths() {
        let error = file_url_from_path(Path::new("relative/index.html")).unwrap_err();
        assert!(error
            .to_string()
            .contains("Failed to convert \"relative/index.html\""));
    }

    #[test]
    fn directory_of_requires_parent() {
        let error = directory_of(Path::new("index.html")).unwrap_err();
        assert!(error
            .to_string()
            .contains("Executable must reside within a directory"));
    }
}
