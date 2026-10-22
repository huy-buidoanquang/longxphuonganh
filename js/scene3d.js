'use strict';
/* Cảnh Three.js trên một canvas cố định phủ màn hình:
   phong bì 3D mở thiệp → sau đó là cánh hoa rơi, bụi vàng lấp lánh, cặp nhẫn trong hero và pháo giấy 3D. */

function canvas2d(w, h) { const c = document.createElement('canvas'); c.width = Math.round(w); c.height = Math.round(h); return [c, c.getContext('2d')]; }

// Canvas cho một mặt phong bì: luôn vẽ theo hệ toạ độ rộng 1024, chiều cao theo tỉ lệ mặt đó
function surface(ew, eh, px) {
  const [c, x] = canvas2d(px, px * eh / ew);
  x.scale(px / 1024, px / 1024);
  return [c, x, 1024, 1024 * eh / ew];
}

function grain(x, w, h, base, seed) { // nền giấy có hạt
  const rand = rng(seed);
  x.fillStyle = base; x.fillRect(0, 0, w, h);
  for (let i = 0; i < w * h / 60; i++) {
    x.fillStyle = rand() < 0.5 ? `rgba(255,255,255,${rand() * 0.25})` : `rgba(120,90,60,${rand() * 0.03})`;
    x.fillRect(rand() * w, rand() * h, 2, 2);
  }
}

function damask(x, w, h) { // hoa văn chìm cùng tông giấy; nhờ bumpMap nó trông như dập nổi
  x.save(); x.globalAlpha = 0.07;
  for (let gy = 60, row = 0; gy < h; gy += 170, row++) {
    for (let gx = 40 + (row % 2) * 85; gx < w; gx += 170) {
      for (let k = 0; k < 4; k++) leaf(x, gx, gy, 34, k * TAU / 4 + row, '#a8906f');
      x.fillStyle = '#a8906f'; x.beginPath(); x.arc(gx, gy, 6, 0, TAU); x.fill();
    }
  }
  x.restore();
}

// Mặt trước phong bì. glow = true: bản đen chỉ có hoa và nếp gấp, dùng làm emissiveMap để hoa "phát sáng"
function paintPocket(x, w, h, seamY, glow) {
  if (glow) { x.fillStyle = '#000'; x.fillRect(0, 0, w, h); } else { grain(x, w, h, '#f4e8da', 3); damask(x, w, h); }
  x.save();
  x.lineWidth = glow ? 6 : 3; x.strokeStyle = glow ? '#e8b866' : 'rgba(140,100,70,.28)';
  if (!glow) { x.shadowColor = 'rgba(90,60,40,.3)'; x.shadowBlur = 10; x.shadowOffsetY = -2; }
  x.beginPath(); x.moveTo(0, h); x.lineTo(w / 2, seamY); x.lineTo(w, h); x.stroke();
  x.restore();
  const s = Math.min(w, h) * 0.38;
  bouquet(x, 0, h, s, -0.8, rng(21)); bouquet(x, w, h, s, 0.8 - Math.PI, rng(22));
  bouquet(x, 0, h * 0.42, s * 0.55, 0.15, rng(23)); bouquet(x, w, h * 0.42, s * 0.55, Math.PI - 0.15, rng(24));
}

function pocketText(x, w, h, guest) {
  x.textAlign = 'center';
  x.fillStyle = '#9a8478'; x.font = 'italic 34px "Cormorant Garamond"';
  x.fillText(guest ? 'Kính gửi' : 'Thiệp mời', w / 2, h * 0.79);
  x.fillStyle = '#8e2f45'; x.font = '76px "Pinyon Script"';
  x.fillText(guest || 'Long & Phương Anh', w / 2, h * 0.79 + 84, w * 0.5);
}

function paintFlap(x, w, h, glow) {
  if (glow) { x.fillStyle = '#000'; x.fillRect(0, 0, w, h); } else { grain(x, w, h, '#f7ecdf', 5); damask(x, w, h); }
  const s = Math.min(w, h) * 0.45, o = 30;
  bouquet(x, 0, 0, s, 0.35, rng(31)); bouquet(x, w, 0, s, Math.PI - 0.35, rng(32));
  x.strokeStyle = glow ? '#ffd27a' : '#c9a66b'; x.lineWidth = glow ? 6 : 3; // viền vàng song song mép nắp
  x.beginPath(); x.moveTo(o, 0); x.lineTo(w / 2, h - o * h / (w / 2)); x.lineTo(w - o, 0); x.stroke();
}

