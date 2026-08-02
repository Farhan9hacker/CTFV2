
(function () {
  'use strict';
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);
  const COUNT = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 30 : 200;
  const particles = [];
  for (let i = 0; i < COUNT; i++) {
    particles.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 2 + 0.5,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -(Math.random() * 0.5 + 0.1),
      life: Math.random(),
      maxLife: Math.random() * 0.6 + 0.4,
      hue: Math.random() > 0.7 ? 35 : 185, 
    });
  }
  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) {
      p.life += 0.003;
      if (p.life > p.maxLife) {
        p.life = 0;
        p.x = Math.random() * canvas.width;
        p.y = canvas.height + 10;
      }
      p.x += p.vx;
      p.y += p.vy;
      const alpha = Math.sin((p.life / p.maxLife) * Math.PI) * 0.6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 80%, 65%, ${alpha})`;
      ctx.fill();
    }
    requestAnimationFrame(tick);
  }
  tick();
})();
