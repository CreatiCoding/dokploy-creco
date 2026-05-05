FROM allinurl/goaccess:latest

# Install nginx
RUN apk add --no-cache nginx && \
    mkdir -p /var/www/goaccess /tmp/goaccess-db /run/nginx

# Nginx configuration
COPY nginx.conf /etc/nginx/http.d/default.conf

# Entry script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
