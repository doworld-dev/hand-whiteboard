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
