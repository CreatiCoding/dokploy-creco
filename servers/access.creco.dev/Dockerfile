FROM allinurl/goaccess:latest AS goaccess

FROM nginx:alpine

# Install GoAccess from the official image
COPY --from=goaccess /usr/local/bin/goaccess /usr/local/bin/goaccess
COPY --from=goaccess /usr/local/share/GeoIP/ /usr/local/share/GeoIP/
COPY --from=goaccess /etc/goaccess/ /etc/goaccess/

# GoAccess configuration
COPY goaccess.conf /etc/goaccess/goaccess.conf

# Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Entry script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
