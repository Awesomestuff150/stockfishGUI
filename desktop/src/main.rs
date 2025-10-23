#[cfg(feature = "desktop")]
use anyhow::Result;
#[cfg(feature = "desktop")]
use stockfish_studio::{current_exe_dir, file_url_from_path, locate_entry_html};
#[cfg(feature = "desktop")]
use tao::dpi::LogicalSize;
#[cfg(feature = "desktop")]
use tao::event::{Event, WindowEvent};
#[cfg(feature = "desktop")]
use tao::event_loop::{ControlFlow, EventLoop};
#[cfg(feature = "desktop")]
use tao::window::WindowBuilder;
#[cfg(feature = "desktop")]
use wry::WebViewBuilder;

#[cfg(feature = "desktop")]
fn main() {
    if let Err(error) = run() {
        eprintln!("Stockfish Studio failed to start: {error:?}");
    }
}

#[cfg(not(feature = "desktop"))]
fn main() {
    eprintln!(
        "The desktop binary requires the `desktop` feature. Run with `cargo run --features desktop`."
    );
}

#[cfg(feature = "desktop")]
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
