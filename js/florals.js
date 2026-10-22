'use strict';
/* Hoa vẽ bằng Canvas 2D — dùng cho khung hoa hero (đung đưa), góc thiệp, nhánh hoa cố định bên mép,
   ảnh giữ chỗ của album và texture phong bì 3D. rng có seed để hình giống nhau mỗi lần tải. */
const TAU = Math.PI * 2;
function rng(seed) { let s = seed % 2147483647 || 1; return () => (s = s * 16807 % 2147483647) / 2147483647; }

const ROSES = [['#fbe6e2', '#e39ea6'], ['#fdeee2', '#e7ac86'], ['#fffaf6', '#dcc6b8'], ['#f7d9d4', '#d98a92'], ['#f5c6cd', '#b04d66']];
const GREENS = ['#9fb48e', '#7f9a73', '#b9c9a6', '#6f8a67'];

function leaf(x, cx, cy, len, a, color) {
  x.save(); x.translate(cx, cy); x.rotate(a);
  x.fillStyle = color;
  x.beginPath(); x.moveTo(0, 0);
  x.quadraticCurveTo(len * 0.5, -len * 0.3, len, 0);
  x.quadraticCurveTo(len * 0.5, len * 0.3, 0, 0);
  x.fill();
  x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = Math.max(1, len * 0.025);
  x.beginPath(); x.moveTo(0, 0); x.lineTo(len * 0.85, 0); x.stroke();
  x.restore();
}

function sprig(x, cx, cy, len, a, color) {
  x.save(); x.translate(cx, cy); x.rotate(a);
  x.strokeStyle = color; x.lineWidth = Math.max(1, len * 0.012);
  x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(len / 2, len * 0.12, len, 0); x.stroke();
  for (let i = 1; i <= 6; i++) {
    const t = i / 7; // điểm trên đường cong cuống
    leaf(x, len * t, len * 0.24 * t * (1 - t), len * 0.2 * (1.1 - t * 0.5), (i % 2 ? -1 : 1) * 0.8, color);
  }
  leaf(x, len, 0, len * 0.16, 0, color);
  x.restore();
}

function rose(x, cx, cy, r, [light, deep]) {
  x.save();
  x.shadowColor = 'rgba(110,60,50,.28)'; x.shadowOffsetY = r * 0.06;
  for (let ring = 0; ring < 4; ring++) {
    const n = 6 - ring, rr = r * (1 - ring * 0.22);
    x.shadowBlur = r * (ring ? 0.12 : 0.3);
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU + ring * 0.9;
      x.save(); x.translate(cx + Math.cos(a) * rr * 0.42, cy + Math.sin(a) * rr * 0.42); x.rotate(a);
      const g = x.createRadialGradient(-rr * 0.4, 0, 0, -rr * 0.4, 0, rr * 0.95);
      g.addColorStop(0, deep); g.addColorStop(1, light);
      x.fillStyle = g;
      x.beginPath(); x.ellipse(0, 0, rr * 0.5, rr * 0.42, 0, 0, TAU); x.fill();
      x.strokeStyle = 'rgba(255,255,255,.5)'; x.lineWidth = r * 0.015; x.stroke();
      x.restore();
    }
  }
  x.shadowColor = 'transparent';
  x.strokeStyle = deep; x.lineWidth = r * 0.05; x.lineCap = 'round';
  for (let k = 0; k < 3; k++) { x.beginPath(); x.arc(cx, cy, r * (0.06 + k * 0.07), k * 2, k * 2 + 3.6); x.stroke(); }
  x.restore();
}

// Hoa trắng 5 cánh cho nhánh hoa leo
function blossom(x, cx, cy, r) {
  x.save(); x.translate(cx, cy);
  x.shadowColor = 'rgba(90,70,50,.2)'; x.shadowBlur = r * 0.4;
  for (let i = 0; i < 5; i++) {
    x.rotate(TAU / 5);
    const g = x.createRadialGradient(0, -r * 0.2, 0, 0, -r * 0.5, r * 0.7);
    g.addColorStop(0, '#fff'); g.addColorStop(1, '#efe4db');
    x.fillStyle = g;
    x.beginPath(); x.ellipse(0, -r * 0.5, r * 0.36, r * 0.5, 0, 0, TAU); x.fill();
  }
  x.shadowColor = 'transparent';
  x.fillStyle = '#e8c98a'; x.beginPath(); x.arc(0, 0, r * 0.18, 0, TAU); x.fill();
  x.restore();
}

