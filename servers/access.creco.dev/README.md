# GoAccess - access.creco.dev

Dokploy 호스트의 모든 HTTP 접근 로그를 실시간으로 시각화하는 GoAccess 대시보드.

## 기능

- 실시간 트래픽 모니터링 (WebSocket)
- 방문자, 요청, 상태코드, OS, 브라우저 분석
- 404 에러 추적
- 지리적 위치 정보
- Virtual Host별 분류

## 배포 전 설정 (Dokploy 호스트)

### 1. Traefik Access Log 활성화

Dokploy의 Traefik 설정에서 access log를 활성화해야 합니다.

Traefik static config (`/etc/dokploy/traefik/traefik.yml`):

```yaml
accessLog:
  filePath: "/var/log/traefik/access.log"
  bufferingSize: 100
```

### 2. 로그 볼륨 생성

```bash
docker volume create dokploy-traefik-logs
```

Traefik 컨테이너에 해당 볼륨을 마운트:
```yaml
volumes:
  - dokploy-traefik-logs:/var/log/traefik
```

### 3. DNS 설정

`access.creco.dev` → Dokploy 호스트 IP로 A 레코드 추가.

## 환경 변수

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `WS_URL` | `access.creco.dev` | WebSocket URL (도메인) |
| `ACCESS_LOG_PATH` | `/var/log/traefik/access.log` | 로그 파일 경로 |
| `TRAEFIK_LOG_VOLUME` | `dokploy-traefik-logs` | Traefik 로그 볼륨 이름 |
| `GOACCESS_EXTRA_ARGS` | (없음) | GoAccess 추가 옵션 |

## Dokploy 배포

1. Dokploy에서 새 Compose 서비스 생성
2. Source: Git → 이 저장소, path: `servers/access.creco.dev`
3. 환경 변수 설정
4. 도메인: `access.creco.dev` (HTTPS)
5. 배포
