# 달빛여관 — 업데이트 패키지

기존 사이트(`xn--2j1b67omb.site`)를 받아 **3가지**를 보완했습니다. 이 폴더 전체를
기존 호스팅의 같은 위치에 올리면(덮어쓰기 + 새 파일 추가) 끝입니다.

## 무엇이 바뀌었나

### 1) AI 역극이 실제로 동작하도록 수정  (`dalbit-roleplay.html`)
원본은 `api.anthropic.com` 호출에 **인증·버전·브라우저 허용 헤더가 전부 빠져** 있어
호출 자체가 실패하는 상태였습니다. 다음을 고쳤습니다.
- `x-api-key`, `anthropic-version`, `anthropic-dangerous-direct-browser-access` 헤더 추가
- 모델 `claude-sonnet-4-20250514` → **`claude-sonnet-4-6`** (최신). 더 깊은 몰입을 원하면
  파일 상단 `const MODEL=` 을 `'claude-opus-4-8'` 로 바꾸면 됩니다.
- **BYOK 방식**: 이용자가 본인 Anthropic API 키를 입력 → **브라우저(localStorage)에만 저장**.
  키는 소스에 박혀 있지 않습니다. 잘못된 키(401)면 자동으로 지우고 재입력을 요청합니다.
  '🔑 API 키 변경·삭제' 링크로 언제든 교체 가능.

> ⚠️ 보안 주의: BYOK는 **각 이용자가 자기 키로 플레이**하는 개인용 방식입니다.
> 키가 그 사람 브라우저에 저장되므로, 불특정 다수에게 **내 키를 대신 쓰게 하려면**
> 절대 키를 소스/클라이언트에 넣지 말고 **서버리스 프록시**(Cloudflare Workers 등)를 두세요.
> 지금 구조는 "방문자 각자 키 입력"에 맞춰져 있습니다.

### 2) 진짜 PWA(오프라인·설치형)로 전환
원본은 '오프라인 가능'이라 적었지만 service worker도 manifest도 없고, 오히려
`Cache-Control: no-store`로 캐싱을 막아 두어 실제로는 오프라인이 안 됐습니다.
- `manifest.webmanifest` 추가 → 홈 화면에 **설치 가능**(standalone 앱처럼 실행)
- `sw.js`(서비스 워커) 추가 → 핵심 페이지·아이콘 **프리캐시**, 구글 폰트·이미지는
  첫 방문 후 캐시되어 **비행기모드에서도 글꼴·화면 유지**
- 모든 페이지에서 `no-store` 메타 제거, 각 페이지에 SW 등록 스크립트 주입
- AI 역극의 POST 호출은 서비스 워커가 **건드리지 않도록**(GET만 캐시) 처리

### 3) SEO · 공유 미리보기 · 아이콘
- 카톡/디스코드 링크 공유 시 뜨는 **OG 미리보기 카드**(`og-cover.png`, 1200×630) 추가
- `description`, Open Graph, 트위터 카드, `theme-color`, favicon, 애플 터치 아이콘 메타 주입
- 앱 아이콘 `icon-192.png` / `icon-512.png`(마스커블 포함), `favicon-32.png` 생성

## 새로 추가된 파일
```
manifest.webmanifest   sw.js
icon-192.png  icon-512.png  favicon-32.png  og-cover.png
```
## 수정된 파일
```
index.html  dalbit-offline.html  dalbit-novel.html
dalbit-roleplay.html  dalbit-chat-rp.html
```

## 배포 방법
1. 이 폴더의 **모든 파일**을 기존 호스팅 루트(현재 페이지들이 있는 위치)에 업로드.
2. HTTPS면 PWA가 바로 작동합니다(현재 사이트는 HTTPS라 OK). 모바일에서 브라우저 메뉴
   → '홈 화면에 추가'로 설치돼요.
3. **콘텐츠를 갱신할 때마다** 두 곳의 버전을 함께 올리세요.
   - 페이지 링크의 `?v=20250606` (기존 캐시버스트 방식 유지)
   - `sw.js` 첫 줄 `const CACHE = 'dalbit-v1'` → `'dalbit-v2'` …로 증가
   서비스 워커가 옛 캐시를 자동 정리하고 새 파일을 받아갑니다.

## 참고
- OG 이미지를 직접 만든 커버 대신 다른 그림으로 바꾸려면 `og-cover.png`(1200×630)만 교체.
- 아이콘 디자인을 바꾸려면 `icon-*.png`를 같은 크기로 교체.
