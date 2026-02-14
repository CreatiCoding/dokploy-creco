FROM minio/minio:latest

# Environment variables will be set by Dokploy
# Default values for local development only
ENV MINIO_ROOT_USER=${MINIO_ROOT_USER:-minioadmin}
ENV MINIO_ROOT_PASSWORD=${MINIO_ROOT_PASSWORD:-minioadmin123}
ENV MINIO_BROWSER=${MINIO_BROWSER:-on}

# Create data directory
RUN mkdir -p /data

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=20s --start-period=3s --retries=3 \
  CMD curl -f http://localhost:9000/minio/health/live || exit 1

# Expose MinIO API and Console ports
EXPOSE 9000 9001

# Start MinIO server with proper configuration
CMD ["server", "/data", "--console-address", ":9001", "--address", ":9000"]