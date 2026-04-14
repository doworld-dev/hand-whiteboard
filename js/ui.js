// ui.js — 하단 툴바 버튼과 치트시트 모달.

export function initUI(handlers) {
  document.getElementById('toolbar').addEventListener('click', (e) => {
    const action = e.target.dataset.action;
    if (!action) return;
    handlers[action]?.();
  });

  document.getElementById('help-modal').addEventListener('click', (e) => {
    if (e.target.dataset.action === 'close-help' || e.target.classList.contains('modal')) {
      document.getElementById('help-modal').classList.add('hidden');
    }
  });

  const listEl = document.getElementById('help-list');
  const items = [
    '🤌 핀치 — 요소 잡기 / 놓기',
    '👉 빠르게 놓기 — 던지기 (관성 유지)',
    '🤌🤌 양손 핀치 (요소 위) — 확대 / 축소 / 회전',
    '✋✋ 양손 활짝 0.5초 — 중력 ON / OFF',
  ];
  listEl.innerHTML = items.map((t) => `<li>${t}</li>`).join('');
}

export function showHelp() {
  document.getElementById('help-modal').classList.remove('hidden');
}

export function toggleTheme() {
  const body = document.body;
  const cur = body.dataset.theme;
  body.dataset.theme = cur === 'dark' ? 'light' : 'dark';
}

export function pickImage() {
  return new Promise((resolve) => {
    const input = document.getElementById('image-input');
    const done = () => {
      input.removeEventListener('change', onChange);
      input.value = '';
    };
    const onChange = () => {
      const f = input.files[0];
      done();
      if (!f) return resolve(null);
      const url = URL.createObjectURL(f);
      resolve(url);
    };
    input.addEventListener('change', onChange);
    input.click();
  });
}
