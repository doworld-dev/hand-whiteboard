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
