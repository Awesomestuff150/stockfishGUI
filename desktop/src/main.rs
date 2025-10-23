use anyhow::{anyhow, Context, Result};
use std::path::{Path, PathBuf};
use tao::dpi::LogicalSize;
use tao::event::{Event, WindowEvent};
use tao::event_loop::{ControlFlow, EventLoop};
use tao::window::WindowBuilder;
use wry::WebViewBuilder;

fn main() {
    if let Err(error) = run() {
        eprintln!("Stockfish Studio failed to start: {error:?}");
    }
}

fn run() -> Result<()> {
    let event_loop = EventLoop::new();
    let window = WindowBuilder::new()
        .with_title("Stockfish Studio")
        .with_inner_size(LogicalSize::new(1400.0, 900.0))
        .build(&event_loop)?;

    let exe_dir = current_exe_dir()?;
    let index_path = locate_entry_html(&exe_dir)?;
    let index_url = file_url_from_path(&index_path)?;

    WebViewBuilder::new()
        .with_url(index_url.as_str())
        .with_devtools(true)
        .build(&window)?;

    event_loop.run(move |event, _, control_flow| {
        *control_flow = ControlFlow::Wait;
        if let Event::WindowEvent {
            event: WindowEvent::CloseRequested,
            ..
        } = event
        {
            *control_flow = ControlFlow::Exit;
        }
    });
}

fn current_exe_dir() -> Result<PathBuf> {
    let exe_path = std::env::current_exe().context("Unable to read executable path")?;
    let dir = exe_path
        .parent()
        .map(Path::to_path_buf)
        .ok_or_else(|| anyhow!("Executable must reside within a directory"))?;
    Ok(dir)
}

fn locate_entry_html(start_dir: &Path) -> Result<PathBuf> {
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
        }
    }

    Err(anyhow!(
        "Unable to locate index.html next to the executable. Ensure the assets shipped with the app are kept together."
    ))
}

fn find_index_near(dir: &Path) -> Option<PathBuf> {
    let candidate = dir.join("index.html");
    if candidate.exists() {
        Some(candidate)
    } else {
        None
    }
}

fn file_url_from_path(path: &Path) -> Result<url::Url> {
    url::Url::from_file_path(path)
        .map_err(|_| anyhow!("Failed to convert {:?} to a file:// URL", path))
}
