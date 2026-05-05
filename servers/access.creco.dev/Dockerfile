FROM allinurl/goaccess:latest AS goaccess-bin

FROM nginx:alpine

# Copy GoAccess binary and its dependencies from official image
COPY --from=goaccess-bin /goaccess /goaccess
COPY --from=goaccess-bin /usr/local/share/GeoIP /usr/local/share/GeoIP

# Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Entry script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Create necessary directories
RUN mkdir -p /var/www/goaccess /tmp/goaccess-db

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