function bouquet(x, cx, cy, size, a, rand) {
  for (let i = 0; i < 14; i++) {
    const b = a + (rand() - 0.5) * 2.6, len = size * (0.55 + rand() * 0.5), c = GREENS[i % 4];
    i % 3 ? leaf(x, cx, cy, len * 0.5, b, c) : sprig(x, cx, cy, len, b, c);
  }
  for (let i = 0; i < 30; i++) { // hoa baby li ti
    const b = a + (rand() - 0.5) * 2.4, d = size * (0.22 + rand() * 0.6);
    x.fillStyle = ['#fff', '#ecd3a0', '#f6cfd3', '#fff'][i % 4];
    x.beginPath(); x.arc(cx + Math.cos(b) * d, cy + Math.sin(b) * d, size * (0.01 + rand() * 0.014), 0, TAU); x.fill();
  }
  const at = (da, d) => [cx + Math.cos(a + da) * size * d, cy + Math.sin(a + da) * size * d];
  const spots = [[0.25, 0.7, 0.065, ROSES[4]], [-0.2, 0.72, 0.06, ROSES[4]], [0.5, 0.52, 0.11], [-0.55, 0.55, 0.1], [1, 0.36, 0.16], [-0.95, 0.38, 0.17], [0, 0.12, 0.27]];
  for (const [da, d, r, c] of spots) rose(x, ...at(da, d), size * r, c || ROSES[(rand() * 4) | 0]); // xa trước, gần sau
}

// Vẽ sẵn một bó hoa vào canvas riêng để mỗi khung hình chỉ cần xoay/đung đưa (rẻ hơn vẽ lại)
function bouquetSprite(size, a, seed, scale) {
  const pad = size * 1.3, c = document.createElement('canvas');
  c.width = c.height = Math.ceil(pad * 2 * scale);
  const x = c.getContext('2d'); x.scale(scale, scale);
  bouquet(x, pad, pad, size, a, rng(seed));
  return { c, pad };
}

// Hoa tĩnh ở các góc của canvas.florals (data-corners="tl tr bl br", data-scale)
function drawFlorals(c) {
  const dpr = Math.min(devicePixelRatio || 1, 2), w = c.clientWidth, h = c.clientHeight;
  c.width = w * dpr; c.height = h * dpr;
  const x = c.getContext('2d'), rand = rng(+c.dataset.seed);
  const s = Math.min(w * 0.55, 260) * (+c.dataset.scale || 1);
  x.scale(dpr, dpr);
  const spots = { tl: [0, 0, 0.8], tr: [w, 0, Math.PI - 0.8], bl: [0, h, -0.8], br: [w, h, 0.8 - Math.PI] };
  for (const k of c.dataset.corners.split(' ')) bouquet(x, spots[k][0], spots[k][1], k[0] === 't' ? s : s * 0.8, spots[k][2], rand);
}

