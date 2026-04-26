from __future__ import annotations

import argparse
import json
import shutil
import socket
import subprocess
import sys
import threading
import time
import traceback
import urllib.error
import urllib.request
import webbrowser
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlencode, urlparse


HOST = "127.0.0.1"
PREFERRED_PORT = 8765
APP_NAME = "EPHRS Bracket"
EXPORT_WIDTH = 1840
EXPORT_HEIGHT = 1080


def resolve_bundle_root() -> Path:
    if getattr(sys, "frozen", False):
        return Path(getattr(sys, "_MEIPASS", Path(sys.executable).resolve().parent))

    return Path(__file__).resolve().parent


def resolve_app_root() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent

    return Path(__file__).resolve().parent


BUNDLE_ROOT = resolve_bundle_root()
APP_ROOT = resolve_app_root()
STATE_FILE = APP_ROOT / "tournament-state.json"
EXPORT_DIR = APP_ROOT / "exports"
RUNTIME_DIR = APP_ROOT / ".runtime"
AUTOMATION_STATUS_FILE = RUNTIME_DIR / "automation-status.json"
ERROR_LOG_FILE = APP_ROOT / "server-error.log"


def ensure_runtime_dirs() -> None:
    EXPORT_DIR.mkdir(exist_ok=True)
    RUNTIME_DIR.mkdir(exist_ok=True)


def append_error_log(message: str) -> None:
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    ERROR_LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    with ERROR_LOG_FILE.open("a", encoding="utf-8") as handle:
        handle.write(f"[{timestamp}] {message}\n")


