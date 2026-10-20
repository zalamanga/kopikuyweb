FROM nginx:stable-alpine@sha256:970364228b1e4f932abc22d321932816782cca8a20b85a77552a7cfe9acfb3b5

COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY index.html produk.html cart.html data.json /srv/www/
COPY css/ /srv/www/css/
COPY fonts/ /srv/www/fonts/
COPY images/ /srv/www/images/
COPY js/ /srv/www/js/
COPY vendor/ /srv/www/vendor/

USER nginx
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:8080/ && wget -q -O /dev/null http://127.0.0.1:8080/data.json || exit 1

ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]
