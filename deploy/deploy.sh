#!/usr/bin/env bash
# Build all experiments and deploy to vr.pinecone.website on the pinecone droplet.
#
# Usage:  ./deploy/deploy.sh
#
# Needs: the droplet ssh key loaded (ssh-add ~/.ssh/id_ed25519) and the droplet
# sudo password (you'll be prompted on first run, for nginx setup).
set -euo pipefail

HOST="eric@68.183.63.41"
DOMAIN="vr.pinecone.website"
WEBROOT="/var/www/${DOMAIN}"
REPO="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Building (yarn build)…"
( cd "$REPO" && yarn build )

echo "==> Ensuring webroot ${WEBROOT} exists (sudo on droplet)…"
ssh -t "$HOST" "sudo mkdir -p '${WEBROOT}' && sudo chown eric:eric '${WEBROOT}'"

echo "==> Installing + enabling nginx vhost (idempotent)…"
scp "${REPO}/deploy/${DOMAIN}.nginx.conf" "${HOST}:/tmp/${DOMAIN}.conf"
# Single -t command string (no heredoc on stdin, so sudo's prompt renders cleanly).
ssh -t "$HOST" "sudo install -m644 /tmp/${DOMAIN}.conf /etc/nginx/sites-available/${DOMAIN} \
  && sudo ln -sf /etc/nginx/sites-available/${DOMAIN} /etc/nginx/sites-enabled/${DOMAIN} \
  && rm -f /tmp/${DOMAIN}.conf \
  && sudo nginx -t && sudo systemctl reload nginx \
  && echo '   vhost enabled + nginx reloaded'"

echo "==> Syncing build to ${WEBROOT}…"
rsync -az --delete "${REPO}/dist/" "${HOST}:${WEBROOT}/"

echo "==> Done. https://${DOMAIN}/"