function paintCard(x, w, h, portrait) {
  grain(x, w, h, '#fffaf3', 7);
  x.strokeStyle = '#c9a66b'; x.lineWidth = 4; x.strokeRect(26, 26, w - 52, h - 52);
  x.lineWidth = 1.5; x.strokeRect(40, 40, w - 80, h - 80);
  const s = Math.min(w, h) * 0.3, cy = h / 2;
  bouquet(x, 0, 0, s, 0.8, rng(41)); bouquet(x, w, h, s, 0.8 - Math.PI, rng(42));
  x.textAlign = 'center';
  const line = (text, font, color, y, max) => { x.font = font; x.fillStyle = color; x.fillText(text, w / 2, y, max); };
  if (portrait) {
    line('Save the Date', '64px "Pinyon Script"', '#b8935a', cy - 330);
    line('Long', '150px "Pinyon Script"', '#8e2f45', cy - 150);
    line('&', '90px "Great Vibes"', '#b8935a', cy - 50);
    line('Phương Anh', '150px "Pinyon Script"', '#8e2f45', cy + 95, w - 160);
    line('CHỦ NHẬT · 20 · 12 · 2026', '600 38px "Playfair Display"', '#4d3f3f', cy + 230, w - 160);
    line('Trân trọng kính mời', 'italic 36px "Cormorant Garamond"', '#8a7a76', cy + 295);
  } else {
    line('Save the Date', '56px "Pinyon Script"', '#b8935a', 140);
    line('Long & Phương Anh', '116px "Pinyon Script"', '#8e2f45', 300, w - 240);
    line('CHỦ NHẬT · 20 · 12 · 2026', '600 36px "Playfair Display"', '#4d3f3f', 400);
    line('Trân trọng kính mời', 'italic 30px "Cormorant Garamond"', '#8a7a76', 465);
  }
}

function linerCanvas() { // lớp lót bên trong phong bì
  const [c, x] = canvas2d(512, 512);
  grain(x, 512, 512, '#e9c4c0', 9);
  x.fillStyle = 'rgba(201,166,107,.6)';
  for (let gy = 16, row = 0; gy < 512; gy += 32, row++) {
    for (let gx = 8 + (row % 2) * 16; gx < 512; gx += 32) { x.beginPath(); x.arc(gx, gy, 3.2, 0, TAU); x.fill(); }
  }
  return c;
}

function sealCanvas() { // chữ lồng + vòng nguyệt quế trên dấu sáp
  const [c, x] = canvas2d(512, 512);
  x.translate(256, 256);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 9; i++) {
      const a = Math.PI / 2 + side * (0.35 + i * 0.27);
      leaf(x, Math.cos(a) * 168, Math.sin(a) * 168, 46, a + side * 1.9, '#e9cf9b');
    }
  }
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '160px "Pinyon Script"';
  x.fillStyle = 'rgba(60,0,15,.55)'; x.fillText('L&PA', 6, 14, 280);
  x.fillStyle = '#ecd09a'; x.fillText('L&PA', 0, 6, 280);
  x.strokeStyle = 'rgba(236,208,154,.8)'; x.lineWidth = 7;
  x.beginPath(); x.arc(0, 0, 228, 0, TAU); x.stroke();
  return c;
}

function glowCanvas() {
  const [c, x] = canvas2d(128, 128), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,225,170,.55)'); g.addColorStop(1, 'rgba(255,200,120,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return c;
}

function raysCanvas() { // tia sáng toả ra từ dấu sáp
  const [c, x] = canvas2d(512, 512);
  x.translate(256, 256);
  for (let i = 0; i < 28; i++) {
    x.rotate(TAU / 28);
    const g = x.createLinearGradient(0, 0, 250, 0), wd = i % 2 ? 5 : 11;
    g.addColorStop(0, 'rgba(255,236,190,.9)'); g.addColorStop(1, 'rgba(255,220,150,0)');
    x.fillStyle = g;
    x.beginPath(); x.moveTo(0, 0); x.lineTo(250, -wd); x.lineTo(250, wd); x.fill();
  }
  return c;
}

