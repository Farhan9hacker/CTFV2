(function () {
  'use strict';
  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  }
  function initVaneArchive(callback) {
    if (!('indexedDB' in window)) {
      if (callback) callback(null);
      return;
    }
    var req = indexedDB.open('VaneArchive', 1);
    req.onupgradeneeded = function (e) {
      var db = e.target.result;
      if (!db.objectStoreNames.contains('logs')) {
        db.createObjectStore('logs', { keyPath: 'id' });
      }
    };
    req.onsuccess = function (e) {
      var db = e.target.result;
      var tx = db.transaction('logs', 'readwrite');
      var store = tx.objectStore('logs');
      store.put({
        id:      'log-1708',
        type:    'manifest-log',
        title:   'Quartermaster Log #1708',
        payload: 'Log entry matching Sparrow 1708 navigation coordinates.',
        status:  'synced',
        notes:   'Elevate rank to Quartermaster via server verification to unseal payload.'
      });
      store.put({
        id:      'manifest-03',
        type:    'cargo-record',
        title:   'Nassau Shipping Manifest #03',
        payload: 'Merchant cargo manifest - rum, timber, brass compasses.',
        status:  'synced',
        notes:   'Nassau merchant registry from 1712.'
      });
      tx.oncomplete = function () {
        if (callback) callback(db);
      };
    };
    req.onerror = function () {
      if (callback) callback(null);
    };
  }
  var cookieRole = (getCookie('visitor') || '').trim().toLowerCase();
  var localRole  = (localStorage.getItem('sparrow_ledger_role') || localStorage.getItem('vane_ledger_role') || '').trim().toLowerCase();
  if (cookieRole === 'captian') cookieRole = 'captain';
  if (localRole  === 'captian') localRole  = 'captain';
  var rawRole = 'guest';
  if (cookieRole === 'captain' || localRole === 'captain') {
    rawRole = 'captain';
  } else if (cookieRole === 'quartermaster' || localRole === 'quartermaster') {
    rawRole = 'quartermaster';
  } else if (cookieRole && cookieRole !== 'guest') {
    rawRole = cookieRole;
  } else if (localRole && localRole !== 'guest') {
    rawRole = localRole;
  }
  var visitorRole = rawRole.toLowerCase();
  if (!localStorage.getItem('sparrow_ledger_role')) {
    localStorage.setItem('sparrow_ledger_role', 'guest');
    localStorage.setItem('vane_ledger_role', 'guest');
  }
  var roleEl = document.getElementById('visitor-role');
  if (roleEl) roleEl.textContent = rawRole;
  var fakeEl    = document.getElementById('archive-fake');
  var realEl    = document.getElementById('archive-real');
  var loadingEl = document.getElementById('archive-loading-state');
  function renderQuartermasterVerification() {
    var wrapper = document.querySelector('.archive-wrapper');
    if (!wrapper || document.getElementById('qm-verification-card')) return;
    var qmCard = document.createElement('div');
    qmCard.id = 'qm-verification-card';
    qmCard.style.cssText = 'background:linear-gradient(135deg, rgba(7,26,42,0.95), rgba(4,10,15,0.98)); border:2px solid var(--gold); border-radius:12px; padding:2rem; margin-bottom:2rem; box-shadow:0 0 30px rgba(255,183,3,0.15); font-family:var(--font-mono); transition:all 0.5s ease;';
    qmCard.innerHTML = `
      <div style="text-align:center; margin-bottom:1.5rem;">
        <div id="qm-seal-icon" style="font-size:2.8rem; margin-bottom:0.5rem; transition:transform 0.4s ease, filter 0.4s ease;">⚓</div>
        <h2 style="font-family:var(--font-display); color:var(--gold); font-size:1.5rem; margin-bottom:0.5rem;">
          Quartermaster's Verification
        </h2>
        <p style="color:var(--parchment); font-size:0.88rem; line-height:1.7; max-width:620px; margin:0 auto;">
          "Many have claimed to possess Sparrow's chart.<br>
          Few carried the genuine fragment.<br>
          Present the recovered chart fragment and prove your worth."
        </p>
      </div>
      <div style="background:rgba(5,13,21,0.85); border:1px solid rgba(46,196,221,0.25); border-radius:8px; padding:1.5rem;">
        <label for="fragment-input-1" style="display:block; font-size:0.8rem; color:var(--teal-bright); margin-bottom:0.6rem; text-transform:uppercase; letter-spacing:1px;">
          Present the First Chart Fragment
        </label>
        <div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
          <input type="text" id="fragment-input-1" placeholder="Recovered Fragment" autocomplete="off" spellcheck="false"
                 style="flex:1; min-width:240px; background:rgba(4,10,15,0.9); border:1px solid var(--teal-deep); border-radius:4px; padding:0.8rem 1rem; color:var(--gold); font-family:var(--font-mono); font-size:0.9rem; outline:none; transition:border 0.3s ease;">
          <button id="verify-fragment-btn-1" class="btn-primary" style="padding:0.8rem 1.6rem; font-family:var(--font-mono); font-weight:bold; cursor:pointer;">
            Verify Fragment
          </button>
        </div>
        <div id="verification-status-1" style="margin-top:1rem; font-size:0.85rem;"></div>
      </div>
    `;
    wrapper.insertBefore(qmCard, wrapper.children[1]);
    var verifyBtn = document.getElementById('verify-fragment-btn-1');
    var fragmentInput = document.getElementById('fragment-input-1');
    function executeVerification() {
      var val = fragmentInput ? fragmentInput.value.trim() : '';
      if (!val) {
        var statusEl = document.getElementById('verification-status-1');
        if (statusEl) {
          statusEl.style.display = 'block';
          statusEl.innerHTML = '<span style="color:var(--red-warning)">⚓ Present a chart fragment to the Quartermaster.</span>';
        }
        return;
      }
      fetch('/api/verify-fragment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: 1, value: val })
      })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var statusEl = document.getElementById('verification-status-1');
        if (data.success) {
          localStorage.setItem('sparrow_ledger_role', 'quartermaster');
          localStorage.setItem('vane_ledger_role', 'quartermaster');
          visitorRole = 'quartermaster';
          var p = JSON.parse(localStorage.getItem('bb_progress') || '{"layers":[]}');
          if (!p.layers.includes(1)) p.layers.push(1);
          if (!p.layers.includes(2)) p.layers.push(2);
          localStorage.setItem('bb_progress', JSON.stringify(p));
          window.location.reload();
        } else {
          if (statusEl) {
            statusEl.style.display = 'block';
            statusEl.innerHTML = '<span style="color:var(--red-warning)">✗ The Quartermaster studies the parchment... This is no authentic chart fragment from Sparrow\'s wreck.</span>';
          }
        }
      })
      .catch(function () {
        var statusEl = document.getElementById('verification-status-1');
        if (statusEl) {
          statusEl.style.display = 'block';
          statusEl.innerHTML = '<span style="color:var(--red-warning)">✗ Backend verification server error (HTTP 503).</span>';
        }
      });
    }
    if (verifyBtn) verifyBtn.addEventListener('click', executeVerification);
    if (fragmentInput) {
      fragmentInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') executeVerification();
      });
    }
  }
  if (visitorRole !== 'quartermaster' && visitorRole !== 'captain') {
    renderQuartermasterVerification();
  }
  initVaneArchive(function () {
    if (loadingEl) loadingEl.style.display = 'none';
    if (visitorRole === 'quartermaster' || visitorRole === 'captain') {
      fetch('/api/archive-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: visitorRole })
      })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.success) {
          if (fakeEl) fakeEl.style.display = 'none';
          if (realEl) {
            realEl.style.display = 'block';
            realEl.innerHTML = `
              <div class="archive-entry" style="border-color:var(--gold)">
                <div class="entry-title">${data.title}</div>
                <div class="entry-body">
                  A classified record has been unsealed from the server vault.<br><br>
                  🏴‍☠️ <strong>SECOND MAP FRAGMENT:</strong> <code style="color:var(--gold);font-weight:bold;">${data.fragment}</code><br><br>
                  <em>${data.notes}</em>
                </div>
              </div>
            `;
          }
          var p = JSON.parse(localStorage.getItem('bb_progress') || '{"layers":[]}');
          if (!p.layers.includes(2)) p.layers.push(2);
          localStorage.setItem('bb_progress', JSON.stringify(p));
        }
      }).catch(function () {});
    } else {
      if (fakeEl) fakeEl.style.display = 'block';
      if (realEl) realEl.style.display = 'none';
    }
  });
})();
