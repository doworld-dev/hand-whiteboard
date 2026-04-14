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
        const label = results.multiHandedness[i].label;
        const key = label === 'Right' ? 'left' : 'right';
        payload[key] = {
          landmarks: results.multiHandLandmarks[i],
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
