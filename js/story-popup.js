
(function () {
  'use strict';
  const STORY_TEXT = [
    "⚓ CAPTAIN'S LOG — SEPTEMBER 14, 2008",
    "",
    "For forty years, every pirate crew alive has chased the same rumor: Captain Jack Sparrow's Last Haul — a treasure so vast he stopped raiding merchant ships and started raiding Royal banks.",
    "",
    "When the Navy cornered him at the Black Beacon reef, Sparrow didn't bury one map. He burned it, tore it into three fragments, and hid each piece behind a nautical lock meant to drown a navy scout and reward a true pirate.",
    "",
    "You hold the first fragment. Chart the course. Solve every mechanism. Reassemble the map. Claim the haul.",
    "",
    "Fly the colors. Prove you're Packet Pirates."
  ];
  let typingInterval = null;
  let isTyping = false;
  let fullTextString = STORY_TEXT.join('\n');
  function createStoryModal() {
    if (document.getElementById('story-modal-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'story-modal-overlay';
    overlay.innerHTML = `
      <div class="story-modal-box">
        <div class="story-modal-header">
          <span class="story-modal-skull">☠</span>
          <h2 class="story-modal-title">THE LEGEND OF BLACK BEACON</h2>
          <span class="story-modal-tag">PIRATE NOIR LORE</span>
        </div>
        <div class="story-content-area">
          <div id="story-typewriter-target"></div><span class="typewriter-cursor">▌</span>
        </div>
        <div class="story-modal-actions">
          <button id="story-skip-btn" class="story-btn secondary">⚡ Fast Forward</button>
          <button id="story-close-btn" class="story-btn primary">⚓ Enter the Wreck</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('story-skip-btn').addEventListener('click', skipTypewriter);
    document.getElementById('story-close-btn').addEventListener('click', closeStoryModal);
  }
  function startTypewriter() {
    const target = document.getElementById('story-typewriter-target');
    const closeBtn = document.getElementById('story-close-btn');
    const skipBtn = document.getElementById('story-skip-btn');
    if (!target) return;
    target.innerHTML = '';
    isTyping = true;
    if (closeBtn) closeBtn.style.opacity = '0.5';
    let charIndex = 0;
    const textLength = fullTextString.length;
    function typeNextChar() {
      if (!isTyping) return;
      if (charIndex < textLength) {
        const char = fullTextString.charAt(charIndex);
        if (char === '\n') {
          target.innerHTML += '<br>';
        } else {
          const safeChar = char === '<' ? '&lt;' : char === '>' ? '&gt;' : char;
          target.innerHTML += safeChar;
        }
        charIndex++;
        let delay = Math.floor(Math.random() * 15) + 20; 
        if (char === '.' || char === '!' || char === '?') delay += 250; 
        if (char === '\n') delay += 300;
        typingInterval = setTimeout(typeNextChar, delay);
      } else {
        finishTypewriter();
      }
    }
    typeNextChar();
  }
  function skipTypewriter() {
    if (!isTyping) return;
    isTyping = false;
    clearTimeout(typingInterval);
    const target = document.getElementById('story-typewriter-target');
    if (target) {
      target.innerHTML = fullTextString.replace(/\n/g, '<br>');
    }
    finishTypewriter();
  }
  function finishTypewriter() {
    isTyping = false;
    clearTimeout(typingInterval);
    const closeBtn = document.getElementById('story-close-btn');
    const skipBtn = document.getElementById('story-skip-btn');
    if (closeBtn) {
      closeBtn.style.opacity = '1';
      closeBtn.classList.add('pulse-gold');
    }
    if (skipBtn) {
      skipBtn.style.display = 'none';
    }
  }
  function openStoryModal() {
    createStoryModal();
    const overlay = document.getElementById('story-modal-overlay');
    const skipBtn = document.getElementById('story-skip-btn');
    const closeBtn = document.getElementById('story-close-btn');
    if (skipBtn) skipBtn.style.display = 'inline-flex';
    if (closeBtn) closeBtn.classList.remove('pulse-gold');
    if (overlay) {
      overlay.style.display = 'flex';
      setTimeout(() => overlay.classList.add('active'), 20);
    }
    startTypewriter();
  }
  function closeStoryModal() {
    isTyping = false;
    clearTimeout(typingInterval);
    const overlay = document.getElementById('story-modal-overlay');
    if (overlay) {
      overlay.classList.remove('active');
      setTimeout(() => { overlay.style.display = 'none'; }, 400);
    }
    localStorage.setItem('bb_story_shown', 'true');
  }
  window.addEventListener('DOMContentLoaded', function () {
    setTimeout(openStoryModal, 600);
    const replayBtn = document.getElementById('replay-story-btn');
    if (replayBtn) {
      replayBtn.addEventListener('click', function (e) {
        e.preventDefault();
        openStoryModal();
      });
    }
  });
  window.showCTFStory = openStoryModal;
})();
