# Hand Whiteboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 웹캠 손 제스처로 스티키노트·이미지·도형을 잡고 던지고 양손으로 확대·회전하는 물리 기반 인터랙티브 화이트보드 웹 프로토타입 구축.

**Architecture:** 빌드 없는 정적 HTML/JS. MediaPipe Hands가 21개 랜드마크 추출 → gestures 모듈이 핀치/양손 분류 → Matter.js 2D 물리 월드가 단일 진실 원천 → Canvas 2D가 모든 렌더 (물리 바디 + 손 커서 + 파티클). ES modules, CDN 의존성.

**Tech Stack:** MediaPipe Hands (@mediapipe/hands CDN), Matter.js (CDN), Vanilla JS ES modules, Canvas 2D.

**Testing Strategy:** Spec 요구사항에 따라 자동화 테스트 없음. 각 태스크는 브라우저 DevTools Console 또는 시각적 확인으로 수동 검증.

---

## File Structure

```
hand-whiteboard/
├── index.html            # 진입점, CDN 로드, canvas + video + UI
├── css/style.css         # 레이아웃, 테마 변수, UI 바 스타일
├── js/
│   ├── app.js            # 오케스트레이션, rAF 루프, 모듈 배선
│   ├── vision.js         # MediaPipe 초기화, onResults → hand state
│   ├── gestures.js       # 핀치/포인팅/양손 분류, hysteresis
│   ├── physics.js        # Matter.js 엔진, walls, grab constraint
│   ├── items.js          # sticky/image/shape 팩토리, preset
│   ├── render.js         # Canvas draw: bodies, cursor, particles
│   └── ui.js             # 버튼 바, 치트시트, 테마 토글
├── assets/
│   ├── sample-1.jpg
│   ├── sample-2.jpg
│   └── sample-3.jpg
└── README.md
```

---

### Task 1: 프로젝트 스캐폴드 & index.html

**Files:**
- Create: `index.html`
- Create: `css/style.css`
- Create: `js/app.js`
- Create: `README.md`

- [ ] **Step 1: index.html 작성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Hand Whiteboard</title>
  <link rel="stylesheet" href="css/style.css" />
</head>
<body data-theme="light">
  <video id="cam" autoplay playsinline style="display:none"></video>
  <canvas id="board"></canvas>

  <div id="status" class="status status--waiting">Initializing…</div>

  <div id="toolbar">
    <button data-action="add-note">＋ 노트</button>
    <button data-action="add-image">＋ 이미지</button>
    <button data-action="add-shape">＋ 도형</button>
    <button data-action="toggle-theme">테마</button>
    <button data-action="clear">전체 삭제</button>
    <button data-action="help">?</button>
  </div>

  <div id="help-modal" class="modal hidden">
    <div class="modal__content">
      <h2>제스처 가이드</h2>
      <ul id="help-list"></ul>
      <button data-action="close-help">닫기</button>
    </div>
  </div>

  <input type="file" id="image-input" accept="image/*" style="display:none" />

  <!-- Matter.js -->
  <script src="https://cdn.jsdelivr.net/npm/matter-js@0.19.0/build/matter.min.js"></script>
  <!-- MediaPipe Hands -->
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js"></script>

  <script type="module" src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: css/style.css 작성**

```css
:root {
  --bg: #fafafa;
  --fg: #222;
  --accent: #2d8cf0;
  --surface: #fff;
  --shadow: 0 4px 16px rgba(0,0,0,0.12);
}

[data-theme="dark"] {
  --bg: #1a1a1e;
  --fg: #eee;
  --accent: #6aa9ff;
  --surface: #2a2a30;
  --shadow: 0 4px 16px rgba(0,0,0,0.4);
}

* { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  background: var(--bg);
  color: var(--fg);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  overflow: hidden;
}

#board {
  display: block;
  width: 100vw;
  height: 100vh;
  cursor: none;
}

#status {
  position: fixed;
  top: 16px;
  left: 16px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 13px;
  background: var(--surface);
  box-shadow: var(--shadow);
  z-index: 10;
}
.status--ok    { color: #2ecc71; }
.status--waiting { color: #f39c12; }
.status--error { color: #e74c3c; }

#toolbar {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  padding: 8px;
  background: var(--surface);
  border-radius: 12px;
  box-shadow: var(--shadow);
  z-index: 10;
}
#toolbar button {
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--fg);
  font-size: 14px;
  cursor: pointer;
  transition: background 0.15s;
}
#toolbar button:hover { background: rgba(0,0,0,0.05); }
[data-theme="dark"] #toolbar button:hover { background: rgba(255,255,255,0.08); }

.modal {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.modal.hidden { display: none; }
.modal__content {
  background: var(--surface);
  padding: 32px;
  border-radius: 16px;
  max-width: 480px;
  box-shadow: var(--shadow);
}
.modal__content h2 { margin-top: 0; }
.modal__content ul { line-height: 2; padding-left: 20px; }
```

- [ ] **Step 3: js/app.js 초기 스텁 작성**

```javascript
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#2d8cf0';
  ctx.font = '24px sans-serif';
  ctx.fillText('Hand Whiteboard — scaffold OK', 40, 60);
  requestAnimationFrame(loop);
}
loop();
```

- [ ] **Step 4: README.md 스켈레톤 작성**

```markdown
# Hand Whiteboard

웹캠 손 제스처로 조작하는 물리 기반 인터랙티브 화이트보드.

## Run Locally

```bash
python3 -m http.server 8000
```

브라우저에서 `http://localhost:8000` 열고 카메라 허용.

## Gestures

- 🤌 핀치 — 요소 잡기/놓기 (던질 수 있음)
- 🤌🤌 양손 핀치 — 뷰포트 zoom/pan 또는 요소 scale/rotate
- ✋✋ 양손 활짝 0.5초 — 중력 on/off
```

- [ ] **Step 5: 수동 검증**

Run: `cd ~/Desktop/developments/hand-whiteboard && python3 -m http.server 8000`
브라우저에서 `http://localhost:8000` 열기.

Expected: 좌상단 "Initializing…" 배지, 하단 툴바 6개 버튼, 캔버스 중앙 "Hand Whiteboard — scaffold OK" 텍스트.

- [ ] **Step 6: Commit**

```bash
git add index.html css/style.css js/app.js README.md
git commit -m "Add project scaffold with static HTML, CSS, and render loop stub"
```

---

### Task 2: Vision 모듈 — MediaPipe 연결

**Files:**
- Create: `js/vision.js`
- Modify: `js/app.js`

- [ ] **Step 1: js/vision.js 작성**

