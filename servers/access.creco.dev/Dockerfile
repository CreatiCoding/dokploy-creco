FROM allinurl/goaccess:latest

# Install nginx and node
RUN apk add --no-cache nginx nodejs && \
    mkdir -p /var/www/goaccess /var/www/auth /var/www/dashboard /tmp/goaccess-db /run/nginx

# Nginx configuration
COPY nginx.conf /etc/nginx/http.d/default.conf

# Auth server and login page
COPY auth-server.js /app/auth-server.js
COPY login.html /var/www/auth/login.html

# Custom dashboard
COPY dashboard.html /var/www/dashboard/index.html

# Entry script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
