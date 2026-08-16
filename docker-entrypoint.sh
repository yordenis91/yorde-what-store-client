#!/bin/sh
# Rewrites the runtime config baked into the image with the container's own
# environment before nginx starts. Dropped into /docker-entrypoint.d/, which the
# official nginx image executes on boot.
set -eu

CONFIG_FILE=/usr/share/nginx/html/config.js
API_URL="${VITE_API_URL:-/api/v1}"

# Empty is meaningful: it turns off subdomain storefronts, leaving stores
# reachable only at /store/<slug>.
ROOT_DOMAIN="${VITE_STOREFRONT_ROOT_DOMAIN:-}"

cat > "$CONFIG_FILE" <<EOF
window.__APP_CONFIG__ = {
  apiUrl: '${API_URL}',
  storefrontRootDomain: '${ROOT_DOMAIN}',
}
EOF

echo "[entrypoint] runtime config written: apiUrl=${API_URL} storefrontRootDomain=${ROOT_DOMAIN:-<none>}"
