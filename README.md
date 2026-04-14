# Hand Whiteboard

웹캠 손 제스처로 조작하는 물리 기반 인터랙티브 화이트보드.

## Run Locally

```bash
python3 -m http.server 8000
```

브라우저에서 `http://localhost:8000` 열고 카메라 허용.

## Gestures

- 🤌 핀치 — 요소 잡기/놓기 (던질 수 있음)
- 🤌🤌 양손 핀치 — 뷰포트 zoom/pan 또는 요소 scale/rotate
- ✋✋ 양손 활짝 0.5초 — 중력 on/off
