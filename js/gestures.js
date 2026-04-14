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

function fingerFolded(lm, tip, mcp) {
  return dist(lm[tip], lm[WRIST]) < dist(lm[mcp], lm[WRIST]) * 1.1;
}

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

  const midX = 1 - (lm[THUMB_TIP].x + lm[INDEX_TIP].x) / 2;
  const midY = (lm[THUMB_TIP].y + lm[INDEX_TIP].y) / 2;
  const indexX = 1 - lm[INDEX_TIP].x;
  const indexY = lm[INDEX_TIP].y;

  return {
    pinch,
    pinchRatio,
    pointing,
    openPalm,
    pos: { x: midX, y: midY },
    indexPos: { x: indexX, y: indexY },
    landmarks: lm,
  };
}

let openPalmStart = 0;
let openPalmTriggered = false;

export function classify(handsPayload) {
  const left = classifyHand('left', handsPayload.left);
  const right = classifyHand('right', handsPayload.right);

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