function haloCanvas() { // vòng sáng nhấp nháy mời chạm vào dấu sáp
  const [c, x] = canvas2d(256, 256), g = x.createRadialGradient(128, 128, 60, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,230,180,0)'); g.addColorStop(0.75, 'rgba(255,230,180,.9)'); g.addColorStop(1, 'rgba(255,230,180,0)');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  return c;
}

function beamCanvas() { // luồng sáng vàng hắt lên từ miệng phong bì
  const [c, x] = canvas2d(256, 512);
  const g = x.createLinearGradient(0, 512, 0, 0);
  g.addColorStop(0, 'rgba(255,226,160,.95)'); g.addColorStop(1, 'rgba(255,226,160,0)');
  x.fillStyle = g; x.fillRect(0, 0, 256, 512);
  x.globalCompositeOperation = 'destination-in';
  const s = x.createLinearGradient(0, 0, 256, 0);
  s.addColorStop(0, 'rgba(0,0,0,0)'); s.addColorStop(0.5, '#000'); s.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = s; x.fillRect(0, 0, 256, 512);
  return c;
}

// ShapeGeometry với UV trải đều theo khung bao, để texture canvas phủ đúng hình
function shapeGeo(pts) {
  const g = new THREE.ShapeGeometry(new THREE.Shape(pts.map(([px, py]) => new THREE.Vector2(px, py))));
  g.computeBoundingBox();
  const { min, max } = g.boundingBox, p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - min.x) / (max.x - min.x), (p.getY(i) - min.y) / (max.y - min.y));
  return g;
}

