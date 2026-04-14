# Hand Whiteboard — Design Spec

- **Date:** 2026-04-14
- **Status:** Draft, pending user review
- **Scope:** 1-week standalone web prototype (portfolio demo)

## 1. Overview

웹캠 기반 손 제스처로 조작하는 인터랙티브 화이트보드. 사용자는 스티키노트·이미지 카드·도형을 핀치로 집어들고, 던지고, 양손으로 확대·회전하며, 중력을 토글해 요소들이 쌓이거나 떠오르게 한다.

포트폴리오 데모 목적. 빌드 도구 없이 정적 파일로 실행, GitHub Pages 배포.

## 2. Goals / Non-Goals

### Goals

- 좋은 조명에서 핀치 제스처 인식률 90%+
- 요소 10개 동시 표시 시 60fps 유지
- 처음 보는 사용자가 치트시트 보고 30초 이내 "던지기" 성공
- GitHub Pages에 배포 가능한 정적 사이트

### Non-Goals

- 저장/불러오기 (localStorage 포함 X)
- 텍스트 인라인 편집 (노트는 프리셋 문구)
- 음성 입력
- 그룹화/정렬 자동화
- 모바일/터치 지원 (데스크톱 + 웹캠 전용)
- 실시간 멀티유저
- 자동화 테스트 (수동 QA 체크리스트만)

## 3. Architecture

### Layers

매 프레임 루프:
```
camera frame → hand landmarks → gesture state → physics step → canvas render
```

1. **Vision Layer** — MediaPipe Hands가 21개 랜드마크 추출 (손당)
2. **Physics Layer** — Matter.js 2D 엔진이 모든 요소를 바디로 관리
3. **Render Layer** — Canvas 2D, 물리 월드 + 손 커서 오버레이

### 원칙

- Matter.js 바디가 **단일 진실 원천**. 별도 상태 동기화 없음.
- `vision.js`는 손 상태만 내보내며 물리/렌더를 모름.
- 모듈 간 통신은 명시적 이벤트/콜백.

## 4. Module Structure

```
hand-whiteboard/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── vision.js      # MediaPipe 초기화, 랜드마크 추출
│   ├── gestures.js    # 핀치/양손 제스처 분류, hysteresis 필터
│   ├── physics.js     # Matter.js 엔진, 바디 팩토리, grab constraint
│   ├── items.js       # 스티키/이미지/도형 타입 + 프리셋
│   ├── render.js      # Canvas draw 루프, 파티클, 오버레이
│   ├── ui.js          # 버튼 바, 치트시트, 테마 토글
│   └── app.js         # 전체 오케스트레이션, requestAnimationFrame 루프
├── assets/
│   └── sample-*.{png,jpg}  # 샘플 이미지 3-4장
└── README.md
```

각 JS 모듈은 ES modules (`<script type="module">`), 빌드 없음.

## 5. Interaction Model

### 단일 손

| 제스처 | 동작 |
|---|---|
| 🤌 핀치 시작 (요소 위) | 잡기 — Matter.js point constraint 부착 |
| 🤌 핀치 유지 | 드래그 — constraint anchor를 핀치 좌표로 이동 |
| ✋ 핀치 해제 | 놓기 — 바디 관성 유지 (던지기) |
| 👉 검지 포인팅 | 호버 하이라이트 |

### 양손

| 제스처 | 동작 |
|---|---|
| 🤌🤌 허공 양손 핀치 | 뷰포트 pan/zoom (두 손 중점·거리 변화) |
| 🤌🤌 같은 요소 양손 핀치 | 해당 요소 scale + rotate |
| ✋✋ 양손 활짝 (0.5s 유지) | 중력 토글 |

### UI (화면 하단 바)

- `+ 노트` `+ 이미지` `+ 도형` `테마` `전체 삭제` `도움말(?)`

### 상태 피드백

- 손 인식 상태: 좌상단 인디케이터 (초록/빨강)
- 선택 요소: 옅은 glow 외곽선
- 핀치 시작: 요소가 살짝 튀어오름 + 그림자 진해짐
- 놓기: 짧은 motion trail
- 충돌: 스파크 파티클 (원본 파티클 엔진 재사용)

## 6. Data Flow

### Per-frame 루프

1. MediaPipe가 카메라 프레임에서 랜드마크 추출 → `{left: [21], right: [21]}`
2. `gestures.js`가 분류 → `{leftHand: {pinch, pos, pointing}, rightHand: {...}}`
3. `app.js`가 제스처 전이 감지:
   - `pinch: false → true` + 요소 근접 → `physics.attachGrab(hand, body)`
   - `pinch: true → false` → `physics.releaseGrab(hand)` (관성 유지)
   - 양손 핀치 동시 → `physics.applyTwoHand(delta)`