```javascript
// vision.js — MediaPipe Hands를 초기화하고 손 상태를 이벤트로 내보낸다.
// 외부 의존: window.Hands, window.Camera (CDN으로 로드)

const listeners = new Set();
let cameraInstance = null;
let lastResult = { left: null, right: null, timestamp: 0 };

export function onHands(cb) { listeners.add(cb); return () => listeners.delete(cb); }
export function getLast() { return lastResult; }

export async function startVision(videoEl) {
  const hands = new window.Hands({
    locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`,
  });

  hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7,
  });

  hands.onResults((results) => {
    const payload = { left: null, right: null, timestamp: performance.now() };
    if (results.multiHandLandmarks && results.multiHandedness) {
      for (let i = 0; i < results.multiHandLandmarks.length; i++) {
        const label = results.multiHandedness[i].label; // 'Left' or 'Right' (in camera view)
        // 셀피 뷰라 라벨 뒤집음: 카메라의 'Right'가 유저의 왼손
        const key = label === 'Right' ? 'left' : 'right';
        payload[key] = {
          landmarks: results.multiHandLandmarks[i], // 21 points, normalized
          score: results.multiHandedness[i].score,
        };
      }
    }
    lastResult = payload;
    for (const cb of listeners) cb(payload);
  });

  cameraInstance = new window.Camera(videoEl, {
    onFrame: async () => { await hands.send({ image: videoEl }); },
    width: 640,
    height: 480,
  });
  await cameraInstance.start();
}
```

- [ ] **Step 2: js/app.js 수정 — vision 연결**

```javascript
import { startVision, onHands } from './vision.js';

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const video = document.getElementById('cam');
const statusEl = document.getElementById('status');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

function setStatus(text, cls) {
  statusEl.textContent = text;
  statusEl.className = `status status--${cls}`;
}

let handsState = { left: null, right: null };

async function main() {
  try {
    setStatus('카메라 요청 중…', 'waiting');
    await startVision(video);
    setStatus('손을 보여주세요', 'waiting');
    onHands((state) => { handsState = state; });
  } catch (err) {
    console.error(err);
    setStatus('카메라 접근 실패: ' + err.message, 'error');
  }
}

