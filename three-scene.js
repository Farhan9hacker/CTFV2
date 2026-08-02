
(function () {
  'use strict';
  if (typeof THREE === 'undefined') return;
  const canvas = document.getElementById('three-canvas');
  if (!canvas) return;
  const isMobile = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768;
  const subDivs  = isMobile ? 60 : 160;
  const maxDPR   = isMobile ? 1.2 : Math.min(window.devicePixelRatio, 2);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: !isMobile,
    powerPreference: 'high-performance'
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(maxDPR);
  renderer.setClearColor(0x01060d, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  function createSoftParticleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.5)');
    grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(32, 32, 32, 0, Math.PI * 2);
    ctx.fill();
    return new THREE.CanvasTexture(canvas);
  }
  const softParticleMap = createSoftParticleTexture();
  function createVolumetricBeamTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 0.40)');
    grad.addColorStop(0.2, 'rgba(255, 255, 255, 0.22)');
    grad.addColorStop(0.7, 'rgba(255, 255, 255, 0.08)');
    grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 256);
    return new THREE.CanvasTexture(canvas);
  }
  const beamTextureMap = createVolumetricBeamTexture();
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.5, 800);
  const savedCamState = JSON.parse(sessionStorage.getItem('bb_camera_pos') || 'null');
  if (savedCamState) {
    camera.position.set(savedCamState.x, savedCamState.y, savedCamState.z);
  } else {
    camera.position.set(0, 6.2, 16.5);
  }
  let composer = null;
  let bloomPass = null;
  let vignettePass = null;
  if (!isMobile && typeof THREE.EffectComposer !== 'undefined') {
    try {
      composer = new THREE.EffectComposer(renderer);
      composer.addPass(new THREE.RenderPass(scene, camera));
      if (typeof THREE.UnrealBloomPass !== 'undefined') {
        bloomPass = new THREE.UnrealBloomPass(
          new THREE.Vector2(window.innerWidth, window.innerHeight),
          0.50, 
          0.40, 
          0.85  
        );
        composer.addPass(bloomPass);
      }
      if (typeof THREE.ShaderPass !== 'undefined') {
        const CustomVignetteShader = {
          uniforms: {
            tDiffuse: { value: null },
            uTime: { value: 0 },
            uVignetteIntensity: { value: 0.45 },
            uGrainIntensity: { value: 0.04 },
            uChromaShift: { value: 0.0012 }
          },
          vertexShader: `
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            uniform sampler2D tDiffuse;
            uniform float uTime;
            uniform float uVignetteIntensity;
            uniform float uGrainIntensity;
            uniform float uChromaShift;
            varying vec2 vUv;
            float rand(vec2 co) {
              return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
            }
            void main() {
              vec2 uv = vUv;
              vec2 dist = uv - vec2(0.5);
              float r = length(dist);
              float vig = 1.0 - smoothstep(0.4, 0.95, r * uVignetteIntensity);
              vec2 shift = dist * uChromaShift;
              float red = texture2D(tDiffuse, uv + shift).r;
              float green = texture2D(tDiffuse, uv).g;
              float blue = texture2D(tDiffuse, uv - shift).b;
              vec3 col = vec3(red, green, blue);
              float grain = (rand(uv + fract(uTime)) - 0.5) * uGrainIntensity;
              col += vec3(grain);
              col *= vig;
              gl_FragColor = vec4(col, 1.0);
            }
          `
        };
        vignettePass = new THREE.ShaderPass(CustomVignetteShader);
        composer.addPass(vignettePass);
      }
    } catch (e) {
      composer = null;
    }
  }
  const fogColor = new THREE.Color(0x020a14);
  scene.fog = new THREE.FogExp2(fogColor.getHex(), 0.008);
  const ambientLight = new THREE.AmbientLight(0x0c253a, 1.9);
  scene.add(ambientLight);
  const moonLight = new THREE.DirectionalLight(0x52d3eb, 2.6);
  moonLight.position.set(-70, 90, -50);
  scene.add(moonLight);
  const horizonLight = new THREE.DirectionalLight(0xffb703, 0.85);
  horizonLight.position.set(50, 18, -120);
  scene.add(horizonLight);
  const lightningLight = new THREE.DirectionalLight(0xbde0fe, 0.0);
  lightningLight.position.set(0, 140, -90);
  scene.add(lightningLight);
  const oceanSize = 500;
  const oceanGeo  = new THREE.PlaneGeometry(oceanSize, oceanSize, subDivs, subDivs);
  oceanGeo.rotateX(-Math.PI / 2);
  const oceanMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime:             { value: 0 },
      uWeatherProg:      { value: 0 },
      uDeepColor:        { value: new THREE.Color(0x01060d) },
      uMidColor:         { value: new THREE.Color(0x052236) },
      uCrestColor:       { value: new THREE.Color(0x0c7b93) },
      uFoamColor:        { value: new THREE.Color(0x7ae5f5) },
      uSkyReflectColor:  { value: new THREE.Color(0x154565) },
      uMoonPos:          { value: new THREE.Vector3(-70, 90, -50) },
      uBeaconPos:        { value: new THREE.Vector3(0, 24, -220) },
      uBeaconColor:      { value: new THREE.Color(0xffb703) },
      uBeaconIntensity:  { value: 0 }
    },
    vertexShader: `
      uniform float uTime;
      uniform float uWeatherProg;
      varying float vElevation;
      varying vec2  vUv;
      varying vec3  vWorldPos;
      varying vec3  vNormal;
      vec3 gerstnerWave(vec2 p, vec2 dir, float steepness, float wavelength, float speed) {
        float k = 6.28318535 / wavelength;
        float c = sqrt(9.81 / k) * speed;
        float f = k * (dot(dir, p) - c * uTime);
        float a = steepness / k;
        float stormMult = 1.0 + uWeatherProg * 1.1;
        a *= stormMult;
        return vec3(
          dir.x * (a * cos(f)),
          a * sin(f),
          dir.y * (a * cos(f))
        );
      }
      void main() {
        vUv = uv;
        vec3 pos = position;
        vec3 w1 = gerstnerWave(pos.xz, vec2(0.707, 0.707), 0.30, 28.0, 1.3);
        vec3 w2 = gerstnerWave(pos.xz, vec2(-0.6, 0.8),   0.20, 18.0, 1.6);
        vec3 w3 = gerstnerWave(pos.xz, vec2(0.9, -0.4),   0.12, 9.0,  2.2);
        vec3 w4 = gerstnerWave(pos.xz, vec2(0.3, 0.95),   0.07, 4.5,  3.0);
        vec3 w5 = gerstnerWave(pos.xz, vec2(-0.85, -0.52),0.04, 2.2,  4.2);
        vec3 totalWave = w1 + w2 + w3 + w4 + w5;
        pos += totalWave;
        vElevation = totalWave.y;
        float eps = 0.2;
        vec3 pX = position + vec3(eps, 0.0, 0.0) + gerstnerWave(position.xz + vec2(eps, 0.0), vec2(0.707, 0.707), 0.30, 28.0, 1.3);
        vec3 pZ = position + vec3(0.0, 0.0, eps) + gerstnerWave(position.xz + vec2(0.0, eps), vec2(0.707, 0.707), 0.30, 28.0, 1.3);
        vec3 nCalc = normalize(cross(pZ - pos, pX - pos));
        vNormal = normalMatrix * nCalc;
        vec4 worldPos = modelMatrix * vec4(pos, 1.0);
        vWorldPos = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform vec3  uDeepColor;
      uniform vec3  uMidColor;
      uniform vec3  uCrestColor;
      uniform vec3  uFoamColor;
      uniform vec3  uSkyReflectColor;
      uniform vec3  uMoonPos;
      uniform vec3  uBeaconPos;
      uniform vec3  uBeaconColor;
      uniform float uBeaconIntensity;
      uniform float uWeatherProg;
      varying float vElevation;
      varying vec2  vUv;
      varying vec3  vWorldPos;
      varying vec3  vNormal;
      void main() {
        float slope = 1.0 - max(dot(vNormal, vec3(0.0, 1.0, 0.0)), 0.0);
        float foamSteep = smoothstep(0.18, 0.55, slope);
        float foamElevation = smoothstep(1.3, 2.8, vElevation);
        float totalFoam = clamp(foamElevation + foamSteep * 0.75, 0.0, 1.0);
        vec3 col = mix(uDeepColor, uMidColor, smoothstep(-2.5, -0.2, vElevation));
        col = mix(col, uCrestColor, smoothstep(-0.2, 1.3, vElevation));
        col = mix(col, uFoamColor, totalFoam);
        float sss = smoothstep(-0.5, 1.8, vElevation) * 0.35;
        col += vec3(0.05, 0.65, 0.75) * sss * (1.0 + uWeatherProg * 0.5);
        vec3 viewDir  = normalize(cameraPosition - vWorldPos);
        vec3 moonDir  = normalize(uMoonPos - vWorldPos);
        vec3 halfMoon = normalize(moonDir + viewDir);
        float moonSpec = pow(max(dot(vNormal, halfMoon), 0.0), 140.0) * 1.25;
        col += vec3(0.35, 0.85, 1.0) * moonSpec;
        vec3 beaconDir  = normalize(uBeaconPos - vWorldPos);
        vec3 halfBeacon = normalize(beaconDir + viewDir);
        float beaconSpec = pow(max(dot(vNormal, halfBeacon), 0.0), 160.0) * uBeaconIntensity * 2.2;
        col += uBeaconColor * beaconSpec;
        float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 5.0);
        col = mix(col, uSkyReflectColor, fresnel * 0.55);
        float dist = length(vWorldPos.xz);
        float fade = smoothstep(120.0, 240.0, dist);
        col = mix(col, uDeepColor, fade);
        gl_FragColor = vec4(col, 0.96);
      }
    `,
    transparent: true,
  });
  const ocean = new THREE.Mesh(oceanGeo, oceanMat);
  ocean.position.y = -2.2;
  scene.add(ocean);
  function getSeaHeight(x, z, time, weatherProg) {
    const stormMult = 1.0 + weatherProg * 1.1;
    let e = 0;
    e += Math.sin(x * 0.14 + z * 0.14 - time * 1.3) * 1.0 * stormMult;
    e += Math.sin(-x * 0.16 + z * 0.22 + time * 1.6) * 0.65 * stormMult;
    e += Math.sin(x * 0.35 + z * 0.28 - time * 2.2) * 0.3;
    e += Math.sin(-x * 0.85 - z * 0.52 + time * 4.2) * 0.1;
    return e - 2.2;
  }
  function buildAAAPirateGalleon() {
    const ship = new THREE.Group();
    const darkWood = new THREE.MeshStandardMaterial({ color: 0x180d07, roughness: 0.80, metalness: 0.05, emissive: 0x000000 });
    const midWood  = new THREE.MeshStandardMaterial({ color: 0x301a0b, roughness: 0.75, metalness: 0.05, emissive: 0x000000 });
    const deckWood = new THREE.MeshStandardMaterial({ color: 0x4a2e16, roughness: 0.70, metalness: 0.05, emissive: 0x000000 });
    const goldTrim = new THREE.MeshStandardMaterial({ color: 0xffb703, roughness: 0.30, metalness: 0.85, emissive: 0x000000 });
    const ironMat  = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.40, metalness: 0.85, emissive: 0x000000 });
    const sailMat  = new THREE.MeshStandardMaterial({ color: 0x0f1b26, roughness: 0.85, side: THREE.DoubleSide, transparent: true, opacity: 0.95 });
    const flagMat  = new THREE.MeshBasicMaterial({ color: 0x050505, side: THREE.DoubleSide });
    const lensMat  = new THREE.MeshBasicMaterial({ color: 0xffcb3d, transparent: true, opacity: 0.85 });
    const keel = new THREE.Mesh(new THREE.BoxGeometry(3.0, 2.4, 14.0), darkWood);
    keel.position.set(0, 1.2, 0);
    ship.add(keel);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.6, 13.0), midWood);
    deck.position.set(0, 2.6, 0);
    ship.add(deck);
    const deckPlanks = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.15, 12.6), deckWood);
    deckPlanks.position.set(0, 3.35, 0);
    ship.add(deckPlanks);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.38, 13.0), goldTrim);
    rail.position.set(0, 3.55, 0);
    ship.add(rail);
    for (let z = -5.5; z <= 5.5; z += 1.8) {
      for (let side = -1; side <= 1; side += 2) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 6), goldTrim);
        post.position.set(side * 2.25, 3.8, z);
        ship.add(post);
      }
    }
    for (let i = 0; i < 4; i++) {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.65, 0.65), darkWood);
      crate.position.set(-1.2 + (i % 2) * 0.8, 3.75, 1.0 + Math.floor(i / 2) * 0.8);
      ship.add(crate);
    }
    const barrelGeo = new THREE.CylinderGeometry(0.32, 0.38, 0.8, 8);
    for (let i = 0; i < 3; i++) {
      const barrel = new THREE.Mesh(barrelGeo, midWood);
      barrel.position.set(1.4, 3.8, -2.0 + i * 0.75);
      ship.add(barrel);
    }
    const helmGroup = new THREE.Group();
    helmGroup.position.set(0, 4.4, 4.2);
    const helmWheel = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.07, 8, 12), goldTrim);
    helmGroup.add(helmWheel);
    const helmPost = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.9, 6), darkWood);
    helmPost.position.y = -0.45;
    helmGroup.add(helmPost);
    ship.add(helmGroup);
    const bowCone = new THREE.Mesh(new THREE.ConeGeometry(2.3, 5.5, 16), darkWood);
    bowCone.rotation.x = -Math.PI / 2;
    bowCone.position.set(0, 2.4, -8.5);
    ship.add(bowCone);
    const bowsprit = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.19, 8.5, 12), darkWood);
    bowsprit.rotation.x = -Math.PI / 3.5;
    bowsprit.position.set(0, 3.6, -11.5);
    ship.add(bowsprit);
    const figBody = new THREE.Mesh(new THREE.ConeGeometry(0.38, 1.8, 8), goldTrim);
    figBody.rotation.x = -Math.PI / 3;
    figBody.position.set(0, 3.4, -9.3);
    ship.add(figBody);
    const sternGroup = new THREE.Group();
    sternGroup.position.set(0, 3.5, 5.2);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(4.5, 2.5, 4.2), darkWood);
    cabin.position.y = 1.25;
    sternGroup.add(cabin);
    const lanternMat = new THREE.MeshBasicMaterial({ color: 0xffb703 });
    const swingingLanterns = [];
    const ghostPointLights = [];
    for (let lx = -1.4; lx <= 1.4; lx += 1.4) {
      const lanternGroup = new THREE.Group();
      lanternGroup.position.set(lx, 2.6, 1.7);
      const lanternMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.65, 8), lanternMat);
      lanternGroup.add(lanternMesh);
      const flareMesh = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 8), lensMat);
      lanternGroup.add(flareMesh);
      const pLight = new THREE.PointLight(0xffb703, 1.8, 26, 2.0);
      lanternGroup.add(pLight);
      const gLight = new THREE.PointLight(0x2ec4dd, 0.0, 26, 2.0);
      lanternGroup.add(gLight);
      ghostPointLights.push(gLight);
      sternGroup.add(lanternGroup);
      swingingLanterns.push(lanternGroup);
    }
    ship.add(sternGroup);
    const animatedSails = [];
    function buildMast(x, z, height, sailW, sailH) {
      const mastGroup = new THREE.Group();
      mastGroup.position.set(x, 3.3, z);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.23, height, 10), darkWood);
      pole.position.y = height / 2;
      mastGroup.add(pole);
      const nest = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.55, 0.65, 8), darkWood);
      nest.position.y = height * 0.76;
      mastGroup.add(nest);
      const yard = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, sailW + 0.9, 8), darkWood);
      yard.rotation.z = Math.PI / 2;
      yard.position.y = height * 0.68;
      mastGroup.add(yard);
      for (let side = -1; side <= 1; side += 2) {
        const shroudGeo = new THREE.BufferGeometry();
        const shroudPos = new Float32Array([
          side * 1.8, 0, 0,
          side * 0.4, height * 0.76, 0
        ]);
        shroudGeo.setAttribute('position', new THREE.BufferAttribute(shroudPos, 3));
        const shroudLine = new THREE.Line(shroudGeo, new THREE.LineBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.7 }));
        mastGroup.add(shroudLine);
      }
      const sailGeo = new THREE.PlaneGeometry(sailW, sailH, 14, 14);
      const posAttr = sailGeo.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        const vy = posAttr.getY(i);
        const bulge = Math.cos((vy / sailH) * Math.PI) * (sailW * 0.17);
        posAttr.setZ(i, posAttr.getZ(i) - bulge);
      }
      sailGeo.computeVertexNormals();
      const sailMesh = new THREE.Mesh(sailGeo, sailMat);
      sailMesh.position.set(0, height * 0.52, -0.3);
      mastGroup.add(sailMesh);
      animatedSails.push(sailMesh);
      return { mastGroup, sailMesh };
    }
    const { mastGroup: mainMast }   = buildMast(0, -0.2, 14.0, 5.6, 6.4);
    const { mastGroup: foreMast }   = buildMast(0, -4.8, 11.5, 4.6, 5.4);
    const { mastGroup: mizzenMast } = buildMast(0, 4.2, 9.2, 3.8, 4.4);
    ship.add(mainMast, foreMast, mizzenMast);
    const pirateFlag = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.4, 10, 6), flagMat);
    pirateFlag.position.set(1.2, 17.2, -0.2);
    ship.add(pirateFlag);
    const anchorGroup = new THREE.Group();
    const anchorRing = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.08, 8, 16), ironMat);
    const anchorShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.9, 8), ironMat);
    anchorShaft.position.y = -0.95;
    const anchorArms = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.08, 8, 16, Math.PI), ironMat);
    anchorArms.rotation.x = Math.PI / 2;
    anchorArms.position.y = -1.9;
    anchorGroup.add(anchorRing, anchorShaft, anchorArms);
    anchorGroup.position.set(-2.8, 2.6, -9.5);
    ship.add(anchorGroup);
    ship.scale.set(0.72, 0.72, 0.72);
    return { galleonGroup: ship, pirateFlag, anchorGroup, swingingLanterns, ghostPointLights, animatedSails, helmGroup };
  }
  const { galleonGroup: ship, pirateFlag, anchorGroup, swingingLanterns, ghostPointLights, animatedSails, helmGroup } = buildAAAPirateGalleon();
  ship.position.set(0, 0, 0);
  scene.add(ship);
  function buildBlackBeaconIsland() {
    const island = new THREE.Group();
    island.position.set(0, -5.5, -220);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x0a121a, roughness: 0.92, metalness: 0.2 });
    const rockBase1 = new THREE.Mesh(new THREE.DodecahedronGeometry(10, 2), rockMat);
    rockBase1.scale.set(1.4, 0.35, 1.2);
    rockBase1.position.y = -1.0;
    island.add(rockBase1);
    const rockBase2 = new THREE.Mesh(new THREE.IcosahedronGeometry(7, 1), rockMat);
    rockBase2.position.set(-6, -1.8, 2);
    rockBase2.scale.set(1.2, 0.4, 1.1);
    island.add(rockBase2);
    const rockBase3 = new THREE.Mesh(new THREE.DodecahedronGeometry(6, 1), rockMat);
    rockBase3.position.set(7, -1.6, -3);
    rockBase3.scale.set(1.1, 0.38, 1.2);
    island.add(rockBase3);
    const aoMat = new THREE.MeshBasicMaterial({ color: 0x01060d, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
    const aoRing = new THREE.Mesh(new THREE.RingGeometry(8, 18, 24), aoMat);
    aoRing.rotation.x = -Math.PI / 2;
    aoRing.position.y = 0.05;
    island.add(aoRing);
    const towerMat  = new THREE.MeshStandardMaterial({ color: 0x14202c, roughness: 0.8 });
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xffb703 });
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.8, 24, 16), towerMat);
    tower.position.y = 11;
    island.add(tower);
    const winMat = new THREE.MeshBasicMaterial({ color: 0xffb703 });
    for (let wy = 6; wy <= 18; wy += 6) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.65, 0.2), winMat);
      win.position.set(0, wy, 2.1 - wy * 0.04);
      island.add(win);
    }
    const lanternRoom = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 4.0, 12), beaconMat);
    lanternRoom.position.y = 24;
    island.add(lanternRoom);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.6, 3.2, 12), rockMat);
    roof.position.y = 27.5;
    island.add(roof);
    const beaconSpot1 = new THREE.SpotLight(0xffb703, 14, 260, Math.PI / 5.5, 0.35, 1.2);
    beaconSpot1.position.set(0, 24, 0);
    beaconSpot1.near = 2.5;
    island.add(beaconSpot1);
    const beaconSpot2 = new THREE.SpotLight(0x2ec4dd, 9, 260, Math.PI / 5.5, 0.35, 1.2);
    beaconSpot2.position.set(0, 24, 0);
    beaconSpot2.near = 2.5;
    island.add(beaconSpot2);
    const coneGeo = new THREE.ConeGeometry(14, 120, 16, 1, true);
    coneGeo.rotateX(Math.PI / 2);
    coneGeo.translate(0, 0, 60);
    const coneMat1 = new THREE.MeshBasicMaterial({
      color: 0xffb703,
      map: beamTextureMap,
      transparent: true,
      opacity: 0.14,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const beamMesh1 = new THREE.Mesh(coneGeo, coneMat1);
    beamMesh1.position.set(0, 24, 0);
    island.add(beamMesh1);
    const coneMat2 = new THREE.MeshBasicMaterial({
      color: 0x2ec4dd,
      map: beamTextureMap,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const beamMesh2 = new THREE.Mesh(coneGeo, coneMat2);
    beamMesh2.position.set(0, 24, 0);
    island.add(beamMesh2);
    const pierMat = new THREE.MeshStandardMaterial({ color: 0x241408, roughness: 0.85 });
    const pier = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.8, 14.0), pierMat);
    pier.position.set(0, 1.0, 12.0);
    island.add(pier);
    return { islandGroup: island, beaconSpot1, beaconSpot2, beamMesh1, beamMesh2 };
  }
  const { islandGroup: island, beaconSpot1, beaconSpot2, beamMesh1, beamMesh2 } = buildBlackBeaconIsland();
  scene.add(island);
  const ghostShip = new THREE.Group();
  ghostShip.position.set(-80, 0, -110);
  const ghostMat = new THREE.MeshBasicMaterial({ color: 0x2ec4dd, transparent: true, opacity: 0.0, side: THREE.DoubleSide });
  const ghostHull = new THREE.Mesh(new THREE.BoxGeometry(3.5, 2.2, 11), ghostMat);
  ghostShip.add(ghostHull);
  scene.add(ghostShip);
  const rainCount = isMobile ? 300 : 1200;
  const rainGeo   = new THREE.BufferGeometry();
  const rainPos   = new Float32Array(rainCount * 3);
  for (let i = 0; i < rainCount * 3; i += 3) {
    rainPos[i]     = (Math.random() - 0.5) * 200;
    rainPos[i + 1] = Math.random() * 90;
    rainPos[i + 2] = (Math.random() - 0.5) * 240;
  }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rainMat = new THREE.PointsMaterial({
    color: 0x9edbfa,
    map: softParticleMap,
    size: 0.28,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: true
  });
  const rainParticles = new THREE.Points(rainGeo, rainMat);
  scene.add(rainParticles);
  const sprayCount = isMobile ? 40 : 120;
  const sprayGeo   = new THREE.BufferGeometry();
  const sprayPos   = new Float32Array(sprayCount * 3);
  for (let i = 0; i < sprayCount * 3; i += 3) {
    sprayPos[i]     = (Math.random() - 0.5) * 4.5;
    sprayPos[i + 1] = Math.random() * 2.0;
    sprayPos[i + 2] = -11.5 + (Math.random() - 0.5) * 2.5;
  }
  sprayGeo.setAttribute('position', new THREE.BufferAttribute(sprayPos, 3));
  const sprayMat = new THREE.PointsMaterial({
    color: 0x7ae5f5,
    map: softParticleMap,
    size: 0.35,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: true
  });
  const sprayParticles = new THREE.Points(sprayGeo, sprayMat);
  ship.add(sprayParticles);
  const starCount = 800;
  const starPos   = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount * 3; i += 3) {
    starPos[i]     = (Math.random() - 0.5) * 450;
    starPos[i + 1] = Math.random() * 160 + 20;
    starPos[i + 2] = (Math.random() - 0.5) * 450;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xd6f0fa,
    map: softParticleMap,
    size: 0.30,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    fog: true
  });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(4.8, 24, 24), new THREE.MeshBasicMaterial({ color: 0xe0f7fa }));
  moon.position.set(-70, 90, -50);
  scene.add(moon);
  const shipSpline = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 10.0),       
    new THREE.Vector3(-3.5, 0, -35.0),   
    new THREE.Vector3(4.0, 0, -80.0),    
    new THREE.Vector3(-1.8, 0, -125.0),  
    new THREE.Vector3(0, 0, -160.0)      
  ]);
  let targetProgress = 0;
  let progress       = 0;
  window.addEventListener('wheel', function (e) {
    const delta = e.deltaY * 0.0006;
    targetProgress = Math.min(1.0, Math.max(0.0, targetProgress + delta));
  }, { passive: true });
  function updateScrollFromWindow() {
    const totalH = document.documentElement.scrollHeight - window.innerHeight;
    if (totalH > 0 && Math.abs(window.scrollY / totalH - targetProgress) > 0.05) {
      targetProgress = Math.min(1.0, Math.max(0.0, window.scrollY / totalH));
    }
  }
  window.addEventListener('scroll', updateScrollFromWindow, { passive: true });
  let touchStartY = 0;
  window.addEventListener('touchstart', e => { touchStartY = e.touches[0].clientY; }, { passive: true });
  window.addEventListener('touchmove', e => {
    const deltaY = (touchStartY - e.touches[0].clientY) * 0.0016;
    touchStartY = e.touches[0].clientY;
    targetProgress = Math.min(1.0, Math.max(0.0, targetProgress + deltaY));
  }, { passive: true });
  let mouseX = 0, mouseY = 0;
  let dampedMouseX = 0, dampedMouseY = 0;
  document.addEventListener('mousemove', function (e) {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  });
  window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (composer) composer.setSize(window.innerWidth, window.innerHeight);
  });
  function getSolvedState() {
    try {
      const p = JSON.parse(localStorage.getItem('bb_progress') || '{"layers":[]}');
      return p.layers || [];
    } catch (e) {
      return [];
    }
  }
  const initialBlackFade = document.getElementById('initial-black-fade');
  const teamOverlay      = document.getElementById('team-reveal-overlay');
  const teamSubtitle     = document.getElementById('team-subtitle');
  const letters          = document.querySelectorAll('.reveal-letter');
  function updateTeamRevealTimeline(prog) {
    if (initialBlackFade) {
      if (prog < 0.20) {
        const fadeVal = Math.max(0, 1.0 - (prog / 0.15));
        initialBlackFade.style.opacity = fadeVal;
      } else {
        initialBlackFade.style.opacity = '0';
      }
    }
    if (teamOverlay) {
      if (prog >= 0.72 && prog <= 0.98) {
        teamOverlay.style.opacity = '1';
        const revealProg = Math.min(1.0, Math.max(0.0, (prog - 0.74) / 0.16));
        const totalLetters = letters.length;
        const countToAssemble = Math.floor(revealProg * (totalLetters + 1));
        letters.forEach((letter, idx) => {
          if (idx < countToAssemble) {
            letter.classList.add('assembled');
          } else {
            letter.classList.remove('assembled');
          }
        });
        if (revealProg > 0.75 && teamSubtitle) {
          teamSubtitle.classList.add('visible');
        } else if (teamSubtitle) {
          teamSubtitle.classList.remove('visible');
        }
      } else {
        teamOverlay.style.opacity = '0';
        letters.forEach(letter => letter.classList.remove('assembled'));
        if (teamSubtitle) teamSubtitle.classList.remove('visible');
      }
    }
  }
  const _tmpShipPos          = new THREE.Vector3();
  const _tmpShipAhead        = new THREE.Vector3();
  const _tmpHeading          = new THREE.Vector3();
  const _tmpCamPos           = new THREE.Vector3();
  const _tmpLookTarget       = new THREE.Vector3();
  const _tmpSpot1            = new THREE.Vector3();
  const _tmpSpot2            = new THREE.Vector3();
  const _tmpLighthouseCenter = new THREE.Vector3(0, 11.0, -220.0);
  const _tmpPushDir          = new THREE.Vector3();
  const clock = new THREE.Clock();
  let time = 0;
  let lightningTimer = 0;
  let lightningFlashVal = 0;
  function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.05);
    time += delta * 1.1;
    progress     = THREE.MathUtils.damp(progress, targetProgress, 4.5, delta);
    dampedMouseX = THREE.MathUtils.damp(dampedMouseX, mouseX, 3.0, delta);
    dampedMouseY = THREE.MathUtils.damp(dampedMouseY, mouseY, 3.0, delta);
    updateTeamRevealTimeline(progress);
    const solvedLayers = getSolvedState();
    const hasFlag1 = solvedLayers.includes(1);
    const hasFlag2 = solvedLayers.includes(2);
    const hasFlag3 = solvedLayers.includes(3);
    const hasFlag4 = solvedLayers.includes(4);
    let weatherIntensity = 0;
    if (hasFlag3) {
      weatherIntensity = 0.85;
    } else if (hasFlag2) {
      weatherIntensity = 0.15;
    } else if (progress > 0.40 && progress < 0.60) {
      weatherIntensity = (progress - 0.40) * 2.5;
    } else if (progress >= 0.60 && progress <= 0.75) {
      weatherIntensity = 0.50 - (progress - 0.60) * 1.8;
    }
    oceanMat.uniforms.uTime.value = time;
    oceanMat.uniforms.uWeatherProg.value = weatherIntensity;
    let baseFog = 0.008;
    if (hasFlag1) baseFog = 0.005;
    if (hasFlag3) baseFog = 0.016;
    if (hasFlag4) baseFog = 0.004;
    const fogEase = THREE.MathUtils.smoothstep(progress, 0.0, 1.0);
    scene.fog.density = baseFog + Math.sin(time * 0.5) * 0.001 + fogEase * 0.001;
    ghostPointLights.forEach(gLight => {
      gLight.intensity = hasFlag2 ? 2.2 + Math.sin(time * 3.0) * 0.5 : 0.0;
    });
    if (hasFlag3) {
      ghostMat.opacity = 0.35 + Math.sin(time * 1.5) * 0.15;
      ghostShip.position.x = -80 + Math.sin(time * 0.3) * 15;
      ghostShip.position.y = Math.sin(time * 0.8) * 0.8;
    } else {
      ghostMat.opacity = 0.0;
    }
    lightningFlashVal = Math.max(0, lightningFlashVal - delta * 5.0);
    if (hasFlag3 || (progress >= 0.74 && progress <= 0.90)) {
      lightningTimer += delta;
      if (lightningTimer > 2.8 + Math.sin(time) * 1.2) {
        lightningTimer = 0;
        lightningLight.intensity = 5.2;
        lightningFlashVal = 1.0;
        setTimeout(() => { lightningLight.intensity = 0; }, 75);
        setTimeout(() => { lightningLight.intensity = 3.5; lightningFlashVal = 0.7; }, 150);
        setTimeout(() => { lightningLight.intensity = 0; }, 230);
      }
    }
    if (vignettePass) {
      vignettePass.uniforms.uTime.value = time;
      vignettePass.uniforms.uChromaShift.value = 0.0012 + lightningFlashVal * 0.004;
    }
    if (bloomPass) {
      bloomPass.threshold = 0.85 - lightningFlashVal * 0.3;
    }
    if (hasFlag1 || progress > 0.40) {
      oceanMat.uniforms.uBeaconIntensity.value = 1.0;
      const rotSpeed = hasFlag2 ? 2.5 : 1.2;
      const angle1 = time * rotSpeed;
      _tmpSpot1.set(Math.sin(angle1) * 90, 0, -220 + Math.cos(angle1) * 90);
      beaconSpot1.target.position.copy(_tmpSpot1);
      beaconSpot1.target.updateMatrixWorld();
      beamMesh1.rotation.y = angle1;
      beamMesh2.rotation.y = angle1 + Math.PI;
      const angle2 = angle1 + Math.PI;
      _tmpSpot2.set(Math.sin(angle2) * 90, 0, -220 + Math.cos(angle2) * 90);
      beaconSpot2.target.position.copy(_tmpSpot2);
      beaconSpot2.target.updateMatrixWorld();
    }
    shipSpline.getPointAt(progress, _tmpShipPos);
    const aheadProg = Math.min(1.0, progress + 0.015);
    shipSpline.getPointAt(aheadProg, _tmpShipAhead);
    _tmpHeading.subVectors(_tmpShipAhead, _tmpShipPos).normalize();
    const seaY      = getSeaHeight(_tmpShipPos.x, _tmpShipPos.z, time, weatherIntensity);
    const seaYFront = getSeaHeight(_tmpShipPos.x + _tmpHeading.x * 3.6, _tmpShipPos.z + _tmpHeading.z * 3.6, time, weatherIntensity);
    const seaYRight = getSeaHeight(_tmpShipPos.x + 3.4, _tmpShipPos.z, time, weatherIntensity);
    const pitchAngle = Math.atan2(seaY - seaYFront, 3.6) * 0.65;
    const rollAngle  = Math.atan2(seaYRight - seaY, 3.4) * 0.50;
    ship.position.set(_tmpShipPos.x, seaY + 0.35, _tmpShipPos.z);
    ship.lookAt(_tmpShipAhead.x, seaY + 0.35, _tmpShipAhead.z);
    ship.rotation.x += pitchAngle + Math.sin(time * 1.4) * 0.030;
    ship.rotation.z += rollAngle  + Math.cos(time * 1.7) * 0.035;
    ship.rotation.y += Math.sin(time * 0.7) * 0.020;
    if (helmGroup) {
      helmGroup.rotation.z = Math.sin(time * 1.2) * 0.25;
    }
    animatedSails.forEach((sail, idx) => {
      const sailPos = sail.geometry.attributes.position;
      for (let i = 0; i < sailPos.count; i++) {
        const vx = sailPos.getX(i);
        const flutter = Math.sin(time * 4.0 + vx * 2.0 + idx) * 0.05;
        sailPos.setZ(i, sailPos.getZ(i) + flutter * 0.01);
      }
      sail.geometry.attributes.position.needsUpdate = true;
    });
    swingingLanterns.forEach(lantern => {
      lantern.rotation.z = Math.sin(time * 2.2) * 0.18;
      lantern.rotation.x = Math.cos(time * 1.8) * 0.12;
    });
    if (progress > 0.92 && anchorGroup) {
      const dropAmount = Math.min(2.8, (progress - 0.92) * 30.0);
      anchorGroup.position.y = 2.6 - dropAmount;
    }
    if (pirateFlag) {
      pirateFlag.rotation.z = Math.sin(time * 4.0) * 0.15;
      pirateFlag.rotation.y = Math.cos(time * 6.0) * 0.08;
    }
    const rPos = rainGeo.attributes.position.array;
    for (let i = 0; i < rainCount * 3; i += 3) {
      rPos[i + 1] -= delta * (30.0 + weatherIntensity * 25.0);
      const dx = rPos[i] - _tmpLighthouseCenter.x;
      const dy = rPos[i + 1] - _tmpLighthouseCenter.y;
      const dz = rPos[i + 2] - _tmpLighthouseCenter.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      if (rPos[i + 1] < -2.5 || distSq < 144.0) {
        rPos[i]     = (Math.random() - 0.5) * 200;
        rPos[i + 1] = 85.0 + Math.random() * 10;
        rPos[i + 2] = (Math.random() - 0.5) * 240;
      }
    }
    rainGeo.attributes.position.needsUpdate = true;
    if (sprayParticles) {
      const sPos = sprayGeo.attributes.position.array;
      for (let i = 0; i < sprayCount * 3; i += 3) {
        sPos[i + 1] += delta * 2.5;
        if (sPos[i + 1] > 2.2) {
          sPos[i]     = (Math.random() - 0.5) * 4.5;
          sPos[i + 1] = 0.0;
          sPos[i + 2] = -11.5 + (Math.random() - 0.5) * 2.5;
        }
      }
      sprayGeo.attributes.position.needsUpdate = true;
    }
    if (starMat) {
      starMat.opacity = 0.75 + Math.sin(time * 2.5) * 0.15;
    }
    const followDist   = 16.5; 
    const followHeight = 6.2;  
    _tmpCamPos.copy(_tmpShipPos);
    _tmpCamPos.x -= _tmpHeading.x * followDist;
    _tmpCamPos.z -= _tmpHeading.z * followDist;
    _tmpCamPos.y = seaY + followHeight + Math.cos(time * 1.5) * 0.10;
    const shakeAmount = (Math.abs(pitchAngle) + Math.abs(rollAngle)) * 0.25 + lightningFlashVal * 0.35;
    _tmpCamPos.x += Math.sin(time * 12.0) * shakeAmount * 0.12 + dampedMouseX * 1.8;
    _tmpCamPos.y += Math.cos(time * 15.0) * shakeAmount * 0.08 - dampedMouseY * 1.0;
    _tmpCamPos.y = Math.max(_tmpCamPos.y, seaY + 3.5);
    const distToShip = _tmpCamPos.distanceTo(_tmpShipPos);
    const minShipDist = 10.0;
    if (distToShip < minShipDist) {
      _tmpPushDir.subVectors(_tmpCamPos, _tmpShipPos).normalize();
      _tmpCamPos.copy(_tmpShipPos).addScaledVector(_tmpPushDir, minShipDist);
      _tmpCamPos.y = Math.max(_tmpCamPos.y, seaY + 4.5);
    }
    const distToLighthouse = _tmpCamPos.distanceTo(_tmpLighthouseCenter);
    const minLighthouseDist = 13.0;
    if (distToLighthouse < minLighthouseDist) {
      _tmpPushDir.subVectors(_tmpCamPos, _tmpLighthouseCenter).normalize();
      _tmpCamPos.copy(_tmpLighthouseCenter).addScaledVector(_tmpPushDir, minLighthouseDist);
      _tmpCamPos.y = Math.max(_tmpCamPos.y, seaY + 4.0);
    }
    camera.position.x = THREE.MathUtils.damp(camera.position.x, _tmpCamPos.x, 5.0, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, _tmpCamPos.y, 5.0, delta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, _tmpCamPos.z, 5.0, delta);
    sessionStorage.setItem('bb_camera_pos', JSON.stringify({
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z
    }));
    if (progress > 0.94) {
      _tmpLookTarget.set(0, 4.5, -220);
    } else {
      _tmpLookTarget.copy(_tmpShipPos);
      _tmpLookTarget.x += _tmpHeading.x * 22.0;
      _tmpLookTarget.z += _tmpHeading.z * 22.0;
      _tmpLookTarget.y = seaY + 3.2;
    }
    camera.lookAt(_tmpLookTarget);
    const lockOverlay = document.getElementById('lock-overlay');
    const appEl       = document.getElementById('app');
    if (progress > 0.96) {
      const fadeVal = Math.min(1.0, (progress - 0.96) * 25.0);
      if (appEl) appEl.style.opacity = fadeVal;
      if (lockOverlay) lockOverlay.style.opacity = fadeVal;
    }
    if (composer) {
      composer.render();
    } else {
      renderer.render(scene, camera);
    }
  }
  animate();
})();
