(function () {
  'use strict';
  function decodeBase91(str) {
    var b91alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!#$%&()*+,./:;<=>?@[]^_`{|}~"';
    var lookup = {};
    for (var i = 0; i < b91alphabet.length; i++) {
      lookup[b91alphabet.charAt(i)] = i;
    }
    var v = -1, b = 0, n = 0, out = '';
    for (var j = 0; j < str.length; j++) {
      var c = str.charAt(j);
      if (!(c in lookup)) continue;
      var cVal = lookup[c];
      if (v < 0) {
        v = cVal;
      } else {
        v += cVal * 91;
        b += cVal * 91;
        b |= v << n;
        n += (v & 8191) > 88 ? 13 : 14;
        do {
          out += String.fromCharCode(b & 255);
          b >>= 8;
          n -= 8;
        } while (n > 7);
        v = -1;
      }
    }
    if (v >= 0) {
      out += String.fromCharCode((b | (v << n)) & 255);
    }
    return out;
  }
  window._sparrowDecode = function(str) {
    if (typeof str !== 'string') return '';
    var trimmed = str.trim();
    var isFlag = trimmed.startsWith('SPARROW{') || trimmed.startsWith('FLAG1{') || trimmed.startsWith('VANE{');
    var result = isFlag ? trimmed : decodeBase91(trimmed);
    if (result) {
      fetch('/api/verify-fragment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: 1, value: result })
      })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.success) {
          if (window.__bbSecurity) {
            window.__bbSecurity.triggerWorldChange(1);
          }
          var p = JSON.parse(localStorage.getItem('bb_progress') || '{"layers":[]}');
          if (!p.layers.includes(1)) p.layers.push(1);
          localStorage.setItem('bb_progress', JSON.stringify(p));
          if (!localStorage.getItem('sparrow_ledger_role')) {
            localStorage.setItem('sparrow_ledger_role', 'guest');
            localStorage.setItem('vane_ledger_role', 'guest');
          }
          var progressBar = document.getElementById('progress-bar');
          if (progressBar) progressBar.style.width = Math.min(100, Math.round((p.layers.length / 3) * 100)) + '%';
          var manifestSec = document.getElementById('manifest-rR!&.^El');
          if (manifestSec) {
            var clueBox = document.getElementById('flag1-clue-box');
            if (!clueBox) {
              clueBox = document.createElement('div');
              clueBox.id = 'flag1-clue-box';
              clueBox.style.cssText = 'background:rgba(10,61,74,0.85);border:2px solid var(--gold);border-radius:8px;padding:1.5rem;margin-top:1.5rem;animation:fadeIn 0.5s ease;';
              manifestSec.appendChild(clueBox);
            }
            clueBox.innerHTML = `
              <div style="font-family:var(--font-display);color:var(--gold);font-size:1.2rem;margin-bottom:0.75rem;">
                🏴‍☠️ FIRST MAP FRAGMENT UNLOCKED: <code style="color:var(--teal-bright);">${data.fragment}</code>
              </div>
              <div style="font-family:var(--font-mono);color:var(--parchment);font-size:0.88rem;line-height:1.7;">
                <strong>📜 CAPTAIN JACK SPARROW'S JOURNAL UPDATE:</strong><br>
                <em>"The Quartermaster trusted no paper ledger. When the ship foundered, his true tally remained locked beneath a guest's mark in persistent memory."</em>
              </div>
            `;
          }
          var navBrand = document.querySelector('.nav-brand');
          if (navBrand) {
            navBrand.style.color = '#4ecdc4';
            navBrand.style.textShadow = '0 0 12px rgba(78, 205, 196, 0.8)';
          }
        }
      }).catch(function() {});
    }
    return result;
  };
  window._vaneDecode = window._sparrowDecode;
})();
