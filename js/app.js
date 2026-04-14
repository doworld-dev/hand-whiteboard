const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#2d8cf0';
  ctx.font = '24px sans-serif';
  ctx.fillText('Hand Whiteboard — scaffold OK', 40, 60);
  requestAnimationFrame(loop);
}
loop();