function drawLandmarks(hand, color) {
  if (!hand) return;
  ctx.fillStyle = color;
  for (const pt of hand.landmarks) {
    // 셀피 뷰라 x 미러
    const x = (1 - pt.x) * canvas.width;
    const y = pt.y * canvas.height;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const anyHand = handsState.left || handsState.right;
  if (anyHand) setStatus('손 인식됨', 'ok');

  drawLandmarks(handsState.left, '#2d8cf0');
  drawLandmarks(handsState.right, '#ff6b6b');

  requestAnimationFrame(loop);
}

main();
loop();
```

- [ ] **Step 3: 수동 검증**

서버가 돌아가는 상태에서 브라우저 새로고침. 카메라 허용.

Expected:
- 상단 상태가 "카메라 요청 중…" → "손을 보여주세요" → (손 들면) "손 인식됨"
- 손을 카메라 앞에 대면 21개 점이 손 관절 위에 표시됨
- 왼손은 파란색, 오른손은 빨간색
- 손을 좌우로 움직이면 점도 같이 움직임 (mirror — 실제 움직임과 같은 방향)

DevTools Console 에러 없어야 함.

- [ ] **Step 4: Commit**

```bash
git add js/vision.js js/app.js
git commit -m "Integrate MediaPipe Hands and render landmarks on canvas"
```

---

### Task 3: Gestures 모듈 — 핀치 & 포인팅 분류

**Files:**
- Create: `js/gestures.js`
- Modify: `js/app.js`

- [ ] **Step 1: js/gestures.js 작성**

```javascript
// gestures.js — 랜드마크로부터 제스처를 분류한다.
// 순수 함수 + 손별 상태 저장 (hysteresis)

const THUMB_TIP = 4;
const INDEX_TIP = 8;
const INDEX_MCP = 5;
const MIDDLE_TIP = 12;
const MIDDLE_MCP = 9;
const RING_TIP = 16;
const RING_MCP = 13;
const PINKY_TIP = 20;
const PINKY_MCP = 17;
const WRIST = 0;

function dist(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function palmWidth(lm) { return dist(lm[INDEX_MCP], lm[PINKY_MCP]); }

// 손가락 굽힘 판정: 끝이 MCP보다 손목에 가까우면 굽혀짐
function fingerFolded(lm, tip, mcp) {
  return dist(lm[tip], lm[WRIST]) < dist(lm[mcp], lm[WRIST]) * 1.1;
}

// 각 손 상태 저장
const handState = {
  left: { pinch: false },
  right: { pinch: false },
};

const PINCH_ON = 0.30;
const PINCH_OFF = 0.45;

function classifyHand(handKey, hand) {
  if (!hand) { handState[handKey].pinch = false; return null; }
  const lm = hand.landmarks;
  const pw = palmWidth(lm) || 1e-6;
  const pinchRatio = dist(lm[THUMB_TIP], lm[INDEX_TIP]) / pw;

  const prev = handState[handKey].pinch;
  let pinch = prev;
  if (!prev && pinchRatio < PINCH_ON) pinch = true;
  else if (prev && pinchRatio > PINCH_OFF) pinch = false;
  handState[handKey].pinch = pinch;

  const indexExtended = !fingerFolded(lm, INDEX_TIP, INDEX_MCP);
  const othersFolded =
    fingerFolded(lm, MIDDLE_TIP, MIDDLE_MCP) &&
    fingerFolded(lm, RING_TIP, RING_MCP) &&
    fingerFolded(lm, PINKY_TIP, PINKY_MCP);
  const pointing = indexExtended && othersFolded;

  const openPalm =
    !fingerFolded(lm, INDEX_TIP, INDEX_MCP) &&
    !fingerFolded(lm, MIDDLE_TIP, MIDDLE_MCP) &&
    !fingerFolded(lm, RING_TIP, RING_MCP) &&
    !fingerFolded(lm, PINKY_TIP, PINKY_MCP);

  // 핀치 위치: 엄지-검지 중점, 셀피 미러 적용된 normalized 좌표
  const midX = 1 - (lm[THUMB_TIP].x + lm[INDEX_TIP].x) / 2;
  const midY = (lm[THUMB_TIP].y + lm[INDEX_TIP].y) / 2;
  const indexX = 1 - lm[INDEX_TIP].x;
  const indexY = lm[INDEX_TIP].y;

  return {
    pinch,
    pinchRatio,
    pointing,
    openPalm,
    pos: { x: midX, y: midY },          // normalized [0..1]
    indexPos: { x: indexX, y: indexY },
    landmarks: lm,
  };
}

// Two-hand 상태 추적
let openPalmStart = 0;
let openPalmTriggered = false;

export function classify(handsPayload) {
  const left = classifyHand('left', handsPayload.left);
  const right = classifyHand('right', handsPayload.right);

  // 양손 모두 오픈팜 0.5초 유지 시 single event
  const bothOpen = left && right && left.openPalm && right.openPalm;
  let gravityToggle = false;
  const now = performance.now();
  if (bothOpen) {
    if (openPalmStart === 0) openPalmStart = now;
    else if (!openPalmTriggered && now - openPalmStart > 500) {
      gravityToggle = true;
      openPalmTriggered = true;
    }
  } else {
    openPalmStart = 0;
    openPalmTriggered = false;
  }

  return {
    left, right,
    bothPinch: !!(left && right && left.pinch && right.pinch),
    gravityToggle,
  };
}
```

- [ ] **Step 2: js/app.js 수정 — 제스처 표시**

기존 `loop()` 함수를 다음으로 교체:

```javascript
import { startVision, onHands } from './vision.js';
import { classify } from './gestures.js';

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const video = document.getElementById('cam');
const statusEl = document.getElementById('status');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

function setStatus(text, cls) {
  statusEl.textContent = text;
  statusEl.className = `status status--${cls}`;
}

let handsState = { left: null, right: null };

async function main() {
  try {
    setStatus('카메라 요청 중…', 'waiting');
    await startVision(video);
    setStatus('손을 보여주세요', 'waiting');
    onHands((state) => { handsState = state; });
  } catch (err) {
    console.error(err);
    setStatus('카메라 접근 실패: ' + err.message, 'error');
  }
}

function drawCursor(hand, color) {
  if (!hand) return;
  const x = hand.pos.x * canvas.width;
  const y = hand.pos.y * canvas.height;
  ctx.fillStyle = hand.pinch ? color : 'transparent';
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, hand.pinch ? 14 : 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const g = classify(handsState);

  if (g.left || g.right) setStatus('손 인식됨', 'ok');
  if (g.gravityToggle) console.log('[gesture] gravity toggle');

  drawCursor(g.left, '#2d8cf0');
  drawCursor(g.right, '#ff6b6b');

  requestAnimationFrame(loop);
}

main();
loop();
```

- [ ] **Step 3: 수동 검증**

브라우저 새로고침.

Expected:
- 손을 들면 손바닥 근처에 원형 커서 (왼손 파랑, 오른손 빨강)
- 엄지+검지 핀치하면 원이 **채워진 작은 원**으로 바뀜
- 손을 펴면 **외곽선 큰 원**으로 돌아옴
- 양손 활짝 펴고 0.5초 유지 → Console에 `[gesture] gravity toggle` 로그 1회

조명 밝게, 손이 프레임 안에 완전히 들어오도록 테스트.

- [ ] **Step 4: Commit**

```bash
git add js/gestures.js js/app.js
git commit -m "Add gesture classifier for pinch, pointing, and open-palm toggle"
```

---

### Task 4: Physics 모듈 — Matter.js 엔진 & 벽

**Files:**
- Create: `js/physics.js`
- Modify: `js/app.js`

- [ ] **Step 1: js/physics.js 작성**

```javascript
// physics.js — Matter.js 래퍼. 엔진, 월드, 벽, body 팩토리, grab constraint.

const { Engine, World, Bodies, Body, Constraint, Composite, Events } = Matter;

let engine, world;
let walls = [];

export function initPhysics() {
  engine = Engine.create();
  engine.gravity.y = 1.0;
  world = engine.world;
  rebuildWalls();
  return { engine, world };
}

export function step(deltaMs) {
  Engine.update(engine, deltaMs);
}

export function setGravity(on) {
  engine.gravity.y = on ? 1.0 : 0.0;
}

export function isGravityOn() {
  return engine.gravity.y > 0;
}

export function allBodies() {
  return Composite.allBodies(world).filter((b) => !b.isStatic);
}

export function rebuildWalls() {
  for (const w of walls) World.remove(world, w);
  walls = [];
  const W = window.innerWidth;
  const H = window.innerHeight;
  const t = 50;
  const opts = { isStatic: true, render: { visible: false } };
  walls.push(Bodies.rectangle(W / 2, -t / 2, W, t, opts));        // top
  walls.push(Bodies.rectangle(W / 2, H + t / 2, W, t, opts));     // bottom
  walls.push(Bodies.rectangle(-t / 2, H / 2, t, H, opts));        // left
  walls.push(Bodies.rectangle(W + t / 2, H / 2, t, H, opts));     // right
  World.add(world, walls);
}

export function addBody(body) {
  World.add(world, body);
  return body;
}

export function removeBody(body) {
  World.remove(world, body);
}

export function clearAll() {
  for (const b of allBodies()) World.remove(world, b);
}

// Grab constraint — 손별로 하나씩 관리
const grabs = { left: null, right: null };

export function findBodyAt(x, y) {
  for (const b of allBodies()) {
    if (Matter.Bounds.contains(b.bounds, { x, y })) {
      // 더 정확히: vertex-in-polygon
      if (Matter.Vertices.contains(b.vertices, { x, y })) return b;
    }
  }
  return null;
}

export function attachGrab(handKey, body, x, y) {
  releaseGrab(handKey);
  const c = Constraint.create({
    pointA: { x, y },
    bodyB: body,
    pointB: { x: x - body.position.x, y: y - body.position.y },
    stiffness: 0.9,
    damping: 0.1,
    length: 0,
  });
  World.add(world, c);
  grabs[handKey] = c;
}

export function updateGrab(handKey, x, y) {
  const c = grabs[handKey];
  if (c) { c.pointA.x = x; c.pointA.y = y; }
}

export function releaseGrab(handKey) {
  const c = grabs[handKey];
  if (c) {
    World.remove(world, c);
    grabs[handKey] = null;
  }
}

export function getGrabbedBody(handKey) {
  return grabs[handKey]?.bodyB ?? null;
}

export function onCollision(cb) {
  Events.on(engine, 'collisionStart', (e) => {
    for (const pair of e.pairs) cb(pair);
  });
}
```

- [ ] **Step 2: js/app.js 수정 — physics 초기화 + 테스트 박스 하나**

상단 import 추가 및 main/loop 수정:

```javascript
import { startVision, onHands } from './vision.js';
import { classify } from './gestures.js';
import { initPhysics, step, rebuildWalls, addBody, allBodies } from './physics.js';

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const video = document.getElementById('cam');
const statusEl = document.getElementById('status');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  rebuildWalls();
}
window.addEventListener('resize', resize);

function setStatus(text, cls) {
  statusEl.textContent = text;
  statusEl.className = `status status--${cls}`;
}

let handsState = { left: null, right: null };

async function main() {
  initPhysics();
  resize();

  // 테스트 박스 하나 배치
  const box = Matter.Bodies.rectangle(
    window.innerWidth / 2, 100, 80, 80,
    { restitution: 0.2, friction: 0.4, frictionAir: 0.02 }
  );
  box.custom = { kind: 'shape', color: '#ffd166' };
  addBody(box);

  try {
    setStatus('카메라 요청 중…', 'waiting');
    await startVision(video);
    setStatus('손을 보여주세요', 'waiting');
    onHands((state) => { handsState = state; });
  } catch (err) {
    console.error(err);
    setStatus('카메라 접근 실패: ' + err.message, 'error');
  }
}

function drawCursor(hand, color) {
  if (!hand) return;
  const x = hand.pos.x * canvas.width;
  const y = hand.pos.y * canvas.height;
  ctx.fillStyle = hand.pinch ? color : 'transparent';
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, hand.pinch ? 14 : 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawBody(b) {
  ctx.save();
  ctx.translate(b.position.x, b.position.y);
  ctx.rotate(b.angle);
  ctx.fillStyle = b.custom?.color ?? '#ccc';
  const w = b.bounds.max.x - b.bounds.min.x;
  const h = b.bounds.max.y - b.bounds.min.y;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.restore();
}

let lastT = performance.now();
function loop() {
  const now = performance.now();
  const dt = Math.min(32, now - lastT);
  lastT = now;

  step(dt);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const b of allBodies()) drawBody(b);

  const g = classify(handsState);
  if (g.left || g.right) setStatus('손 인식됨', 'ok');
  drawCursor(g.left, '#2d8cf0');
  drawCursor(g.right, '#ff6b6b');

  requestAnimationFrame(loop);
}

main();
loop();
```

- [ ] **Step 3: 수동 검증**

브라우저 새로고침.

Expected:
- 노란 박스가 화면 위쪽에 생성되고 중력으로 떨어져 바닥에 멈춤
- 창 크기 변경 시 벽 재구성 (박스가 바닥에서 다시 안정)
- 손 커서는 기존대로 작동

- [ ] **Step 4: Commit**

```bash
git add js/physics.js js/app.js
git commit -m "Add Matter.js physics engine with walls and test body"
```

---

### Task 5: Items 모듈 — sticky/image/shape 팩토리 & preset

**Files:**
- Create: `js/items.js`
- Modify: `js/app.js`

- [ ] **Step 1: js/items.js 작성**

```javascript
// items.js — 3가지 아이템 타입의 body 생성기 + preset 보드.

const { Bodies } = Matter;

const STICKY_COLORS = ['#ffe066', '#ff99c8', '#9bf6ff', '#caffbf'];
const STICKY_TEXTS = ['Idea', 'TODO', 'Maybe', 'Ship it', 'Ask', 'Later'];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const BASE_OPTS = {
  restitution: 0.1,
  friction: 0.35,
  frictionAir: 0.02,
  density: 0.001,
};

export function createSticky(x, y, text = null, color = null) {
  const w = 120, h = 120;
  const body = Bodies.rectangle(x, y, w, h, { ...BASE_OPTS });
  body.custom = {
    kind: 'sticky',
    color: color ?? rand(STICKY_COLORS),
    text: text ?? rand(STICKY_TEXTS),
    w, h,
  };
  return body;
}

export function createShape(x, y, shape = null) {
  const kinds = ['rect', 'circle', 'triangle'];
  const pick = shape ?? rand(kinds);
  let body;
  if (pick === 'circle') {
    body = Bodies.circle(x, y, 45, { ...BASE_OPTS });
  } else if (pick === 'triangle') {
    body = Bodies.polygon(x, y, 3, 55, { ...BASE_OPTS });
  } else {
    body = Bodies.rectangle(x, y, 90, 90, { ...BASE_OPTS });
  }
  body.custom = {
    kind: 'shape',
    shape: pick,
    color: rand(['#ef476f', '#06d6a0', '#118ab2', '#ffd166']),
  };
  return body;
}

export function createImage(x, y, src) {
  const w = 160, h = 120;
  const body = Bodies.rectangle(x, y, w, h, { ...BASE_OPTS });
  const img = new Image();
  img.src = src;
  body.custom = { kind: 'image', img, w, h };
  return body;
}

export function presetBoard() {
  const W = window.innerWidth, H = window.innerHeight;
  const bodies = [];
  // 스티키 6개 — 상단에 가로로 분포, 약간 랜덤
  for (let i = 0; i < 6; i++) {
    const x = (W / 7) * (i + 1) + (Math.random() - 0.5) * 30;
    const y = 120 + Math.random() * 60;
    bodies.push(createSticky(x, y));
  }
  // 이미지 3개 — 중앙 가로줄
  const samples = ['assets/sample-1.jpg', 'assets/sample-2.jpg', 'assets/sample-3.jpg'];
  for (let i = 0; i < 3; i++) {
    const x = (W / 4) * (i + 1);
    const y = H / 2;
    bodies.push(createImage(x, y, samples[i]));
  }
  // 도형 3개 — 하단 가로줄
  const shapes = ['rect', 'circle', 'triangle'];
  for (let i = 0; i < 3; i++) {
    const x = (W / 4) * (i + 1);
    const y = H * 0.75;
    bodies.push(createShape(x, y, shapes[i]));
  }
  return bodies;
}
```

- [ ] **Step 2: 샘플 이미지 추가**

```bash
mkdir -p assets
# placeholder 이미지 생성 (ImageMagick 없으면 picsum 사용)
curl -L -o assets/sample-1.jpg "https://picsum.photos/seed/wb1/320/240"
curl -L -o assets/sample-2.jpg "https://picsum.photos/seed/wb2/320/240"
curl -L -o assets/sample-3.jpg "https://picsum.photos/seed/wb3/320/240"
```

- [ ] **Step 3: js/app.js 수정 — preset 로드**

`main()` 함수 내 테스트 박스 생성 코드를 다음으로 교체:

```javascript
import { presetBoard } from './items.js';
// ... 기존 imports ...

async function main() {
  initPhysics();
  resize();

  for (const b of presetBoard()) addBody(b);

  try {
    setStatus('카메라 요청 중…', 'waiting');
    await startVision(video);
    setStatus('손을 보여주세요', 'waiting');
    onHands((state) => { handsState = state; });
  } catch (err) {
    console.error(err);
    setStatus('카메라 접근 실패: ' + err.message, 'error');
  }
}
```

- [ ] **Step 4: 수동 검증**

브라우저 새로고침.

Expected:
- 스티키 6개가 상단에서 떨어져 쌓임 (색이 각각 다름)
- 이미지 3개가 중앙에서 떨어짐 (단, 현재 render는 색만 그리므로 이미지 자체는 아직 안 보여도 OK)
- 도형 3개가 하단에서 떨어짐

(이미지는 Task 6에서 제대로 그림)

- [ ] **Step 5: Commit**

```bash
git add js/items.js js/app.js assets/
git commit -m "Add item factories (sticky, image, shape) and preset board"
```

---

### Task 6: Render 모듈 — sticky/image/shape 제대로 그리기

**Files:**
- Create: `js/render.js`
- Modify: `js/app.js`

- [ ] **Step 1: js/render.js 작성**

```javascript
// render.js — Matter.js body를 Canvas 2D로 그린다. 커서와 파티클도.

export function drawBody(ctx, b) {
  ctx.save();
  ctx.translate(b.position.x, b.position.y);
  ctx.rotate(b.angle);

  const c = b.custom ?? {};
  if (c.kind === 'sticky') drawSticky(ctx, b, c);
  else if (c.kind === 'image') drawImage(ctx, b, c);
  else if (c.kind === 'shape') drawShape(ctx, b, c);
  else drawFallback(ctx, b);

  if (b.__highlight) {
    ctx.strokeStyle = 'rgba(45,140,240,0.8)';
    ctx.lineWidth = 3;
    ctx.strokeRect(-(c.w ?? 80) / 2 - 4, -(c.h ?? 80) / 2 - 4,
      (c.w ?? 80) + 8, (c.h ?? 80) + 8);
  }
  ctx.restore();
}

function drawSticky(ctx, b, c) {
  const w = c.w, h = c.h;
  ctx.shadowColor = 'rgba(0,0,0,0.2)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = c.color;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#333';
  ctx.font = '600 18px -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(c.text, 0, 0);
}

function drawImage(ctx, b, c) {
  const w = c.w, h = c.h;
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 4;
  if (c.img.complete) {
    ctx.drawImage(c.img, -w / 2, -h / 2, w, h);
  } else {
    ctx.fillStyle = '#ddd';
    ctx.fillRect(-w / 2, -h / 2, w, h);
  }
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 4;
  ctx.strokeRect(-w / 2, -h / 2, w, h);
}

function drawShape(ctx, b, c) {
  ctx.shadowColor = 'rgba(0,0,0,0.2)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = c.color;
  ctx.beginPath();
  const v = b.vertices;
  ctx.moveTo(v[0].x - b.position.x, v[0].y - b.position.y);
  for (let i = 1; i < v.length; i++) {
    ctx.lineTo(v[i].x - b.position.x, v[i].y - b.position.y);
  }
  ctx.closePath();
  ctx.fill();
}

function drawFallback(ctx, b) {
  ctx.fillStyle = '#999';
  ctx.fillRect(-40, -40, 80, 80);
}

export function drawCursor(ctx, hand, color, canvas) {
  if (!hand) return;
  const x = hand.pos.x * canvas.width;
  const y = hand.pos.y * canvas.height;
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.fillStyle = hand.pinch ? color : 'rgba(255,255,255,0.4)';
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, hand.pinch ? 14 : 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// Particle system
const particles = [];

export function emitSpark(x, y, count = 12, color = '#fff') {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 2 + Math.random() * 4;
    particles.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 500,
      age: 0,
      color,
    });
  }
}