function startScene({ guest, onOpen, onReveal, onDone }) {
  const canvas = document.getElementById('scene'), flash = document.getElementById('flash');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(20));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const sun = new THREE.DirectionalLight(0xffffff, 0.35); sun.position.set(-2, 3, 5); scene.add(sun);
  const fill = new THREE.PointLight(0xfff0d0, 0.25); fill.position.set(3, -1, 4); scene.add(fill);
  const sealLight = new THREE.PointLight(0xffc870, 0, 4); scene.add(sealLight);

  // Màn dọc dùng phong bì dọc (gần kín màn hình như thiệp giấy), màn ngang dùng phong bì ngang
  const portrait = innerWidth < innerHeight * 0.9;
  const W = portrait ? 2 : 3.2, H = portrait ? 3.1 : 2.1;
  const FLAP_H = H * (portrait ? 0.53 : 0.6), NOTCH_Y = H / 2 - FLAP_H * 0.9, R = Math.min(W, H) * 0.12;
  const PX = portrait ? 768 : 1024;
  let fitZ = 5;
  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    fitZ = Math.max(H / 2 / (portrait ? 0.7 : 0.66) / tanHalf, W / 2 / 0.9 / (tanHalf * camera.aspect));
    camera.position.z = fitZ;
    camera.updateProjectionMatrix();
  }
  resize();
  addEventListener('resize', resize);

  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const tex = c => { const t = new THREE.CanvasTexture(c); t.anisotropy = maxAniso; return t; };
  const surfaceTex = (ew, eh, paint, px = PX) => { const [c, x, w, h] = surface(ew, eh, px); paint(x, w, h); return tex(c); };
  const paperMat = (map, emissiveMap) => new THREE.MeshPhongMaterial({
    map, bumpMap: map, bumpScale: 0.15, emissive: 0xffc27a, emissiveMap, emissiveIntensity: 0, shininess: 6, specular: 0x1a1410,
  });
  const seamY = h => (H / 2 - NOTCH_Y) / H * h + h * 0.05;

  // --- Phong bì: lớp lót, thiệp, túi trước, nắp, dấu sáp (xếp lớp theo trục z) ---
  const env = new THREE.Group(); scene.add(env);
  const linerMap = tex(linerCanvas());
  const linerMat = new THREE.MeshBasicMaterial({ map: linerMap, color: 0xe8e0dc }); // lớp lót bên trong: không cần đổ bóng, tránh bị tối khi lật nắp
  env.add(new THREE.Mesh(new THREE.PlaneGeometry(W, H), linerMat));
  const card = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.9, H * 0.86),
    new THREE.MeshLambertMaterial({ map: surfaceTex(W * 0.9, H * 0.86, (x, w, h) => paintCard(x, w, h, portrait)), transparent: true }));
  card.position.z = 0.01; env.add(card);
  const pocket = new THREE.Mesh(shapeGeo([[-W / 2, -H / 2], [W / 2, -H / 2], [W / 2, H / 2], [0, NOTCH_Y], [-W / 2, H / 2]]), paperMat(
    surfaceTex(W, H, (x, w, h) => { paintPocket(x, w, h, seamY(h), false); pocketText(x, w, h, guest); }),
    surfaceTex(W, H, (x, w, h) => paintPocket(x, w, h, seamY(h), true), PX / 2)));
  pocket.position.z = 0.02; env.add(pocket);
  const flap = new THREE.Group(); flap.position.set(0, H / 2, 0.03); env.add(flap); // bản lề ở mép trên
  const flapGeo = shapeGeo([[-W / 2, 0], [0, -FLAP_H], [W / 2, 0]]);
  const flapFront = new THREE.Mesh(flapGeo, paperMat(
    surfaceTex(W, FLAP_H, (x, w, h) => paintFlap(x, w, h, false)),
    surfaceTex(W, FLAP_H, (x, w, h) => paintFlap(x, w, h, true), PX / 2)));
  const flapInside = new THREE.Mesh(flapGeo, linerMat);
  flapInside.rotation.y = Math.PI;
  flap.add(flapFront, flapInside);

  const sealShape = new THREE.Shape();
  for (let i = 0; i <= 64; i++) { // mép sáp lượn sóng
    const a = i / 64 * TAU, r = R * (1 + 0.05 * Math.sin(a * 7) + 0.03 * Math.sin(a * 13 + 1));
    i ? sealShape.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sealShape.moveTo(r, 0);
  }
  const sealMat = new THREE.MeshStandardMaterial({ color: 0x8e2f45, roughness: 0.32, metalness: 0.05, emissive: 0xffb45a, emissiveIntensity: 0 });
  const seal = new THREE.Mesh(new THREE.ExtrudeGeometry(sealShape, { depth: R * 0.08, bevelThickness: R * 0.12, bevelSize: R * 0.12, bevelSegments: 5 }), sealMat);
  const sealTex = tex(sealCanvas());
  const mono = new THREE.Mesh(new THREE.CircleGeometry(R * 0.86, 64), new THREE.MeshStandardMaterial({
    map: sealTex, bumpMap: sealTex, bumpScale: 0.5, transparent: true, roughness: 0.4, emissive: 0xffb45a, emissiveIntensity: 0,
  }));
  mono.position.z = R * 0.2 + 0.002; seal.add(mono);
  seal.position.set(0, -FLAP_H + R * 0.25, 0.03); flap.add(seal);

  // --- Ánh sáng: tia toả, vòng mời chạm, quầng sáng, ánh vàng trong phong bì ---
  // Cộng màu nhưng giữ nguyên alpha: trên nền trang sáng, hạt sáng không biến thành chấm xám
  const ADD = { blending: THREE.CustomBlending, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor };
  const additive = (map, color) => ({ map, color, transparent: true, opacity: 0, depthWrite: false, ...ADD });
  const glowMap = tex(glowCanvas());
  const rays = new THREE.Sprite(new THREE.SpriteMaterial(additive(tex(raysCanvas()), 0xffd9a0)));
  const halo = new THREE.Sprite(new THREE.SpriteMaterial(additive(tex(haloCanvas()), 0xffe2b0)));
  const sealGlow = new THREE.Sprite(new THREE.SpriteMaterial(additive(glowMap, 0xffcf8a)));
  scene.add(rays, halo, sealGlow);
  const inner = new THREE.Sprite(new THREE.SpriteMaterial(additive(glowMap, 0xffd28a)));
  inner.position.set(0, H / 2 - FLAP_H * 0.35, 0.05); inner.scale.set(W * 1.4, FLAP_H * 1.4, 1); env.add(inner);
  const beam = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.95, H * 1.3), new THREE.MeshBasicMaterial(additive(tex(beamCanvas()), 0xffe2a8)));
  beam.position.set(0, H / 2 + H * 0.65 - 0.02, 0.006); env.add(beam);

  // --- Bụi vàng: một hệ hạt dùng chung cho tia lửa khi bẻ dấu, bụi bay lên và lấp lánh khắp trang ---
  const DUST = 320, dPos = new Float32Array(DUST * 3), dCol = new Float32Array(DUST * 3), dVel = new Float32Array(DUST * 3);
  const dLife = new Float32Array(DUST), dMax = new Float32Array(DUST), dGrav = new Float32Array(DUST);
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
  dustGeo.setAttribute('color', new THREE.BufferAttribute(dCol, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    map: tex(glowCanvas()), size: 0.09, vertexColors: true, transparent: true, depthWrite: false, ...ADD,
  }));
  dust.frustumCulled = false; scene.add(dust);
  let dNext = 0, ambientAcc = 0;
  function emit(px, py, pz, n, speed, grav, life, spread = TAU, dir = 0) {
    for (let k = 0; k < n; k++) {
      const i = dNext++ % DUST, a = dir + (Math.random() - 0.5) * spread, s = speed * (0.3 + Math.random() * 0.7);
      dPos.set([px, py, pz], i * 3);
      dVel.set([Math.cos(a) * s, Math.sin(a) * s, (Math.random() - 0.3) * speed * 0.4], i * 3);
      dLife[i] = dMax[i] = life * (0.6 + Math.random() * 0.8);
      dGrav[i] = grav;
    }
  }

  // --- Cánh hoa 3D rơi (InstancedMesh: một draw call cho tất cả) ---
  const ps = new THREE.Shape();
  ps.moveTo(0, 0); ps.bezierCurveTo(-0.6, 0.35, -0.4, 1, 0, 1.05); ps.bezierCurveTo(0.4, 1, 0.6, 0.35, 0, 0);
  const petalGeo = new THREE.ShapeGeometry(ps, 10), pp = petalGeo.attributes.position;
  for (let i = 0; i < pp.count; i++) pp.setZ(i, 0.35 * pp.getX(i) ** 2 + 0.15 * pp.getY(i) ** 2); // uốn cong cánh hoa
  petalGeo.computeVertexNormals(); petalGeo.translate(0, -0.5, 0); petalGeo.scale(0.12, 0.12, 0.12);
  const COUNT = innerWidth < 600 ? 28 : 55;
  const petals = new THREE.InstancedMesh(petalGeo, new THREE.MeshLambertMaterial({ side: THREE.DoubleSide, emissive: 0x4a3030 }), COUNT);
  petals.frustumCulled = false;
  if (!reduce) scene.add(petals);
  const palette = ['#f6c9cf', '#f9dfe0', '#fff4f1', '#eba7b3', '#fbe2cf'].map(c => new THREE.Color(c));
  const P = [];
  function spawn(q, anywhere) {
    q.z = (Math.random() - 0.5) * 4;
    const hh = tanHalf * (camera.position.z - q.z);
    q.x = (Math.random() * 2 - 1) * hh * camera.aspect;
    q.y = anywhere ? (Math.random() * 2 - 1) * hh : hh + 0.2;
  }
  for (let i = 0; i < COUNT; i++) {
    P.push({ k: 0.7 + Math.random() * 0.7, sp: 0.05 + Math.random() * 0.07, ph: Math.random() * TAU,
      r: new THREE.Euler(Math.random() * TAU, Math.random() * TAU, 0), w: [Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5] });
    petals.setColorAt(i, palette[i % palette.length]);
    spawn(P[i], true);
  }

  // --- Cặp nhẫn cưới 3D, bám theo vị trí .rings-anchor trong hero ---
  const gold = new THREE.MeshPhongMaterial({ color: 0xd9b26a, specular: 0xfff1c9, shininess: 90, emissive: 0x2a1a00 });
  const ringGeo = new THREE.TorusGeometry(0.5, 0.075, 24, 96);
  const ringA = new THREE.Mesh(ringGeo, gold), ringB = new THREE.Mesh(ringGeo, gold);
  ringA.position.x = -0.3; ringA.rotation.set(0.15, 0.6, 0);
  ringB.position.x = 0.3; ringB.rotation.set(-0.15, -0.6, 0);
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.11), new THREE.MeshPhongMaterial({ color: 0xffffff, specular: 0xffffff, shininess: 200, flatShading: true }));
  gem.position.y = 0.6; ringB.add(gem);
  const rings = new THREE.Group(); rings.add(ringA, ringB); rings.visible = false; scene.add(rings);
  const anchor = document.querySelector('.rings-anchor');

  // --- Pháo giấy 3D ---
  const CONF = 170;
  const confetti = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.05, 0.085), new THREE.MeshLambertMaterial({ side: THREE.DoubleSide, emissive: 0x333333 }), CONF);
  confetti.frustumCulled = false; scene.add(confetti);
  const confColors = ['#d9b26a', '#8e2f45', '#f2b8c6', '#fff7f0', '#9fb48e', '#f3d9a4', '#e39ea6'].map(c => new THREE.Color(c));
  const C = [];
  for (let i = 0; i < CONF; i++) {
    C.push({ p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), w: new THREE.Vector3(), life: 0, k: 1 });
    confetti.setColorAt(i, confColors[i % confColors.length]);
  }
  let cNext = 0;
  function celebrate(sx = innerWidth / 2, sy = innerHeight / 2, n = 110) {
    const hh0 = tanHalf * camera.position.z, upp = 2 * hh0 / innerHeight;
    const ox = (sx - innerWidth / 2) * upp, oy = (innerHeight / 2 - sy) * upp;
    for (let k = 0; k < n; k++) {
      const q = C[cNext++ % CONF], a = Math.PI / 2 + (Math.random() - 0.5) * 1.7, sp = hh0 * (1.6 + Math.random() * 1.8);
      q.p.set(ox, oy, 0.4 + Math.random() * 0.6);
      q.v.set(Math.cos(a) * sp, Math.sin(a) * sp, (Math.random() - 0.5) * hh0);
      q.r.set(Math.random() * TAU, Math.random() * TAU, Math.random() * TAU);
      q.w.set((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 6);
      q.life = 3.6 + Math.random();
      q.k = (0.8 + Math.random() * 0.6) * hh0 / 2;
    }
  }

  // --- Tương tác + kịch bản mở thiệp ---
  const clock = new THREE.Clock(), dummy = new THREE.Object3D(), tmp = new THREE.Vector3();
  const ptr = { x: 0, y: 0 };
  addEventListener('pointermove', e => { ptr.x = e.clientX / innerWidth - 0.5; ptr.y = e.clientY / innerHeight - 0.5; });
  let opened = null, done = false, burst = false, revealed = false, cardFrom = null, ringsIn = 0;
  function open() { if (opened === null) { opened = clock.elapsedTime; if (onOpen) onOpen(); } }
  canvas.addEventListener('click', open);

  const ease = v => v <= 0 ? 0 : v >= 1 ? 1 : v * v * (3 - 2 * v);
  const seg = (t, a, b) => ease((t - a) / (b - a)); // tiến độ 0..1 của đoạn [a, b] giây

  function finish() {
    done = true;
    camera.position.z = fitZ;
    flash.style.opacity = 0;
    scene.remove(sealLight);
    for (const o of [env, card, rays, halo, sealGlow]) {
      scene.remove(o);
      o.traverse(m => {
        if (m.geometry) m.geometry.dispose();
        if (m.material) { for (const k of ['map', 'bumpMap', 'emissiveMap']) if (m.material[k]) m.material[k].dispose(); m.material.dispose(); }
      });
    }
    if (onDone) onDone();
  }

  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05), time = clock.elapsedTime;

    // Kịch bản (giây sau khi chạm): 0 dấu sáp & hoa phát sáng → 0.55 vỡ dấu → 0.65 lật nắp, ánh vàng tràn ra
    // → 1.6 rút thiệp → 2.7 thiệp bay tới, phong bì rơi → 3.25 pháo giấy + chớp sáng → 4.5 xong
    if (!done) {
      const t = opened === null ? -1 : time - opened, idle = opened === null ? 1 : 0;
      const glowIn = seg(t, 0, 0.55), slide = seg(t, 1.6, 2.7), zoom = seg(t, 2.7, 3.7);
      camera.position.z = fitZ * (1 - 0.07 * glowIn * (1 - zoom)); // đẩy máy quay lại gần một chút
      env.rotation.y += ((ptr.x * 0.45 + Math.sin(time * 0.7) * 0.1) * idle - env.rotation.y) * 0.06;
      env.rotation.x += (ptr.y * 0.35 * idle - 0.9 * zoom - env.rotation.x) * 0.06;
      env.position.y = Math.sin(time * 1.3) * 0.03 * (1 - slide) - 0.42 * H * slide - 7 * zoom * zoom;

      seal.getWorldPosition(tmp);
      if (t < 0.55) { halo.position.copy(tmp); rays.position.copy(tmp); sealGlow.position.copy(tmp); } // vỡ dấu rồi thì ánh sáng đứng yên
      const pulse = (time % 1.8) / 1.8;
      halo.material.opacity = idle * (1 - pulse) * 0.55;
      halo.scale.setScalar(R * (2.6 + pulse * 2.2));

      if (opened !== null) {
        const hh0 = tanHalf * camera.position.z;
        sealMat.emissiveIntensity = mono.material.emissiveIntensity = glowIn * 1.4;
        seal.scale.setScalar((1 + 0.18 * glowIn) * (1 - seg(t, 0.55, 0.8)) + 1e-4);
        pocket.material.emissiveIntensity = flapFront.material.emissiveIntensity = glowIn * 0.9 * (1 - 0.9 * seg(t, 1.3, 2.4));
        sealLight.position.set(tmp.x, tmp.y, tmp.z + 0.8);
        sealLight.intensity = glowIn * 0.7 * (1 - seg(t, 0.8, 1.6));
        rays.material.opacity = glowIn * 0.8 * (1 - seg(t, 0.55, 1.1));
        rays.material.rotation = time * 0.25;
        rays.scale.setScalar(R * (5 + 7 * glowIn));
        sealGlow.material.opacity = Math.sin(Math.min(t / 1.4, 1) * Math.PI) * 0.55;
        sealGlow.scale.setScalar(R * (3 + 5 * seg(t, 0, 1.4)));
        if (!burst && t > 0.55) { burst = true; emit(tmp.x, tmp.y, tmp.z + 0.1, 90, hh0 * 0.9, -hh0 * 0.25, 1.4); }

        flap.rotation.x = -Math.PI * seg(t, 0.65, 1.65);
        flap.position.z = flap.rotation.x < -Math.PI / 2 ? -0.005 : 0.03; // nắp lật qua rồi thì nằm sau thiệp
        const light = seg(t, 0.7, 1.5) * (1 - seg(t, 2.6, 3.4));
        inner.material.opacity = light; beam.material.opacity = light * 0.75;
        if (t > 0.8 && t < 2.8) {
          inner.getWorldPosition(tmp);
          emit(tmp.x + (Math.random() - 0.5) * W * 0.6, tmp.y, 0.1, 2, hh0 * 0.25, hh0 * 0.12, 2.2, 0.9, Math.PI / 2);
        }

        if (card.parent === env) card.position.y = H * 0.97 * slide;
        if (t > 2.7 && card.parent === env) { scene.attach(card); cardFrom = card.position.clone(); }
        if (cardFrom) {
          const s = Math.min(0.88 * 2 * hh0 * camera.aspect / (W * 0.9), 1.6 * hh0 / (H * 0.86));
          card.position.lerpVectors(cardFrom, tmp.set(0, 0, 0.4), zoom);
          card.rotation.x *= 0.9; card.rotation.y *= 0.9;
          card.scale.setScalar(1 + (s - 1) * zoom);
          card.material.opacity = 1 - seg(t, 3.4, 3.7); // tắt dần dưới chớp sáng để không chồng chữ với hero
        }
        if (t > 3.25 && !revealed) { revealed = true; celebrate(innerWidth / 2, innerHeight * 0.45, 140); if (onReveal) onReveal(); }
        flash.style.opacity = Math.max(0, 1 - Math.abs(t - 3.6) / 0.5) * 0.95;
        rings.visible = t > 3.4; ringsIn = seg(t, 3.4, 4.4);
        if (t > 4.5) finish();
      }
    }

    const hh0 = tanHalf * camera.position.z; // nửa chiều cao khung nhìn tại z = 0

    // Bụi vàng lấp lánh khắp màn hình
    if (!reduce) {
      ambientAcc += dt * 4;
      for (; ambientAcc > 1; ambientAcc--) {
        const z = (Math.random() - 0.5) * 3, hh = tanHalf * (camera.position.z - z);
        emit((Math.random() * 2 - 1) * hh * camera.aspect, (Math.random() * 2 - 1) * hh, z, 1, 0.08, 0.03, 7);
      }
    }
    const drag = Math.pow(0.4, dt);
    for (let i = 0; i < DUST; i++) {
      const j = i * 3;
      if (dLife[i] <= 0) { dCol[j] = dCol[j + 1] = dCol[j + 2] = 0; continue; }
      dLife[i] -= dt;
      dVel[j] *= drag; dVel[j + 1] = dVel[j + 1] * drag + dGrav[i] * dt; dVel[j + 2] *= drag;
      dPos[j] += dVel[j] * dt; dPos[j + 1] += dVel[j + 1] * dt; dPos[j + 2] += dVel[j + 2] * dt;
      const b = Math.max(0, Math.sin(dLife[i] / dMax[i] * Math.PI)) * (0.65 + 0.35 * Math.sin(time * 6 + i));
      dCol[j] = b; dCol[j + 1] = 0.85 * b; dCol[j + 2] = 0.55 * b;
    }
    dustGeo.attributes.position.needsUpdate = dustGeo.attributes.color.needsUpdate = true;

    for (let i = 0; i < COUNT; i++) {
      const q = P[i], hh = tanHalf * (camera.position.z - q.z);
      q.y -= q.sp * hh * dt;
      q.x += Math.sin(time * 0.9 + q.ph) * 0.25 * dt;
      q.r.x += q.w[0] * dt * 2; q.r.y += q.w[1] * dt * 2; q.r.z += q.w[2] * dt;
      if (q.y < -hh - 0.2) spawn(q, false);
      dummy.position.set(q.x, q.y, q.z); dummy.rotation.copy(q.r); dummy.scale.setScalar(q.k);
      dummy.updateMatrix(); petals.setMatrixAt(i, dummy.matrix);
    }
    petals.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < CONF; i++) {
      const q = C[i];
      if (q.life > 0) {
        q.life -= dt;
        q.v.multiplyScalar(Math.exp(-1.6 * dt)); // cản không khí
        q.v.y -= 1.4 * hh0 * dt;
        q.v.x += Math.sin(time * 4 + i) * 0.5 * hh0 * dt; // phấp phới
        q.p.addScaledVector(q.v, dt);
        q.r.x += q.w.x * dt; q.r.y += q.w.y * dt; q.r.z += q.w.z * dt;
      }
      dummy.position.copy(q.p); dummy.rotation.copy(q.r);
      dummy.scale.setScalar(q.life > 0 ? q.k * Math.min(1, q.life * 2) : 0);
      dummy.updateMatrix(); confetti.setMatrixAt(i, dummy.matrix);
    }
    confetti.instanceMatrix.needsUpdate = true;

    if (rings.visible) {
      const r = anchor.getBoundingClientRect(), upp = 2 * hh0 / innerHeight; // đơn vị 3D trên mỗi px CSS
      rings.position.set((r.left + r.width / 2 - innerWidth / 2) * upp, (innerHeight / 2 - r.top - r.height / 2) * upp, 0);
      rings.scale.setScalar(r.height * upp / 1.3 * ringsIn + 1e-4);
      rings.rotation.set(Math.sin(time * 0.4) * 0.15, Math.sin(time * 0.6) * 0.6, 0);
    }

    renderer.render(scene, camera);
  });

  return { open, celebrate };
}
