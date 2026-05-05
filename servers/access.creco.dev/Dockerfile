FROM allinurl/goaccess:latest

# GoAccess configuration
COPY goaccess.conf /etc/goaccess/goaccess.conf

# Entry script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 7890

ENTRYPOINT ["/entrypoint.sh"]
