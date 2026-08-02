/**
 * _secrets.js — Central Server Secrets & Security Utility Module
 * Operation Black Beacon CTF
 * Private module used by serverless functions and local server.
 */

const crypto = require('crypto');

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

/* ── Rate Limiting & Security Helpers ─────────────────────── */
const rateLimitMap = new Map();
const RATE_LIMIT = 15; // max 15 attempts per minute per IP
const RATE_WINDOW = 60 * 1000; // 1 minute window

function isRateLimited(req) {
  const ip = (req.headers && req.headers['x-forwarded-for']) || (req.socket && req.socket.remoteAddress) || '127.0.0.1';
  const clientIp = ip.split(',')[0].trim();
  const now = Date.now();
  const data = rateLimitMap.get(clientIp) || { count: 0, resetAt: now + RATE_WINDOW };

  if (now > data.resetAt) {
    data.count = 0;
    data.resetAt = now + RATE_WINDOW;
  }
  data.count++;
  rateLimitMap.set(clientIp, data);
  return data.count > RATE_LIMIT;
}

function applySecurityHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-CTF', 'Black-Beacon');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
}

module.exports = {
  FRAGMENTS,
  PASSPHRASES,
  MASTER_FLAG,
  LEGACY_MASTER_FLAG,
  isRateLimited,
  applySecurityHeaders
};
