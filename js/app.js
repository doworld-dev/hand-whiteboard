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
