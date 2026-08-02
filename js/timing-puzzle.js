
(function () {
  'use strict';
  const SEQUENCE = ['anchor', 'wave', 'skull'];
  const MAX_GAP  = 500;
  let state = [];
  let lastClickTime = 0;
  const btns = {
    anchor: document.getElementById('btn-anchor'),
    wave:   document.getElementById('btn-wave'),
    skull:  document.getElementById('btn-skull'),
  };
  const statusEl = document.getElementById('timing-status');
  const flagEl   = document.getElementById('timing-flag');
  if (!btns.anchor) return;
  function handleClick(name) {
    const now = Date.now();
    if (state.length === 0) {
      state = [name];
      lastClickTime = now;
      updateStatus('info', '1/3 — Timing started. Next press within 500ms.');
      return;
    }
    const gap = now - lastClickTime;
    if (gap > MAX_GAP) {
      state = [];
      lastClickTime = 0;
      updateStatus('error', `✗ Too slow (${gap}ms). Resetting sequence.`);
      return;
    }
    state.push(name);
    lastClickTime = now;
    if (state.length === SEQUENCE.length) {
      const correct = state.every((s, i) => s === SEQUENCE[i]);
      if (correct) {
        success();
      } else {
        state = [];
        lastClickTime = 0;
        updateStatus('error', '✗ Incorrect sequence order. Resetting.');
      }
    } else {
      updateStatus('info', `${state.length}/3 — Next press within 500ms.`);
    }
  }
  function success() {
    if (flagEl) {
      flagEl.textContent = '⚓ Sparrow\'s Rhythm Verified: Tide sequence confirmed within 500ms.';
      flagEl.style.display = 'block';
    }
    updateStatus('success', '✓ Sequence verified within 500ms!');
    const p = JSON.parse(localStorage.getItem('bb_progress') || '{"layers":[]}');
    if (!p.layers.includes(4)) p.layers.push(4);
    localStorage.setItem('bb_progress', JSON.stringify(p));
    Object.values(btns).forEach(b => { if (b) b.disabled = true; });
  }
  function updateStatus(cls, msg) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.className = 'timing-status ' + cls;
  }
  Object.entries(btns).forEach(([name, btn]) => {
    if (btn) btn.addEventListener('click', () => handleClick(name));
  });
})();
