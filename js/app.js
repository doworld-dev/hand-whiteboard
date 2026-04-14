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
