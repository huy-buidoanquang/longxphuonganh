'use strict';
/* Hình minh hoạ tự vẽ bằng Canvas/SVG, không tải ảnh ngoài: bó hoa, phong bì + dấu sáp, bao lì xì, 3 icon lịch trình,
   phác hoạ lâu đài và ảnh giữ chỗ. Mỗi hình vẽ một lần rồi gán cho mọi <img class="art-…"> cùng loại. */
(() => {
  const TAU = Math.PI * 2;
  let seed = 1;
  const R = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const rnd = (a, b) => a + (b - a) * R();
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => { const x = hex(a), y = hex(b); return 'rgb(' + x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',') + ')'; };
  const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d', { willReadFrequently: true })]; }; // vẽ bằng CPU: tránh mất nội dung khi GPU reset

  const RED = ['#2a050a', '#55101a', '#7a1d28', '#96363f'];
  const CREAM = ['#b39368', '#e9d8bb', '#fdf7ec'];
  const WHITE = ['#cbbd9f', '#f1eadc', '#fffdf8'];
  const SAGE = ['#767b57', '#a9ab86', '#d0cdaf'];
  const BEIGE = ['#9c8c63', '#d2c59f', '#efe6cc'];

  // Cánh hoa trong toạ độ cục bộ: gốc ở (0,0), mọc về phía -y, mép ngoài gợn sóng
  function petal(g, len, wid, c0, c1, c2, ruff = .08) {
    const p = new Path2D(), n = 4, e = .72;
    p.moveTo(0, 0);
    p.bezierCurveTo(-wid * .55, -len * .18, -wid, -len * .58, -wid * e, -len * .9);
    for (let i = 0; i < n; i++) {
      const xa = -wid * e + (i + .5) * 2 * e * wid / n, xb = -wid * e + (i + 1) * 2 * e * wid / n;
      const ya = -len * (.9 + .12 * Math.sin(Math.PI * (i + .5) / n) + rnd(0, ruff));
      const yb = i === n - 1 ? -len * .9 : -len * (.9 + .12 * Math.sin(Math.PI * (i + 1) / n) - rnd(0, ruff) * .6);
      p.quadraticCurveTo(xa, ya, xb, yb);
    }
    p.bezierCurveTo(wid, -len * .58, wid * .55, -len * .18, 0, 0);
    const gr = g.createLinearGradient(0, 0, 0, -len);
    gr.addColorStop(0, c0); gr.addColorStop(.55, c1); gr.addColorStop(1, c2);
    g.fillStyle = gr; g.fill(p);
    g.save(); g.clip(p);
    g.lineWidth = Math.max(.5, wid * .02); g.strokeStyle = 'rgba(30,0,0,.07)';
    for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(i * wid * .18, -len * .5, i * wid * .3, -len * 1.05); g.stroke(); }
    g.lineWidth = Math.max(1, wid * .1); g.strokeStyle = 'rgba(255,238,230,.16)'; g.stroke(p);
    g.restore();
    g.lineWidth = Math.max(.4, wid * .018); g.strokeStyle = 'rgba(25,0,0,.25)'; g.stroke(p);
  }

  function shadowDisk(g, r, col, k = .8) {
    g.save(); g.shadowColor = 'rgba(25,5,0,.4)'; g.shadowBlur = r * .3; g.shadowOffsetY = r * .08;
    g.fillStyle = col; g.beginPath(); g.arc(0, 0, r * k, 0, TAU); g.fill(); g.restore();
  }

  function peony(g, x, y, r, P = RED, rot = 0, squash = .86) {
    g.save(); g.translate(x, y); g.rotate(rot); g.scale(1, squash);
    shadowDisk(g, r, P[0]);
    const layers = [[12, 1, .4], [11, .86, .38], [10, .72, .34], [9, .58, .3], [8, .45, .26], [7, .32, .2]];
    layers.forEach(([n, lf, wf], li) => {
      const off = R() * TAU, t = li / (layers.length - 1);
      for (let i = 0; i < n; i++) {
        g.save(); g.rotate(off + i * TAU / n + rnd(-.18, .18));
        petal(g, r * lf * rnd(.9, 1.06), r * wf * rnd(.85, 1.12), P[0], mix(P[1], P[0], t * .4), mix(P[2], P[3], t * .5), .1);
        g.restore();
      }
    });
    for (let i = 0; i < 40; i++) {
      const a = R() * TAU, d = Math.sqrt(R()) * r * .16;
      g.fillStyle = R() < .5 ? '#e2bf66' : '#a77a26'; g.beginPath(); g.arc(Math.cos(a) * d, Math.sin(a) * d, r * rnd(.015, .03), 0, TAU); g.fill();
    }
    for (let i = 0; i < 5; i++) { g.save(); g.rotate(R() * TAU); petal(g, r * .2, r * .14, P[0], P[1], P[3], .06); g.restore(); }
    g.restore();
  }

  function rose(g, x, y, r, P = CREAM, rot = 0) {
    g.save(); g.translate(x, y); g.rotate(rot); g.scale(1, .92);
    shadowDisk(g, r, P[1], .85);
    [[7, 1, .62], [6, .8, .55], [5, .62, .48]].forEach(([n, lf, wf]) => {
      const off = R() * TAU;
      for (let i = 0; i < n; i++) { g.save(); g.rotate(off + i * TAU / n + rnd(-.2, .2)); petal(g, r * lf, r * wf, P[0], P[1], P[2], .03); g.restore(); }
    });
    for (let i = 0; i < 6; i++) { // xoáy cánh ở giữa
      const rr = r * (.42 - i * .06), a = R() * TAU, ox = rnd(-.04, .04) * r, oy = rnd(-.04, .04) * r;
      const gr = g.createRadialGradient(ox - rr * .3, oy - rr * .3, rr * .1, ox, oy, rr);
      gr.addColorStop(0, P[2]); gr.addColorStop(1, mix(P[0], P[1], .4));
      g.fillStyle = gr; g.beginPath(); g.ellipse(ox, oy, rr, rr * .86, a, 0, TAU); g.fill();
      g.lineWidth = Math.max(.6, r * .025); g.strokeStyle = 'rgba(90,60,30,.4)';
      g.beginPath(); g.arc(ox, oy, rr, a, a + rnd(2.4, 3.6)); g.stroke();
    }
    g.restore();
  }

  function blossom(g, x, y, r, rot = 0, P = WHITE) {
    g.save(); g.translate(x, y); g.rotate(rot);
    g.shadowColor = 'rgba(40,20,0,.25)'; g.shadowBlur = r * .3;
    for (let i = 0; i < 5; i++) { g.save(); g.rotate(i * TAU / 5 + rnd(-.1, .1)); petal(g, r * rnd(.9, 1.05), r * .52, P[0], P[1], P[2], .05); g.restore(); }
    g.shadowColor = 'transparent';
    g.fillStyle = '#c9a24a'; g.beginPath(); g.arc(0, 0, r * .2, 0, TAU); g.fill();
    g.fillStyle = '#5a3a1a';
    for (let i = 0; i < 10; i++) { const a = i * TAU / 10; g.beginPath(); g.arc(Math.cos(a) * r * .25, Math.sin(a) * r * .25, r * .035, 0, TAU); g.fill(); }
    g.restore();
  }

  function leaf(g, x, y, len, ang, C = SAGE, wid = len * .32) {
    g.save(); g.translate(x, y); g.rotate(ang);
    const p = new Path2D();
    p.moveTo(0, 0); p.bezierCurveTo(wid, -len * .2, wid * .8, -len * .7, 0, -len); p.bezierCurveTo(-wid * .8, -len * .7, -wid, -len * .2, 0, 0);
    const gr = g.createLinearGradient(-wid, 0, wid, 0);
    gr.addColorStop(0, C[0]); gr.addColorStop(.5, C[1]); gr.addColorStop(1, C[2]);
    g.shadowColor = 'rgba(30,20,0,.25)'; g.shadowBlur = len * .08;
    g.fillStyle = gr; g.fill(p); g.shadowColor = 'transparent';
    g.strokeStyle = 'rgba(60,50,20,.35)'; g.lineWidth = Math.max(.5, len * .012); g.stroke(p);
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(wid * .1, -len * .5, 0, -len * .96); g.strokeStyle = 'rgba(255,250,230,.5)'; g.stroke();
    g.restore();
  }

  function stem(g, pts, w, col = '#6b5a3e') {
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) g.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2);
    const l = pts[pts.length - 1];
    g.lineTo(l[0], l[1]); g.lineWidth = w; g.lineCap = 'round'; g.strokeStyle = col; g.stroke();
  }

  function berry(g, x, y, r) {
    const gr = g.createRadialGradient(x - r * .35, y - r * .35, r * .1, x, y, r);
    gr.addColorStop(0, '#b4505a'); gr.addColorStop(.5, '#6a1420'); gr.addColorStop(1, '#330810');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }

  // Cành quả mọng: thân cong, các nhánh con có quả ở đầu
  function sprig(g, x0, y0, x1, y1, bend, r, n = 7) {
    const cx = (x0 + x1) / 2 + bend, cy = (y0 + y1) / 2;
    const at = t => [(1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t * t * x1, (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t * t * y1];
    g.strokeStyle = '#5b3a2a'; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(cx, cy, x1, y1); g.lineWidth = r * .35; g.stroke();
    for (let i = 0; i < n; i++) {
      const [px, py] = at(.35 + .65 * i / (n - 1)), side = i % 2 ? 1 : -1, l = r * rnd(2, 4), bx = px + side * l, by = py - l * .6;
      g.beginPath(); g.moveTo(px, py); g.lineTo(bx, by); g.lineWidth = r * .22; g.strokeStyle = '#5b3a2a'; g.stroke();
      berry(g, bx, by, r * rnd(.8, 1.1));
    }
    berry(g, x1, y1, r);
  }

  function baby(g, x, y, s, n = 16) { // hoa baby li ti
    for (let i = 0; i < n; i++) {
      const a = R() * TAU, d = Math.sqrt(R()) * s;
      g.fillStyle = R() < .3 ? '#e6dac4' : '#fdf9f1'; g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, s * rnd(.06, .11), 0, TAU); g.fill();
    }
  }

  function grain(g, W, H, clip, n = 2500, a = .05) {
    g.save(); if (clip) g.clip(clip);
    for (let i = 0; i < n; i++) { g.fillStyle = R() < .5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a * 1.4})`; g.fillRect(R() * W, R() * H, rnd(1, 2.5), rnd(1, 2.5)); }
    g.restore();
  }

  function heart(p, x, y, s) {
    p.moveTo(x, y + s * .9);
    p.bezierCurveTo(x - s * 1.3, y + s * .1, x - s * .9, y - s * .9, x, y - s * .35);
    p.bezierCurveTo(x + s * .9, y - s * .9, x + s * 1.3, y + s * .1, x, y + s * .9);
  }

  // ---------- Bó hoa dọc (tỉ lệ 811×1938 như mẫu) ----------
  function bouquet() {
    seed = 11;
    const W = 480, H = 1148, [c, g] = cv(W, H), u = x => x * W, v = y => y * H;
    for (let i = 0; i < 6; i++) stem(g, [[u(.5 + rnd(-.06, .06)), v(.6)], [u(.48 + rnd(-.08, .08)), v(.8)], [u(.42 + rnd(-.12, .12)), v(.985)]], W * .012, i % 2 ? '#6b5a3e' : '#7c7a52');
    sprig(g, u(.5), v(.4), u(.56), v(.03), W * .08, W * .022, 8);
    sprig(g, u(.45), v(.42), u(.28), v(.12), -W * .06, W * .02, 6);
    sprig(g, u(.55), v(.45), u(.82), v(.2), W * .05, W * .018, 5);
    [[.42, .26, -.9], [.62, .22, .8], [.36, .33, -1.3], [.68, .3, 1.2], [.3, .4, -1.6], [.76, .38, 1.5]]
      .forEach(([x, y, a], i) => leaf(g, u(x), v(y), W * rnd(.16, .22), a, i % 2 ? SAGE : BEIGE));
    [[.14, .5, -1.9, .3], [.88, .56, 1.8, .28], [.12, .68, -2.3, .26], [.9, .72, 2.2, .25], [.26, .84, -2.7, .2], [.74, .86, 2.7, .2]]
      .forEach(([x, y, a, l], i) => leaf(g, u(x), v(y), W * l, a, i % 2 ? BEIGE : SAGE));
    baby(g, u(.78), v(.36), W * .08); baby(g, u(.2), v(.6), W * .07); baby(g, u(.8), v(.7), W * .06);
    peony(g, u(.42), v(.41), W * .3, RED, .3);
    blossom(g, u(.82), v(.3), W * .1, .4);
    rose(g, u(.76), v(.5), W * .2, CREAM, .2);
    blossom(g, u(.17), v(.52), W * .12, -.2);
    peony(g, u(.55), v(.63), W * .34, RED, -.4);
    peony(g, u(.2), v(.72), W * .1, RED, .8);
    rose(g, u(.5), v(.8), W * .11, CREAM, .5);
    blossom(g, u(.3), v(.83), W * .1, .9);
    blossom(g, u(.74), v(.8), W * .09, 1.3);
    return c;
  }

  // ---------- Bó hoa tròn ở góc tờ giấy sổ lưu bút ----------
  function bouquetWide() {
    seed = 23;
    const W = 560, H = 460, [c, g] = cv(W, H), u = x => x * W, v = y => y * H;
    for (let i = 0; i < 4; i++) stem(g, [[u(.5), v(.6)], [u(.6 + rnd(-.05, .05)), v(.82)], [u(.68 + rnd(-.08, .08)), v(.98)]], W * .01, '#6b5a3e');
    sprig(g, u(.35), v(.42), u(.12), v(.06), -W * .04, W * .016, 6);
    sprig(g, u(.6), v(.45), u(.82), v(.16), W * .03, W * .014, 5);
    [[.1, .52, -1.7, .2], [.22, .8, -2.4, .18], [.86, .56, 1.6, .18], [.78, .82, 2.4, .2], [.3, .24, -.7, .16], [.64, .2, .6, .15]]
      .forEach(([x, y, a, l], i) => leaf(g, u(x), v(y), W * l, a, i % 2 ? BEIGE : SAGE));
    baby(g, u(.72), v(.62), W * .07); baby(g, u(.3), v(.36), W * .05);
    peony(g, u(.15), v(.44), W * .08, RED, .2);
    blossom(g, u(.31), v(.3), W * .07, .3);
    rose(g, u(.27), v(.66), W * .13, CREAM, .4);
    peony(g, u(.5), v(.5), W * .2, RED, -.2);
    blossom(g, u(.69), v(.74), W * .06, .8);
    return c;
  }

  // ---------- Phong bì: mặt sau (nắp mở có ren) và mặt trước (túi + dấu sáp) ----------
  function lace(g, x0, y0, x1, y1, w) {
    const len = Math.hypot(x1 - x0, y1 - y0), n = Math.round(len / w);
    g.save(); g.translate(x0, y0); g.rotate(Math.atan2(y1 - y0, x1 - x0));
    g.fillStyle = 'rgba(40,6,10,.92)'; g.fillRect(0, 0, len, w * .7);
    for (let i = 0; i < n; i++) {
      const cx = (i + .5) * len / n;
      g.fillStyle = 'rgba(40,6,10,.92)'; g.beginPath(); g.arc(cx, w * .7, w * .42, 0, Math.PI); g.fill();
      g.fillStyle = '#7d2630'; g.beginPath(); g.arc(cx, w * .45, w * .15, 0, TAU); g.fill();
      g.beginPath(); g.arc(cx + len / n / 2, w * .2, w * .07, 0, TAU); g.fill();
      g.beginPath(); g.arc(cx, w * .88, w * .07, 0, TAU); g.fill();
    }
    g.restore();
  }

  function envBack() {
    seed = 31;
    const W = 500, H = 577, fy = H * .4, [c, g] = cv(W, H);
    const body = new Path2D();
    body.moveTo(0, fy); body.lineTo(W / 2, 2); body.lineTo(W, fy); body.lineTo(W, H); body.lineTo(0, H); body.closePath();
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#4e1118'); gr.addColorStop(1, '#36090e');
    g.fillStyle = gr; g.fill(body);
    grain(g, W, H, body);
    lace(g, 0, fy, W / 2, 2, W * .045); lace(g, W / 2, 2, W, fy, W * .045);
    return c;
  }

  function seal(g, x, y, r) {
    g.save(); g.translate(x, y);
    const p = new Path2D(), n = 11;
    for (let i = 0; i <= n * 4; i++) {
      const a = i / (n * 4) * TAU, rr = r * (1 + .06 * Math.sin(a * n) + rnd(-.015, .015));
      i ? p.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : p.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    p.closePath();
    g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = r * .35; g.shadowOffsetY = r * .12;
    let gr = g.createRadialGradient(-r * .35, -r * .4, r * .1, 0, 0, r * 1.1);
    gr.addColorStop(0, '#f6e0a0'); gr.addColorStop(.45, '#d4a94e'); gr.addColorStop(1, '#8a6020');
    g.fillStyle = gr; g.fill(p); g.shadowColor = 'transparent';
    gr = g.createRadialGradient(r * .2, r * .25, r * .1, 0, 0, r * .75);
    gr.addColorStop(0, '#c9973e'); gr.addColorStop(1, '#e8c878');
    g.beginPath(); g.arc(0, 0, r * .72, 0, TAU); g.fillStyle = gr; g.fill();
    g.lineWidth = r * .06; g.strokeStyle = 'rgba(110,70,15,.55)'; g.stroke();
    const h = new Path2D(); heart(h, 0, r * .05, r * .42);
    g.lineWidth = r * .09; g.lineJoin = 'round';
    g.save(); g.translate(r * .03, r * .04); g.strokeStyle = 'rgba(255,240,190,.75)'; g.stroke(h); g.restore();
    g.strokeStyle = '#7a5214'; g.stroke(h);
    g.restore();
  }

  function envCover() {
    seed = 37;
    const W = 500, H = 330, vx = W / 2, vy = H * .46, [c, g] = cv(W, H);
    g.beginPath(); g.roundRect(0, 0, W, H, [0, 0, 6, 6]); g.clip();
    const tri = (pts, c0, c1, x0, y0, x1, y1) => {
      const p = new Path2D(); p.moveTo(...pts[0]); pts.slice(1).forEach(q => p.lineTo(...q)); p.closePath();
      const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, c0); gr.addColorStop(1, c1);
      g.fillStyle = gr; g.fill(p); return p;
    };
    tri([[0, 0], [vx, vy], [W, 0], [W, H], [0, H]], '#561620', '#561620', 0, 0, 0, H); // nền liền, không hở khe giữa các nắp
    tri([[0, 0], [vx, vy], [0, H]], '#661c25', '#541620', 0, 0, vx, vy);
    tri([[W, 0], [vx, vy], [W, H]], '#5c1820', '#4a1219', W, 0, vx, vy);
    g.save(); g.shadowColor = 'rgba(0,0,0,.4)'; g.shadowBlur = 12; g.shadowOffsetY = -3;
    tri([[0, H], [vx, vy + 8], [W, H]], '#4c1219', '#5e1a22', 0, vy, 0, H);
    g.restore();
    g.beginPath(); g.moveTo(0, 1); g.lineTo(vx, vy); g.lineTo(W, 1);
    g.strokeStyle = 'rgba(255,205,205,.2)'; g.lineWidth = 2; g.stroke();
    g.beginPath(); g.moveTo(0, H); g.lineTo(vx, vy + 8); g.lineTo(W, H);
    g.strokeStyle = 'rgba(255,205,205,.1)'; g.lineWidth = 1.5; g.stroke();
    grain(g, W, H, null, 3000);
    seal(g, vx, vy + 4, W * .085);
    return c;
  }

  // ---------- Bao lì xì ở hộp quà mừng ----------
  function giftEnv() {
    seed = 41;
    const W = 420, H = 672, [c, g] = cv(W, H), u = x => x * W, v = y => y * H;
    const body = new Path2D(); body.roundRect(4, 4, W - 8, H - 8, 14);
    let gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#a3252d'); gr.addColorStop(1, '#76131a');
    g.fillStyle = gr; g.fill(body);
    grain(g, W, H, body, 3000);
    g.save(); g.clip(body);
    [[.18, .56, -1.6, .2], [.82, .6, 1.5, .2], [.2, .86, -2.4, .18], [.8, .88, 2.4, .18], [.42, .4, -.5, .17], [.62, .38, .6, .15]]
      .forEach(([x, y, a, l], i) => leaf(g, u(x), v(y), W * l, a, i % 2 ? BEIGE : ['#a8874a', '#d8b878', '#f1dcae']));
    sprig(g, u(.48), v(.52), u(.3), v(.36), -W * .04, W * .016, 5);
    baby(g, u(.7), v(.72), W * .07); baby(g, u(.28), v(.62), W * .05);
    blossom(g, u(.3), v(.48), W * .08, .2);
    rose(g, u(.6), v(.55), W * .14, CREAM, .3);
    peony(g, u(.38), v(.67), W * .2, RED, -.3);
    rose(g, u(.63), v(.79), W * .12, CREAM, 1);
    blossom(g, u(.78), v(.7), W * .06, .7);
    g.restore();
    const flap = new Path2D();
    flap.moveTo(4, 18); flap.quadraticCurveTo(4, 4, 18, 4); flap.lineTo(W - 18, 4); flap.quadraticCurveTo(W - 4, 4, W - 4, 18);
    flap.lineTo(W / 2 + 22, v(.3) - 8); flap.quadraticCurveTo(W / 2, v(.315), W / 2 - 22, v(.3) - 8); flap.closePath();
    g.save(); g.shadowColor = 'rgba(0,0,0,.4)'; g.shadowBlur = 14; g.shadowOffsetY = 5;
    gr = g.createLinearGradient(0, 0, 0, v(.3)); gr.addColorStop(0, '#8d1a22'); gr.addColorStop(1, '#a1242c');
    g.fillStyle = gr; g.fill(flap); g.restore();
    g.strokeStyle = 'rgba(255,200,190,.25)'; g.lineWidth = 2; g.stroke(flap);
    leaf(g, u(.42), v(.19), W * .09, -1.2, BEIGE); leaf(g, u(.58), v(.19), W * .09, 1.2, BEIGE);
    blossom(g, u(.4), v(.14), W * .04, .2); blossom(g, u(.6), v(.14), W * .04, .9);
    rose(g, u(.5), v(.17), W * .075, CREAM, .2);
    return c;
  }

  // ---------- Icon lịch trình: máy ảnh, bánh cưới, bàn tiệc ----------
  const GOLD = ['#8a6420', '#d4a94e', '#f3dc9c'];
  function goldFill(g, x0, y0, x1, y1) { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, GOLD[2]); gr.addColorStop(.5, GOLD[1]); gr.addColorStop(1, GOLD[0]); return gr; }

  function camera() {
    seed = 51;
    const W = 300, H = 318, [c, g] = cv(W, H), u = x => x * W, v = y => y * H;
    sprig(g, u(.2), v(.5), u(.08), v(.12), -W * .03, W * .016, 4);
    leaf(g, u(.18), v(.42), W * .16, -.8, BEIGE); leaf(g, u(.14), v(.62), W * .14, -2, SAGE);
    g.save(); g.shadowColor = 'rgba(0,0,0,.4)'; g.shadowBlur = 10; g.shadowOffsetY = 4;
    let gr = g.createLinearGradient(0, v(.3), 0, v(.76)); gr.addColorStop(0, '#f6eddd'); gr.addColorStop(1, '#d2bf9d');
    g.fillStyle = gr; g.beginPath(); g.roundRect(u(.2), v(.33), u(.76), v(.42), 14); g.fill(); g.restore();
    g.fillStyle = '#eadcc4'; g.beginPath(); g.roundRect(u(.32), v(.25), u(.22), v(.1), 6); g.fill();
    g.fillStyle = '#d8c8aa'; g.fillRect(u(.2), v(.46), u(.76), v(.19));
    g.fillStyle = 'rgba(120,95,60,.25)';
    for (let i = 0; i < 160; i++) g.fillRect(u(.2) + R() * u(.76), v(.46) + R() * v(.19), 2, 2);
    g.fillStyle = goldFill(g, 0, v(.27), 0, v(.33)); g.beginPath(); g.roundRect(u(.72), v(.27), u(.11), v(.06), 3); g.fill();
    g.fillStyle = '#fbf6ea'; g.strokeStyle = GOLD[0]; g.lineWidth = 2; g.beginPath(); g.roundRect(u(.8), v(.37), u(.1), v(.06), 3); g.fill(); g.stroke();
    const lx = u(.58), ly = v(.55);
    g.fillStyle = goldFill(g, lx - u(.2), ly - u(.2), lx + u(.2), ly + u(.2)); g.beginPath(); g.arc(lx, ly, u(.19), 0, TAU); g.fill();
    g.fillStyle = '#3b3530'; g.beginPath(); g.arc(lx, ly, u(.15), 0, TAU); g.fill();
    gr = g.createRadialGradient(lx - u(.03), ly - u(.03), 2, lx, ly, u(.1)); gr.addColorStop(0, '#5a5a66'); gr.addColorStop(1, '#0e0c0c');
    g.fillStyle = gr; g.beginPath(); g.arc(lx, ly, u(.1), 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.arc(lx - u(.035), ly - u(.035), u(.025), 0, TAU); g.fill();
    leaf(g, u(.4), v(.86), W * .14, 1.9, SAGE); leaf(g, u(.12), v(.8), W * .12, -2.3, BEIGE);
    peony(g, u(.17), v(.6), W * .09, RED, .3);
    rose(g, u(.3), v(.74), W * .13, CREAM, .2);
    blossom(g, u(.44), v(.8), W * .055, .5);
    return c;
  }

  function cake() {
    seed = 61;
    const W = 260, H = 373, [c, g] = cv(W, H), u = x => x * W, v = y => y * H;
    g.fillStyle = goldFill(g, u(.35), 0, u(.65), 0);
    g.beginPath(); g.moveTo(u(.43), v(.86)); g.lineTo(u(.57), v(.86)); g.lineTo(u(.63), v(.95)); g.lineTo(u(.37), v(.95)); g.fill();
    g.beginPath(); g.ellipse(u(.5), v(.955), u(.16), v(.022), 0, 0, TAU); g.fill();
    g.fillStyle = goldFill(g, 0, v(.82), 0, v(.88)); g.beginPath(); g.ellipse(u(.5), v(.845), u(.44), v(.035), 0, 0, TAU); g.fill();
    const tier = (x0, x1, y0, y1) => {
      const rx = (x1 - x0) / 2, cx = x0 + rx, ry = rx * .16;
      const gr = g.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, '#ddd2bf'); gr.addColorStop(.45, '#fffcf6'); gr.addColorStop(1, '#d6cab4');
      g.save(); g.shadowColor = 'rgba(0,0,0,.25)'; g.shadowBlur = 6; g.shadowOffsetY = 2;
      g.fillStyle = gr; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0, y1); g.ellipse(cx, y1, rx, ry, 0, Math.PI, 0, true); g.lineTo(x1, y0); g.fill(); g.restore();
      g.fillStyle = '#fffdf8'; g.beginPath(); g.ellipse(cx, y0, rx, ry, 0, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(150,130,100,.45)'; g.lineWidth = 1.2; g.stroke();
      g.strokeStyle = 'rgba(160,140,110,.5)';
      for (let i = 0; i < 5; i++) { const sx = x0 + (i + .5) * (x1 - x0) / 5; g.beginPath(); g.arc(sx, y0 + (y1 - y0) * .35, (x1 - x0) / 11, .2, Math.PI - .2); g.stroke(); }
    };
    tier(u(.16), u(.84), v(.62), v(.81)); tier(u(.24), u(.76), v(.45), v(.62)); tier(u(.32), u(.68), v(.3), v(.46));
    leaf(g, u(.36), v(.25), W * .1, -1.1, SAGE); leaf(g, u(.62), v(.22), W * .09, 1, BEIGE);
    sprig(g, u(.46), v(.24), u(.36), v(.12), -W * .02, W * .014, 3);
    peony(g, u(.47), v(.26), W * .1, RED, .2); rose(g, u(.59), v(.28), W * .06, CREAM, .3);
    leaf(g, u(.58), v(.78), W * .12, -1.9, SAGE); leaf(g, u(.86), v(.66), W * .1, 1.1, BEIGE);
    peony(g, u(.72), v(.69), W * .1, RED, -.3); rose(g, u(.6), v(.76), W * .07, CREAM, .5); blossom(g, u(.83), v(.76), W * .05, .3);
    return c;
  }

  function cook() {
    seed = 71;
    const W = 300, H = 350, [c, g] = cv(W, H), u = x => x * W, v = y => y * H;
    const px = u(.46), py = v(.56);
    g.save(); g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 10; g.shadowOffsetY = 3;
    g.fillStyle = goldFill(g, px - u(.3), py - u(.3), px + u(.3), py + u(.3)); g.beginPath(); g.arc(px, py, u(.3), 0, TAU); g.fill(); g.restore();
    let gr = g.createRadialGradient(px - u(.08), py - u(.08), 4, px, py, u(.28)); gr.addColorStop(0, '#fffdf8'); gr.addColorStop(1, '#e6dac4');
    g.fillStyle = gr; g.beginPath(); g.arc(px, py, u(.28), 0, TAU); g.fill();
    g.strokeStyle = 'rgba(180,150,90,.6)'; g.lineWidth = 1.5; g.beginPath(); g.arc(px, py, u(.21), 0, TAU); g.stroke();
    g.save(); g.translate(px, py); g.rotate(-.08);
    g.shadowColor = 'rgba(0,0,0,.2)'; g.shadowBlur = 5; g.fillStyle = '#f7f0e2'; g.fillRect(-u(.08), -v(.17), u(.16), v(.33));
    g.shadowColor = 'transparent'; g.fillStyle = 'rgba(160,140,110,.25)'; g.fillRect(u(.02), -v(.17), u(.06), v(.33));
    g.fillStyle = '#7a1622'; g.fillRect(-u(.08), -v(.02), u(.16), v(.03));
    for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * u(.04), -v(.005), u(.045), v(.022), s * .5, 0, TAU); g.fill(); }
    g.beginPath(); g.moveTo(0, 0); g.lineTo(-u(.04), v(.09)); g.lineTo(-u(.015), v(.09)); g.fill();
    g.beginPath(); g.moveTo(0, 0); g.lineTo(u(.04), v(.09)); g.lineTo(u(.015), v(.09)); g.fill();
    g.restore();
    g.fillStyle = goldFill(g, u(.04), 0, u(.12), 0);
    g.beginPath(); g.roundRect(u(.07), v(.45), u(.03), v(.42), 4); g.fill();
    for (let i = 0; i < 4; i++) g.fillRect(u(.055) + i * u(.018), v(.33), u(.009), v(.1));
    g.beginPath(); g.roundRect(u(.055), v(.41), u(.06), v(.05), 3); g.fill();
    g.fillStyle = goldFill(g, u(.84), 0, u(.92), 0);
    g.beginPath(); g.roundRect(u(.86), v(.55), u(.03), v(.32), 4); g.fill();
    g.beginPath(); g.moveTo(u(.86), v(.56)); g.quadraticCurveTo(u(.85), v(.4), u(.89), v(.36)); g.lineTo(u(.9), v(.56)); g.fill();
    g.strokeStyle = GOLD[0]; g.lineWidth = 2; g.fillStyle = 'rgba(255,255,255,.55)';
    g.beginPath(); g.moveTo(u(.8), v(.04)); g.quadraticCurveTo(u(.78), v(.2), u(.86), v(.21)); g.quadraticCurveTo(u(.94), v(.2), u(.92), v(.04)); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(u(.86), v(.21)); g.lineTo(u(.86), v(.3)); g.stroke();
    g.beginPath(); g.ellipse(u(.86), v(.305), u(.05), v(.012), 0, 0, TAU); g.fill(); g.stroke();
    g.strokeStyle = GOLD[1]; g.lineWidth = 3; g.beginPath(); g.moveTo(u(.8), v(.045)); g.lineTo(u(.92), v(.045)); g.stroke();
    leaf(g, u(.42), v(.88), W * .12, -2, SAGE); leaf(g, u(.76), v(.84), W * .12, 1.9, BEIGE); leaf(g, u(.62), v(.74), W * .1, .6, SAGE);
    peony(g, u(.58), v(.83), W * .1, RED, .2); rose(g, u(.44), v(.86), W * .07, CREAM, .4); blossom(g, u(.7), v(.88), W * .05, .9);
    baby(g, u(.34), v(.84), W * .04, 8);
    return c;
  }

  // ---------- Phác hoạ cung điện (nét bút chì, hiện mờ 10% phía sau) ----------
  function castleSVG() {
    const W = 1310, H = 1009, G = 935; // G: mặt đất
    let s = '';
    const P = (d, w = 1.6) => { s += `<path d="${d}" stroke-width="${w}"/>`; };
    const F = (d, o = .14) => { s += `<path d="${d}" fill="#7a6450" fill-opacity="${o}" stroke="none"/>`; };
    const win = (x, y, w, h, k = 1) => { // cửa sổ vòm: khung, song kính, bệ, mi cửa
      const d = `M${x} ${y + h}V${y + w / 2}A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2}V${y + h}Z`;
      P(d, 1.6 * k); F(d, .1);
      P(`M${x + w / 2} ${y + 3}V${y + h}M${x} ${y + h * .45}H${x + w}M${x} ${y + h * .72}H${x + w}`, .9 * k);
      P(`M${x - 6} ${y + h + 5}H${x + w + 6}M${x - 4} ${y + h + 10}H${x + w + 4}`, 1.2 * k);
      P(`M${x - 9} ${y - 4}Q${x + w / 2} ${y - w * .6} ${x + w + 9} ${y - 4}`, 1.3 * k);
    };
    const balus = (x0, x1, y, h, step = 13) => {
      P(`M${x0} ${y}H${x1}M${x0} ${y + h}H${x1}`, 1.5);
      for (let x = x0 + 6; x < x1 - 2; x += step) P(`M${x} ${y + 2}q-3 ${h / 2} 0 ${h - 4}M${x + 4} ${y + 2}q3 ${h / 2} 0 ${h - 4}`, .7);
    };
    const statue = (x, y) => P(`M${x - 8} ${y}h16v-8h-16zM${x - 4} ${y - 8}q-2 -16 4 -24q6 8 4 24M${x} ${y - 32}a4 4 0 1 1 .1 0`, 1.2);
    const col = (x, y0, y1, w = 14) => {
      P(`M${x} ${y0}V${y1}M${x + w} ${y0}V${y1}`, 1.4);
      P(`M${x - 4} ${y0}h${w + 8}M${x - 3} ${y0 + 5}h${w + 6}M${x - 4} ${y1}h${w + 8}`, 1.1);
      for (let k = 3; k < w; k += 4) P(`M${x + k} ${y0 + 8}V${y1 - 4}`, .5);
    };
    const hatch = (x0, x1, y) => { for (let x = x0; x < x1; x += 7) P(`M${x} ${y}l6 -6`, .6); };
    const tree = (cx, cy, r) => {
      for (let i = 0; i < 30; i++) {
        const a = i / 30 * TAU, rr = r * (.75 + .25 * Math.sin(i * 2.3));
        P(`M${(cx + Math.cos(a) * rr * .8).toFixed(1)} ${(cy + Math.sin(a) * rr * 1.3).toFixed(1)}q6 -7 13 -1`, 1);
      }
      P(`M${cx} ${cy + r * 1.3}V${G}`, 1.6);
    };

    F(`M80 ${G}V540H470V450H840V540H1230V${G}Z`);
    F('M520 450V265H790V450Z', .12);
    F('M520 228Q522 120 655 96Q788 120 790 228Z', .18);
    P(`M0 ${G}H${W}M0 ${G + 10}H${W}`, 2);
    for (let i = 0; i < 7; i++) P(`M${590 - i * 9} ${G + 14 + i * 9}H${720 + i * 9}`, 1.1);
    // hai cánh hai tầng
    for (const [x0, x1] of [[80, 470], [840, 1230]]) {
      P(`M${x0} ${G}V540H${x1}V${G}`, 2.2);
      P(`M${x0 - 8} 540H${x1 + 8}M${x0 - 6} 530H${x1 + 6}M${x0 - 4} 548H${x1 + 4}`, 1.4);
      balus(x0, x1, 500, 30);
      for (let x = x0 + 30; x < x1; x += 96) statue(x, 500);
      hatch(x0, x1, 562);
      P(`M${x0} 720H${x1}M${x0} 728H${x1}M${x0} ${G - 40}H${x1}`, 1.2);
      for (let i = 0; i < 4; i++) {
        const x = x0 + 30 + i * 96;
        win(x, 590, 44, 100); win(x + 2, 760, 40, 120);
        col(x + 62, 580, 712, 10); col(x + 62, 740, G - 4, 10);
      }
    }
    // gian giữa: trán tường tam giác, hàng cột, cổng vòm
    P(`M470 ${G}V450H840V${G}`, 2.4);
    P('M455 450L655 352L855 450Z', 2.2); P('M488 442L655 366L822 442', 1.1); F('M455 450L655 352L855 450Z', .12);
    P('M630 420a25 18 0 1 0 50 0a25 18 0 1 0 -50 0', 1.2); P('M560 430q40 -20 70 -8M750 430q-40 -20 -70 -8', 1);
    P('M462 470H848M462 480H848', 1.3); hatch(470, 840, 492);
    for (const x of [482, 530, 578, 714, 762, 810]) col(x, 494, G - 4, 18);
    P(`M605 ${G}V760A50 50 0 0 1 705 760V${G}`, 2); P(`M655 712V${G}M612 820H698`, 1);
    win(624, 560, 62, 140, 1.2);
    statue(472, 450); statue(838, 450); statue(655, 352);
    // tầng trống đỡ mái vòm
    P('M520 450V265H790V450', 2); P('M512 265H798M514 258H796', 1.4); balus(520, 790, 228, 28, 12);
    for (let i = 0; i < 6; i++) { const x = 536 + i * 44; P(`M${x} 290V440`, 1.1); P(`M${x + 22} 340a10 10 0 1 0 .1 0`, 1.2); }
    for (let i = 0; i < 5; i++) win(547 + i * 44, 372, 20, 50, .8);
    // mái vòm, gân, cửa mái, bóng đổ
    P('M520 228Q522 120 655 96Q788 120 790 228', 2.6);
    for (const k of [-.8, -.55, -.3, -.1, .1, .3, .55, .8]) P(`M${655 + k * 135} 228Q${655 + k * 125} 140 655 98`, 1);
    for (const k of [-.6, -.2, .2, .6]) P(`M${655 + k * 120 - 7} 180a7 9 0 1 0 14 0a7 9 0 1 0 -14 0`, 1);
    for (let y = 120; y < 225; y += 12) P(`M${(655 - 120 * Math.sqrt(1 - ((225 - y) / 130) ** 2)).toFixed(1)} ${y}l8 -5`, .5);
    // đèn lồng trên đỉnh
    P('M627 98V52H683V98M621 52H689M624 46H686M628 46Q655 14 682 46M655 22V2M648 10H662', 1.6);
    for (const x of [636, 655, 674]) P(`M${x} 58V92`, 1);
    // tháp góc
    for (const [x, top] of [[40, 430], [1270, 470]]) {
      P(`M${x - 34} ${G}V${top}H${x + 34}V${G}`, 2); F(`M${x - 34} ${G}V${top}H${x + 34}V${G}Z`);
      P(`M${x - 40} ${top}H${x + 40}M${x - 28} ${top}V${top - 48}H${x + 28}V${top}M${x - 30} ${top - 48}Q${x} ${top - 110} ${x + 30} ${top - 48}M${x} ${top - 92}V${top - 130}`, 1.6);
      for (let y = top + 40; y < G - 80; y += 150) win(x - 12, y, 24, 70, .9);
    }
    tree(150, 820, 52); tree(1180, 830, 48); tree(-20, 760, 70); tree(1330, 770, 70);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><g fill="none" stroke="#4a3a2c" stroke-linecap="round" stroke-linejoin="round">${s}</g></svg>`;
  }

  // ---------- Ảnh giữ chỗ khi chưa có ảnh thật ----------
  const TONES = [['#efe2d0', '#c98f8f', '#6e1a20'], ['#f3e8db', '#b5878a', '#511419'], ['#ece4d8', '#d4a59a', '#7a1f26'], ['#f6ede2', '#c4a07a', '#5a1a1f']];
  function photo(i, names = '') {
    seed = 100 + i;
    const W = 600, H = 900, [c, g] = cv(W, H), T = TONES[i % TONES.length];
    let gr = g.createLinearGradient(0, 0, W * .4, H); gr.addColorStop(0, T[0]); gr.addColorStop(.6, T[1]); gr.addColorStop(1, T[2]);
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (let k = 0; k < 26; k++) {
      const x = R() * W, y = R() * H * .8, r = rnd(20, 90);
      gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,248,236,.35)'); gr.addColorStop(1, 'rgba(255,248,236,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
    const h = new Path2D(); heart(h, W / 2, H * .44, 70);
    g.lineWidth = 3; g.strokeStyle = 'rgba(255,250,243,.85)'; g.stroke(h);
    g.fillStyle = 'rgba(255,250,243,.92)'; g.textAlign = 'center';
    g.font = 'italic 44px "Times New Roman", serif'; g.fillText(names, W / 2, H * .6);
    g.font = '24px "Times New Roman", serif'; g.fillText(i ? 'Ảnh cưới ' + i : 'Ảnh của hai bạn', W / 2, H * .65);
    return c.toDataURL('image/jpeg', .85);
  }
  window.artPhoto = photo;

  // ---------- Gán hình cho các thẻ <img> ----------
  // Mỗi hình vẽ một lần rồi dùng lại; window.artFill() gán cho các <img> dựng sau (lịch trình từ content.js)
  const made = {};
  const apply = (sel, make) => {
    const imgs = [...document.querySelectorAll(sel)].filter(im => !im.getAttribute('src'));
    if (!imgs.length) return;
    made[sel] = made[sel] || new Promise(res => { const c = make(); c.toBlob(b => res([URL.createObjectURL(b), c.width, c.height])); });
    made[sel].then(([url, w, h]) => imgs.forEach(im => { im.width = w; im.height = h; im.src = url; }));
  };
  const castle = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(castleSVG());
  document.querySelectorAll('img.castle').forEach(im => { im.src = castle; });
  const jobs = [['.art-bouquet', bouquet], ['.art-env-back', envBack], ['.art-env-cover', envCover], ['.art-bouquet-wide', bouquetWide], ['.art-gift', giftEnv], ['.art-camera', camera], ['.art-cake', cake], ['.art-cook', cook]];
  const next = i => { if (i < jobs.length) { apply(...jobs[i]); setTimeout(next, 0, i + 1); } }; // vẽ lần lượt, không chặn trang lâu
  window.artFill = () => next(0);
  next(0);
})();
