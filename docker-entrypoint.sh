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
} > /etc/nginx/conf.d/00-prerender.conf

echo "[entrypoint] link-preview prerender: ${PRERENDER_UPSTREAM:-disabled}"