export function stepParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.age += dt;
    if (p.age > p.life) { particles.splice(i, 1); continue; }
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.08;
    p.vx *= 0.98; p.vy *= 0.98;
  }
}

export function drawParticles(ctx) {
  for (const p of particles) {
    const a = 1 - p.age / p.life;
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
```

- [ ] **Step 2: js/app.js 수정 — render 모듈 사용**

```javascript
import { startVision, onHands } from './vision.js';
import { classify } from './gestures.js';
import { initPhysics, step, rebuildWalls, addBody, allBodies } from './physics.js';
import { presetBoard } from './items.js';
import { drawBody, drawCursor, stepParticles, drawParticles } from './render.js';

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const video = document.getElementById('cam');
const statusEl = document.getElementById('status');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  rebuildWalls();
}
window.addEventListener('resize', resize);

function setStatus(text, cls) {
  statusEl.textContent = text;
  statusEl.className = `status status--${cls}`;
}

let handsState = { left: null, right: null };

async function main() {
  initPhysics();
  resize();
  for (const b of presetBoard()) addBody(b);
  try {
    setStatus('카메라 요청 중…', 'waiting');
    await startVision(video);
    setStatus('손을 보여주세요', 'waiting');
    onHands((state) => { handsState = state; });
  } catch (err) {
    console.error(err);
    setStatus('카메라 접근 실패: ' + err.message, 'error');
  }
}

let lastT = performance.now();
function loop() {
  const now = performance.now();
  const dt = Math.min(32, now - lastT);
  lastT = now;

  step(dt);
  stepParticles(dt);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const b of allBodies()) drawBody(ctx, b);
  drawParticles(ctx);

  const g = classify(handsState);
  if (g.left || g.right) setStatus('손 인식됨', 'ok');
  drawCursor(ctx, g.left, '#2d8cf0', canvas);
  drawCursor(ctx, g.right, '#ff6b6b', canvas);

  requestAnimationFrame(loop);
}

