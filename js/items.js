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
  for (let i = 0; i < 6; i++) {
    const x = (W / 7) * (i + 1) + (Math.random() - 0.5) * 30;
    const y = 120 + Math.random() * 60;
    bodies.push(createSticky(x, y));
  }
  const samples = ['assets/sample-1.jpg', 'assets/sample-2.jpg', 'assets/sample-3.jpg'];
  for (let i = 0; i < 3; i++) {
    const x = (W / 4) * (i + 1);
    const y = H / 2;
    bodies.push(createImage(x, y, samples[i]));
  }
  const shapes = ['rect', 'circle', 'triangle'];
  for (let i = 0; i < 3; i++) {
    const x = (W / 4) * (i + 1);
    const y = H * 0.75;
    bodies.push(createShape(x, y, shapes[i]));
  }
  return bodies;
}
