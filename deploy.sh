#!/usr/bin/env bash
# Déploie Le Village de Charlie (site statique) dans le dossier servi par Caddy.
# Usage: bash /root/apple-charlie/deploy.sh   (récupère la dernière version depuis GitHub puis publie)
set -e
SRC=/root/apple-charlie
DEST=/var/www/village
cd "$SRC"
git pull --quiet origin main || true
mkdir -p "$DEST"
# On ne publie que les fichiers du site (jamais .git, README ou test.txt)
rm -rf "$DEST"/index.html "$DEST"/admin.html "$DEST"/favicon.svg "$DEST"/favicon-32.png "$DEST"/apple-touch-icon.png "$DEST"/robots.txt "$DEST"/style.css "$DEST"/js "$DEST"/lib
cp -a "$SRC"/index.html "$SRC"/admin.html "$SRC"/favicon.svg "$SRC"/favicon-32.png "$SRC"/apple-touch-icon.png "$SRC"/robots.txt "$SRC"/style.css "$SRC"/js "$SRC"/lib "$DEST"/
# Numéro de version sur les scripts et le CSS : le navigateur recharge forcément la nouvelle version
VER=$(git rev-parse --short HEAD)
sed -i -E "s#(src=\"js/[a-z0-9]+\.js)\"#\1?v=$VER\"#g; s#(href=\"style\.css)\"#\1?v=$VER\"#" "$DEST"/index.html
# Version publiée : le jeu la compare toutes les minutes pour se mettre à jour tout seul
echo "$VER" > "$DEST"/version.txt
sed -i "s#<head>#<head>\n    <meta name=\"game-version\" content=\"$VER\">#" "$DEST"/index.html
chmod 755 /var/www "$DEST"
chmod -R a+rX "$DEST"
echo "OK -> publié dans $DEST"
ls "$DEST"