main();
loop();
```

- [ ] **Step 3: 수동 검증**

브라우저 새로고침.

Expected:
- 스티키노트에 텍스트 ("Idea", "TODO" 등) 표시, 그림자
- 이미지 카드에 실제 샘플 이미지 렌더 (picsum)
- 도형은 각각의 모양 (사각/원/삼각)으로 그려지고 색 구분
- 손 커서에 glow 효과

- [ ] **Step 4: Commit**

```bash
git add js/render.js js/app.js
git commit -m "Add render pipeline for items, cursor glow, and particle system"
```

---

### Task 7: Grab & Drag — 핀치로 요소 잡기

**Files:**
- Modify: `js/app.js`

- [ ] **Step 1: js/app.js 수정 — grab 로직 추가**

상단 imports에 physics grab 함수 추가 및 loop 수정:

```javascript
import { startVision, onHands } from './vision.js';
import { classify } from './gestures.js';
import {
  initPhysics, step, rebuildWalls, addBody, allBodies,
  findBodyAt, attachGrab, updateGrab, releaseGrab, getGrabbedBody,
} from './physics.js';
import { presetBoard } from './items.js';
import { drawBody, drawCursor, stepParticles, drawParticles, emitSpark } from './render.js';

// ... (상단 변수 선언, resize, setStatus, handsState, main은 기존 그대로) ...

// 이전 프레임 핀치 상태 추적 (edge 감지)
let prevPinch = { left: false, right: false };

function handleGrab(handKey, hand) {
  if (!hand) {
    if (prevPinch[handKey]) releaseGrab(handKey);
    prevPinch[handKey] = false;
    return;
  }
  const x = hand.pos.x * canvas.width;
  const y = hand.pos.y * canvas.height;

  if (hand.pinch && !prevPinch[handKey]) {
    // 핀치 시작: 요소 탐색 후 constraint 부착
    const body = findBodyAt(x, y);
    if (body) {
      attachGrab(handKey, body, x, y);
      emitSpark(x, y, 10, '#ffd166');
    }
  } else if (hand.pinch && prevPinch[handKey]) {
    updateGrab(handKey, x, y);
  } else if (!hand.pinch && prevPinch[handKey]) {
    releaseGrab(handKey);
  }
  prevPinch[handKey] = hand.pinch;
}

let lastT = performance.now();
function loop() {
  const now = performance.now();
  const dt = Math.min(32, now - lastT);
  lastT = now;

  const g = classify(handsState);
  handleGrab('left', g.left);
  handleGrab('right', g.right);

  step(dt);
  stepParticles(dt);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 선택된 요소에 하이라이트 플래그
  const grabbedL = getGrabbedBody('left');
  const grabbedR = getGrabbedBody('right');
  for (const b of allBodies()) {
    b.__highlight = (b === grabbedL || b === grabbedR);
    drawBody(ctx, b);
  }
  drawParticles(ctx);

  if (g.left || g.right) setStatus('손 인식됨', 'ok');
  drawCursor(ctx, g.left, '#2d8cf0', canvas);
  drawCursor(ctx, g.right, '#ff6b6b', canvas);

  requestAnimationFrame(loop);
}

