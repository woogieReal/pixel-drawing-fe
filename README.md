# 🎨 Pixel Drawing App [Frontend]

빠르고 혁신적인 실시간 픽셀 아트 드로잉 협업 웹 앱입니다. 수많은 유저가 동시에 접속해 함께 픽셀을 그리고 캔버스의 크기를 자유롭게 조절할 수 있습니다. `React`, `Vite`, `Socket.IO` 기반으로 개발되었으며, 사용자 친화적이고 직관적인 깔끔한 화이트 테마를 지원합니다.

---

## ✨ 주요 기능 (Features)

### 1. 캔버스 갤러리 (Canvas List) 👉 `GET /canvas`

- **목록 조회 및 페이지네이션**: 로드 모어(Load More) 버튼을 통해 끊김 없이 생성된 캔버스 목록을 그리드 뷰로 탐색할 수 있습니다.
- **간편한 캔버스 생성**: 우측 하단의 멋진 플로팅 원형 버튼(FAB)을 클릭해 16x16 기본 사이즈의 픽셀 캔버스를 즉시 생성하고 이동합니다.

### 2. 실시간 콜라보레이션 룸 (Detail Room) 👉 `WebSocket` + `GET /canvas/:id`

- **실시간 드로잉 마스터**: 캔버스에 마우스를 드래그하며 즉각적으로 픽셀을 채택된 색깔로 렌더링하고, 5-byte 커스텀 바이너리 패킷을 이용해 서버에 아주 가볍고 빠르게 `draw` 이벤트를 송신합니다.
- **브로드캐스트 동기화**: `pixelUpdated` 이벤트를 통해 다른 유저가 그리는 내용이 캔버스에 눈에 보이는 딜레이 없이 실시간으로 즉시 나타납니다.
- **확대 / 축소 뷰포트**: 캔버스의 디테일한 픽셀 조작을 위해 `Zoom In`, `Zoom Out` 기능을 지원하며 일정한 크기 이상 확대 시 연한 회색의 픽셀 가이드라인(Grid) 레이어가 오버레이로 보입니다.
- **색깔 팔레트**: 6가지의 툴킷(Black, White, Red, Green, Blue, Yellow)이 캔버스 하단에 미려한 디자인으로 제공되어 팔레트 간 손쉬운 전환이 가능합니다.

### 3. 캔버스 확장 (Canvas Resizing) 👉 `PATCH /canvas/:id/resize`

- **실시간 맵 확장**: 그림을 그리다가 공간이 부족해지면 캔버스 모서리(상, 하, 좌, 우) 4방향에 부착된 `+` 버튼 중 하나를 클릭하여 캔버스 크기를 1픽셀 단위로 늘릴 수 있습니다.
- **무중단 소켓 리사이징**: 서버로부터 `canvasResized` 웹소켓 이벤트를 수신하여, 브라우저 새로고침이나 중단 없이 원활하게 새로운 픽셀 사이즈와 화면(Base64 Payload)을 리렌더リング합니다.

---

## 🚀 테크 스택 (Tech Stack)

- **UI Framework/Library**: React (`v19`), Vite (`v8`)
- **Routing**: React Router DOM (`v7`+)
- **WebSocket Protocol**: Socket.IO Client
- **Aesthetics & UI**: Vanilla CSS (`index.css`), Lucide React (아이콘)
- **Language**: TypeScript

---

## 💻 로컬 구동 방법 (How to run locally)

본 프로젝트는 상위 `pixel-drawing-app` 루트 디렉토리에서 `docker-compose`를 통하여 백엔드 프로젝트와 함께 통합 실행하는 것을 권장합니다.
상세한 통합 실행 방법은 [루트 디렉토리의 README.md](../README.md)를 참고해 주세요.
