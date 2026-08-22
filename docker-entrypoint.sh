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

# ---------------------------------------------------------------------------
# Link-preview prerendering.
#
# PRERENDER_UPSTREAM is the API's address on the internal network (in EasyPanel,
# "<project>_<service>:3000"). Left unset, the map below sends every request to
# an empty value and the conditional in default.conf never fires — the site
# behaves exactly as it does without this feature.
#
# Search-engine crawlers are absent from the list on purpose: they execute
# JavaScript and should index the real page, not this stub.
# ---------------------------------------------------------------------------
PRERENDER_UPSTREAM="${PRERENDER_UPSTREAM:-}"
DNS_RESOLVER="${DNS_RESOLVER:-127.0.0.11}"

# ---------------------------------------------------------------------------
# Product images (/uploads).
#
# The API serves uploaded files at /uploads (src/main.ts, useStaticAssets),
# outside its own /api/v1 prefix. Same-origin deployments used to rely on a
# second Traefik path rule ("<domain> -> /uploads -> api service") to route
# these requests directly to the API, bypassing this container entirely — but
# in practice that rule's priority against this service's catch-all
# Host(...) rule has proven unreliable to get right in EasyPanel, silently
# falling back to this container's SPA, which serves index.html for the
# request with a 200 (a broken image, not an error anyone notices).
#
# So nginx now proxies /uploads/ itself instead, the same way it already
# proxies link-preview requests below — one fewer moving part outside this
# image's control. Defaults to PRERENDER_UPSTREAM since it's almost always
# the same address; set UPLOADS_UPSTREAM separately only if it needs to
# differ. Left unset, /uploads/ 502s loudly instead of quietly serving HTML
# as if it were a JPEG.
# ---------------------------------------------------------------------------
UPLOADS_UPSTREAM="${UPLOADS_UPSTREAM:-$PRERENDER_UPSTREAM}"

{
  # Resolved per request rather than at startup, so nginx boots even when the
  # API container isn't up yet.
  echo "resolver ${DNS_RESOLVER} ipv6=off valid=30s;"
  echo ''
  # Requests for files (anything with an extension) are never documents.
  echo 'map $uri $prerender_is_document {'
  echo '    default 1;'
  echo '    "~*\.[a-z0-9]+$" 0;'
  echo '}'
  echo ''
  echo 'map "$prerender_is_document:$http_user_agent" $prerender_upstream {'
  echo '    default "";'
  if [ -n "$PRERENDER_UPSTREAM" ]; then
    echo "    \"~*^1:.*(facebookexternalhit|WhatsApp|Twitterbot|TelegramBot|LinkedInBot|Slackbot|Discordbot|Pinterest|SkypeUriPreview|vkShare|redditbot|Iframely|embedly)\" \"${PRERENDER_UPSTREAM}\";"
  fi
  echo '}'
  echo ''
  echo 'map "" $uploads_upstream {'
  echo "    default \"${UPLOADS_UPSTREAM}\";"
  echo '}'
} > /etc/nginx/conf.d/00-prerender.conf

echo "[entrypoint] link-preview prerender: ${PRERENDER_UPSTREAM:-disabled}"
echo "[entrypoint] uploads proxy: ${UPLOADS_UPSTREAM:-disabled (will 502)}"
