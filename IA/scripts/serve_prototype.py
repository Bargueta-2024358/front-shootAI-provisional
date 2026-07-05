#!/usr/bin/env python3
"""Sirve el prototipo web estático + proxy TTS ElevenLabs en desarrollo."""

from __future__ import annotations

import http.server
import json
import os
import socketserver
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "web"
PORT = 8081
MAX_TEXT_LEN = 300
DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"
DEFAULT_MODEL_ID = "eleven_multilingual_v2"


def load_dotenv() -> None:
    env_path = Path(__file__).resolve().parents[1] / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip())


def elevenlabs_tts(text: str) -> bytes:
    api_key = os.environ.get("ELEVENLABS_API_KEY", "")
    if not api_key:
        raise RuntimeError("ELEVENLABS_API_KEY no configurada")

    voice_id = os.environ.get("ELEVENLABS_VOICE_ID", DEFAULT_VOICE_ID)
    model_id = os.environ.get("ELEVENLABS_MODEL_ID", DEFAULT_MODEL_ID)
    payload = json.dumps(
        {
            "text": text[:MAX_TEXT_LEN],
            "model_id": model_id,
            "voice_settings": {"stability": 0.45, "similarity_boost": 0.75},
        }
    ).encode("utf-8")

    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
        data=payload,
        headers={
            "xi-api-key": api_key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read()


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_OPTIONS(self) -> None:
        if self.path == "/api/tts":
            self.send_response(204)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
            self.end_headers()
            return
        super().do_OPTIONS()

    def do_POST(self) -> None:
        if self.path != "/api/tts":
            self.send_error(404)
            return

        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length) if length else b"{}"
        try:
            data = json.loads(body.decode("utf-8"))
            text = str(data.get("text", "")).strip()
        except json.JSONDecodeError:
            self.send_json(400, {"error": "JSON inválido"})
            return

        if not text:
            self.send_json(400, {"error": "Texto vacío"})
            return

        try:
            audio = elevenlabs_tts(text)
        except RuntimeError as err:
            self.send_json(401, {"error": str(err)})
        except urllib.error.HTTPError as err:
            self.send_json(502, {"error": f"ElevenLabs HTTP {err.code}"})
        except Exception:
            self.send_json(502, {"error": "Error de conexión con ElevenLabs"})
        else:
            self.send_response(200)
            self.send_header("Content-Type", "audio/mpeg")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(audio)

    def send_json(self, code: int, payload: dict) -> None:
        data = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


def main() -> None:
    load_dotenv()
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Pose Coach → http://localhost:{PORT}")
        if os.environ.get("ELEVENLABS_API_KEY"):
            print("TTS ElevenLabs: /api/tts activo")
        else:
            print("TTS: configura ELEVENLABS_API_KEY en .env para voz local")
        httpd.serve_forever()


if __name__ == "__main__":
    main()