main();
loop();
```

- [ ] **Step 2: 수동 검증**

브라우저 새로고침.

Expected:
- 손을 스티키 위로 가져가 핀치하면 그 요소가 손을 따라옴
- 핀치 시작 시 노란 스파크 파티클
- 핀치 유지 시 요소 하이라이트 외곽선
- 손을 놓으면 요소가 그 자리에 멈춤 (던지기는 Task 8)
- 양손 각각 다른 요소 잡기 가능

- [ ] **Step 3: Commit**

```bash
git add js/app.js
git commit -m "Add single-hand pinch-to-grab with constraint attachment"
```

---

### Task 8: Throw Physics — 던졌을 때 관성 유지

**Files:**
- Modify: `js/physics.js`

- [ ] **Step 1: js/physics.js 의 releaseGrab 함수 개선**

기존 `releaseGrab`을 다음으로 교체:

```javascript
export function releaseGrab(handKey) {
  const c = grabs[handKey];
  if (!c) return;
  const body = c.bodyB;
  // 최근 프레임의 pointA 속도를 body에 전달
  const prev = c.__prevPoint ?? c.pointA;
  const vx = (c.pointA.x - prev.x) * 0.4;
  const vy = (c.pointA.y - prev.y) * 0.4;
  World.remove(world, c);
  grabs[handKey] = null;
  Body.setVelocity(body, { x: vx, y: vy });
}
```

그리고 `updateGrab`을 다음으로 교체 (prev 추적 추가):

```javascript
export function updateGrab(handKey, x, y) {
  const c = grabs[handKey];
  if (c) {
    c.__prevPoint = { x: c.pointA.x, y: c.pointA.y };
    c.pointA.x = x;
    c.pointA.y = y;
  }
}
```

- [ ] **Step 2: 수동 검증**

브라우저 새로고침.

Expected:
- 스티키를 빠르게 끌다가 핀치를 놓으면 요소가 **계속 날아간다** (벽에 부딪쳐 멈춤)
- 천천히 놓으면 제자리 근처에 살며시 내려놓아짐
- 아이템끼리 부딪치면 서로 밀린다

- [ ] **Step 3: Commit**

```bash
git add js/physics.js
git commit -m "Transfer grab velocity to body on release for throw physics"
```

---

### Task 9: Two-Hand — Viewport Zoom & Item Scale/Rotate

**Files:**
- Modify: `js/physics.js`
- Modify: `js/app.js`

- [ ] **Step 1: js/physics.js — body 스케일 헬퍼 추가**

파일 하단에 추가:

```javascript
export function scaleBody(body, factor) {
  // clamp to reasonable range
  const w = (body.bounds.max.x - body.bounds.min.x);
  if ((w < 40 && factor < 1) || (w > 400 && factor > 1)) return;
  Body.scale(body, factor, factor);
  if (body.custom?.w) {
    body.custom.w *= factor;
    body.custom.h *= factor;
  }
}

export function rotateBody(body, deltaAngle) {
  Body.rotate(body, deltaAngle);
}
```

- [ ] **Step 2: js/app.js — two-hand 핸들러**

기존 loop 위에 새 함수 추가, loop 내 호출:

```javascript
import {
  initPhysics, step, rebuildWalls, addBody, allBodies,
  findBodyAt, attachGrab, updateGrab, releaseGrab, getGrabbedBody,
  scaleBody, rotateBody,
} from './physics.js';

// ... 기존 코드 ...

let prevTwoHand = null; // { dist, angle, targetBody | null }

function handleTwoHand(g) {
  if (!(g.left && g.right && g.left.pinch && g.right.pinch)) {
    prevTwoHand = null;
    return;
  }
  const lx = g.left.pos.x * canvas.width;
  const ly = g.left.pos.y * canvas.height;
  const rx = g.right.pos.x * canvas.width;
  const ry = g.right.pos.y * canvas.height;

  const dx = rx - lx, dy = ry - ly;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);

  // 양손 중점 근처의 요소가 있으면 그 요소를 조작, 없으면 viewport?
  // MVP: 양손 사이에 요소가 있으면 해당 요소 scale/rotate. 뷰포트는 non-goal 단순화.
  const mx = (lx + rx) / 2, my = (ly + ry) / 2;
  const body = findBodyAt(mx, my);

  if (!prevTwoHand) {
    // 시작: 이미 양손이 같은 요소를 각각 grab 중이면 release
    if (getGrabbedBody('left') || getGrabbedBody('right')) {
      releaseGrab('left'); releaseGrab('right');
    }
    prevTwoHand = { dist, angle, target: body };
    return;
  }

  const target = prevTwoHand.target;
  if (!target) { prevTwoHand = { dist, angle, target: null }; return; }

  const scaleFactor = dist / prevTwoHand.dist;
  if (Math.abs(scaleFactor - 1) > 0.005) scaleBody(target, scaleFactor);

  const angleDelta = angle - prevTwoHand.angle;
  if (Math.abs(angleDelta) > 0.01) rotateBody(target, angleDelta);

  prevTwoHand.dist = dist;
  prevTwoHand.angle = angle;
}
```

loop 안에서 `handleGrab` 두 번 호출 **앞에** two-hand 체크:

```javascript
function loop() {
  const now = performance.now();
  const dt = Math.min(32, now - lastT);
  lastT = now;

  const g = classify(handsState);

  if (g.bothPinch) {
    handleTwoHand(g);
    prevPinch.left = true;
    prevPinch.right = true;
  } else {
    prevTwoHand = null;
    handleGrab('left', g.left);
    handleGrab('right', g.right);
  }

  step(dt);
  stepParticles(dt);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const grabbedL = getGrabbedBody('left');
  const grabbedR = getGrabbedBody('right');
  for (const b of allBodies()) {
    b.__highlight = (b === grabbedL || b === grabbedR || b === prevTwoHand?.target);
    drawBody(ctx, b);
  }
  drawParticles(ctx);

  if (g.left || g.right) setStatus('손 인식됨', 'ok');
  drawCursor(ctx, g.left, '#2d8cf0', canvas);
  drawCursor(ctx, g.right, '#ff6b6b', canvas);

  requestAnimationFrame(loop);
}
```

- [ ] **Step 3: 수동 검증**

브라우저 새로고침.

Expected:
- 양손을 한 요소 양쪽에 놓고 둘 다 핀치 → 두 손 벌리면 요소가 **커진다**
- 두 손을 회전시키면 요소도 **회전한다**
- 양손 핀치 해제 시 요소 관성 유지 (살짝 튕김)

- [ ] **Step 4: Commit**

```bash
git add js/physics.js js/app.js
git commit -m "Add two-hand pinch for scaling and rotating items"
```

---

### Task 10: Gravity Toggle — 양손 오픈팜

**Files:**
- Modify: `js/app.js`

- [ ] **Step 1: js/app.js — gravity toggle 반영**

loop 내에 `g.gravityToggle` 처리 추가. 상단 imports에 `setGravity, isGravityOn` 추가:

```javascript
import {
  initPhysics, step, rebuildWalls, addBody, allBodies,
  findBodyAt, attachGrab, updateGrab, releaseGrab, getGrabbedBody,
  scaleBody, rotateBody, setGravity, isGravityOn,
} from './physics.js';
```

loop 안에서, classify 호출 직후:

```javascript
if (g.gravityToggle) {
  setGravity(!isGravityOn());
  emitSpark(canvas.width / 2, canvas.height / 2, 30, '#2d8cf0');
}
```

- [ ] **Step 2: 수동 검증**

브라우저 새로고침.

Expected:
- 양손을 활짝 펴고 0.5초 유지 → 화면 중앙에 파란 스파크, 모든 아이템이 **공중에 멈춤 또는 살짝 떠오름** (중력 0)
- 다시 양손 오픈팜 → 아이템이 다시 **떨어진다**
- 중력 off 상태에서 아이템을 집어서 던지면 일정 속도로 계속 이동 (공간 물리 느낌)

- [ ] **Step 3: Commit**

```bash
git add js/app.js
git commit -m "Toggle gravity on two-hand open-palm gesture"
```

---

### Task 11: UI 버튼 & 추가 기능

**Files:**
- Create: `js/ui.js`
- Modify: `js/app.js`
- Modify: `js/physics.js`

- [ ] **Step 1: js/physics.js — clearAll 노출 확인 (이미 있음). 추가로 remove by body 확인**

`clearAll`과 `addBody`는 이미 export됨. 추가 작업 없음.

- [ ] **Step 2: js/ui.js 작성**

```javascript
// ui.js — 하단 툴바 버튼과 치트시트 모달.

