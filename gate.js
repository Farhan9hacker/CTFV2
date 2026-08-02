
(function () {
  'use strict';
  window.__bbSecurity = {
    triggerWorldChange: function (stage) {
      document.body.classList.add('world-stage-' + stage);
      if (stage === 1) {
        const fog = document.getElementById('particles-canvas');
        if (fog) fog.style.opacity = '0.2';
      } else if (stage === 2) {
        const card = document.querySelector('.beacon-artwork-card');
        if (card) card.style.boxShadow = '0 0 50px rgba(46, 196, 221, 0.9)';
      } else if (stage === 3) {
        document.body.style.background = 'radial-gradient(circle at center, #0c3345 0%, #040a0f 100%)';
      }
    }
  };
  document.addEventListener('DOMContentLoaded', function () {
    const overlay = document.getElementById('lock-overlay');
    if (overlay) {
      overlay.remove();
    }
    const app = document.getElementById('app');
    if (app) app.classList.remove('gate-locked-hide');
    const nav = document.querySelector('nav');
    if (nav) nav.classList.remove('gate-locked-hide');
  });
})();
