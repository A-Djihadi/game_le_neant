# Le Néant™ : site statique ODG. Aucun build : fichiers servis par nginx sans root.
# nginx 1.31.7 (mainline) : hors de portée des CVE nginx 1.30.6.
# brotli-libs 1.2.0-r1 (CVE-2026-111497, out-of-bounds write) -> 1.2.1-r0.
# L'image tourne par défaut en utilisateur non-root (101) : repasser root le temps d'apk.
FROM nginxinc/nginx-unprivileged:1.31-alpine

USER root
RUN apk add --no-cache --upgrade brotli-libs
USER 101

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY public/ /usr/share/nginx/html/

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
