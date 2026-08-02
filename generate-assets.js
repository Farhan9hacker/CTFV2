/**
 * Build Asset Generator Script
 * Generates clean static image and WebAssembly binary assets.
 * Operation Black Beacon CTF
 */

const fs     = require('fs');
const path   = require('path');

const ROOT = path.join(__dirname);

// ── Ensure directories exist ──────────────────────────────
['images', 'wasm'].forEach(d => {
  const p = path.join(ROOT, d);
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, { recursive: true });
  }
});

// ══════════════════════════════════════════════════════════
// 1. images/beacon.png — PNG with clean metadata
// ══════════════════════════════════════════════════════════

function crc32(buf) {
  let table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function pngText(key, value) {
  const data = Buffer.concat([
    Buffer.from(key + '\x00' + value, 'latin1')
  ]);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const type = Buffer.from('tEXt');
  const crcData = Buffer.concat([type, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcData), 0);
  return Buffer.concat([len, type, data, crcBuf]);
}

function buildPNG() {
  const W = 400, H = 200;
  const signature = Buffer.from([137,80,78,71,13,10,26,10]);
  
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(W, 0);
  ihdrData.writeUInt32BE(H, 4);
  ihdrData[8]  = 8;  // bit depth
  ihdrData[9]  = 2;  // RGB
  ihdrData[10] = 0;  // compression
  ihdrData[11] = 0;  // filter
  ihdrData[12] = 0;  // interlace
  
  const ihdrLen = Buffer.alloc(4);
  ihdrLen.writeUInt32BE(13, 0);
  const ihdrType = Buffer.from('IHDR');
  const ihdrCrcData = Buffer.concat([ihdrType, ihdrData]);
  const ihdrCrc = Buffer.alloc(4);
  ihdrCrc.writeUInt32BE(crc32(ihdrCrcData), 0);
  const ihdr = Buffer.concat([ihdrLen, ihdrType, ihdrData, ihdrCrc]);

  // Raw pixel data for background
  const rowSize = W * 3 + 1;
  const rawData = Buffer.alloc(rowSize * H);
  for (let y = 0; y < H; y++) {
    const rowStart = y * rowSize;
    rawData[rowStart] = 0;
    for (let x = 0; x < W; x++) {
      const px = rowStart + 1 + x * 3;
      rawData[px]     = Math.floor(4 + (x / W) * 12);
      rawData[px + 1] = Math.floor(20 + (y / H) * 22);
      rawData[px + 2] = Math.floor(35 + (x / W) * 25);
    }
  }

  // Deflate
  const CHUNK_SIZE = 65535;
  const deflateChunks = [Buffer.from([0x78, 0x01])];
  let pos = 0;
  while (pos < rawData.length) {
    const end = Math.min(pos + CHUNK_SIZE, rawData.length);
    const chunk = rawData.slice(pos, end);
    const isFinal = (end === rawData.length);
    const blockHeader = Buffer.alloc(5);
    blockHeader[0] = isFinal ? 1 : 0;
    blockHeader.writeUInt16LE(chunk.length, 1);
    blockHeader.writeUInt16LE(~chunk.length & 0xFFFF, 3);
    deflateChunks.push(blockHeader, chunk);
    pos = end;
  }
  
  let s1 = 1, s2 = 0;
  for (const b of rawData) {
    s1 = (s1 + b) % 65521;
    s2 = (s2 + s1) % 65521;
  }
  const adlerVal = ((s2 << 16) | s1) >>> 0;
  const adler = Buffer.alloc(4);
  adler.writeUInt32BE(adlerVal, 0);
  deflateChunks.push(adler);
  
  const compressed = Buffer.concat(deflateChunks);
  const idatLen = Buffer.alloc(4);
  idatLen.writeUInt32BE(compressed.length, 0);
  const idatType = Buffer.from('IDAT');
  const idatCrcData = Buffer.concat([idatType, compressed]);
  const idatCrc = Buffer.alloc(4);
  idatCrc.writeUInt32BE(crc32(idatCrcData), 0);
  const idat = Buffer.concat([idatLen, idatType, compressed, idatCrc]);

  // tEXt metadata chunks
  const textChunks = Buffer.concat([
    pngText('Description',        'Operation Black Beacon — Signal Beacon Chart'),
    pngText('Author',             'Captain Jack Sparrow, 2008'),
    pngText('Software',           'Sparrow Cartographic Engine v2008'),
  ]);

  const iendLen = Buffer.alloc(4);
  const iendType = Buffer.from('IEND');
  const iendCrc = Buffer.alloc(4);
  iendCrc.writeUInt32BE(crc32(iendType), 0);
  const iend = Buffer.concat([iendLen, iendType, iendCrc]);

  return Buffer.concat([signature, ihdr, textChunks, idat, iend]);
}

const pngPath = path.join(ROOT, 'images', 'beacon.png');
fs.writeFileSync(pngPath, buildPNG());

// ══════════════════════════════════════════════════════════
// 2. WASM Module Generator — Clean Computation Engine
// ══════════════════════════════════════════════════════════

function encodeLeb128(n) {
  const result = [];
  while (true) {
    const byte = n & 0x7f;
    n >>= 7;
    if (n === 0) { result.push(byte); break; }
    else { result.push(byte | 0x80); }
  }
  return result;
}

function makeSection(id, payload) {
  return [id, ...encodeLeb128(payload.length), ...payload];
}

function buildWasm() {
  const magic = [0x00, 0x61, 0x73, 0x6d];
  const version = [0x01, 0x00, 0x00, 0x00];
  const typeSec = makeSection(1, [0x01, 0x60, 0x02, 0x7f, 0x7f, 0x01, 0x7f]);
  const funcSec = makeSection(3, [0x01, 0x00]);
  const memSec = makeSection(5, [0x01, 0x00, 0x01]);
  const exportSec = makeSection(7, [
    0x02,
    0x06, 0x6d, 0x65, 0x6d, 0x6f, 0x72, 0x79, 0x02, 0x00,
    0x06, 0x76, 0x65, 0x72, 0x69, 0x66, 0x79, 0x00, 0x00
  ]);

  const funcBody = [
    0x00,
    0x20, 0x01,
    0x0b
  ];

  const codeSec = makeSection(10, [0x01, ...encodeLeb128(funcBody.length), ...funcBody]);

  return Buffer.from([...magic, ...version, ...typeSec, ...funcSec, ...memSec, ...exportSec, ...codeSec]);
}

const wasmPath = path.join(ROOT, 'wasm', 'vault.wasm');
fs.writeFileSync(wasmPath, buildWasm());

const legacyWasmPath = path.join(ROOT, 'wasm', 'legacy.wasm');
fs.writeFileSync(legacyWasmPath, buildWasm());

console.log('⚓ CTF assets generated cleanly.');
