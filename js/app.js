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
