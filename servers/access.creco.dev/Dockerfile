FROM allinurl/goaccess:latest

# Install nginx and apache2-utils for htpasswd
RUN apk add --no-cache nginx apache2-utils && \
    mkdir -p /var/www/goaccess /tmp/goaccess-db /run/nginx

# Auth file (password set via env at runtime)
COPY .htpasswd /etc/nginx/.htpasswd

# Nginx configuration
COPY nginx.conf /etc/nginx/http.d/default.conf

# Entry script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
