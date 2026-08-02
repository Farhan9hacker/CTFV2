/**
 * server.js — Hardened Server & Verification API Endpoint
 * Operation Black Beacon CTF
 *
 * Serves static files and provides rate-limited backend verification endpoints.
 * All verification logic exists purely on the server.
 */

const http   = require('http');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const url    = require('url');

const PORT = process.env.PORT || 3000;
const ROOT = path.join(__dirname, '..');

/* ── Rate Limiter ────────────────────────────────────────── */
const rateLimitMap = new Map();
const RATE_LIMIT   = 15; // max 15 attempts per minute
const RATE_WINDOW  = 60 * 1000; // 1 minute

function isRateLimited(ip) {
  const now = Date.now();
  const data = rateLimitMap.get(ip) || { count: 0, resetAt: now + RATE_WINDOW };
  if (now > data.resetAt) {
    data.count   = 0;
    data.resetAt = now + RATE_WINDOW;
  }
  data.count++;
  rateLimitMap.set(ip, data);
  return data.count > RATE_LIMIT;
}

/* ── MIME Types ──────────────────────────────────────────── */
const MIME = {
  '.html':  'text/html; charset=utf-8',
  '.css':   'text/css',
  '.js':    'application/javascript',
  '.json':  'application/json',
  '.svg':   'image/svg+xml',
  '.png':   'image/png',
  '.mp3':   'audio/mpeg',
  '.wasm':  'application/wasm',
  '.txt':   'text/plain',
  '.xml':   'application/xml',
};

/* ── Server Secrets & Fragment Definitions ───────────────── */
const FRAGMENTS = {
  1: ['SPARROW{anchor_in_the_deep}', 'VANE{anchor_in_the_deep}'],
  2: ['SPARROW{ghost_ship_indexed}', 'VANE{ghost_ship_indexed}'],
  3: ['SPARROW{pixel_by_pixel_truth}', 'VANE{pixel_by_pixel_truth}']
};

const PASSPHRASES = {
  strongbox: 'BEACONRED'
};

const COMBINED = FRAGMENTS[1][0] + FRAGMENTS[2][0] + FRAGMENTS[3][0];
const MASTER_HASH = crypto.createHash('sha256').update(COMBINED).digest('hex');
const MASTER_FLAG = 'SPARROW{' + MASTER_HASH.substring(0, 16) + '}';

const LEGACY_COMBINED = FRAGMENTS[1][1] + FRAGMENTS[2][1] + FRAGMENTS[3][1];
const LEGACY_HASH = crypto.createHash('sha256').update(LEGACY_COMBINED).digest('hex');
const LEGACY_MASTER_FLAG = 'VANE{' + LEGACY_HASH.substring(0, 16) + '}';

console.log('⚓ Operation Black Beacon CTF Server Initialized');
console.log('Serving from:', ROOT);
console.log('Port:', PORT);