4. `physics.step(deltaTime)` — Matter.js 틱
5. `render.draw()` — 모든 바디 + 손 커서 + 파티클

### 좌표계

- MediaPipe: normalized [0,1], 카메라 기준
- Canvas: pixel, 좌상단 원점
- 셀피 뷰라 x 축 mirror: `canvasX = (1 - normalizedX) * canvasWidth`

## 7. Physics Tuning

- `gravity.y = 1.0` (기본 on)
- 요소 `frictionAir: 0.01`, `friction: 0.3`, `restitution: 0.1`
- 뷰포트 4면에 정적 벽 (두께 50px, 화면 밖)
- Grab constraint: `stiffness: 0.9`, `damping: 0.1` — 달라붙되 약간 탄력

## 8. Gesture Classification

### 핀치 감지

- 엄지 끝(4)과 검지 끝(8) 거리 계산
- 손바닥 폭(관절 5→17 거리)으로 정규화
- `ratio < 0.3` → pinch ON, `ratio > 0.45` → pinch OFF (hysteresis)
- 3프레임 이동 평균으로 노이즈 제거

### 포인팅

- 검지만 펴짐 (다른 손가락은 접힘)
- 각 손가락의 끝-MCP 벡터 방향으로 판정

### 양손 조건

- 양쪽 손 모두 프레임에 존재 + 각각 신뢰도 > 0.7

## 9. Error Handling

| 상황 | 동작 |
|---|---|
| 카메라 거부 | 친절한 에러 화면 + "다시 시도" 버튼 |
| MediaPipe CDN 실패 | 대체 CDN(jsdelivr) 시도, 이후 에러 메시지 |
| 5초간 손 미검출 | 손 커서 페이드아웃, 모든 grab 해제 |
| WebGL/Canvas 미지원 | "Chrome/Edge 최신 버전 필요" 안내 |

## 10. Content (Preset)

로딩 직후 보드에 미리 배치:

- 스티키노트 6개 (노랑/분홍/하늘/연두 랜덤, "Idea", "TODO", "Maybe", "Ship it" 등 문구)
- 이미지 카드 3개 (assets/ 샘플 3장)
- 도형 3개 (원, 사각형, 삼각형)

사용자 추가 시 빈 공간 또는 화면 중앙 위쪽에서 드롭.

## 11. Schedule (7 days)

| Day | 작업 |
|---|---|
| 1 | 프로젝트 뼈대, MediaPipe 연결, 랜드마크 렌더 |
| 2 | 제스처 분류기 (핀치·양손), 상태 머신 |
| 3 | Matter.js 연결, grab constraint, 3가지 바디 타입 |
| 4 | 양손 zoom/rotate, 중력 토글, 벽/충돌 튜닝 |
| 5 | UI 버튼, 프리셋 보드, 치트시트 |
| 6 | 파티클 피드백, 모션 폴리싱, 라이트/다크 테마 |
| 7 | QA, README 작성, GitHub Pages 배포, 데모 영상 촬영 |

## 12. Manual QA Checklist

- [ ] 좋은 조명에서 한 손 핀치 → 10회 중 9회 성공
- [ ] 빠르게 놓으면 물체가 던져짐 (관성 유지)
- [ ] 양손 핀치 → 요소 크기 변경 + 회전
- [ ] 양손 활짝 → 중력 on/off 전환
- [ ] 요소 10개 동시 표시 60fps
- [ ] 카메라 거부 시 친절한 에러
- [ ] GitHub Pages 배포판에서 카메라 작동 (HTTPS)

## 13. Risks & Mitigations

| 리스크 | 완화 |
|---|---|
| 핀치 인식 불안정 | 이동 평균 + hysteresis 임계값, 조명 가이드 툴팁 |
| Matter.js ↔ Canvas 좌표 어긋남 | physics가 단일 원천, render는 body.position만 읽음 |
| 양손 감지 실패 | 한 손 fallback 유지, 두 손 기능은 옵션 취급 |
| 성능 저하 (요소 많을 때) | sleeping 활성화, 화면 밖 요소 제거 |

## 14. Tech Stack

- **MediaPipe Hands** (CDN, `@mediapipe/hands`)
- **Matter.js** (CDN, `matter-js`)
- **Vanilla JS** (ES modules), **Canvas 2D**
- **No build step**. `python -m http.server`로 개발, GitHub Pages 배포.