export function initUI(handlers) {
  document.getElementById('toolbar').addEventListener('click', (e) => {
    const action = e.target.dataset.action;
    if (!action) return;
    handlers[action]?.();
  });

  document.getElementById('help-modal').addEventListener('click', (e) => {
    if (e.target.dataset.action === 'close-help' || e.target.classList.contains('modal')) {
      document.getElementById('help-modal').classList.add('hidden');
    }
  });

  // 치트시트 내용 주입
  const listEl = document.getElementById('help-list');
  const items = [
    '🤌 핀치 — 요소 잡기 / 놓기',
    '👉 빠르게 놓기 — 던지기 (관성 유지)',
    '🤌🤌 양손 핀치 (요소 위) — 확대 / 축소 / 회전',
    '✋✋ 양손 활짝 0.5초 — 중력 ON / OFF',
  ];
  listEl.innerHTML = items.map((t) => `<li>${t}</li>`).join('');
}

export function showHelp() {
  document.getElementById('help-modal').classList.remove('hidden');
}

export function toggleTheme() {
  const body = document.body;
  const cur = body.dataset.theme;
  body.dataset.theme = cur === 'dark' ? 'light' : 'dark';
}

export function pickImage() {
  return new Promise((resolve) => {
    const input = document.getElementById('image-input');
    const done = () => {
      input.removeEventListener('change', onChange);
      input.value = '';
    };
    const onChange = () => {
      const f = input.files[0];
      done();
      if (!f) return resolve(null);
      const url = URL.createObjectURL(f);
      resolve(url);
    };
    input.addEventListener('change', onChange);
    input.click();
  });
}
```

- [ ] **Step 3: js/app.js — UI 와이어링**

상단 imports:

```javascript
import { createSticky, createShape, createImage, presetBoard } from './items.js';
import { initUI, showHelp, toggleTheme, pickImage } from './ui.js';
import {
  initPhysics, step, rebuildWalls, addBody, allBodies, clearAll,
  findBodyAt, attachGrab, updateGrab, releaseGrab, getGrabbedBody,
  scaleBody, rotateBody, setGravity, isGravityOn,
} from './physics.js';
```

main 함수 끝에 UI 초기화 추가:

```javascript
async function main() {
  initPhysics();
  resize();
  for (const b of presetBoard()) addBody(b);

  initUI({
    'add-note': () => addBody(createSticky(canvas.width / 2, 120)),
    'add-shape': () => addBody(createShape(canvas.width / 2, 120)),
    'add-image': async () => {
      const url = await pickImage();
      if (url) addBody(createImage(canvas.width / 2, 120, url));
    },
    'toggle-theme': toggleTheme,
    'clear': () => clearAll(),
    'help': showHelp,
  });

  try {
    setStatus('카메라 요청 중…', 'waiting');
    await startVision(video);
    setStatus('손을 보여주세요', 'waiting');
    onHands((state) => { handsState = state; });
  } catch (err) {
    console.error(err);
    setStatus('카메라 접근 실패: ' + err.message, 'error');
  }
}
```

- [ ] **Step 4: 수동 검증**

브라우저 새로고침.

Expected:
- `＋ 노트` 클릭 → 상단 중앙에서 새 스티키 떨어짐 (랜덤 색/문구)
- `＋ 도형` 클릭 → 새 도형 추가
- `＋ 이미지` 클릭 → 파일 선택 다이얼로그 → 선택한 이미지 카드로 추가
- `테마` 클릭 → 배경/텍스트 색 라이트↔다크 전환
- `전체 삭제` 클릭 → 모든 아이템 사라짐
- `?` 클릭 → 치트시트 모달, 닫기 버튼 또는 배경 클릭으로 닫힘

- [ ] **Step 5: Commit**

```bash
git add js/ui.js js/app.js
git commit -m "Wire up toolbar buttons, theme toggle, image picker, and help modal"
```

---

### Task 12: 충돌 파티클 & 시각 피드백

**Files:**
- Modify: `js/physics.js`
- Modify: `js/app.js`

- [ ] **Step 1: js/physics.js — 충돌 이벤트 이미 구현된 onCollision 사용. 확인만**

`onCollision(cb)`이 이미 export됨. 수정 불필요.

- [ ] **Step 2: js/app.js — 충돌 파티클 연결**

상단 imports에 `onCollision` 추가:

```javascript
import {
  initPhysics, step, rebuildWalls, addBody, allBodies, clearAll,
  findBodyAt, attachGrab, updateGrab, releaseGrab, getGrabbedBody,
  scaleBody, rotateBody, setGravity, isGravityOn, onCollision,
} from './physics.js';
```

main 함수 초기 부분에 충돌 훅 등록:

```javascript
async function main() {
  initPhysics();
  resize();

  onCollision((pair) => {
    // 정적 벽과의 충돌은 무시
    if (pair.bodyA.isStatic || pair.bodyB.isStatic) return;
    // 충돌 상대 속도가 일정 이상일 때만 스파크
    const vA = pair.bodyA.velocity;
    const vB = pair.bodyB.velocity;
    const relSpeed = Math.hypot(vA.x - vB.x, vA.y - vB.y);
    if (relSpeed < 2) return;
    const p = pair.collision?.supports?.[0] ?? pair.bodyA.position;
    emitSpark(p.x, p.y, Math.min(20, Math.floor(relSpeed * 2)), '#ffffff');
  });

  for (const b of presetBoard()) addBody(b);

  // ... 기존 initUI 호출과 이하 동일 ...
}
```

- [ ] **Step 3: 수동 검증**

브라우저 새로고침.

Expected:
- 아이템을 빠르게 다른 아이템에 던지면 충돌 지점에 **흰색 스파크**
- 천천히 부딪치는 건 스파크 없음 (임계값 2 이상일 때만)
- 벽 충돌은 스파크 없음

- [ ] **Step 4: Commit**

```bash
git add js/app.js
git commit -m "Emit collision sparks based on relative velocity"
```

---

### Task 13: 에러 처리 & 손 미검출 페이드

**Files:**
- Modify: `js/app.js`

- [ ] **Step 1: js/app.js — 손 미검출 추적 & 커서 페이드**

전역 상태 추가 (파일 상단 변수 선언 근처):

```javascript
let lastHandSeen = 0;
```

`onHands` 콜백 수정:

```javascript
onHands((state) => {
  handsState = state;
  if (state.left || state.right) lastHandSeen = performance.now();
});
```

loop 안에서 미검출 시 상태/커서 처리:

```javascript
const now = performance.now();
const handAge = now - lastHandSeen;

