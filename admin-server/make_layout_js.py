#!/usr/bin/env python3
"""Transforme le dernier placement validé dans la page admin en fichier du jeu (js/decor-layout.js).

Usage (par Claude, quand on lui dit « c'est validé ») :
    python3 admin-server/make_layout_js.py /var/lib/village-admin/layout.json js/decor-layout.js
Une liste vide (« Revenir au décor au hasard ») remet Game.DECOR_LAYOUT = null.
"""
import json
import sys

src, dst = sys.argv[1], sys.argv[2]
with open(src, encoding="utf-8") as fh:
    record = json.load(fh)
layout = record.get("layout") or {}
items = layout.get("items") or []
places = layout.get("places") or {}
head = ("// ── decor-layout.js ── Placement du décor choisi dans la page admin (null = décor tiré au hasard) ──\n"
        "// Généré par admin-server/make_layout_js.py à partir de la validation du %s.\n" % record.get("saved", "?"))
data = {"version": 2, "items": items, "places": places}
body = "Game.DECOR_LAYOUT = %s;\n" % (json.dumps(data, ensure_ascii=False, separators=(",", ":")) if (items or places) else "null")
with open(dst, "w", encoding="utf-8") as fh:
    fh.write(head + body)
print("%s : %d objets, %d grands éléments déplacés" % (dst, len(items), len(places)))
