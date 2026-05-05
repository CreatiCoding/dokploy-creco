FROM nginx:alpine

# Install GoAccess from Alpine packages
RUN apk add --no-cache goaccess

# GoAccess configuration
COPY goaccess.conf /etc/goaccess/goaccess.conf

# Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Entry script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Create directories
RUN mkdir -p /var/www/goaccess /tmp/goaccess-db

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
