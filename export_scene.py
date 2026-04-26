from __future__ import annotations

import sys
import threading

from generator_server import HOST, STATE_FILE, create_server, run_automation_export


def main() -> int:
    formats = [arg.lower() for arg in sys.argv[1:]] or ["png", "pdf"]
    invalid = [fmt for fmt in formats if fmt not in {"png", "pdf"}]
    if invalid:
        print(f"Unsupported formats: {', '.join(invalid)}")
        print("Usage: python export_scene.py [png] [pdf]")
        return 1

    if not STATE_FILE.exists():
        print("State snapshot not found.")
        print(f"Start the app once at http://{HOST}:8765 and save the scene first.")
        return 1

    server = create_server(0)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    try:
        print(f"Temporary automation export server: http://{HOST}:{server.server_port}")
        for fmt in formats:
            output_path = run_automation_export(fmt, server.server_port)
            print(f"Exported {fmt.upper()}: {output_path}")
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)

    print("Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
