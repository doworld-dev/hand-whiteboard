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
  walls.push(Bodies.rectangle(W / 2, -t / 2, W, t, opts));
  walls.push(Bodies.rectangle(W / 2, H + t / 2, W, t, opts));
  walls.push(Bodies.rectangle(-t / 2, H / 2, t, H, opts));
  walls.push(Bodies.rectangle(W + t / 2, H / 2, t, H, opts));
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

const grabs = { left: null, right: null };

export function findBodyAt(x, y) {
  for (const b of allBodies()) {
    if (Matter.Bounds.contains(b.bounds, { x, y })) {
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
  if (c) {
    c.__prevPoint = { x: c.pointA.x, y: c.pointA.y };
    c.pointA.x = x;
    c.pointA.y = y;
  }
}

export function releaseGrab(handKey) {
  const c = grabs[handKey];
  if (!c) return;
  const body = c.bodyB;
  const prev = c.__prevPoint ?? c.pointA;
  const vx = (c.pointA.x - prev.x) * 0.4;
  const vy = (c.pointA.y - prev.y) * 0.4;
  World.remove(world, c);
  grabs[handKey] = null;
  Body.setVelocity(body, { x: vx, y: vy });
}

export function getGrabbedBody(handKey) {
  return grabs[handKey]?.bodyB ?? null;
}

export function onCollision(cb) {
  Events.on(engine, 'collisionStart', (e) => {
    for (const pair of e.pairs) cb(pair);
  });
}