// Khung hoa dày quanh hero, các bó hoa đung đưa nhẹ như có gió
function floralFrame(canvas) {
  const x = canvas.getContext('2d');
  let sprites = [], dpr = 1;
  function build() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    const w = canvas.clientWidth, h = canvas.clientHeight, S = Math.min(w * 0.56, 270);
    canvas.width = w * dpr; canvas.height = h * dpr;
    // [x, y, hướng mọc vào trong, cỡ]
    const spots = [[0, 0, 0.8, 1], [w, 0, Math.PI - 0.8, 1], [w / 2, -S * 0.32, Math.PI / 2, 0.5],
      [-S * 0.25, h * 0.47, 0.1, 0.42], [w + S * 0.25, h * 0.53, Math.PI - 0.1, 0.42],
      [0, h, -0.8, 0.9], [w, h, 0.8 - Math.PI, 0.9], [w / 2, h + S * 0.32, -Math.PI / 2, 0.5]];
    sprites = spots.map(([sx, sy, a, k], i) => ({ sx, sy, ph: i * 1.7, ...bouquetSprite(S * k, a, 7 + i * 13, Math.min(dpr, 1.5)) }));
  }
  function draw(t) {
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.clearRect(0, 0, canvas.width, canvas.height);
    for (const s of sprites) {
      const k = (1 + Math.sin(t * 0.45 + s.ph) * 0.012) * s.pad * 2 / s.c.width; // sprite vẽ ở độ phân giải riêng
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      x.translate(s.sx, s.sy); x.rotate(Math.sin(t * 0.6 + s.ph) * 0.03); x.scale(k, k);
      x.drawImage(s.c, -s.c.width / 2, -s.c.height / 2);
    }
  }
  build();
  return { build, draw };
}

// Nhánh hoa trắng cố định bên mép trái màn hình (nội dung cuộn qua trên nó), lá đung đưa theo thời gian
function vine(canvas) {
  const x = canvas.getContext('2d'), flower = document.createElement('canvas');
  flower.width = flower.height = 64;
  blossom(flower.getContext('2d'), 32, 32, 26);
  let w = 0, h = 0, dpr = 1, nodes = [];
  function build() {
    const rand = rng(99);
    dpr = Math.min(devicePixelRatio || 1, 2); w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    nodes = [];
    for (let y = -10, i = 0; y < h + 20; y += 21, i++) {
      nodes.push({ y, side: i % 2 ? 1 : -1, len: 14 + rand() * 18, col: GREENS[i % 4], bloom: rand() < 0.28, r: 8 + rand() * 7, ph: rand() * TAU });
    }
  }
  const stemX = (y, t) => w * 0.34 + Math.sin(y * 0.011 + 1) * w * 0.17 + Math.sin(y * 0.027) * w * 0.06 + Math.sin(t * 0.7 + y * 0.01) * 3;
  function draw(t) {
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.clearRect(0, 0, w, h);
    x.globalAlpha = 0.75;
    x.strokeStyle = '#8fa67f'; x.lineWidth = 1.8;
    x.beginPath();
    for (let y = -10; y < h + 20; y += 8) y === -10 ? x.moveTo(stemX(y, t), y) : x.lineTo(stemX(y, t), y);
    x.stroke();
    for (const n of nodes) {
      const sx = stemX(n.y, t), sway = Math.sin(t * 1.1 + n.ph) * 0.13;
      leaf(x, sx, n.y, n.len, Math.PI / 2 + n.side * (0.85 + sway), n.col);
      if (n.bloom) {
        x.save(); x.translate(sx + n.side * 9, n.y + 6); x.rotate(n.ph + sway);
        x.drawImage(flower, -n.r, -n.r, n.r * 2, n.r * 2);
        x.restore();
      }
    }
    x.globalAlpha = 1;
  }
  build();
  return { build, draw };
}

// Ảnh giữ chỗ cho album khi chưa có file images/anh-*.jpg
function placeholderPhoto(i) {
  const c = document.createElement('canvas'); c.width = 450; c.height = 630;
  const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 450, 630);
  g.addColorStop(0, ['#f7e1dc', '#efe3d3', '#e9eedf'][i % 3]); g.addColorStop(1, '#fffaf4');
  x.fillStyle = g; x.fillRect(0, 0, 450, 630);
  bouquet(x, 0, 630, 230, -0.8, rng(i + 3)); bouquet(x, 450, 0, 190, Math.PI - 0.8, rng(i + 9));
  x.textAlign = 'center';
  x.fillStyle = '#8e2f45'; x.font = '72px "Pinyon Script"'; x.fillText('L & PA', 225, 315);
  x.fillStyle = '#8a7a76'; x.font = 'italic 26px "Cormorant Garamond"'; x.fillText('Ảnh cưới sắp ra mắt', 225, 365);
  return c.toDataURL('image/jpeg', 0.85);
}
