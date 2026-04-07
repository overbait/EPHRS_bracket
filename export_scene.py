from __future__ import annotations

import sys
import threading
from pathlib import Path

from generator_server import EXPORT_DIR, GeneratorHandler, HOST, ROOT, STATE_FILE, ThreadingHTTPServer, run_browser_export


def main() -> int:
    formats = [arg.lower() for arg in sys.argv[1:]] or ["png", "pdf"]
    invalid = [fmt for fmt in formats if fmt not in {"png", "pdf"}]
    if invalid:
        print(f"Unsupported formats: {', '.join(invalid)}")
        print("Usage: python export_scene.py [png] [pdf]")
        return 1

    if not STATE_FILE.exists():
        print("State snapshot not found.")
        print("Open the generator through http://127.0.0.1:8765 and let it save the scene first.")
        return 1

    EXPORT_DIR.mkdir(exist_ok=True)
    server = ThreadingHTTPServer((HOST, 0), GeneratorHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    try:
        print(f"Temporary export server: http://{HOST}:{server.server_port}")
        exported = []
        for fmt in formats:
            output_path = run_browser_export(fmt, server.server_port)
            exported.append(output_path)
            print(f"Exported {fmt.upper()}: {output_path.relative_to(ROOT)}")
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)

    print("Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
