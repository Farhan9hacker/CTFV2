
(function () {
  'use strict';
  const canvas = document.getElementById('flag-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width  = 400;
  canvas.height = 100;
  ctx.fillStyle = '#040a0f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < 100; y += 8) {
    ctx.beginPath();
    ctx.strokeStyle = `rgba(13,94,115,${0.1 + (y / 100) * 0.15})`;
    ctx.lineWidth = 1;
    for (let x = 0; x <= canvas.width; x += 4) {
      const wy = y + Math.sin((x + y) * 0.08) * 3;
      if (x === 0) ctx.moveTo(x, wy);
      else ctx.lineTo(x, wy);
    }
    ctx.stroke();
  }
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = `rgba(255,183,3,${Math.random() * 0.25})`;
    ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 1, 1);
  }
  const _gridData = [66, 69, 65, 67, 79, 78, 82, 69, 68];
  const imageData = ctx.getImageData(0, 42, canvas.width, 1);
  const data = imageData.data;
  for (let i = 0; i < data.length; i++) {
    data[i] = 0;
    if (i % 4 === 3) data[i] = 255;
  }
  _gridData.forEach(function (byte, idx) {
    const pixelOffset = (10 + idx) * 4;
    data[pixelOffset]     = byte;
    data[pixelOffset + 1] = 0;
    data[pixelOffset + 2] = 0;
    data[pixelOffset + 3] = 255;
  });
  ctx.putImageData(imageData, 0, 42);
})();
