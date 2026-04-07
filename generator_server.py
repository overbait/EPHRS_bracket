from __future__ import annotations

import json
import mimetypes
import shutil
import subprocess
import tempfile
import time
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse


ROOT = Path(__file__).resolve().parent
STATE_FILE = ROOT / "tournament-state.json"
EXPORT_DIR = ROOT / "exports"
HOST = "127.0.0.1"
PORT = 8765
EXPORT_WIDTH = 1840
EXPORT_HEIGHT = 1080


def resolve_browser_executable() -> str:
    candidates = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    ]

    for candidate in candidates:
        if Path(candidate).exists():
            return candidate

    raise FileNotFoundError(
        "Could not find Edge or Chrome. Install one of them or update generator_server.py."
    )


def build_export_url(port: int) -> str:
    return f"http://{HOST}:{port}/index.html?export=1&_ts={int(time.time() * 1000)}"


def crop_png_to_canvas(source_path: Path, output_path: Path) -> None:
    powershell_command = rf"""
Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Bitmap]::FromFile('{source_path}')
try {{
    $rect = New-Object System.Drawing.Rectangle 0, 0, {EXPORT_WIDTH}, {EXPORT_HEIGHT}
    $target = $src.Clone($rect, $src.PixelFormat)
    try {{
        $target.Save('{output_path}', [System.Drawing.Imaging.ImageFormat]::Png)
    }} finally {{
        $target.Dispose()
    }}
}} finally {{
    $src.Dispose()
}}
"""
    completed = subprocess.run(
        [
            "powershell",
            "-NoProfile",
            "-Command",
            powershell_command,
        ],
        cwd=ROOT,
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
    )

    if completed.returncode != 0 or not output_path.exists():
        raise RuntimeError(
            f"PNG crop failed.\nSTDOUT:\n{completed.stdout}\nSTDERR:\n{completed.stderr}"
        )


def run_browser_export(fmt: str, port: int) -> Path:
    browser = resolve_browser_executable()
    EXPORT_DIR.mkdir(exist_ok=True)
    output_path = EXPORT_DIR / f"tournament-graphic.{fmt}"
    export_url = build_export_url(port)
    profile_dir = Path(tempfile.mkdtemp(prefix="ephrs-export-profile-"))

    command = [
        browser,
        "--headless=new",
        "--disable-gpu",
        "--force-device-scale-factor=1",
        "--hide-scrollbars",
        "--run-all-compositor-stages-before-draw",
        "--virtual-time-budget=6000",
        "--disable-crash-reporter",
        "--disable-breakpad",
        "--no-first-run",
        "--no-default-browser-check",
        f"--user-data-dir={profile_dir}",
    ]

    if fmt == "png":
        raw_output_path = EXPORT_DIR / "tournament-graphic-raw.png"
        command.extend(
            [
                "--window-size=1924,1232",
                f"--screenshot={raw_output_path}",
                export_url,
            ]
        )
    elif fmt == "pdf":
        command.extend(
            [
                f"--print-to-pdf={output_path}",
                "--no-pdf-header-footer",
                export_url,
            ]
        )
    else:
        raise ValueError(f"Unsupported export format: {fmt}")

    try:
        completed = subprocess.run(
            command,
            cwd=ROOT,
            capture_output=True,
            text=True,
            timeout=45,
            check=False,
        )
        if fmt == "png":
            if completed.returncode != 0 or not raw_output_path.exists():
                raise RuntimeError(
                    f"Browser export failed.\nSTDOUT:\n{completed.stdout}\nSTDERR:\n{completed.stderr}"
                )

            crop_png_to_canvas(raw_output_path, output_path)
            raw_output_path.unlink(missing_ok=True)
        elif completed.returncode != 0 or not output_path.exists():
            raise RuntimeError(
                f"Browser export failed.\nSTDOUT:\n{completed.stdout}\nSTDERR:\n{completed.stderr}"
            )
        return output_path
    finally:
        shutil.rmtree(profile_dir, ignore_errors=True)


class GeneratorHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(HTTPStatus.NO_CONTENT)
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/state":
            self.handle_get_state()
            return

        if parsed.path in {"", "/"}:
            self.path = "/index.html"

        super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/state":
            self.handle_post_state()
            return
        if parsed.path == "/api/export":
            self.handle_export(parsed)
            return

        self.send_error(HTTPStatus.NOT_FOUND, "Unknown endpoint")

    def handle_get_state(self):
        if STATE_FILE.exists():
            payload = STATE_FILE.read_text(encoding="utf-8")
        else:
            payload = "{}"

        encoded = payload.encode("utf-8")
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def handle_post_state(self):
        content_length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(content_length)

        try:
            parsed = json.loads(body.decode("utf-8"))
        except json.JSONDecodeError as exc:
            self.send_error(HTTPStatus.BAD_REQUEST, f"Invalid JSON: {exc}")
            return

        STATE_FILE.write_text(json.dumps(parsed, ensure_ascii=False, indent=2), encoding="utf-8")

        self.send_response(HTTPStatus.NO_CONTENT)
        self.end_headers()

    def handle_export(self, parsed):
        query = parse_qs(parsed.query)
        fmt = (query.get("format", ["png"])[0] or "png").lower()

        try:
            output_path = run_browser_export(fmt, self.server.server_port)
            content = output_path.read_bytes()
        except Exception as exc:
            encoded = str(exc).encode("utf-8", errors="replace")
            self.send_response(HTTPStatus.INTERNAL_SERVER_ERROR)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Content-Length", str(len(encoded)))
            self.end_headers()
            self.wfile.write(encoded)
            return

        content_type = mimetypes.guess_type(output_path.name)[0] or "application/octet-stream"
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(content)))
        self.send_header("X-Export-Filename", output_path.name)
        self.end_headers()
        self.wfile.write(content)


def main():
    EXPORT_DIR.mkdir(exist_ok=True)
    server = ThreadingHTTPServer((HOST, PORT), GeneratorHandler)
    print(f"Generator server running at http://{HOST}:{PORT}")
    print("Keep this window open. The file-based generator can now save state and export through this local service.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
