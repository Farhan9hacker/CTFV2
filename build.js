/**
 * build.js — Automated Build & Security Audit Pipeline
 * Operation Black Beacon CTF
 *
 * Minifies client JavaScript, strips comments & console logs,
 * and performs a strict security audit scanning all client files for secrets/flags.
 */

const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname);

const FORBIDDEN_PATTERNS = [
  /SPARROW\{[a-zA-Z0-9_]{5,}\}/i,
  /VANE\{[a-zA-Z0-9_]{5,}\}/i,
  /FLAG\{[a-zA-Z0-9_]{5,}\}/i,
  /anchor_in_the_deep/i,
  /ghost_ship_indexed/i,
  /pixel_by_pixel_truth/i,
  /eec8842991268bfa/i,
  /df900b8e72ef044f/i,
  /BEACONRED/i,
  /targetHash/i,
  /\/\/\s*flag/i,
  /\/\/\s*hint/i,
  /\/\/\s*solution/i,
  /\/\/\s*developer notes/i
];

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const relPath  = path.relative(ROOT, filePath).replace(/\\/g, '/');

    // Exclude protected / backend / system directories & non-public assets
    if (
      relPath.startsWith('node_modules') ||
      relPath.startsWith('.git') ||
      relPath.startsWith('reports') ||
      relPath.startsWith('api') ||
      relPath === 'package.json' ||
      relPath === 'package-lock.json' ||
      relPath === 'README.md' ||
      relPath === 'build.js' ||
      relPath === 'generate-assets.js' ||
      relPath === 'Operation_Black_Beacon_CTF_Guide.pdf' ||
      relPath === 'ctfv2.txt'
    ) {
      return;
    }

    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  });
  return fileList;
}

console.log('⚡ Starting Operation Black Beacon Build & Security Audit Pipeline...\n');

// ── Step 1: Minify & Strip Comments / Console Logs ──────────
const jsFiles = [
  'gate.js',
  'three-scene.js',
  'sw.js',
  'js/layer1.js',
  'js/layer3.js',
  'js/canvas-puzzle.js',
  'js/timing-puzzle.js',
  'js/wasm-loader.js',
  'js/story-popup.js',
  'js/particles.js',
  'js/cursor.js'
];

jsFiles.forEach(rel => {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return;

  let code = fs.readFileSync(abs, 'utf8');

  // Strip single-line comments (except URLs)
  code = code.replace(/(^|[^\:])\/\/[^\n]*/g, '$1');

  // Strip multi-line comments
  code = code.replace(/\/\*[\s\S]*?\*\//g, '');

  // Strip console log/warn/info calls in production client scripts
  code = code.replace(/console\.(log|warn|info|debug|error)\s*\([\s\S]*?\);?/g, '');

  // Remove excess blank lines
  code = code.replace(/\n\s*\n/g, '\n');

  fs.writeFileSync(abs, code, 'utf8');
  console.log(`  ✓ Processed & cleaned ${rel}`);
});

console.log('\n🔍 Executing Security Leak Audit on Public Files...');

const publicFiles = getAllFiles(ROOT);
let violations = 0;

publicFiles.forEach(file => {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const ext = path.extname(file).toLowerCase();

  let content = '';
  if (['.wasm', '.png', '.jpg', '.jpeg', '.ico'].includes(ext)) {
    content = fs.readFileSync(file).toString('binary');
  } else {
    content = fs.readFileSync(file, 'utf8');
  }

  FORBIDDEN_PATTERNS.forEach(pattern => {
    if (pattern.test(content)) {
      console.error(`  ❌ SECURITY LEAK DETECTED in ${rel}: pattern ${pattern}`);
      violations++;
    }
  });
});

if (violations > 0) {
  console.error(`\n❌ BUILD FAILED: ${violations} security violations detected in client bundles.\n`);
  process.exit(1);
} else {
  console.log('  ✓ 100% Security Audit Passed. Zero client-side secrets detected.');
  console.log('\n🚀 Operation Black Beacon Hardened Build Ready!\n');
}
