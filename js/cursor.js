
(function () {
  'use strict';
  function initCursor() {
    if (window.matchMedia('(pointer: coarse)').matches) return;
    let cursor = document.getElementById('custom-cursor');
    if (!cursor) {
      cursor = document.createElement('div');
      cursor.id = 'custom-cursor';
      cursor.innerHTML = `
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L14.09 8.26L21 9.27L16.5 13.64L17.82 21L12 17.77L6.18 21L7.5 13.64L3 9.27L9.91 8.26L12 2Z"/>
        </svg>
      `;
      document.body.appendChild(cursor);
    }
    document.body.classList.add('has-custom-cursor');
    document.addEventListener('mousemove', function (e) {
      cursor.style.left = e.clientX + 'px';
      cursor.style.top  = e.clientY + 'px';
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCursor);
  } else {
    initCursor();
  }
})();
