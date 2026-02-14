FROM minio/minio:latest

# Set environment variables with default values
ENV MINIO_ROOT_USER=minioadmin
ENV MINIO_ROOT_PASSWORD=minioadmin123
ENV MINIO_BROWSER=on

# Create data directory
RUN mkdir -p /data

# Expose MinIO API and Console ports
EXPOSE 9000 9001

# Start MinIO server
CMD ["server", "/data", "--console-address", ":9001"]