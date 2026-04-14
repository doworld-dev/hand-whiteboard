# Hand Whiteboard

웹캠 손 제스처로 조작하는 물리 기반 인터랙티브 화이트보드.
MediaPipe Hands + Matter.js + 순수 Canvas 2D, 빌드 없이 실행.

### 🚀 [바로 체험하기 → doworld-dev.github.io/hand-whiteboard](https://doworld-dev.github.io/hand-whiteboard/)

카메라 허용만 하면 됩니다. 설치 · 가입 없음.

## 제스처

| 제스처 | 동작 |
|---|---|
| 🤌 핀치 | 요소 잡기 / 놓기 |
| 🤌 빠르게 놓기 | 던지기 (관성 유지) |
| 🤌🤌 양손 핀치 (요소 위) | 확대 / 축소 / 회전 |
| ✋✋ 양손 활짝 0.5초 | 중력 ON / OFF |

## 로컬 실행

```bash
python3 -m http.server 8000
```

브라우저에서 `http://localhost:8000` 열고 카메라 허용.

> MediaPipe는 `localhost` 또는 `https`에서만 카메라 접근이 허용됩니다. `file://`로 열면 안 됩니다.

## 요구 사항

- 웹캠 있는 데스크톱
- Chrome / Edge 최신 버전
- 좋은 조명 (손이 또렷이 보이는 정도)

## 기술 스택

- [MediaPipe Hands](https://google.github.io/mediapipe/solutions/hands) — 실시간 손 랜드마크 추적
- [Matter.js](https://brm.io/matter-js/) — 2D 물리 엔진
- Vanilla JS (ES modules), Canvas 2D

## 구조

```
js/
├── vision.js      # MediaPipe 손 인식
├── gestures.js    # 핀치/양손 제스처 분류
├── physics.js     # Matter.js 월드, grab, 벽
├── items.js       # 스티키/이미지/도형 팩토리
├── render.js      # Canvas 2D 렌더링, 파티클
├── ui.js          # 툴바, 치트시트, 테마
└── app.js         # 전체 오케스트레이션
```

## 제한 사항

- 모바일 미지원 (데스크톱 웹캠 전용)
- 저장/불러오기 없음 (새로고침 시 초기 상태)
- 텍스트 인라인 편집 불가
- 실시간 멀티유저 아님
