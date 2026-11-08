#!/usr/bin/env python3
"""Petit service de la page admin du Village de Charlie.

Il tourne sur le VPS (127.0.0.1:8790), derrière Caddy (village.oltheo.com/admin-api/*).
- POST /admin-api/check   : vérifie le mot de passe (en-tête X-Admin-Password)
- GET  /admin-api/layout  : renvoie le dernier placement validé
- POST /admin-api/layout  : enregistre un placement validé ({"layout": {...}})

Le mot de passe n'est jamais écrit en clair : seulement un hachage PBKDF2 dans
/etc/village-admin.env (VILLAGE_ADMIN_SALT, VILLAGE_ADMIN_HASH), hors du dépôt public.
Les placements validés vont dans STATE_DIRECTORY (systemd : /var/lib/village-admin) ;
Claude les met ensuite en ligne (js/decor-layout.js) quand on lui dit « c'est validé ».
"""
import hashlib
import hmac
import json
import os
import re
import time
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

SALT = bytes.fromhex(os.environ.get("VILLAGE_ADMIN_SALT", ""))
HASH = bytes.fromhex(os.environ.get("VILLAGE_ADMIN_HASH", ""))
STATE = os.environ.get("STATE_DIRECTORY", "/var/lib/village-admin")
PORT = int(os.environ.get("VILLAGE_ADMIN_PORT", "8790"))
MAX_BODY = 2_000_000
MAX_ITEMS = 4000
WORLD = 6000
CLASS_RE = re.compile(r"^[a-z0-9 _-]{0,80}$", re.I)
SIZE_RE = re.compile(r"^[0-9]{1,3}(\.[0-9]{1,8})?(rem|px)$")

_fails = {}  # ip -> [horodatages des essais ratés]


def password_ok(pw: str) -> bool:
    if not SALT or not HASH or not pw:
        return False
    got = hashlib.pbkdf2_hmac("sha256", pw.encode("utf-8"), SALT, 200_000)
    return hmac.compare_digest(got, HASH)


def clean_layout(data):
    """Vérifie et nettoie la liste d'objets. Renvoie None si quelque chose ne va pas."""
    if not isinstance(data, dict) or not isinstance(data.get("items"), list) or len(data["items"]) > MAX_ITEMS:
        return None
    items = []
    for it in data["items"]:
        if not isinstance(it, dict):
            return None
        c, x, y = it.get("c", ""), it.get("x"), it.get("y")
        if not isinstance(c, str) or not CLASS_RE.match(c):
            return None
        if not isinstance(x, (int, float)) or not isinstance(y, (int, float)) or not (0 <= x <= WORLD and 0 <= y <= WORLD):
            return None
        out = {"c": c, "x": int(x), "y": int(y)}
        h = it.get("h")
        if h is not None:
            if not isinstance(h, str) or len(h) > 16 or "<" in h or ">" in h:
                return None
            out["h"] = h
        f = it.get("f")
        if f is not None:
            if not isinstance(f, str) or not SIZE_RE.match(f):
                return None
            out["f"] = f
        z = it.get("z")
        if z is not None:
            if not re.fullmatch(r"[0-9]{1,3}", str(z)):
                return None
            out["z"] = str(z)
        items.append(out)
    return {"version": 1, "items": items}


class Handler(BaseHTTPRequestHandler):
    server_version = "village-admin"

    def _ip(self):
        return (self.headers.get("X-Forwarded-For") or self.client_address[0]).split(",")[0].strip()

    def _send(self, code, obj=None):
        if code == 204:  # « rien à renvoyer » : pas de contenu du tout
            self.send_response(204)
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            return
        body = json.dumps(obj if obj is not None else {}, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _auth(self):
        ip, now = self._ip(), time.time()
        recent = [t for t in _fails.get(ip, []) if now - t < 60]
        _fails[ip] = recent
        if len(recent) >= 5:
            self._send(429, {"error": "trop d'essais"})
            return False
        if password_ok(self.headers.get("X-Admin-Password", "")):
            return True
        recent.append(now)
        time.sleep(0.5)
        self._send(401, {"error": "mot de passe"})
        return False

    def do_GET(self):
        if self.path.split("?")[0] != "/admin-api/layout":
            return self._send(404)
        if not self._auth():
            return
        path = os.path.join(STATE, "layout.json")
        if not os.path.exists(path):
            return self._send(204)
        with open(path, encoding="utf-8") as fh:
            return self._send(200, json.load(fh))

    def do_POST(self):
        route = self.path.split("?")[0]
        if route not in ("/admin-api/check", "/admin-api/layout"):
            return self._send(404)
        if not self._auth():
            return
        if route == "/admin-api/check":
            return self._send(200, {"ok": True})
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > MAX_BODY:
            return self._send(413, {"error": "taille"})
        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            return self._send(400, {"error": "json"})
        layout = clean_layout(payload.get("layout") if isinstance(payload, dict) else None)
        if layout is None:
            return self._send(400, {"error": "placement invalide"})
        saved = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        record = {"saved": saved, "layout": layout}
        os.makedirs(os.path.join(STATE, "history"), exist_ok=True)
        with open(os.path.join(STATE, "history", saved.replace(":", "-") + ".json"), "w", encoding="utf-8") as fh:
            json.dump(record, fh, ensure_ascii=False)
        tmp = os.path.join(STATE, "layout.json.tmp")
        with open(tmp, "w", encoding="utf-8") as fh:
            json.dump(record, fh, ensure_ascii=False)
        os.replace(tmp, os.path.join(STATE, "layout.json"))
        return self._send(200, {"ok": True, "saved": saved, "count": len(layout["items"])})

    def log_message(self, fmt, *args):  # journal court (journalctl -u village-admin)
        print("%s %s" % (self._ip(), fmt % args), flush=True)


if __name__ == "__main__":
    if not SALT or not HASH:
        raise SystemExit("VILLAGE_ADMIN_SALT / VILLAGE_ADMIN_HASH manquants (voir /etc/village-admin.env)")
    os.makedirs(STATE, exist_ok=True)
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