def convert_png_to_jpeg(source_path: Path, output_path: Path) -> None:
    powershell_command = rf"""
Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Bitmap]::FromFile('{source_path}')
try {{
    $target = New-Object System.Drawing.Bitmap($src.Width, $src.Height)
    try {{
        $graphics = [System.Drawing.Graphics]::FromImage($target)
        try {{
            $graphics.Clear([System.Drawing.Color]::Black)
            $graphics.DrawImage($src, 0, 0, $src.Width, $src.Height)
        }} finally {{
            $graphics.Dispose()
        }}

        $jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object {{ $_.MimeType -eq 'image/jpeg' }}
        $encoder = [System.Drawing.Imaging.Encoder]::Quality
        $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
        $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter($encoder, [long]95)
        $target.Save('{output_path}', $jpegCodec, $encoderParams)
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
        cwd=APP_ROOT,
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
    )

    if completed.returncode != 0 or not output_path.exists():
        raise RuntimeError(
            f"JPEG conversion failed.\nSTDOUT:\n{completed.stdout}\nSTDERR:\n{completed.stderr}"
        )


def create_single_image_pdf(jpeg_path: Path, output_path: Path, image_width: int, image_height: int) -> None:
    jpeg_bytes = jpeg_path.read_bytes()
    page_width = round(image_width * 0.75)
    page_height = round(image_height * 0.75)
    content_stream = f"q\n{page_width} 0 0 {page_height} 0 0 cm\n/Im0 Do\nQ".encode("ascii")

    chunks: list[bytes] = []
    offsets = [0]
    offset = 0

    def push(data: bytes) -> None:
        nonlocal offset
        chunks.append(data)
        offset += len(data)

    push(b"%PDF-1.4\n")

    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Count 1 /Kids [3 0 R] >>",
        f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {page_width} {page_height}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>".encode("ascii"),
        None,
        b"<< /Length " + str(len(content_stream)).encode("ascii") + b" >>\nstream\n" + content_stream + b"\nendstream",
    ]

    for index, object_body in enumerate(objects, start=1):
        offsets.append(offset)
        push(f"{index} 0 obj\n".encode("ascii"))

        if index == 4:
            push(
                (
                    f"<< /Type /XObject /Subtype /Image /Width {image_width} /Height {image_height} "
                    f"/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length {len(jpeg_bytes)} >>\nstream\n"
                ).encode("ascii")
            )
            push(jpeg_bytes)
            push(b"\nendstream")
        else:
            assert object_body is not None
            push(object_body)

        push(b"\nendobj\n")

    start_xref = offset
    push(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
    push(b"0000000000 65535 f \n")

    for object_offset in offsets[1:]:
        push(f"{object_offset:010d} 00000 n \n".encode("ascii"))

    push(
        (
            f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\n"
            f"startxref\n{start_xref}\n%%EOF"
        ).encode("ascii")
    )

    output_path.write_bytes(b"".join(chunks))


def resolve_browser_executable() -> str | None:
    candidates = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    ]

    for candidate in candidates:
        if Path(candidate).exists():
            return candidate

    return None


def is_our_server_running(port: int) -> bool:
    try:
        with urllib.request.urlopen(f"http://{HOST}:{port}/api/ping", timeout=1.5) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (OSError, urllib.error.URLError, json.JSONDecodeError):
        return False

    return payload.get("app") == APP_NAME


def wait_for_file(path: Path, timeout_seconds: float = 20.0) -> bool:
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        if path.exists() and path.stat().st_size > 0:
            return True
        time.sleep(0.2)
    return False


def sanitize_export_filename(filename: str, fmt: str) -> str:
    cleaned = "".join(char if char.isalnum() or char in {"-", "_", "."} else "_" for char in filename.strip())
    cleaned = cleaned.strip("._")
    if not cleaned:
        cleaned = f"tournament-graphic.{fmt}"

    suffix = f".{fmt}"
    if not cleaned.lower().endswith(suffix):
        cleaned = f"{cleaned}{suffix}"

    return cleaned


def build_automation_url(port: int, fmt: str, filename: str) -> str:
    query = urlencode(
        {
            "automation_export": fmt,
            "automation_name": filename,
        }
    )
    return f"http://{HOST}:{port}/index.html?{query}"


def run_automation_export(fmt: str, port: int, filename: str | None = None) -> Path:
    normalized_format = fmt.lower()
    if normalized_format not in {"png", "pdf"}:
        raise ValueError(f"Unsupported export format: {fmt}")

    browser = resolve_browser_executable()
    if not browser:
        raise FileNotFoundError("Microsoft Edge or Google Chrome is required for automated export.")

    ensure_runtime_dirs()
    safe_name = sanitize_export_filename(filename or f"tournament-graphic.{normalized_format}", normalized_format)
    output_path = EXPORT_DIR / safe_name
    output_path.unlink(missing_ok=True)
    AUTOMATION_STATUS_FILE.unlink(missing_ok=True)

    profile_dir = RUNTIME_DIR / f"automation-profile-{int(time.time() * 1000)}"
    profile_dir.mkdir(parents=True, exist_ok=True)
    export_url = build_automation_url(port, normalized_format, safe_name)
    command = [
        browser,
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        "--run-all-compositor-stages-before-draw",
        "--virtual-time-budget=30000",
        "--disable-crash-reporter",
        "--disable-breakpad",
        "--no-first-run",
        "--no-default-browser-check",
        f"--user-data-dir={profile_dir}",
        "--window-size=1920,1200",
        export_url,
    ]

    try:
        completed = subprocess.run(
            command,
            cwd=APP_ROOT,
            capture_output=True,
            text=True,
            timeout=90,
            check=False,
        )
    finally:
        shutil.rmtree(profile_dir, ignore_errors=True)

    if completed.returncode != 0:
        raise RuntimeError(
            f"Automated export browser run failed.\nSTDOUT:\n{completed.stdout}\nSTDERR:\n{completed.stderr}"
        )

    if not wait_for_file(output_path, timeout_seconds=40.0):
        if AUTOMATION_STATUS_FILE.exists():
            try:
                status_payload = json.loads(AUTOMATION_STATUS_FILE.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                status_payload = {}

            if status_payload.get("status") == "error":
                raise RuntimeError(
                    f"Automated export failed in the page: {status_payload.get('message', 'Unknown error')}"
                )

        raise RuntimeError(
            "Automated export did not produce an output file within the expected time window."
        )

    return output_path


def launch_browser_window(url: str) -> tuple[subprocess.Popen[str] | None, callable]:
    browser = resolve_browser_executable()
    if not browser:
        webbrowser.open(url)
        return None, lambda: None

    ensure_runtime_dirs()
    profile_dir = RUNTIME_DIR / f"app-profile-{int(time.time() * 1000)}"
    profile_dir.mkdir(parents=True, exist_ok=True)

    command = [
        browser,
        f"--app={url}",
        "--new-window",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-session-crashed-bubble",
        f"--user-data-dir={profile_dir}",
    ]
    process = subprocess.Popen(command, cwd=APP_ROOT)

    def cleanup() -> None:
        shutil.rmtree(profile_dir, ignore_errors=True)

    return process, cleanup


class GeneratorHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(BUNDLE_ROOT), **kwargs)

    def log_message(self, format: str, *args) -> None:
        if sys.stderr is None:
            return

        super().log_message(format, *args)

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
        try:
            parsed = urlparse(self.path)
            if parsed.path == "/api/ping":
                self.handle_ping()
                return

            if parsed.path == "/api/state":
                self.handle_get_state()
                return

            if parsed.path in {"", "/"}:
                self.path = "/index.html"

            super().do_GET()
        except Exception:
            append_error_log(traceback.format_exc())
            self.send_error(HTTPStatus.INTERNAL_SERVER_ERROR, "Internal server error")

    def do_POST(self):
        try:
            parsed = urlparse(self.path)
            if parsed.path == "/api/state":
                self.handle_post_state()
                return

            if parsed.path == "/api/exports":
                self.handle_export_upload(parsed)
                return

            if parsed.path == "/api/pdf":
                self.handle_pdf_render(parsed)
                return

            if parsed.path == "/api/automation-status":
                self.handle_automation_status()
                return

            self.send_error(HTTPStatus.NOT_FOUND, "Unknown endpoint")
        except Exception:
            append_error_log(traceback.format_exc())
            self.send_error(HTTPStatus.INTERNAL_SERVER_ERROR, "Internal server error")

    def handle_ping(self):
        payload = json.dumps({"app": APP_NAME, "status": "ok"}).encode("utf-8")
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

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

    def handle_export_upload(self, parsed):
        query = parse_qs(parsed.query)
        fmt = (query.get("format", ["png"])[0] or "png").lower()
        if fmt not in {"png", "pdf"}:
            self.send_error(HTTPStatus.BAD_REQUEST, "Unsupported export format")
            return

        filename = sanitize_export_filename(query.get("filename", [""])[0], fmt)
        content_length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(content_length)
        if not body:
            self.send_error(HTTPStatus.BAD_REQUEST, "Export body is empty")
            return

        ensure_runtime_dirs()
        output_path = EXPORT_DIR / filename
        output_path.write_bytes(body)

        payload = json.dumps({"filename": filename, "path": str(output_path)}).encode("utf-8")
        self.send_response(HTTPStatus.CREATED)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def handle_pdf_render(self, parsed):
        query = parse_qs(parsed.query)
        filename = sanitize_export_filename(query.get("filename", ["tournament-graphic.pdf"])[0], "pdf")
        content_length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(content_length)
        if not body:
            self.send_error(HTTPStatus.BAD_REQUEST, "PNG body is empty")
            return

        ensure_runtime_dirs()
        stamp = str(int(time.time() * 1000))
        png_path = RUNTIME_DIR / f"pdf-source-{stamp}.png"
        jpeg_path = RUNTIME_DIR / f"pdf-source-{stamp}.jpg"
        pdf_path = RUNTIME_DIR / f"pdf-output-{stamp}.pdf"

        try:
            png_path.write_bytes(body)
            convert_png_to_jpeg(png_path, jpeg_path)
            create_single_image_pdf(jpeg_path, pdf_path, EXPORT_WIDTH, EXPORT_HEIGHT)
            payload = pdf_path.read_bytes()
        except Exception as exc:
            encoded = str(exc).encode("utf-8", errors="replace")
            self.send_response(HTTPStatus.INTERNAL_SERVER_ERROR)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Content-Length", str(len(encoded)))
            self.end_headers()
            self.wfile.write(encoded)
            return
        finally:
            png_path.unlink(missing_ok=True)
            jpeg_path.unlink(missing_ok=True)
            pdf_path.unlink(missing_ok=True)

        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "application/pdf")
        self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def handle_automation_status(self):
        content_length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(content_length)

        try:
            payload = json.loads(body.decode("utf-8"))
        except json.JSONDecodeError as exc:
            self.send_error(HTTPStatus.BAD_REQUEST, f"Invalid JSON: {exc}")
            return

        ensure_runtime_dirs()
        AUTOMATION_STATUS_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

        self.send_response(HTTPStatus.NO_CONTENT)
        self.end_headers()


def create_server(port: int) -> ThreadingHTTPServer:
    return ThreadingHTTPServer((HOST, port), GeneratorHandler)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=f"Run the {APP_NAME} local app server.")
    parser.add_argument("--no-open", action="store_true", help="Do not open the browser app window.")
    parser.add_argument("--port", type=int, default=PREFERRED_PORT, help="Preferred HTTP port.")
    args = parser.parse_args(argv)

    ensure_runtime_dirs()

    if not args.no_open and args.port == PREFERRED_PORT and is_our_server_running(PREFERRED_PORT):
        url = f"http://{HOST}:{PREFERRED_PORT}"
        launch_browser_window(url)
        print(f"{APP_NAME} is already running at {url}")
        return 0

    port = args.port
    if port == PREFERRED_PORT and not args.no_open and not is_our_server_running(PREFERRED_PORT):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
            if probe.connect_ex((HOST, PREFERRED_PORT)) == 0:
                port = 0

    server = create_server(port)
    url = f"http://{HOST}:{server.server_port}"
    browser_process: subprocess.Popen[str] | None = None
    cleanup_browser_profile = lambda: None

    if not args.no_open:
        browser_process, cleanup_browser_profile = launch_browser_window(url)
        if browser_process is not None:
            def shutdown_when_browser_closes() -> None:
                browser_process.wait()
                server.shutdown()

            threading.Thread(target=shutdown_when_browser_closes, daemon=True).start()

    print(f"{APP_NAME} running at {url}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
    except Exception:
        append_error_log(traceback.format_exc())
        raise
    finally:
        server.server_close()
        cleanup_browser_profile()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
