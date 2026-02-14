FROM minio/minio:latest

# Environment variables will be set by Dokploy
ENV MINIO_ROOT_USER=${MINIO_ROOT_USER:-minioadmin}
ENV MINIO_ROOT_PASSWORD=${MINIO_ROOT_PASSWORD:-minioadmin123}
ENV MINIO_BROWSER=${MINIO_BROWSER:-on}

# Create data directory with proper permissions
RUN mkdir -p /data && chmod 755 /data

# Expose MinIO API and Console ports
EXPOSE 9000 9001

# Start MinIO server
CMD ["server", "/data", "--console-address", ":9001"]