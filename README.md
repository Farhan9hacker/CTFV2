# ⚓ Operation Black Beacon — CTF Hoster Guide & Deployment Docs

> **Packet Pirates CTF — Operation Black Beacon**  
> *Category:* Web Security / Client-Side Reversing / WebAssembly / Cryptography  
> *Difficulty:* Medium  
> *Author:* Packet Pirates  

---

## 📜 Challenge Overview

**Operation Black Beacon** is an interactive multi-layered web CTF challenge. Players navigate the wreck of Captain Jack Sparrow's lost flagship to recover three torn map fragments, reassemble the chart, and submit the calculated Master Flag to seal the vault.

### Core Architecture

* **Frontend Engine:** Vanilla HTML5/CSS3, JavaScript (ES6+), Three.js 3D WebGL render pipeline, Canvas API.
* **Service Worker Interceptor ([sw.js](file:///home/bunny/Desktop/CTF%20V2/sw.js)):** In-browser network proxy handling synthetic routes (`/beacon`, `/api/root`).
* **WebAssembly Engine ([wasm/vault.wasm](file:///home/bunny/Desktop/CTF%20V2/wasm/vault.wasm)):** Real compiled WASM cipher engine protecting Fragment III.
* **Backend Verification ([api/server.js](file:///home/bunny/Desktop/CTF%20V2/api/server.js)):** Rate-limited Node.js HTTP server serving assets and validating final master flag submissions (`POST /api/verify`).

---

## 🚀 Quick Start for Organizers / Hosters

### Prerequisites

* **Node.js:** `>= 16.0.0`
* **npm:** `>= 8.0.0`

### 1. Clone & Install
```bash
git clone <repository-url>
cd "CTF V2"
```

### 2. Generate Challenge Assets
Before launching the server for the first time, run the asset generator script to build WebAssembly binaries and metadata-injected PNGs:
```bash
npm run generate
```
*Outputs generated into `wasm/vault.wasm` and `images/beacon.png`.*

### 3. Launch the Server
To start the CTF server locally:
```bash
npm start
```
*By default, the server runs at **`http://localhost:3000`**.*

To specify a custom port:
```bash
PORT=8080 npm start
```

---

## 🐳 Docker Deployment

Run the challenge inside a hardened, isolated Node Alpine container for local testing or CTF hosting:

### Option A: Docker Compose (Recommended)
```bash
# Build & start container in detached mode
docker-compose up -d --build

# View container logs
docker-compose logs -f

# Stop and remove container
docker-compose down
```
*Access the CTF at **`http://localhost:3000`**.*

### Option B: Docker CLI
```bash
# Build the Docker image
docker build -t operation-black-beacon .

# Run the container on port 3000
docker run -d -p 3000:3000 --name black-beacon-ctf operation-black-beacon

# Stop container
docker stop black-beacon-ctf
```

---

## 🛡️ Security Controls & Hosting Configuration

| Security Feature | Location | Configuration / Behavior |
| :--- | :--- | :--- |
| **Rate Limiter** | [api/server.js](file:///home/bunny/Desktop/CTF%20V2/api/server.js#L18-L32) | Limits `POST /api/verify` to **10 requests / 60 seconds** per IP (`429 Rate limit exceeded`). |
| **Protected Files** | [api/server.js](file:///home/bunny/Desktop/CTF%20V2/api/server.js#L130-L144) | Blocks `.git`, `package.json`, `.env`, `README.md`, `/src`, and `node_modules` (`404 Not Found`). |
| **Anti-Automation** | [gate.js](file:///home/bunny/Desktop/CTF%20V2/gate.js#L163-L175) | Detects `navigator.webdriver` (headless Chrome/Puppeteer/Selenium) and seals viewport. |
| **Anti-DevTools Gate** | [gate.js](file:///home/bunny/Desktop/CTF%20V2/gate.js#L38-L70) | Prevents right-click context menu and standard DevTools key combinations (`F12`, `Ctrl+Shift+I/J/C/K`, `Ctrl+U`). |

---

## 🔑 Official Admin & Organizer Flag Solutions

### 📌 Layer 0: Anti-Inspect Gate Override
* **Override Code:** `BLACKBEARD`
* **Trigger:** Invoke `window.__beacon_override('BLACKBEARD')` in console or submit via lock screen bypass.

---

### 📌 Fragment I: Base91 & CSS Animation Delay Decoding
* **Sub-Flag 1:** `SPARROW{anchor_in_the_deep}`
* **Solution:**
  1. Inspect HTML comment in `index.html`: `*Djd#{]@`
  2. Inspect inline ember CSS animation delays (`ember-v`: 86, `ember-a`: 65, etc.).
  3. Run decoder helper in console: `_vaneDecode("*Djd#{]@")` -> `SPARROW{anchor_in_the_deep}`.

---

### 📌 Fragment II: Service Worker & IndexedDB Archive
* **Sub-Flag 2:** `SPARROW{ghost_ship_indexed}`
* **Solution:**
  1. Inspect Service Worker `sw.js` headers on `/beacon` or `/pages/archive.html`.
  2. Elevate LocalStorage / Cookie role to `quartermaster` (`localStorage.setItem('vane_ledger_role', 'quartermaster')`).
  3. Inspect IndexedDB database `VaneArchive` -> table `logs` -> entry `log-1708` payload decrypted -> `SPARROW{ghost_ship_indexed}`.

---

### 📌 Fragment III: Canvas Pixel Math & WebAssembly Cipher
* **Sub-Flag 3:** `SPARROW{pixel_by_pixel_truth}`
* **Solution:**
  1. Inspect `images/logo.svg` metadata tag `row="0x2a"` (Row 42).
  2. Extract painted RGB byte array on `#flag-canvas` row 42 -> ASCII `[66, 69, 65, 67, 79, 78, 82, 69, 68]` = `BEACONRED`.
  3. Submit `BEACONRED` into the **Strongbox Cipher Engine** on `/pages/beacon.html` to execute `wasm/vault.wasm` `verify()` export.

---

### 🏆 Master Flag Calculation
The master flag submitted to `POST /api/verify` or on the Final Vault page ([final/index.html](file:///home/bunny/Desktop/CTF%20V2/final/index.html)) is calculated by concatenating all 3 sub-flags and SHA-256 hashing the string:

```javascript
const flags = [
  'SPARROW{anchor_in_the_deep}',
  'SPARROW{ghost_ship_indexed}',
  'SPARROW{pixel_by_pixel_truth}'
];
const combined = flags.join(''); // "SPARROW{anchor_in_the_deep}SPARROW{ghost_ship_indexed}SPARROW{pixel_by_pixel_truth}"
const hash = crypto.createHash('sha256').update(combined).digest('hex');
const masterFlag = 'SPARROW{' + hash.substring(0, 16) + '}';
```

* **Master Flag:** `SPARROW{df900b8e72ef044f}` *(or Legacy Flag `VANE{df900b8e72ef044f}`)*

---

## 📡 Verification Endpoint API Specs

### `POST /api/verify`

**Request Body (JSON):**
```json
{
  "flag": "SPARROW{df900b8e72ef044f}"
}
```

**Success Response (HTTP 200):**
```json
{
  "success": true,
  "message": "The X is found. Claim the haul.",
  "flag": "SPARROW{df900b8e72ef044f}"
}
```

**Failure Response (HTTP 401):**
```json
{
  "success": false,
  "message": "Wrong bearing. The vault stays sealed."
}
```

**Rate Limited Response (HTTP 429):**
```json
{
  "error": "Rate limit exceeded. Try again later."
}
```

---

## 🛠️ Maintenance & Troubleshooting

* **Missing WebAssembly / Assets:** If `/wasm/vault.wasm` returns 404, re-run `npm run generate`.
* **Port Conflict:** If port 3000 is occupied, set `PORT=3001 npm start`.
* **Proxy / SSL Setup:** Place Nginx or Cloudflare in front of Node.js for HTTPS termination and DDoS protection during live competition events.