/* ── HTTP Server ────────────────────────────────────────── */
const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
  const ip = req.socket.remoteAddress;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-CTF', 'Black-Beacon');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');

  /* ── API Endpoint Routing & Handler Block ───────────────── */
  if (parsedUrl.pathname.startsWith('/api/') || parsedUrl.pathname === '/api') {
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method Not Allowed. API routes require POST requests.' }));
      return;
    }

    /* ── POST /api/verify-fragment ───────────────────────────── */
    if (parsedUrl.pathname === '/api/verify-fragment') {
      if (isRateLimited(ip)) {
        res.writeHead(429, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }));
        return;
      }

      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const stage = parseInt(data.stage, 10);
          const value = (data.value || '').trim();

          if (stage === 1 && FRAGMENTS[1].includes(value)) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              message: 'First Map Fragment verified by Quartermaster.',
              fragment: FRAGMENTS[1][0]
            }));
            return;
          }

          if (stage === 2 && FRAGMENTS[2].includes(value)) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              message: 'Second Map Fragment verified by Beacon Keeper.',
              fragment: FRAGMENTS[2][0]
            }));
            return;
          }

          if (stage === 3 && (value.toUpperCase() === PASSPHRASES.strongbox || FRAGMENTS[3].includes(value))) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              message: 'Strongbox cipher unsealed.',
              fragment: FRAGMENTS[3][0]
            }));
            return;
          }

          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            message: 'Invalid fragment or passphrase offered to the sea.'
          }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON request payload' }));
        }
      });
      return;
    }

    /* ── POST /api/archive-log ──────────────────────────────── */
    if (parsedUrl.pathname === '/api/archive-log') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const role = (data.role || '').toLowerCase();
          if (role === 'quartermaster' || role === 'captain') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              logId: 'log-1708',
              title: 'Quartermaster Log #1708',
              fragment: FRAGMENTS[2][0],
              notes: 'Sparrow 1708 navigation coordinates verified.'
            }));
          } else {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              message: 'Access denied. Quartermaster rank required.'
            }));
          }
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
      return;
    }

    /* ── POST /api/verify ─────────────────────────────────── */
    if (parsedUrl.pathname === '/api/verify') {
      if (isRateLimited(ip)) {
        res.writeHead(429, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }));
        return;
      }

      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const f1 = (data.f1 || '').trim();
          const f2 = (data.f2 || '').trim();
          const f3 = (data.f3 || '').trim();
          const submittedFlag = (data.flag || '').trim();

          const v1Valid = FRAGMENTS[1].includes(f1);
          const v2Valid = FRAGMENTS[2].includes(f2);
          const v3Valid = FRAGMENTS[3].includes(f3);

          if ((v1Valid && v2Valid && v3Valid) || submittedFlag === MASTER_FLAG || submittedFlag === LEGACY_MASTER_FLAG) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              message: 'The X is found. Claim the haul.',
              flag: MASTER_FLAG
            }));
          } else {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              message: 'Wrong bearing. The vault stays sealed.'
            }));
          }
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
      return;
    }

    // Unmatched API endpoint
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'API route not found' }));
    return;
  }

  /* ── GET /beacon → Redirect ────────────────────────────── */
  if (req.method === 'GET' && (parsedUrl.pathname === '/beacon' || parsedUrl.pathname === '/beacon/')) {
    res.writeHead(302, { 'Location': '/pages/beacon.html' });
    res.end();
    return;
  }

  /* ── Static File Serving ──────────────────────────────── */
  let filePath = parsedUrl.pathname;
  if (filePath === '/' || filePath === '') filePath = '/index.html';

  const normalizedPath = path.normalize(filePath).replace(/\\/g, '/');
  const lowerPath = normalizedPath.toLowerCase();

  // Block git repository disclosure and protected project files
  const isProtectedFile = 
    lowerPath.includes('/.git') ||
    lowerPath.startsWith('.git') ||
    lowerPath.startsWith('/api') ||
    lowerPath.includes('server.js') ||
    lowerPath === '/readme.md' || lowerPath.endsWith('/readme.md') ||
    lowerPath === '/package.json' || lowerPath.endsWith('/package.json') ||
    lowerPath === '/build.js' || lowerPath.endsWith('/build.js') ||
    lowerPath === '/generate-assets.js' || lowerPath.endsWith('/generate-assets.js') ||
    lowerPath === '/.gitignore' || lowerPath.endsWith('/.gitignore') ||
    lowerPath === '/.env' || lowerPath.endsWith('/.env') ||
    lowerPath.startsWith('/src/') || lowerPath === '/src' ||
    lowerPath.startsWith('/node_modules/') || lowerPath === '/node_modules';

  if (isProtectedFile) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 — The chart has no record of this path.');
    return;
  }

  const absPath = path.join(ROOT, filePath);
  const ext     = path.extname(absPath);
  const mimeType = MIME[ext] || 'application/octet-stream';

  if (!absPath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(absPath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 — The chart has no record of this path.');
      } else {
        res.writeHead(500);
        res.end('Server error');
      }
      return;
    }
    res.writeHead(200, { 'Content-Type': mimeType });
    res.end(data);
  });
});

if (require.main === module) {
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️ Port ${PORT} is already in use. Trying port ${Number(PORT) + 1}...`);
      server.listen(Number(PORT) + 1, () => {
        console.log(`⚓ CTF running at http://localhost:${Number(PORT) + 1}`);
        console.log(`🏁 Final Vault: http://localhost:${Number(PORT) + 1}/final/index.html`);
      });
    } else {
      console.error('Server error:', err);
    }
  });

  server.listen(PORT, () => {
    console.log(`⚓ CTF running at http://localhost:${PORT}`);
    console.log(`🏁 Final Vault: http://localhost:${PORT}/final/index.html`);
  });
}

module.exports = (req, res) => {
  server.emit('request', req, res);
};
