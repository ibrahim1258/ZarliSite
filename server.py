import mimetypes
import os
import posixpath
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parent
PUBLIC_DIR = ROOT / "public"


def _env(name: str, default: str | None = None) -> str | None:
    value = os.getenv(name)
    if value is None or value.strip() == "":
        return default
    return value


def _safe_join_public(url_path: str) -> Path | None:
    path = urlparse(url_path).path
    path = unquote(path)
    if path in {"", "/"}:
        path = "/index.html"
    path = posixpath.normpath(path)
    if path.startswith("../") or "/../" in path or path.startswith("..\\") or "\\..\\" in path:
        return None
    if path.startswith("/"):
        path = path[1:]
    candidate = (PUBLIC_DIR / path).resolve()
    try:
        candidate.relative_to(PUBLIC_DIR.resolve())
    except ValueError:
        return None
    return candidate


class Handler(BaseHTTPRequestHandler):
    server_version = "ZarliShop/1.0"

    def do_GET(self) -> None:
        file_path = _safe_join_public(self.path)
        if file_path is None:
            self.send_error(HTTPStatus.BAD_REQUEST, "Bad path")
            return
        if not file_path.exists() or not file_path.is_file():
            self.send_error(HTTPStatus.NOT_FOUND, "Not found")
            return

        content_type, _ = mimetypes.guess_type(str(file_path))
        if not content_type:
            content_type = "application/octet-stream"

        data = file_path.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self) -> None:
        self.send_error(HTTPStatus.NOT_FOUND, "Not found")


def main() -> None:
    host = _env("HOST", "127.0.0.1") or "127.0.0.1"
    port = int(_env("PORT", "8000") or "8000")
    if not PUBLIC_DIR.exists():
        raise RuntimeError(f"Missing public dir: {PUBLIC_DIR}")

    httpd = ThreadingHTTPServer((host, port), Handler)
    print(f"Serving on http://{host}:{port}")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