if (handAge > 5000) {
  setStatus('손이 보이지 않습니다', 'waiting');
  releaseGrab('left');
  releaseGrab('right');
}
```

카메라 실패 친절화 — 이미 구현된 `main()`의 catch 블록을 다음으로 교체:

```javascript
} catch (err) {
  console.error(err);
  const msg = err.name === 'NotAllowedError'
    ? '카메라 권한이 거부되었습니다. 브라우저 설정에서 허용 후 새로고침하세요.'
    : '카메라 초기화 실패: ' + (err.message ?? err);
  setStatus(msg, 'error');
}
```

- [ ] **Step 2: 수동 검증**

Expected:
- 손을 5초 이상 숨기면 상태가 "손이 보이지 않습니다"로 바뀜, 잡고 있던 요소가 놓아짐
- 카메라 권한을 거부하면 친절한 안내 메시지 (상단 배지에 빨간색)

- [ ] **Step 3: Commit**

```bash
git add js/app.js
git commit -m "Handle camera denial and idle hand fallback gracefully"
```

---

### Task 14: 테마 & 성능 폴리싱

**Files:**
- Modify: `css/style.css`
- Modify: `js/physics.js`

- [ ] **Step 1: CSS — 다크 테마에서 스티키 대비 강화**

`css/style.css` 하단에 추가:

```css
[data-theme="dark"] #status { background: #2a2a30; }
[data-theme="dark"] #board { background: #1a1a1e; }
[data-theme="light"] #board { background: #f4f4f7; }
```

- [ ] **Step 2: js/physics.js — sleeping 활성화로 성능 개선**

`initPhysics` 수정:

```javascript
export function initPhysics() {
  engine = Engine.create({ enableSleeping: true });
  engine.gravity.y = 1.0;
  world = engine.world;
  rebuildWalls();
  return { engine, world };
}
```

그리고 `step` 호출 전에 아이템 20개 이상이면 frictionAir 증가 (간단 최적화는 생략해도 OK).

- [ ] **Step 3: 수동 검증**

Expected:
- 다크 테마에서 배경이 어둡고 스티키의 그림자가 자연스럽게 섞임
- 10+ 아이템 배치 후 1분간 대기 → 정지한 아이템이 sleep 상태로 CPU 사용량 감소
- DevTools Performance 탭에서 Timeline 확인 시 쉴 때 rAF 프레임 가벼움

- [ ] **Step 4: Commit**

```bash
git add css/style.css js/physics.js
git commit -m "Polish dark theme board background and enable body sleeping"
```

---

### Task 15: QA 체크리스트 & README 완성

**Files:**
- Modify: `README.md`

- [ ] **Step 1: README.md 완성**

기존 README를 다음 내용으로 교체:

```markdown
# Hand Whiteboard

웹캠 손 제스처로 조작하는 물리 기반 인터랙티브 화이트보드.
MediaPipe Hands + Matter.js + 순수 Canvas 2D, 빌드 없이 실행.

![demo](docs/demo.gif)

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
```

- [ ] **Step 2: QA 전체 수행**

다음 시나리오를 순서대로 실행하고 각 항목 결과 기록:

```
[ ] 좋은 조명에서 한 손 핀치: 10회 중 9회 이상 요소 잡힘
[ ] 빠르게 놓으면 요소가 던져진다 (벽에 부딪쳐 튕김)
[ ] 양손 핀치로 요소 커지기/작아지기 작동
[ ] 양손 회전으로 요소 각도 변경
[ ] 양손 활짝 0.5초 → 중력 on/off 전환, 파란 스파크
[ ] + 노트 / + 도형 / + 이미지 / 테마 / 전체 삭제 / ? 모두 작동
[ ] 요소 15개 동시 표시 상태에서 60fps 유지 (Chrome Performance 탭 확인)
[ ] 카메라 거부 시 친절한 에러 메시지
[ ] 5초간 손 없음 → 상태 배지 변경, 잡고 있던 요소 놓임
[ ] 창 크기 변경 시 벽 재구성, 요소 화면 밖으로 안 사라짐
[ ] 다크 테마에서 모든 요소 가독성 OK
```

결과를 `docs/qa-results.md`에 기록.

- [ ] **Step 3: Commit**

```bash
git add README.md docs/qa-results.md
git commit -m "Write user-facing README and record QA checklist results"
```

---

### Task 16: GitHub Pages 배포 & 데모 영상

**Files:**
- Create: `.gitignore`
- External: GitHub repo + Pages 설정

- [ ] **Step 1: .gitignore 작성**

```
.DS_Store
node_modules/
*.mov
*.mp4
```

- [ ] **Step 2: GitHub 저장소 생성 & 푸시**

```bash
cd ~/Desktop/developments/hand-whiteboard
gh repo create hand-whiteboard --public --source=. --remote=origin --push
```

- [ ] **Step 3: GitHub Pages 활성화**

```bash
gh api -X POST repos/{owner}/hand-whiteboard/pages -f source.branch=main -f source.path=/
```

또는 웹 UI: Settings → Pages → Source: main branch, / (root) → Save.

- [ ] **Step 4: 배포 확인**

`https://{owner}.github.io/hand-whiteboard/` 에서 카메라 작동 확인 (HTTPS라 MediaPipe 정상 동작).

- [ ] **Step 5: 데모 GIF 촬영**

QuickTime이나 GIPHY Capture로 30초 내외 데모:
- 핀치로 스티키 잡고 던지기
- 양손으로 이미지 카드 회전·확대
- 양손 오픈팜으로 중력 토글
- `docs/demo.gif`로 저장

- [ ] **Step 6: Commit & Push**

```bash
git add .gitignore docs/demo.gif
git commit -m "Add .gitignore and demo GIF for portfolio deploy"
git push
```

완료. README의 배포 링크와 GIF가 포트폴리오로 사용 가능.

---

## Summary

총 16 태스크, 7일 일정:

| Day | Tasks |
|---|---|
| 1 | 1, 2 (스캐폴드, MediaPipe 연결) |
| 2 | 3 (제스처 분류) |
| 3 | 4, 5, 6 (physics, items, render) |
| 4 | 7, 8, 9 (grab, throw, two-hand) |
| 5 | 10, 11 (gravity, UI) |
| 6 | 12, 13, 14 (피드백, 에러, 폴리싱) |
| 7 | 15, 16 (QA, 배포) |
