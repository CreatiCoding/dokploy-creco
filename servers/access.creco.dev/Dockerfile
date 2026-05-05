FROM allinurl/goaccess:latest

# Install nginx and node
RUN apk add --no-cache nginx nodejs && \
    mkdir -p /var/www/goaccess /var/www/auth /tmp/goaccess-db /run/nginx

# Nginx configuration
COPY nginx.conf /etc/nginx/http.d/default.conf

# Auth server and login page
COPY auth-server.js /app/auth-server.js
COPY login.html /var/www/auth/login.html

# Entry script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
