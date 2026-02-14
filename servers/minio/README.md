# MinIO S3 Mock Server 🗄️

로컬 개발용 S3 호환 객체 스토리지 서버입니다.

## 📋 기본 정보

- **API 포트**: 9000 (S3 API)
- **콘솔 포트**: 9001 (웹 관리 콘솔)
- **기본 계정**: `minioadmin` / `minioadmin123`

## 🚀 로컬 실행

```bash
# Docker Compose로 실행
docker-compose up -d

# 또는 Docker로 직접 실행
docker build -t minio-s3-mock .
docker run -p 9000:9000 -p 9001:9001 -v minio-data:/data minio-s3-mock
```

## 🌐 접속 URL

- **S3 API Endpoint**: `http://localhost:9000`
- **웹 콘솔**: `http://localhost:9001`

## 📡 S3 SDK 사용 예시

```javascript
// AWS SDK v3 사용 예시
import { S3Client } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  endpoint: "http://localhost:9000",
  region: "us-east-1",
  credentials: {
    accessKeyId: "minioadmin",
    secretAccessKey: "minioadmin123",
  },
  forcePathStyle: true,
});
```

## 🏷️ 환경변수

- `MINIO_ROOT_USER`: 관리자 사용자명 (기본값: minioadmin)
- `MINIO_ROOT_PASSWORD`: 관리자 비밀번호 (기본값: minioadmin123)
- `MINIO_BROWSER`: 웹 콘솔 활성화 (기본값: on)