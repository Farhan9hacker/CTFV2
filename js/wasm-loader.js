
(function () {
  'use strict';
  var wasmInstance = null;
  fetch('../wasm/vault.wasm')
    .then(function (response) { return response.arrayBuffer(); })
    .then(function (bytes) { return WebAssembly.instantiate(bytes, {}); })
    .then(function (results) {
      wasmInstance = results.instance;
    })
    .catch(function () {});
  var inputEl  = document.getElementById('wasm-input');
  var submitEl = document.getElementById('wasm-submit');
  var outputEl = document.getElementById('wasm-output');
  if (!submitEl) return;
  submitEl.addEventListener('click', function () {
    var pass = (inputEl ? inputEl.value.trim() : '');
    if (!pass) {
      outputEl.innerHTML = '<span style="color:var(--red-warning)">⚠ Enter the cipher passphrase.</span>';
      return;
    }
    outputEl.innerHTML = '<span style="color:var(--text-dim)">⚙ Turning the ancient strongbox tumblers…</span>';
    setTimeout(function () {
      fetch('/api/verify-fragment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: 3, value: pass })
      })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.success) {
          if (window.__bbSecurity) {
            window.__bbSecurity.triggerWorldChange(3);
          }
          var p = JSON.parse(localStorage.getItem('bb_progress') || '{"layers":[]}');
          if (!p.layers.includes(3)) p.layers.push(3);
          localStorage.setItem('bb_progress', JSON.stringify(p));
          outputEl.innerHTML = `
            <div style="background:rgba(10,61,74,0.9);border:2px solid var(--gold);border-radius:8px;padding:1.5rem;margin-top:1rem;">
              <div style="font-family:var(--font-display);color:var(--gold);font-size:1.3rem;margin-bottom:0.5rem;">
                🏆 MAP FRAGMENT UNLOCKED: <code style="color:var(--teal-bright);">${data.fragment}</code>
              </div>
              <div style="font-family:var(--font-mono);color:var(--parchment);font-size:0.9rem;line-height:1.7;">
                <strong>✨ THE BLACK BEACON ACTIVATES — THE VAULT OPENS!</strong><br>
                <em>You have unravelled the beacon mechanism. Claim the haul at the Final Vault!</em>
              </div>
            </div>
          `;
        } else {
          outputEl.innerHTML = '<span style="color:var(--red-warning)">✗ The tumblers hold firm. The passphrase was rejected by the sea.</span>';
        }
      })
      .catch(function () {
        outputEl.innerHTML = '<span style="color:var(--red-warning)">✗ Backend verification server error (HTTP 503).</span>';
      });
    }, 400);
  });
  if (inputEl) {
    inputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') submitEl.click();
    });
  }
})();
