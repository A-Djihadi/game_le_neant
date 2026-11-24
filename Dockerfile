# Le Néant™ : site statique ODG. Aucun build : fichiers servis par nginx sans root.
# nginx-unprivileged 1.31 (nginx 1.31.7-r1, brotli-libs 1.2.1-r0) : les CVE nginx
# 1.30.6 et brotli 1.2.0 sont hors de portée, aucun bloc apk n'est nécessaire.
FROM nginxinc/nginx-unprivileged:1.31-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY public/ /usr/share/nginx/html/

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
