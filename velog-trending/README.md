# velog-trending

velog 트렌딩 게시물을 JSON API로 제공하는 서비스.

## API

### `GET /:timeframe`

velog 트렌딩 게시물 목록을 반환합니다.

**timeframe**: `day` | `week` | `month`

```bash
curl https://api.dokploy.creco.dev/velog-trending/week
```

### 응답

```json
{
  "timeframe": "week",
  "count": 20,
  "items": [
    {
      "title": "게시물 제목",
      "description": "짧은 설명...",
      "thumbnail": "https://velog.velcdn.com/images/...",
      "url": "https://velog.io/@username/slug",
      "author": {
        "username": "username",
        "displayName": "표시 이름",
        "thumbnail": "https://..."
      },
      "likes": 42,
      "commentsCount": 5,
      "releasedAt": "2026-02-10T..."
    }
  ]
}
```

### 에러

| 상태 코드 | 설명 |
| --- | --- |
| 400 | 유효하지 않은 timeframe |
| 502 | velog API 요청 실패 |

## 로컬 실행

```bash
yarn install
node server.js
# http://localhost:3000/week
```

## 기술 스택

- **Hono** - 웹 프레임워크
- **Node.js 22** - 내장 fetch 사용
- velog Next.js RSC 페이로드에서 데이터 파싱
