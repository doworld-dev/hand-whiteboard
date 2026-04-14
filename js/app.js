import { startVision, onHands } from './vision.js';
import { classify } from './gestures.js';
import {
  initPhysics, step, rebuildWalls, addBody, allBodies, clearAll,
  findBodyAt, attachGrab, updateGrab, releaseGrab, getGrabbedBody,
  scaleBody, rotateBody, setGravity, isGravityOn,
} from './physics.js';
import { createSticky, createShape, createImage, presetBoard } from './items.js';
import { initUI, showHelp, toggleTheme, pickImage } from './ui.js';
import { drawBody, drawCursor, stepParticles, drawParticles, emitSpark } from './render.js';

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

let prevTwoHand = null;

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

  const mx = (lx + rx) / 2, my = (ly + ry) / 2;
  const body = findBodyAt(mx, my);

  if (!prevTwoHand) {
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

let lastT = performance.now();
function loop() {
  const now = performance.now();
  const dt = Math.min(32, now - lastT);
  lastT = now;

  const g = classify(handsState);

  if (g.gravityToggle) {
    setGravity(!isGravityOn());
    emitSpark(canvas.width / 2, canvas.height / 2, 30, '#2d8cf0');
  }

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

main();
loop();
