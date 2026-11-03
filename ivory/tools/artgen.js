'use strict';
// Bộ vẽ ảnh trang trí thiệp Ivory: tự vẽ bằng canvas (giấy, thiệp, phong bì, hoa, nhẫn, ruy băng, máy hát, biểu tượng),
// cùng chủ đề và vị trí với mẫu nhưng là nét vẽ riêng. Toạ độ theo đơn vị thiết kế của từng khung ảnh.
let S = 2; // px ảnh cho 1 đơn vị thiết kế; bóng đổ canvas tính theo px nên phải nhân S
const TAU = Math.PI * 2, rad = d => d * Math.PI / 180;
function rng(seed) { let s = (Math.imul(seed | 0, 2654435761) >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const lerp = (a, b, t) => a + (b - a) * t;
const mix = (c1, c2, t) => c1.map((v, i) => Math.round(lerp(v, c2[i], t)));
const rgba = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
function shadow(g, blur, dx = 0, dy = 0, a = 0.3, col = [70, 48, 25]) { g.shadowColor = rgba(col, a); g.shadowBlur = blur * S; g.shadowOffsetX = dx * S; g.shadowOffsetY = dy * S; }
function noShadow(g) { g.shadowColor = 'rgba(0,0,0,0)'; g.shadowBlur = 0; g.shadowOffsetX = 0; g.shadowOffsetY = 0; }
const GOLD = [[0, '#8a5e26'], [0.2, '#cfa25c'], [0.38, '#f3dda0'], [0.55, '#bf8f48'], [0.78, '#e8c987'], [1, '#93682c']];
function goldGrad(g, x0, y0, x1, y1) { const gr = g.createLinearGradient(x0, y0, x1, y1); GOLD.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; }

// ---------- Giấy ----------
function paper(g, w, h, seed, base = [244, 239, 232], o = {}) {
  const R = rng(seed);
  g.fillStyle = rgba(base); g.fillRect(0, 0, w, h);
  for (let i = 0; i < w * h / 2500; i++) { // vệt loang lớn
    const x = R() * w, y = R() * h, r = 30 + R() * 110, a = (R() - 0.5) * 0.07;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, a > 0 ? `rgba(255,255,255,${a})` : `rgba(150,118,85,${-a})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  g.lineCap = 'round';
  const ang0 = o.ang ?? rad(-28), n = w * h / (o.density ?? 14), L = o.len ?? 14;
  for (let i = 0; i < n; i++) { // thớ giấy nổi: nét tối lệch xuống dưới + nét sáng
    const x = R() * w, y = R() * h, len = 3 + R() * L, a = ang0 + (R() - 0.5) * 0.5;
    const dx = Math.cos(a) * len, dy = Math.sin(a) * len, bx = (R() - 0.5) * 2.2;
    g.lineWidth = 0.35 + R() * 0.7;
    g.strokeStyle = `rgba(120,92,62,${(0.035 + R() * 0.07) * (o.k ?? 1)})`;
    g.beginPath(); g.moveTo(x + 0.7, y + 0.8); g.quadraticCurveTo(x + dx / 2 + bx + 0.7, y + dy / 2 - bx + 0.8, x + dx + 0.7, y + dy + 0.8); g.stroke();
    g.strokeStyle = `rgba(255,255,255,${(0.18 + R() * 0.32) * (o.k ?? 1)})`;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + dx / 2 + bx, y + dy / 2 - bx, x + dx, y + dy); g.stroke();
  }
}
function grain(g, x, y, w, h, seed, k = 1) { // thớ mịn trên mặt thiệp
  const R = rng(seed); g.lineCap = 'round';
  for (let i = 0; i < w * h / 40 * k; i++) {
    const px = x + R() * w, py = y + R() * h, l = 1.5 + R() * 5, a = rad(-30) + (R() - 0.5) * 0.6;
    g.lineWidth = 0.3 + R() * 0.4; g.strokeStyle = R() < 0.5 ? `rgba(255,255,255,${0.2 + R() * 0.3})` : `rgba(140,110,80,${0.025 + R() * 0.04})`;
    g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); g.stroke();
  }
}

// ---------- Thiệp, phong bì ----------
function card(g, cx, cy, w, h, rot = 0, o = {}) {
  g.save(); g.translate(cx, cy); g.rotate(rad(rot));
  const r = o.r ?? 1.5, x = -w / 2, y = -h / 2, f1 = o.fill ?? [245, 240, 234], f2 = o.fill2 ?? [236, 230, 223];
  const path = () => { g.beginPath(); if (o.path) o.path(g); else g.roundRect(x, y, w, h, r); };
  g.save(); shadow(g, o.blur ?? 14, o.sx ?? 3, o.sy ?? 6, o.sa ?? 0.22); path(); g.fillStyle = rgba(f1); g.fill(); g.restore();
  g.save(); shadow(g, 2.5, 0.8, 1.2, 0.25); path(); g.fillStyle = rgba(f1); g.fill(); g.restore();
  g.save(); path(); g.clip();
  const gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, rgba(f1)); gr.addColorStop(1, rgba(f2));
  g.fillStyle = gr; g.fillRect(x - 2, y - 2, w + 4, h + 4);
  grain(g, x, y, w, h, o.seed ?? 7, o.grain ?? 1.4);
  g.restore();
  if (!o.path) {
    g.lineWidth = 0.7; g.strokeStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.moveTo(x + 0.5, y + h - 1); g.lineTo(x + 0.5, y + 0.5); g.lineTo(x + w - 1, y + 0.5); g.stroke();
    g.strokeStyle = 'rgba(150,125,95,0.35)'; g.beginPath(); g.moveTo(x + w - 0.4, y + 1); g.lineTo(x + w - 0.4, y + h - 0.4); g.lineTo(x + 1, y + h - 0.4); g.stroke();
  }
  g.restore();
}
function poly(g, pts) { g.beginPath(); pts.forEach(([x, y], i) => g[i ? 'lineTo' : 'moveTo'](x, y)); g.closePath(); }
function fillGrad(g, x0, y0, x1, y1, c0, c1) { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, rgba(c0)); gr.addColorStop(1, rgba(c1)); return gr; }
function waxSeal(g, cx, cy, r, seed) {
  const R = rng(seed), n = 60, pts = [];
  for (let i = 0; i < n; i++) { const t = i / n * TAU; pts.push([cx + Math.cos(t) * r * (1 + (R() - 0.5) * 0.07), cy + Math.sin(t) * r * (1 + (R() - 0.5) * 0.07)]); }
  g.save(); shadow(g, 4, 1.2, 2.2, 0.35);
  g.beginPath(); pts.forEach(([x, y], i) => { const [px, py] = pts[(i + n - 1) % n]; if (!i) g.moveTo((x + px) / 2, (y + py) / 2); g.quadraticCurveTo(px, py, (x + px) / 2, (y + py) / 2); });
  g.closePath();
  const gr = g.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r * 1.05); gr.addColorStop(0, '#f7f0e6'); gr.addColorStop(0.7, '#e6dacb'); gr.addColorStop(1, '#cdbba5');
  g.fillStyle = gr; g.fill(); g.restore();
  // vành ép nổi
  g.lineWidth = r * 0.07; g.strokeStyle = 'rgba(160,135,105,.55)'; g.beginPath(); g.arc(cx + 0.4, cy + 0.6, r * 0.72, 0, TAU); g.stroke();
  g.strokeStyle = 'rgba(255,252,245,.85)'; g.lineWidth = r * 0.05; g.beginPath(); g.arc(cx - 0.3, cy - 0.4, r * 0.72, 0, TAU); g.stroke();
  const inner = g.createRadialGradient(cx + r * 0.2, cy + r * 0.25, 0, cx, cy, r * 0.7); inner.addColorStop(0, 'rgba(255,255,255,0)'); inner.addColorStop(1, 'rgba(150,125,95,.15)');
  g.fillStyle = inner; g.beginPath(); g.arc(cx, cy, r * 0.68, 0, TAU); g.fill();
}
function envelopeClosed(g, cx, cy, w, h, rot, flapY, seal) {
  card(g, cx, cy, w, h, rot, { fill: [237, 228, 218], fill2: [225, 214, 202], blur: 16, sx: 4, sy: 8, sa: 0.28, seed: 3 });
  g.save(); g.translate(cx, cy); g.rotate(rad(rot));
  const x = -w / 2, y = -h / 2;
  // nếp gấp dưới
  g.strokeStyle = 'rgba(170,150,125,.35)'; g.lineWidth = 0.6;
  g.beginPath(); g.moveTo(x + 2, y + h - 2); g.lineTo(-w * 0.04, h * 0.08); g.moveTo(x + w - 2, y + h - 2); g.lineTo(w * 0.04, h * 0.08); g.stroke();
  // nắp gập xuống thành hình chữ V
  g.save(); shadow(g, 5, 0.5, 2.5, 0.28);
  poly(g, [[x + 1, y + 1], [x + w - 1, y + 1], [w * 0.03, flapY + 4], [0, flapY + 6], [-w * 0.03, flapY + 4]]);
  g.fillStyle = fillGrad(g, 0, y, 0, flapY, [241, 233, 224], [230, 220, 208]); g.fill(); g.restore();
  g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(x + 2, y + 1.5); g.lineTo(0, flapY + 5); g.lineTo(x + w - 2, y + 1.5); g.stroke();
  g.restore();
  if (seal) waxSeal(g, ...seal);
}
function envelopeOpen(g, x, y, w, h, apex, o = {}) {
  const cx = x + w / 2, vy = o.vy ?? h * 0.4;
  // nắp mở phía trên
  g.save(); shadow(g, 10, 2, 4, 0.18);
  g.beginPath(); g.moveTo(x, y + 2); g.lineTo(apex[0] - 8, apex[1] + 6); g.quadraticCurveTo(apex[0], apex[1] - 2, apex[0] + 8, apex[1] + 6); g.lineTo(x + w, y + 2); g.closePath();
  g.fillStyle = fillGrad(g, 0, apex[1], 0, y, [242, 238, 233], [232, 226, 218]); g.fill(); g.restore();
  if (o.liner) {
    g.save(); g.beginPath(); g.moveTo(x + 12, y + 1); g.lineTo(apex[0] - 6, apex[1] + 18); g.quadraticCurveTo(apex[0], apex[1] + 12, apex[0] + 6, apex[1] + 18); g.lineTo(x + w - 12, y + 1); g.closePath();
    g.fillStyle = rgba(o.liner); g.fill(); g.clip(); grain(g, x, apex[1], w, y - apex[1], 5, 1.4); g.restore();
  }
  // thân sau (mặt trong)
  g.save(); shadow(g, 14, 3, 7, 0.22); g.fillStyle = rgba([238, 233, 225]); g.fillRect(x, y, w, h); g.restore();
  g.fillStyle = fillGrad(g, 0, y, 0, y + h, [226, 220, 211], [234, 228, 220]); g.fillRect(x, y, w, h);
  if (o.inside) o.inside(g);
  // túi trước: hai vạt bên + vạt dưới
  g.save(); shadow(g, 3, 0, -1.5, 0.2);
  poly(g, [[x, y], [cx, y + vy], [x + w, y], [x + w, y + h], [x, y + h]]);
  g.fillStyle = fillGrad(g, x, y, x + w, y + h, [243, 238, 232], [233, 227, 219]); g.fill(); g.restore();
  g.save(); poly(g, [[x, y], [cx, y + vy], [x + w, y], [x + w, y + h], [x, y + h]]); g.clip(); grain(g, x, y, w, h, 9, 0.5); g.restore();
  g.strokeStyle = 'rgba(165,145,120,.35)'; g.lineWidth = 0.6;
  g.beginPath(); g.moveTo(x + 1, y + h - 1); g.lineTo(cx - w * 0.06, y + h * 0.62); g.moveTo(x + w - 1, y + h - 1); g.lineTo(cx + w * 0.06, y + h * 0.62); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.moveTo(x + 1, y + 1); g.lineTo(cx, y + vy); g.lineTo(x + w - 1, y + 1); g.stroke();
}
function scallopCard(g, cx, cy, rx, ry, n, seed) {
  const shape = (k) => { g.beginPath(); for (let i = 0; i <= 1440; i++) { const t = i / 1440 * TAU, b = Math.pow(Math.abs(Math.sin(t * n / 2)), 0.55), f = k * (0.955 + 0.045 * b); const X = cx + Math.cos(t) * rx * f, Y = cy + Math.sin(t) * ry * f; i ? g.lineTo(X, Y) : g.moveTo(X, Y); } g.closePath(); };
  card(g, 0, 0, 1, 1, 0, { path: () => shape(1), fill: [246, 242, 236], fill2: [236, 231, 224], blur: 12, sx: 3, sy: 6, seed });
  // viền ép nổi bên trong
  g.lineWidth = 1.1; g.strokeStyle = 'rgba(165,145,118,.4)'; g.save(); g.translate(0.5, 0.7); shape(0.925); g.stroke(); g.restore();
  g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = 0.9; g.save(); g.translate(-0.4, -0.5); shape(0.925); g.stroke(); g.restore();
}

// ---------- Hoa lá ----------
const PETAL = { base: [192, 152, 104], mid: [238, 222, 198], edge: [255, 250, 242] };
function petalPath(g, len, wid, R, ruff = 0.07) {
  const n = 3 + Math.floor(R() * 3);
  g.beginPath(); g.moveTo(0, 0);
  g.bezierCurveTo(-wid * 0.55, -len * 0.12, -wid * 0.72, -len * 0.72, -wid * 0.36, -len * 0.94);
  for (let i = 1; i <= n; i++) {
    const t = i / n, x = lerp(-wid * 0.36, wid * 0.36, t), y = -len * (0.94 + 0.07 * Math.sin(Math.PI * t)) + (i < n ? (R() - 0.5) * len * ruff : 0);
    g.quadraticCurveTo(lerp(-wid * 0.36, wid * 0.36, t - 0.5 / n), y - len * ruff * (0.5 + R()), x, y);
  }
  g.bezierCurveTo(wid * 0.72, -len * 0.72, wid * 0.55, -len * 0.12, 0, 0);
  g.closePath();
}
function petal(g, len, wid, R, T = PETAL, o = {}) {
  petalPath(g, len, wid, R, o.ruff);
  const gr = g.createLinearGradient(0, 0, 0, -len);
  gr.addColorStop(0, rgba(T.base)); gr.addColorStop(o.mid ?? 0.45, rgba(T.mid)); gr.addColorStop(1, rgba(T.edge));
  g.fillStyle = gr; g.fill();
  g.save(); noShadow(g);
  g.lineWidth = 0.45; g.strokeStyle = 'rgba(150,118,80,0.3)'; g.stroke();
  g.strokeStyle = 'rgba(190,160,120,0.16)'; g.lineWidth = 0.4;
  for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(0, -len * 0.08); g.quadraticCurveTo(k * wid * 0.18, -len * 0.5, k * wid * 0.22, -len * 0.85); g.stroke(); }
  g.restore();
}
function peony(g, cx, cy, Rr, seed) {
  const R = rng(seed); g.save(); g.translate(cx, cy); g.rotate(R() * TAU);
  [[13, 1.0, 0.62], [12, 0.87, 0.58], [11, 0.74, 0.54], [10, 0.61, 0.5], [9, 0.49, 0.46], [8, 0.37, 0.42], [7, 0.26, 0.4], [6, 0.16, 0.38]].forEach(([n, l, w], li) => {
    const off = R() * TAU;
    g.save(); shadow(g, 3.2, 0.4, 1.1, 0.3);
    for (let i = 0; i < n; i++) { g.save(); g.rotate(off + i * TAU / n + (R() - 0.5) * 0.3); petal(g, Rr * l * (0.88 + R() * 0.22), Rr * w * (0.85 + R() * 0.3), R, PETAL, { mid: 0.52 - li * 0.03, ruff: 0.1 }); g.restore(); }
    g.restore();
  });
  const c = g.createRadialGradient(0, 0, 0, 0, 0, Rr * 0.12); c.addColorStop(0, 'rgba(220,186,118,0.85)'); c.addColorStop(1, 'rgba(220,186,118,0)');
  g.fillStyle = c; g.beginPath(); g.arc(0, 0, Rr * 0.12, 0, TAU); g.fill();
  g.restore();
}
function rose(g, cx, cy, Rr, seed) { // hoa hồng nhìn từ trên: các vòng cánh tròn khum chồng lên nhau, lõi cuộn xoắn
  const R = rng(seed); g.save(); g.translate(cx, cy); g.rotate(R() * TAU);
  const base = [186, 146, 96], mid = [235, 217, 190], edge = [255, 250, 241];
  [[6, 0.6, 0.5], [6, 0.47, 0.44], [5, 0.35, 0.37], [5, 0.24, 0.3], [4, 0.14, 0.23]].forEach(([n, d, pr], li) => {
    const off = R() * TAU;
    for (let i = 0; i < n; i++) {
      const a = off + i * TAU / n + (R() - 0.5) * 0.3, px = Math.cos(a) * d * Rr, py = Math.sin(a) * d * Rr, rx = pr * Rr * (0.92 + R() * 0.16), ry = rx * 0.8;
      g.save(); shadow(g, 3.2, 0.3, 1.1, 0.34);
      g.beginPath(); g.ellipse(px, py, rx, ry, a, 0, TAU);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, (d + pr) * Rr); gr.addColorStop(0, rgba(base)); gr.addColorStop(Math.min(0.9, d / (d + pr) + 0.1), rgba(mid)); gr.addColorStop(1, rgba(edge));
      g.fillStyle = gr; g.fill(); g.restore();
      g.lineWidth = 0.8; g.strokeStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.ellipse(px, py, rx - 0.5, ry - 0.5, a, -1.1, 1.1); g.stroke();
      g.lineWidth = 0.5; g.strokeStyle = 'rgba(150,115,72,.35)'; g.beginPath(); g.ellipse(px, py, rx, ry, a, 1.6, 4.7); g.stroke();
    }
  });
  const cr = Rr * 0.16, core = g.createRadialGradient(0, 0, 0, 0, 0, cr * 1.2); core.addColorStop(0, '#b98f5c'); core.addColorStop(1, 'rgba(225,205,172,0)');
  g.fillStyle = core; g.beginPath(); g.arc(0, 0, cr * 1.2, 0, TAU); g.fill();
  g.lineCap = 'round';
  for (let t = 0.6; t < 4 * Math.PI; t += 0.12) { // lõi xoắn
    const r = cr * (1 - t / (4.4 * Math.PI)), x = Math.cos(t) * r, y = Math.sin(t) * r;
    g.strokeStyle = 'rgba(140,100,58,.55)'; g.lineWidth = 0.7; g.beginPath(); g.arc(0, 0, r, t, t + 0.14); g.stroke();
    if (t % 1.2 < 0.12) { g.strokeStyle = 'rgba(255,250,240,.7)'; g.lineWidth = 0.5; g.beginPath(); g.arc(0, 0, r + 0.7, t, t + 0.5); g.stroke(); }
  }
  g.restore();
}
function daisy(g, cx, cy, r, seed) {
  const R = rng(seed); g.save(); g.translate(cx, cy); g.rotate(R() * TAU); shadow(g, 1.5, 0.3, 0.6, 0.3);
  const n = 9 + Math.floor(R() * 3);
  for (let i = 0; i < n; i++) {
    g.save(); g.rotate(i * TAU / n + (R() - 0.5) * 0.15);
    g.beginPath(); g.ellipse(0, -r * 0.55, r * 0.17, r * 0.48, 0, 0, TAU);
    const gr = g.createLinearGradient(0, 0, 0, -r); gr.addColorStop(0, '#e4dacb'); gr.addColorStop(0.5, '#fffdf8'); gr.addColorStop(1, '#ffffff'); g.fillStyle = gr; g.fill(); g.restore();
  }
  noShadow(g);
  const c = g.createRadialGradient(-r * 0.05, -r * 0.05, 0, 0, 0, r * 0.28); c.addColorStop(0, '#f0d27a'); c.addColorStop(0.7, '#cfa046'); c.addColorStop(1, '#9c7331');
  g.fillStyle = c; g.beginPath(); g.arc(0, 0, r * 0.26, 0, TAU); g.fill();
  g.fillStyle = 'rgba(120,80,20,.45)'; for (let i = 0; i < 7; i++) { const a = R() * TAU, d = R() * r * 0.18; g.beginPath(); g.arc(Math.cos(a) * d, Math.sin(a) * d, r * 0.03, 0, TAU); g.fill(); }
  g.restore();
}
function leaf(g, x, y, len, wid, ang, tone = 0) {
  g.save(); g.translate(x, y); g.rotate(ang); shadow(g, 3, 0.8, 1.6, 0.3);
  g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(wid * 0.62, len * 0.18, wid * 0.5, len * 0.72, 0, len); g.bezierCurveTo(-wid * 0.5, len * 0.72, -wid * 0.62, len * 0.18, 0, 0);
  const cols = [['#3a472b', '#60704a', '#43512f'], ['#56623f', '#7d885d', '#5d6945']][tone];
  const gr = g.createLinearGradient(-wid / 2, 0, wid / 2, 0); gr.addColorStop(0, cols[0]); gr.addColorStop(0.5, cols[1]); gr.addColorStop(1, cols[2]);
  g.fillStyle = gr; g.fill(); noShadow(g);
  g.strokeStyle = 'rgba(178,188,142,0.55)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(wid * 0.06, len * 0.5, 0, len * 0.96); g.stroke();
  g.strokeStyle = 'rgba(178,188,142,0.22)'; g.lineWidth = 0.4;
  for (let i = 1; i < 6; i++) { const t = i / 6, e = wid * 0.32 * Math.sin(Math.PI * t) + 1; g.beginPath(); g.moveTo(0, len * t); g.quadraticCurveTo(wid * 0.2, len * (t + 0.03), e, len * (t + 0.1)); g.moveTo(0, len * t); g.quadraticCurveTo(-wid * 0.2, len * (t + 0.03), -e, len * (t + 0.1)); g.stroke(); }
  g.restore();
}
function gyp(g, x, y, len, ang, seed, depth = 3) { // nhành hoa baby
  const R = rng(seed);
  const florets = (fx, fy) => {
    const n = 4 + Math.floor(R() * 5);
    for (let i = 0; i < n; i++) {
      const a = R() * TAU, dd = R() * 3.8, px = fx + Math.cos(a) * dd, py = fy + Math.sin(a) * dd, r = 1.1 + R() * 1.1;
      g.save(); shadow(g, 1.2, 0.3, 0.5, 0.35);
      const gr = g.createRadialGradient(px - r * 0.3, py - r * 0.3, 0, px, py, r); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#eee4d3');
      g.fillStyle = gr; g.beginPath(); g.arc(px, py, r, 0, TAU); g.fill(); g.restore();
      if (R() < 0.35) { g.fillStyle = 'rgba(160,140,90,.6)'; g.beginPath(); g.arc(px, py, r * 0.28, 0, TAU); g.fill(); }
    }
  };
  const branch = (x0, y0, l, a, d) => {
    const x1 = x0 + Math.cos(a) * l, y1 = y0 + Math.sin(a) * l, bend = (R() - 0.5) * l * 0.3;
    g.strokeStyle = d ? '#8d8659' : '#777147'; g.lineWidth = Math.max(0.35, 1.1 - d * 0.25);
    g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2 - Math.sin(a) * bend, (y0 + y1) / 2 + Math.cos(a) * bend, x1, y1); g.stroke();
    if (d >= depth || l < 6) { florets(x1, y1); return; }
    const k = 2 + Math.floor(R() * 2);
    for (let i = 0; i < k; i++) branch(lerp(x0, x1, 0.55 + R() * 0.45), lerp(y0, y1, 0.55 + R() * 0.45), l * (0.45 + R() * 0.25), a + (R() - 0.5) * 1.3, d + 1);
  };
  g.save(); g.lineCap = 'round'; branch(x, y, len * 0.5, ang, 0); g.restore();
}
function bud(g, x, y, r) { g.save(); shadow(g, 1, 0.2, 0.4, 0.3); const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r); gr.addColorStop(0, '#fffdf6'); gr.addColorStop(1, '#e3d6bd'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.restore(); }
function daisySpray(g, x, y, len, ang, seed, n) { // cành cúc nhỏ: thân chính + nhánh bên, đầu nhánh là hoa hoặc nụ
  const R = rng(seed), ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len, b = (R() - 0.5) * len * 0.35, mx = (x + ex) / 2 - Math.sin(ang) * b, my = (y + ey) / 2 + Math.cos(ang) * b;
  const at = t => [lerp(lerp(x, mx, t), lerp(mx, ex, t), t), lerp(lerp(y, my, t), lerp(my, ey, t), t)];
  g.save(); g.lineCap = 'round'; g.strokeStyle = '#4e4b2c'; g.lineWidth = 0.95; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(mx, my, ex, ey); g.stroke();
  const tips = [[ex, ey, 1]];
  for (let i = 0; i < n; i++) {
    const t = 0.2 + 0.8 * (i + R() * 0.5) / n, [px, py] = at(t), a = ang + (i % 2 ? 1 : -1) * (0.4 + R() * 0.7), l = len * (0.18 + R() * 0.25);
    const qx = px + Math.cos(a) * l, qy = py + Math.sin(a) * l;
    g.lineWidth = 0.55; g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo((px + qx) / 2 + (R() - 0.5) * 3, (py + qy) / 2 + (R() - 0.5) * 3, qx, qy); g.stroke();
    tips.push([qx, qy, R()]);
  }
  g.restore();
  for (let i = 0; i < 2; i++) { const [px, py] = at(0.25 + R() * 0.5); leaf(g, px, py, 9 + R() * 5, 4 + R() * 1.5, ang + (i ? 1 : -1) * (0.6 + R() * 0.5) - Math.PI / 2, R() < 0.5 ? 1 : 0); }
  tips.forEach(([tx, ty, k], i) => (k > 0.3 ? daisy(g, tx, ty, 5.5 + R() * 3.5, seed * 13 + i) : bud(g, tx, ty, 2 + R() * 1.2)));
}
// cụm hoa ở góc: lá sau hoa lớn, cành cúc nhỏ + baby toả ra ngoài, hoa lớn, vài bông nhỏ phủ lên mép
function bouquet(g, sp, seed) {
  const R = rng(seed), [ox, oy] = sp.at, d0 = rad(sp.dir), spread = rad(sp.spread ?? 80), big = sp.big ?? [];
  const clear = (...pts) => !pts.some(([x, y]) => (sp.avoid ?? []).some(([x0, y0, x1, y1]) => x > x0 && x < x1 && y > y0 && y < y1)); // không để hoa lấn vào chỗ có chữ
  const from = (k = 0.5) => { if (!big.length) return [ox + (R() - 0.5) * 30, oy + (R() - 0.5) * 30]; const [, x, y, r] = big[Math.floor(R() * big.length)]; const a = d0 + (R() - 0.5) * spread * 1.4; return [x + Math.cos(a) * r * k, y + Math.sin(a) * r * k]; };
  big.forEach(([, x, y, r], i) => { // lá thò ra sau mỗi hoa lớn
    const out = Math.atan2(y - oy, x - ox) || d0;
    for (let j = 0; j < (sp.leafPer ?? 5); j++) { const a = out + (j - 2) * 0.55 + (R() - 0.5) * 0.45, len = r * (1.3 + R() * 0.5), wd = r * (0.5 + R() * 0.14), t = R() < 0.3 ? 1 : 0, bx = x + Math.cos(a) * r * 0.45, by = y + Math.sin(a) * r * 0.45; if (clear([bx + Math.cos(a) * len, by + Math.sin(a) * len], [bx + Math.cos(a) * len * 0.6, by + Math.sin(a) * len * 0.6])) leaf(g, bx, by, len, wd, a - Math.PI / 2, t); }
  });
  (sp.leaves ?? []).forEach(([x, y, len, wid, a, t]) => leaf(g, x, y, len, wid, rad(a), t ?? 0));
  for (let i = 0; i < (sp.gyps ?? 6); i++) { const [x, y] = from(), a = d0 + (R() - 0.5) * spread, l = sp.reach * (0.3 + R() * 0.3); if (clear([x + Math.cos(a) * l * 0.5, y + Math.sin(a) * l * 0.5], [x + Math.cos(a) * l * 0.9, y + Math.sin(a) * l * 0.9])) gyp(g, x, y, l, a, seed * 31 + i, 3); }
  for (let i = 0; i < Math.round((sp.sprays ?? 7) * 1.6); i++) { const [x, y] = from(), a = d0 + (R() - 0.5) * spread, l = sp.reach * (0.22 + R() * 0.3); if (clear([x + Math.cos(a) * l * 0.5, y + Math.sin(a) * l * 0.5], [x + Math.cos(a) * l * 1.15, y + Math.sin(a) * l * 1.15])) daisySpray(g, x, y, l, a, seed * 41 + i, 5 + Math.floor(R() * 5)); }
  big.forEach(([t, x, y, r], i) => (t === 'rose' ? rose : peony)(g, x, y, r, seed * 7 + i));
  for (let i = 0; i < (sp.daisiesTop ?? 5) * 1.5; i++) { const [x, y] = from(1.05), a = d0 + (R() - 0.5) * spread, d = R() * 18, px = x + Math.cos(a) * d, py = y + Math.sin(a) * d; if (clear([px, py])) daisy(g, px, py, 5.5 + R() * 2.5, seed * 19 + i); }
}

// ---------- Nhẫn vàng, ruy băng ----------
function ringShape(g, cx, cy, r, th) { g.beginPath(); g.ellipse(cx, cy, r, r * 0.96, 0, 0, TAU); g.ellipse(cx, cy, r - th, (r - th) * 0.96, 0, TAU, 0, true); }
function ring(g, cx, cy, r, th) {
  ringShape(g, cx, cy, r, th); g.fillStyle = goldGrad(g, cx - r, cy - r, cx + r, cy + r); g.fill();
  g.save(); ringShape(g, cx, cy, r, th); g.clip();
  const hl = g.createRadialGradient(cx - r * 0.4, cy - r * 0.5, 0, cx - r * 0.4, cy - r * 0.5, r * 1.2); hl.addColorStop(0, 'rgba(255,248,220,.7)'); hl.addColorStop(0.45, 'rgba(255,240,200,0)');
  g.fillStyle = hl; g.fillRect(cx - r, cy - r, 2 * r, 2 * r);
  g.lineWidth = th * 0.3; g.strokeStyle = 'rgba(255,246,214,.6)'; g.beginPath(); g.ellipse(cx, cy, r - th * 0.5, (r - th * 0.5) * 0.96, 0, rad(195), rad(285)); g.stroke();
  g.strokeStyle = 'rgba(110,72,25,.35)'; g.beginPath(); g.ellipse(cx, cy, r - th * 0.5, (r - th * 0.5) * 0.96, 0, rad(20), rad(110)); g.stroke();
  g.restore();
  g.lineWidth = 0.5; g.strokeStyle = 'rgba(95,62,20,.6)'; g.beginPath(); g.ellipse(cx, cy, r, r * 0.96, 0, 0, TAU); g.stroke(); g.beginPath(); g.ellipse(cx, cy, r - th, (r - th) * 0.96, 0, 0, TAU); g.stroke();
}
function circleX(a, b) {
  const ra = a[2] - a[3] / 2, rb = b[2] - b[3] / 2, dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy);
  if (d > ra + rb || d < Math.abs(ra - rb)) return [];
  const t = (ra * ra - rb * rb + d * d) / (2 * d), h = Math.sqrt(Math.max(0, ra * ra - t * t)), mx = a[0] + dx * t / d, my = a[1] + dy * t / d;
  return [[mx + h * dy / d, my - h * dx / d], [mx - h * dy / d, my + h * dx / d]];
}
function rings(g, a, b) { // [cx, cy, r, độ dày]
  g.save(); shadow(g, 4, 2.5, 3.5, 0.4); for (const [cx, cy, r, th] of [a, b]) { ringShape(g, cx, cy, r, th); g.fillStyle = 'rgba(140,105,50,.6)'; g.fill(); } g.restore();
  ring(g, ...a); ring(g, ...b);
  const [p] = circleX(a, b);
  if (p) { g.save(); g.beginPath(); g.arc(p[0], p[1], a[3] * 1.7, 0, TAU); g.clip(); ring(g, ...a); g.restore(); }
}
function ribbon(g, f, y0, y1, W, T, o = {}) {
  const pts = [];
  for (let y = y0; y <= y1; y += 1) {
    const x = f(y), dx = f(y + 0.5) - f(y - 0.5), nx = 1 / Math.hypot(1, dx), ny = -dx * nx;
    const ph = Math.PI * (y - y0) / T + (o.ph ?? 0), c = Math.cos(ph), taper = o.taper ? Math.min(1, Math.max(0, (y1 - y) / o.taper)) : 1;
    pts.push({ x, y, nx, ny, hw: W / 2 * (0.12 + 0.88 * Math.abs(c)) * taper, c, s: Math.sin(ph) });
  }
  const edge = (side) => pts.map(p => [p.x + side * p.nx * p.hw, p.y + side * p.ny * p.hw]);
  const L = edge(-1), Rt = edge(1), outline = () => { g.beginPath(); L.forEach(([x, y], i) => g[i ? 'lineTo' : 'moveTo'](x, y)); for (let i = Rt.length - 1; i >= 0; i--) g.lineTo(...Rt[i]); g.closePath(); };
  g.save(); shadow(g, 9, 5, 7, 0.22); outline(); g.fillStyle = 'rgb(236,226,212)'; g.fill(); g.restore();
  const lit = [255, 252, 246], mid = [238, 228, 213], dark = [196, 176, 150];
  for (let i = 0; i < pts.length - 1; i++) {
    const p = pts[i], q = pts[i + 1], face = p.s >= 0 ? 1 : -1, t = (p.c * face + 1) / 2;
    const col = t > 0.5 ? mix(mid, lit, (t - 0.5) * 2) : mix(dark, mid, t * 2);
    const gr = g.createLinearGradient(L[i][0], L[i][1], Rt[i][0], Rt[i][1]);
    gr.addColorStop(0, rgba(mix(col, dark, 0.4))); gr.addColorStop(Math.min(0.9, Math.max(0.1, 0.5 + 0.35 * p.s * face)), rgba(mix(col, lit, 0.7))); gr.addColorStop(1, rgba(mix(col, dark, 0.25)));
    g.fillStyle = gr; g.beginPath(); g.moveTo(...L[i]); g.lineTo(...Rt[i]); g.lineTo(...Rt[i + 1]); g.lineTo(...L[i + 1]); g.closePath(); g.fill();
    g.strokeStyle = gr; g.lineWidth = 0.6; g.stroke(); // phủ khe giữa các dải
  }
  g.lineWidth = 0.5; g.strokeStyle = 'rgba(175,152,122,.55)';
  g.beginPath(); L.forEach(([x, y], i) => g[i ? 'lineTo' : 'moveTo'](x, y)); g.stroke();
  g.beginPath(); Rt.forEach(([x, y], i) => g[i ? 'lineTo' : 'moveTo'](x, y)); g.stroke();
}

// ---------- Máy hát, khung ảnh ----------
function goldCorner(g, x, y, s, a) { g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = goldGrad(g, -s, -s, s, s); g.beginPath(); g.moveTo(0, 0); g.lineTo(s, 0); g.quadraticCurveTo(s * 0.35, s * 0.35, 0, s); g.closePath(); g.fill(); g.restore(); }
function recordPlayer(g) {
  const rot = -10;
  // nắp mở (phía trên) và đế
  const box = (cx, cy, w, h, inner) => {
    card(g, cx, cy, w, h, rot, { r: 7, fill: [246, 240, 231], fill2: [228, 219, 205], blur: 12, sx: 4, sy: 7, sa: 0.3, grain: 0.3, seed: 11 });
    g.save(); g.translate(cx, cy); g.rotate(rad(rot));
    g.strokeStyle = 'rgba(160,140,112,.6)'; g.lineWidth = 0.9; g.beginPath(); g.roundRect(-w / 2 + inner, -h / 2 + inner, w - 2 * inner, h - 2 * inner, 4); g.stroke();
    g.fillStyle = fillGrad(g, 0, -h / 2, 0, h / 2, [249, 245, 239], [238, 231, 220]); g.beginPath(); g.roundRect(-w / 2 + inner + 0.6, -h / 2 + inner + 0.6, w - 2 * inner - 1.2, h - 2 * inner - 1.2, 3.5); g.fill();
    [[-1, -1, 0], [1, -1, Math.PI / 2], [1, 1, Math.PI], [-1, 1, -Math.PI / 2]].forEach(([sx, sy, a]) => goldCorner(g, sx * w / 2 - sx * 0.5, sy * h / 2 - sy * 0.5, 7, a));
    g.restore();
  };
  box(191, 94, 229, 133, 9);
  box(217, 243, 221, 160, 9);
  g.save(); g.translate(217, 243); g.rotate(rad(rot));
  // bản lề, khoá
  for (const x of [-62, 62]) { g.fillStyle = goldGrad(g, x - 9, -84, x + 9, -76); g.beginPath(); g.roundRect(x - 10, -84, 20, 7, 1.5); g.fill(); }
  // tay cầm
  g.save(); shadow(g, 4, 1.5, 3, 0.35); g.fillStyle = fillGrad(g, 0, 82, 0, 96, [248, 243, 235], [222, 212, 197]); g.beginPath(); g.roundRect(-30, 82, 60, 13, 6); g.fill(); g.restore();
  for (const x of [-36, 36]) { g.fillStyle = goldGrad(g, x - 5, 78, x + 5, 86); g.beginPath(); g.roundRect(x - 5, 77, 10, 8, 1.5); g.fill(); }
  g.restore();
  // đĩa than
  const dx = 206, dy = 244, R = 78;
  g.save(); shadow(g, 6, 1.5, 3, 0.45); g.fillStyle = '#141313'; g.beginPath(); g.arc(dx, dy, R, 0, TAU); g.fill(); g.restore();
  for (let r = R - 3; r > 34; r -= 1.6) { g.strokeStyle = `rgba(255,255,255,${0.025 + (r % 7 < 1 ? 0.03 : 0)})`; g.lineWidth = 0.5; g.beginPath(); g.arc(dx, dy, r, 0, TAU); g.stroke(); }
  const sheen = g.createConicGradient(rad(-40), dx, dy);
  [[0, 'rgba(255,255,255,0)'], [0.06, 'rgba(255,255,255,.16)'], [0.14, 'rgba(255,255,255,0)'], [0.5, 'rgba(255,255,255,0)'], [0.56, 'rgba(255,255,255,.12)'], [0.64, 'rgba(255,255,255,0)'], [1, 'rgba(255,255,255,0)']].forEach(([o, c]) => sheen.addColorStop(o, c));
  g.fillStyle = sheen; g.beginPath(); g.arc(dx, dy, R - 1, 0, TAU); g.arc(dx, dy, 33, TAU, 0, true); g.fill();
  g.fillStyle = fillGrad(g, dx - 30, dy - 30, dx + 30, dy + 30, [247, 242, 234], [229, 220, 206]); g.beginPath(); g.arc(dx, dy, 31, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(180,150,105,.6)'; g.lineWidth = 0.6; g.beginPath(); g.arc(dx, dy, 26, 0, TAU); g.stroke();
  g.fillStyle = goldGrad(g, dx - 3, dy - 3, dx + 3, dy + 3); g.beginPath(); g.arc(dx, dy, 2.6, 0, TAU); g.fill();
  // cần đọc
  g.save(); shadow(g, 3, 1, 2, 0.4);
  g.fillStyle = fillGrad(g, 272, 158, 298, 184, [250, 246, 240], [214, 203, 187]); g.beginPath(); g.arc(285, 171, 13, 0, TAU); g.fill();
  g.strokeStyle = goldGrad(g, 280, 170, 268, 262); g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(285, 172); g.lineTo(276, 236); g.lineTo(266, 258); g.stroke();
  g.translate(264, 266); g.rotate(rad(18)); g.fillStyle = fillGrad(g, -6, -12, 6, 12, [251, 248, 243], [216, 205, 190]); g.beginPath(); g.roundRect(-6, -13, 12, 24, 2); g.fill();
  g.restore();
  g.fillStyle = fillGrad(g, 279, 165, 291, 177, [228, 218, 202], [255, 252, 247]); g.beginPath(); g.arc(285, 171, 6.5, 0, TAU); g.fill();
  // núm chỉnh
  g.save(); shadow(g, 2, 0.6, 1.2, 0.4);
  const knob = g.createRadialGradient(311, 265, 1, 313, 268, 8.5); knob.addColorStop(0, '#f6e3a8'); knob.addColorStop(0.6, '#c99a52'); knob.addColorStop(1, '#8b6127');
  g.fillStyle = knob; g.beginPath(); g.arc(313, 268, 8, 0, TAU); g.fill();
  g.fillStyle = fillGrad(g, 314, 283, 322, 291, [255, 253, 248], [222, 212, 198]); g.beginPath(); g.arc(318, 287, 4.6, 0, TAU); g.fill();
  g.restore();
}
function polaroid(g, pcx, pcy, pw, ph, rot, seed) {
  const m = 7, mb = 24;
  g.save(); g.translate(pcx, pcy); g.rotate(rad(rot));
  card(g, 0, (mb - m) / 2, pw + 2 * m, ph + m + mb, 0, { r: 1, fill: [252, 251, 248], fill2: [244, 240, 234], blur: 9, sx: 2.5, sy: 5, sa: 0.28, seed });
  g.fillStyle = fillGrad(g, 0, -ph / 2, 0, ph / 2, [234, 228, 219], [226, 219, 209]); g.fillRect(-pw / 2, -ph / 2, pw, ph);
  g.strokeStyle = 'rgba(150,130,105,.35)'; g.lineWidth = 0.6; g.strokeRect(-pw / 2, -ph / 2, pw, ph);
  g.restore();
}

// ---------- Cảnh từng cột ----------
const COL = {}, el = (page, k) => { for (const s of window.IVORY_DESIGN.pages[page].secs) { const c = s.els.find(e => /\.col$/.test(e.k)); const e = s.els.find(e => e.k === k); if (e) return { ...e, x: e.x - c.x, y: e.y - c.y }; } };
const center = e => [e.x + e.w / 2, e.y + e.h / 2];
const ribbonR = (x0, A, P, ph) => y => x0 + A * Math.sin(TAU * y / P + ph);
COL['p1.col'] = (g, w, h) => {
  paper(g, w, h, 11, [231, 219, 208]);
  ribbon(g, ribbonR(432, 20, 270, 0.6), -30, 720, 48, 120, { taper: 40 });
  bouquet(g, { at: [-6, -6], dir: 62, spread: 70, reach: 150, sprays: 6, daisies: 3, daisiesTop: 2, top: 2 }, 12);
  rings(g, [73, 98, 29, 6.2], [109, 78, 31, 6.2]);
  envelopeClosed(g, 232.3, 420, 325.5, 231.5, -9.55, 38, [237, 458, 33, 13]);
  bouquet(g, {
    avoid: [[150, 560, 420, 690]], at: [10, 850], dir: -40, spread: 120, reach: 230, sprays: 9, daisiesTop: 7,
    big: [['rose', 30, 702, 46], ['peony', 96, 768, 52], ['rose', 22, 884, 44], ['peony', -6, 610, 28], ['rose', 152, 900, 30]],
  }, 13);
};
COL['s0.col'] = (g, w, h) => {
  paper(g, w, h, 21, [241, 238, 233], { k: 0.8 });
  const hero = el('p2', 'photo.hero'), [hx, hy] = center(hero);
  envelopeOpen(g, 52, 263, 338, 225, [215, 72], { vy: 92, inside: g => card(g, hx, hy + 3, 229, 168, hero.r, { r: 1, fill: [252, 250, 246], fill2: [245, 241, 235], blur: 6, sx: 1, sy: 2, sa: 0.18, seed: 22 }) });
  scallopCard(g, 220, 557, 131, 181, 18, 23);
  bouquet(g, {
    avoid: [[100, 140, 350, 330]], at: [462, -8], dir: 128, spread: 80, reach: 210, sprays: 8, daisies: 9, daisiesTop: 5, big: [['rose', 398, 8, 24], ['peony', 434, 46, 42]],
  }, 24);
  rings(g, [305, 73, 22, 5], [337, 90, 22, 5]);
};
COL['s1.col'] = (g, w, h) => {
  paper(g, w, h, 31, [247, 242, 237], { k: 0.8 });
  recordPlayer(g);
  card(g, 227, 473.5, 362, 167, 0, { seed: 32, fill: [249, 246, 241], fill2: [240, 234, 225] });
  const a1 = el('p2', 'photo.a1'), a2 = el('p2', 'photo.a2');
  polaroid(g, ...center(a1), a1.w, a1.h, a1.r, 33); polaroid(g, ...center(a2), a2.w, a2.h, a2.r, 34);
  bouquet(g, {
    avoid: [[46, 390, 408, 560]], at: [470, 780], dir: -140, spread: 100, reach: 260, sprays: 9, daisies: 12, daisiesTop: 6, top: 3,
    big: [['rose', 422, 762, 22], ['peony', 442, 682, 44], ['rose', 372, 724, 36]],
  }, 35);
};
COL['s2.col'] = (g, w, h) => {
  paper(g, w, h, 41, [246, 242, 237], { k: 0.8 });
  ribbon(g, ribbonR(30, 18, 250, 2.2), -30, 600, 50, 125, { taper: 50 });
  card(g, 231.5, 416.5, 359, 601, 0, { seed: 42 });
  bouquet(g, { avoid: [[70, 130, 395, 700]], at: [460, -8], dir: 125, spread: 80, reach: 230, sprays: 8, daisies: 9, daisiesTop: 5, big: [['rose', 394, 14, 30], ['peony', 434, 58, 45]] }, 43);
  bouquet(g, { avoid: [[70, 130, 395, 700]], at: [-8, 812], dir: -55, spread: 90, reach: 230, sprays: 8, daisies: 10, daisiesTop: 5, big: [['rose', 96, 792, 30], ['peony', 28, 748, 52]] }, 44);
  rings(g, [296, 77, 25, 5.6], [329, 87, 23, 5.4]);
};
COL['s3.col'] = (g, w, h) => {
  paper(g, w, h, 51, [247, 241, 236], { k: 0.8 });
  card(g, 226, 409.5, 344, 607, 0, { seed: 52 });
  bouquet(g, { avoid: [[60, 126, 378, 693]], at: [-8, -8], dir: 50, spread: 90, reach: 290, sprays: 10, daisies: 12, daisiesTop: 6, big: [['peony', 28, 120, 48], ['rose', 126, 46, 52], ['peony', 10, 22, 30]] }, 53);
  bouquet(g, { avoid: [[74, 126, 378, 693]], at: [458, 800], dir: -130, spread: 90, reach: 280, sprays: 10, daisies: 12, daisiesTop: 6, big: [['rose', 452, 652, 26], ['peony', 436, 742, 48], ['peony', 370, 778, 40]] }, 54);
};
COL['s4.col'] = (g, w, h) => {
  paper(g, w, h, 61, [246, 240, 234], { k: 0.85 });
  card(g, 223.5, 658, 375, 1076, 0, { seed: 62 });
  bouquet(g, { avoid: [[56, 140, 391, 1176]], at: [452, -8], dir: 128, spread: 95, reach: 340, sprays: 12, daisies: 14, daisiesTop: 7, big: [['rose', 440, 252, 28], ['rose', 265, 60, 55], ['peony', 400, 142, 52], ['peony', 340, 12, 34]] }, 63);
  bouquet(g, { avoid: [[56, 140, 391, 1176]], at: [-8, 1308], dir: -50, spread: 95, reach: 330, sprays: 12, daisies: 14, daisiesTop: 7, big: [['peony', 10, 1080, 26], ['peony', 36, 1168, 50], ['rose', 110, 1256, 55]] }, 64);
};
COL['s5.col'] = (g, w, h) => {
  paper(g, w, h, 71, [245, 240, 235], { k: 0.8 });
  ribbon(g, ribbonR(414, 20, 230, 1.0), -30, 630, 46, 115);
  envelopeOpen(g, 40, 300, 341, 275, [215, 147], { vy: 90, liner: [216, 210, 201] });
  card(g, 213, 422.5, 302, 187, 0, { seed: 72, blur: 8, sx: 2, sy: 4 });
  bouquet(g, { at: [-8, -8], dir: 55, spread: 80, reach: 200, sprays: 7, daisies: 6, daisiesTop: 3, big: [['rose', 66, 12, 22], ['peony', 22, 40, 40]] }, 73);
  rings(g, [117, 78, 22, 5], [141, 62, 22, 5]);
};
COL['s6.col'] = (g, w, h) => {
  paper(g, w, h, 81, [246, 241, 236], { k: 0.8 });
  card(g, 223.5, 663.8, 381, 1142, 0, { seed: 82, blur: 10, sx: 4, sy: 5 });
};
COL['s7.col'] = (g, w, h) => {
  paper(g, w, h, 91, [235, 227, 219]);
  ribbon(g, ribbonR(420, 16, 240, 0.3), -30, 640, 44, 118, { taper: 40 });
  bouquet(g, { at: [-6, -6], dir: 65, spread: 60, reach: 130, sprays: 5, daisies: 2, daisiesTop: 2, top: 2 }, 92);
  rings(g, [72, 73, 24, 5.4], [101, 47, 26, 5.6]);
  const pc = el('p2', 'photo.close'), [px, py] = center(pc);
  card(g, px, py + 2, 260, 356, pc.r, { seed: 93 });
  card(g, 246, 594, 242, 134, 0, { seed: 94 });
  bouquet(g, { avoid: [[114, 125, 373, 505], [125, 527, 367, 661]], at: [-8, 794], dir: -45, spread: 100, reach: 250, sprays: 9, daisies: 12, daisiesTop: 6, big: [['rose', 150, 786, 26], ['rose', 40, 672, 42], ['peony', 86, 746, 46]] }, 95);
};

// ---------- Nền giấy của các khối ----------
function bgPaper(g, w, h) {
  const R = rng(5); g.fillStyle = 'rgb(246,241,234)'; g.fillRect(0, 0, w, h);
  g.lineCap = 'round';
  for (let i = 0; i < w * h / 60; i++) { // nét quét dài lượn sóng
    const x = R() * w * 1.2 - w * 0.1, y = R() * h * 1.2 - h * 0.1, len = 30 + R() * 140, a = rad(-24) + (R() - 0.5) * 0.25, amp = 1 + R() * 3;
    const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len, nx = -Math.sin(a) * amp, ny = Math.cos(a) * amp;
    g.lineWidth = 0.6 + R() * 1.4;
    g.strokeStyle = `rgba(150,120,90,${0.04 + R() * 0.06})`; g.beginPath(); g.moveTo(x + 0.8, y + 1); g.bezierCurveTo(x + (ex - x) / 3 + nx + 0.8, y + (ey - y) / 3 + ny + 1, x + 2 * (ex - x) / 3 - nx + 0.8, y + 2 * (ey - y) / 3 - ny + 1, ex + 0.8, ey + 1); g.stroke();
    g.strokeStyle = `rgba(255,255,255,${0.25 + R() * 0.35})`; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + (ex - x) / 3 + nx, y + (ey - y) / 3 + ny, x + 2 * (ex - x) / 3 - nx, y + 2 * (ey - y) / 3 - ny, ex, ey); g.stroke();
  }
}

// ---------- Biểu tượng, đường viền, nút ----------
const LINE = '#b2833f', CREAM = '#fbf6ee', SAGE = ['#8f9a6c', '#6f7b52'];
function stroke(g, w = 1.3) { g.lineWidth = w; g.strokeStyle = LINE; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(); }
function sprig(g, x, y, len, ang, n = 4, size = 1, flip = 1) { // nhành lá nhỏ
  g.save(); g.translate(x, y); g.rotate(ang);
  g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(len * 0.12 * flip, -len * 0.5, 0, -len); stroke(g, 1);
  for (let i = 0; i < n; i++) {
    const t = 0.25 + i * 0.7 / n, side = i % 2 ? 1 : -1;
    g.save(); g.translate(len * 0.06 * flip * Math.sin(Math.PI * t), -len * t); g.rotate(side * 0.9);
    g.beginPath(); g.ellipse(0, -5 * size, 2.6 * size, 5.5 * size, 0, 0, TAU); g.fillStyle = SAGE[i % 2]; g.fill(); g.lineWidth = 0.5; g.strokeStyle = 'rgba(90,100,60,.6)'; g.stroke(); g.restore();
  }
  g.save(); g.translate(0, -len); g.beginPath(); g.ellipse(0, -4.5 * size, 2.4 * size, 5 * size, 0, 0, TAU); g.fillStyle = SAGE[0]; g.fill(); g.restore();
  g.restore();
}
function tinyFlower(g, x, y, r) { g.save(); g.translate(x, y); for (let i = 0; i < 5; i++) { g.rotate(TAU / 5); g.beginPath(); g.ellipse(0, -r * 0.55, r * 0.38, r * 0.55, 0, 0, TAU); g.fillStyle = '#fffdf8'; g.fill(); g.lineWidth = 0.5; g.strokeStyle = 'rgba(170,140,100,.6)'; g.stroke(); } g.beginPath(); g.arc(0, 0, r * 0.25, 0, TAU); g.fillStyle = '#d9ac55'; g.fill(); g.restore(); }
function sparkle(g, x, y, r) { g.beginPath(); g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r * 0.7, y); g.quadraticCurveTo(x, y, x, y + r); g.quadraticCurveTo(x, y, x - r * 0.7, y); g.quadraticCurveTo(x, y, x, y - r); g.fillStyle = '#d2a85e'; g.fill(); }
const ICON = {};
ICON['ic.rings'] = (g, w, h) => {
  sprig(g, 28, 60, 30, rad(-62), 4, 1.05); sprig(g, 25, 60, 22, rad(-98), 3, 0.95, -1);
  for (const [cx, cy, a] of [[40, 34, -0.35], [56, 36, 0.3]]) { g.save(); g.translate(cx, cy); g.rotate(a); g.beginPath(); g.ellipse(0, 0, 15, 17, 0, 0, TAU); g.ellipse(0, 0, 11.5, 13.5, 0, TAU, 0, true); g.fillStyle = goldGrad(g, -15, -17, 15, 17); g.fill(); g.lineWidth = 0.5; g.strokeStyle = 'rgba(110,72,25,.6)'; g.stroke(); g.restore(); }
  g.beginPath(); g.moveTo(54, 15); g.lineTo(58, 19); g.lineTo(54, 24); g.lineTo(50, 19); g.closePath(); g.fillStyle = '#fffaf0'; g.fill(); g.lineWidth = 0.6; g.strokeStyle = LINE; g.stroke();
};
ICON['ic.glass'] = (g) => {
  g.beginPath(); g.moveTo(14, 12); g.quadraticCurveTo(35, 40, 56, 12); g.closePath(); g.fillStyle = fillGrad(g, 0, 12, 0, 36, [250, 236, 200], [232, 205, 150]); g.fill(); stroke(g);
  g.beginPath(); g.ellipse(35, 12, 21, 3.2, 0, 0, TAU); g.fillStyle = '#fff8e8'; g.fill(); stroke(g, 1);
  g.beginPath(); g.moveTo(35, 31); g.lineTo(35, 62); stroke(g, 1.6); g.beginPath(); g.ellipse(35, 64, 12, 3, 0, 0, TAU); g.fillStyle = CREAM; g.fill(); stroke(g, 1.2);
  sprig(g, 20, 70, 26, rad(-35), 3, 0.9); tinyFlower(g, 18, 56, 6.5);
};
ICON['ic.camera'] = (g) => {
  sprig(g, 14, 62, 30, rad(-20), 4, 0.95); tinyFlower(g, 14, 40, 7);
  g.beginPath(); g.roundRect(26, 20, 58, 38, 5); g.fillStyle = fillGrad(g, 0, 20, 0, 58, [252, 247, 238], [234, 222, 204]); g.fill(); stroke(g);
  g.beginPath(); g.roundRect(44, 13, 22, 9, 2); g.fillStyle = CREAM; g.fill(); stroke(g, 1.1);
  g.beginPath(); g.rect(26, 27, 58, 4); g.fillStyle = '#d8c3a0'; g.fill();
  g.beginPath(); g.arc(55, 39, 14, 0, TAU); g.fillStyle = goldGrad(g, 41, 25, 69, 53); g.fill();
  g.beginPath(); g.arc(55, 39, 10.5, 0, TAU); g.fillStyle = '#2b2622'; g.fill(); g.beginPath(); g.arc(52, 36, 3, 0, TAU); g.fillStyle = 'rgba(255,255,255,.55)'; g.fill();
  g.beginPath(); g.roundRect(73, 23, 7, 4, 1); g.fillStyle = '#d2a85e'; g.fill();
};
ICON['ic.dinner'] = (g) => {
  sprig(g, 34, 62, 20, rad(-112), 3, 0.85, -1); sprig(g, 58, 62, 20, rad(112), 3, 0.85);
  g.beginPath(); g.arc(46, 36, 24, 0, TAU); g.fillStyle = fillGrad(g, 22, 12, 70, 60, [255, 252, 246], [236, 226, 210]); g.fill(); stroke(g, 1.2);
  g.beginPath(); g.arc(46, 36, 17, 0, TAU); stroke(g, 0.9);
  g.beginPath(); g.moveTo(12, 14); g.lineTo(12, 26); g.moveTo(9, 14); g.lineTo(9, 24); g.quadraticCurveTo(10.5, 28, 12, 28); g.quadraticCurveTo(13.5, 28, 15, 24); g.lineTo(15, 14); g.moveTo(12, 28); g.lineTo(12, 60); stroke(g, 1.3);
  g.beginPath(); g.moveTo(80, 14); g.quadraticCurveTo(86, 26, 80, 36); g.lineTo(80, 60); stroke(g, 1.6);
};
ICON['ic.disco'] = (g) => {
  g.beginPath(); g.moveTo(46, 4); g.lineTo(46, 14); stroke(g, 1); g.beginPath(); g.roundRect(42, 13, 8, 5, 1); g.fillStyle = '#d2a85e'; g.fill();
  const cx = 46, cy = 44, r = 26;
  g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fillStyle = (() => { const gr = g.createRadialGradient(cx - 9, cy - 10, 2, cx, cy, r); gr.addColorStop(0, '#fffaf0'); gr.addColorStop(0.6, '#e7d6b6'); gr.addColorStop(1, '#c9ab78'); return gr; })(); g.fill();
  g.save(); g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.clip(); g.lineWidth = 0.6; g.strokeStyle = 'rgba(150,110,55,.7)';
  for (let i = -3; i <= 3; i++) { g.beginPath(); g.ellipse(cx, cy, r * Math.cos(i * Math.PI / 8) || 0.1, r, 0, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(cx - r, cy + i * r / 3.6); g.lineTo(cx + r, cy + i * r / 3.6); g.stroke(); }
  g.restore(); g.beginPath(); g.arc(cx, cy, r, 0, TAU); stroke(g, 1.2);
  sparkle(g, 12, 22, 6); sparkle(g, 80, 18, 5); sparkle(g, 84, 52, 6); sparkle(g, 8, 56, 4.5); sparkle(g, 20, 8, 3.5);
  sprig(g, 37, 80, 18, rad(-118), 3, 0.8, -1); sprig(g, 55, 80, 18, rad(118), 3, 0.8);
};
ICON['ic.dress'] = (g) => { g.beginPath(); g.moveTo(17, 4); g.lineTo(19, 15); g.lineTo(14, 26); g.quadraticCurveTo(6, 42, 4, 52); g.quadraticCurveTo(23, 56, 42, 52); g.quadraticCurveTo(40, 42, 32, 26); g.lineTo(27, 15); g.lineTo(29, 4); g.moveTo(19, 15); g.quadraticCurveTo(23, 19, 27, 15); g.fillStyle = CREAM; g.fill(); stroke(g, 1.3); g.beginPath(); g.moveTo(14, 26); g.quadraticCurveTo(23, 29, 32, 26); stroke(g, 1); };
ICON['ic.bus'] = (g) => {
  g.beginPath(); g.roundRect(5, 5, 30, 34, 5); g.fillStyle = CREAM; g.fill(); stroke(g);
  g.beginPath(); g.roundRect(9, 11, 22, 13, 2); stroke(g, 1); g.beginPath(); g.moveTo(14, 8); g.lineTo(26, 8); stroke(g, 1);
  g.beginPath(); g.arc(12, 31, 2.2, 0, TAU); g.arc(28, 31, 2.2, 0, TAU); stroke(g, 1); g.beginPath(); g.roundRect(8, 39, 6, 5, 1); g.roundRect(26, 39, 6, 5, 1); stroke(g, 1);
};
ICON['ic.hotel'] = (g) => {
  g.beginPath(); g.moveTo(4, 48); g.lineTo(84, 48); stroke(g, 1.2);
  g.beginPath(); g.rect(30, 8, 28, 40); g.fillStyle = CREAM; g.fill(); stroke(g, 1.2); g.beginPath(); g.rect(20, 22, 10, 26); g.rect(58, 22, 10, 26); g.fill(); stroke(g, 1.1);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) { g.beginPath(); g.rect(35 + c * 11, 13 + r * 8, 5, 4.5); stroke(g, 0.8); }
  for (const x of [23.5, 61.5]) for (let r = 0; r < 3; r++) { g.beginPath(); g.rect(x, 27 + r * 7, 3.5, 3.5); stroke(g, 0.7); }
  g.beginPath(); g.rect(40, 40, 8, 8); stroke(g, 0.9);
  for (const x of [10, 78]) { g.beginPath(); g.ellipse(x, 32, 5.5, 8, 0, 0, TAU); g.fillStyle = '#eef0e2'; g.fill(); stroke(g, 1); g.beginPath(); g.moveTo(x, 34); g.lineTo(x, 48); stroke(g, 1); }
};
ICON['ic.gift'] = (g) => {
  g.beginPath(); g.rect(6, 20, 31, 27); g.fillStyle = CREAM; g.fill(); stroke(g); g.beginPath(); g.rect(4, 14, 35, 7); g.fill(); stroke(g);
  g.beginPath(); g.moveTo(21.5, 14); g.lineTo(21.5, 47); stroke(g, 1.1);
  g.beginPath(); g.moveTo(21.5, 14); g.bezierCurveTo(14, 2, 6, 8, 12, 13); g.closePath(); g.moveTo(21.5, 14); g.bezierCurveTo(29, 2, 37, 8, 31, 13); g.closePath(); stroke(g, 1.1);
};
const laurel = flip => (g, w, h) => { g.save(); if (flip) { g.translate(w, 0); g.scale(-1, 1); } sprig(g, w * 0.62, h - 2, h - 9, rad(-12), 4, 0.95); g.restore(); };
ICON['ic.laurel1'] = laurel(0); ICON['ic.laurel1r'] = laurel(1); ICON['ic.laurel2'] = laurel(0); ICON['ic.laurel2r'] = laurel(1); ICON['ic.laurel3'] = laurel(0); ICON['ic.laurel3r'] = laurel(1);
function ornament(g, w, h, o = {}) { // đường chỉ vàng mảnh + hoạ tiết giữa
  const cy = h / 2, cx = w / 2, m = o.m ?? h * 0.62;
  const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(170,122,55,.2)'); gr.addColorStop(0.08, 'rgba(170,122,55,1)'); gr.addColorStop(0.92, 'rgba(170,122,55,1)'); gr.addColorStop(1, 'rgba(170,122,55,.2)');
  g.strokeStyle = gr; g.lineWidth = o.lw ?? 1.1; g.beginPath(); if (o.small) { g.moveTo(1, cy); g.lineTo(w - 1, cy); } else { g.moveTo(1, cy); g.lineTo(cx - m * 1.4, cy); g.moveTo(cx + m * 1.4, cy); g.lineTo(w - 1, cy); } g.stroke();
  g.fillStyle = goldGrad(g, cx - m, cy - m, cx + m, cy + m);
  g.beginPath(); g.moveTo(cx, cy - m * 0.42); g.lineTo(cx + m * 0.3, cy); g.lineTo(cx, cy + m * 0.42); g.lineTo(cx - m * 0.3, cy); g.closePath(); g.fill();
  if (o.small) return;
  g.strokeStyle = LINE; g.lineWidth = o.lw ?? 1.1;
  for (const s of [-1, 1]) {
    g.beginPath(); g.moveTo(cx + s * m * 0.35, cy); g.bezierCurveTo(cx + s * m * 0.7, cy - m * 0.45, cx + s * m * 1.05, cy - m * 0.1, cx + s * m * 0.85, cy + m * 0.05); g.stroke();
    g.beginPath(); g.moveTo(cx + s * m * 0.35, cy); g.bezierCurveTo(cx + s * m * 0.7, cy + m * 0.45, cx + s * m * 1.15, cy + m * 0.2, cx + s * m * 1.4, cy); g.stroke();
    g.beginPath(); g.arc(cx + s * m * 0.85, cy + m * 0.05, m * 0.06, 0, TAU); g.fill();
  }
  g.beginPath(); g.arc(cx, cy - m * 0.62, m * 0.07, 0, TAU); g.arc(cx, cy + m * 0.62, m * 0.07, 0, TAU); g.fill();
}
function pill(g, w, h) {
  const x = 1.5, y = 1.5, pw = w - 3, ph = h - 3.5;
  g.save(); shadow(g, 2.5, 0.5, 1, 0.18); g.beginPath(); g.roundRect(x, y, pw, ph, ph / 2); g.fillStyle = fillGrad(g, 0, y, 0, y + ph, [253, 250, 245], [244, 237, 227]); g.fill(); g.restore();
  g.beginPath(); g.roundRect(x + 0.3, y + 0.3, pw - 0.6, ph - 0.6, ph / 2); g.lineWidth = 1.5; g.strokeStyle = goldGrad(g, x, y, x + pw, y + ph); g.stroke();
}
const ORN = { 'orn.divider': {}, 'orn.day': {}, 'orn.det': { m: 14 }, 'orn.sep1': { m: 15 }, 'orn.sep2': { m: 15 }, 'orn.sep3': { m: 15 } };
for (let i = 1; i <= 5; i++) ORN['orn.u' + i] = { small: 1, m: 9 };

// ---------- Danh sách ảnh cần xuất ----------
function slots() {
  const out = {};
  for (const P of Object.values(window.IVORY_DESIGN.pages)) for (const s of P.secs) for (const e of s.els) if (e.t === 'i' && !/^photo\./.test(e.k) && !out[e.k]) { const ib = e.ib || [0, 0, e.w, e.h]; out[e.k] = [ib[2], ib[3]]; }
  out['bg.paper'] = [1366, 819.6];
  return out;
}
window.ART_KEYS = Object.keys(slots());
window.renderArt = (k, type = 'image/webp', q = 0.86) => {
  const [w, h] = slots()[k];
  S = k === 'bg.paper' ? 0.9 : /\.col$/.test(k) ? 2 : 4;
  const c = document.createElement('canvas'); c.width = Math.round(w * S); c.height = Math.round(h * S);
  const g = c.getContext('2d'); g.scale(S, S);
  if (COL[k]) COL[k](g, w, h);
  else if (k === 'bg.paper') bgPaper(g, w, h);
  else if (ICON[k]) ICON[k](g, w, h);
  else if (ORN[k]) ornament(g, w, h, ORN[k]);
  else if (/^btn\./.test(k)) pill(g, w, h);
  else throw new Error('chưa có cách vẽ: ' + k);
  return c.toDataURL(type, q);
};
