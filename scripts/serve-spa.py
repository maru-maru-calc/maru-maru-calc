from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1] / "dist"
BASE_PATH = "/maru-maru-calc"


class SpaHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def translate_path(self, path):
        if path == BASE_PATH or path.startswith(f"{BASE_PATH}/"):
            path = path[len(BASE_PATH):] or "/"
        return super().translate_path(path)

    def send_head(self):
        translated = Path(self.translate_path(self.path.split("?", 1)[0].split("#", 1)[0]))
        if not translated.exists():
            self.path = "/index.html"
        return super().send_head()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", 8081), SpaHandler)
    print("Serving SPA on http://localhost:8081/maru-maru-calc/")
    server.serve_forever()
