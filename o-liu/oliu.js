'use strict';
/* Thiệp cưới theo mẫu "Ô Liu" (motdoi.com.vn): dựng toàn bộ trang từ content.js, bố cục và hiệu ứng như mẫu.
   Link: mặc định thiệp nhà trai · ?nha=gai thiệp nhà gái · ?nha=chung cả hai bên (có nút chọn) · ?to=Tên khách.
   Xem trước trong trang quản trị: ?preview (nhận nội dung nháp qua postMessage). */
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const p2 = n => String(n).padStart(2, '0');
  const INT = Math.floor;
  const params = new URLSearchParams(location.search);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const preview = params.has('preview') && parent !== window;
  const IMG = '/o-liu/img/';
  const TEST = window.OLIU_TEST || {}; // chỉ có khi chạy kiểm thử (lời chúc mẫu, giờ cố định...)

  // ---------- Ngày giờ (giờ Việt Nam) ----------
  const WD = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
  const when = s => {
    const [y, m, d, h = 0, mi = 0] = String(s || '').split(/\D/).filter(Boolean).map(Number);
    if (!(y > 1900 && m && d)) return null;
    return { y, m, d, h, mi, wd: WD[new Date(Date.UTC(y, m - 1, d)).getUTCDay()], dot: `${p2(d)}.${p2(m)}.${y}`, hm: `${p2(h)}:${p2(mi)}`, t: Date.UTC(y, m - 1, d, h - 7, mi) };
  };

  // ---------- Âm lịch Việt Nam (thuật toán thiên văn của Hồ Ngọc Đức, múi giờ +7) ----------
  const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
  const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
  const jdn = (d, m, y) => {
    const a = INT((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3;
    const j = d + INT((153 * mm + 2) / 5) + 365 * yy + INT(yy / 4) - INT(yy / 100) + INT(yy / 400) - 32045;
    return j < 2299161 ? d + INT((153 * mm + 2) / 5) + 365 * yy + INT(yy / 4) - 32083 : j;
  };
  const newMoonDay = k => {
    const T = k / 1236.85, T2 = T * T, T3 = T2 * T, r = Math.PI / 180, sin = Math.sin;
    const jd = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3 + 0.00033 * sin((166.56 + 132.87 * T - 0.009173 * T2) * r);
    const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
    const Mp = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
    const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
    const c = (0.1734 - 0.000393 * T) * sin(M * r) + 0.0021 * sin(2 * r * M) - 0.4068 * sin(Mp * r) + 0.0161 * sin(2 * r * Mp) - 0.0004 * sin(3 * r * Mp)
      + 0.0104 * sin(2 * r * F) - 0.0051 * sin((M + Mp) * r) - 0.0074 * sin((M - Mp) * r) + 0.0004 * sin((2 * F + M) * r) - 0.0004 * sin((2 * F - M) * r)
      - 0.0006 * sin((2 * F + Mp) * r) + 0.0010 * sin((2 * F - Mp) * r) + 0.0005 * sin((2 * Mp + M) * r);
    const dt = T < -11 ? 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3 : -0.000278 + 0.000265 * T + 0.000262 * T2;
    return INT(jd + c - dt + 0.5 + 7 / 24);
  };
  const sunSector = day => { // 0..11: cung hoàng đạo của mặt trời lúc nửa đêm giờ Việt Nam
    const T = (day - 2451545.5 - 7 / 24) / 36525, T2 = T * T, r = Math.PI / 180;
    const M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
    const dl = (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(r * M) + (0.019993 - 0.000101 * T) * Math.sin(2 * r * M) + 0.00029 * Math.sin(3 * r * M);
    let L = (280.46645 + 36000.76983 * T + 0.0003032 * T2 + dl) * r;
    L -= 2 * Math.PI * INT(L / (2 * Math.PI));
    return INT(L / Math.PI * 6);
  };
  const month11 = y => {
    const k = INT((jdn(31, 12, y) - 2415021.076998695) / 29.530588853);
    const nm = newMoonDay(k);
    return sunSector(nm) >= 9 ? newMoonDay(k - 1) : nm;
  };
  const leapOffset = a11 => {
    const k = Math.round((a11 - 2415021.076998695) / 29.530588853);
    let i = 1, last, arc = sunSector(newMoonDay(k + 1));
    do { last = arc; arc = sunSector(newMoonDay(k + ++i)); } while (arc !== last && i < 14);
    return i - 1;
  };
  function lunar({ d, m, y }) {
    const day = jdn(d, m, y), k = INT((day - 2415021.076998695) / 29.530588853);
    let start = newMoonDay(k + 1);
    if (start > day) start = newMoonDay(k);
    let a11 = month11(y), b11 = a11, ly;
    if (a11 >= start) { ly = y; a11 = month11(y - 1); } else { ly = y + 1; b11 = month11(y + 1); }
    const diff = Math.round((start - a11) / 29);
    let lm = diff + 11, leap = false;
    if (b11 - a11 > 365) { const lo = leapOffset(a11); if (diff >= lo) { lm = diff + 10; leap = diff === lo; } }
    if (lm > 12) lm -= 12;
    if (lm >= 11 && diff < 4) ly -= 1;
    return `ngày ${day - start + 1} tháng ${lm}${leap ? ' (nhuận)' : ''} năm ${CAN[(ly + 6) % 10]} ${CHI[(ly + 8) % 12]}`;
  }

  // ---------- Biểu tượng ----------
  const HEART_PATH = 'M119.4.4C95.5-2.8 82.1 15.6 76.4 39.9 70.7 15.7 57.4-2.8 33.4.4 9.2 3.6-5.3 34.3 1.8 63.2c5 20.3 30.1 66.2 74.6 91.2 44.6-25 69.6-70.8 74.6-91.2C158.2 34.3 143.7 3.6 119.4.4Z';
  const heartShape = cls => `<svg class="${cls}" viewBox="0 0 153 155" preserveAspectRatio="none" aria-hidden="true"><path fill="currentColor" d="${HEART_PATH}"></path></svg>`;
  const lucide = (name, paths, size = 24, cls = '') => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-${name}${cls ? ' ' + cls : ''}" aria-hidden="true">${paths.map(d => d.startsWith('<') ? d : `<path d="${d}"></path>`).join('')}</svg>`;
  const ICONS = {
    move: () => lucide('move', ['M12 2v20', 'm15 19-3 3-3-3', 'm19 9 3 3-3 3', 'M2 12h20', 'm5 9-3 3 3 3', 'm9 5 3-3 3 3']),
    msgHeart: () => lucide('message-circle-heart', ['M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719', 'M7.828 13.07A3 3 0 0 1 12 8.764a3 3 0 0 1 5.004 2.224 3 3 0 0 1-.832 2.083l-3.447 3.62a1 1 0 0 1-1.45-.001z']),
    chevDown: () => lucide('chevron-down', ['m6 9 6 6 6-6']),
    send: () => lucide('send', ['M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z', 'm21.854 2.147-10.94 10.939']),
    loader: (size = 24, cls = 'spin') => lucide('loader-circle', ['M21 12a9 9 0 1 1-6.219-8.56'], size, cls),
    check: () => lucide('check', ['M20 6 9 17l-5-5']),
    x: () => lucide('x', ['M18 6 6 18', 'm6 6 12 12']),
    minus: () => lucide('minus', ['M5 12h14']),
    plus: () => lucide('plus', ['M5 12h14', 'M12 5v14']),
    heart: () => lucide('heart', ['M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5']),
    pen: () => lucide('pen-line', ['M13 21h8', 'M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z']),
    download: (size = 24) => lucide('download', ['M12 15V3', 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'm7 10 5 5 5-5'], size),
    eraser: () => lucide('eraser', ['M21 21H8a2 2 0 0 1-1.42-.587l-3.994-3.999a2 2 0 0 1 0-2.828l10-10a2 2 0 0 1 2.829 0l5.999 6a2 2 0 0 1 0 2.828L12.834 21', 'm5.082 11.09 8.828 8.828']),
    music: () => lucide('music', ['M9 18V5l12-2v13', '<circle cx="6" cy="18" r="3"></circle>', '<circle cx="18" cy="16" r="3"></circle>'], 18),
    chevL: () => lucide('chevron-left', ['m15 18-6-6 6-6']),
    chevR: () => lucide('chevron-right', ['m9 18 6-6-6-6']),
    zoomIn: () => lucide('zoom-in', ['<circle cx="11" cy="11" r="8"></circle>', '<line x1="21" x2="16.65" y1="21" y2="16.65"></line>', '<line x1="11" x2="11" y1="8" y2="14"></line>', '<line x1="8" x2="14" y1="11" y2="11"></line>'], 18),
    zoomOut: () => lucide('zoom-out', ['<circle cx="11" cy="11" r="8"></circle>', '<line x1="21" x2="16.65" y1="21" y2="16.65"></line>', '<line x1="8" x2="14" y1="11" y2="11"></line>'], 18),
  };
  const PIN = '<svg class="event-pin" viewBox="0 0 14 19" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M7 19a28 28 0 0 1-3.5-3.53C1.9 13.56 0 10.71 0 8a7 7 0 0 1 14 0c0 2.71-1.9 5.56-3.5 7.47A28 28 0 0 1 7 19Zm0-14a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"></path></svg>';

  // ---------- Dựng HTML từ nội dung ----------
  const lastWord = s => String(s || '').trim().split(/\s+/).filter(Boolean).pop() || '';
  const initial = s => lastWord(s).charAt(0).toLocaleUpperCase('vi-VN');
  const photoSrc = p => (/^(https:|images\/|data:image\/)/.test(p || '') ? p : '');
  const decor = (file, cls = '', style = '') => `<img aria-hidden="true" alt="" src="${IMG}${file}.webp" class="decor${cls ? ' ' + cls : ''}"${style ? ` style="${style}"` : ''} draggable="false">`;
  const reveal = (fx, cls, inner, { tag = 'div', dur = 3, delay = 0, play = false, attrs = '' } = {}) =>
    `<${tag} class="reveal ${cls}" data-fx="${fx}"${play ? ' data-play' : ''} style="animation-duration:${dur}s${delay ? `;animation-delay:${delay}s` : ''}"${attrs}>${inner}</${tag}>`;
  // Vị trí ảnh trong khung: chuỗi "x% y%" dùng thẳng; tiêu điểm {x, y} (0–1) như mẫu thì tính lại theo cỡ ảnh và cỡ khung (focal())
  const cl01 = v => Math.min(1, Math.max(0, Number.isFinite(+v) ? +v : 0.5));
  const posOf = f => (f && typeof f === 'object' ? `${Math.round(100 * cl01(f.x))}% ${Math.round(100 * cl01(f.y))}%` : /^[\d.]+% [\d.]+%$/.test(f || '') ? f : '50% 50%');
  const focalAttr = f => (f && typeof f === 'object' ? ` data-focal="${cl01(f.x)},${cl01(f.y)}"` : '');
  const photo = (src, alt, pos, eager = false) => src
    ? `<img src="${esc(src)}" class="photo" style="object-position:${posOf(pos)}"${focalAttr(pos)} alt="${esc(alt)}" loading="${eager ? 'eager' : 'lazy'}" draggable="false">`
    : '<div class="photo" style="background:#d9d6c1"></div>';
  // computeCoverPosition của mẫu: đặt tiêu điểm vào giữa khung nếu ảnh còn thừa để dịch, đo khung bằng getBoundingClientRect của thẻ cha
  const coverPos = (fx, fy, nw, nh, cw, ch) => {
    const s = Math.max(cw / nw, ch / nh), w = nw * s, h = nh * s, ox = Math.max(0, w - cw), oy = Math.max(0, h - ch);
    const px = ox > 0 ? Math.min(ox, Math.max(0, fx * w - cw / 2)) / ox * 100 : 50, py = oy > 0 ? Math.min(oy, Math.max(0, fy * h - ch / 2)) / oy * 100 : 50;
    return `${Math.round(100 * px) / 100}% ${Math.round(100 * py) / 100}%`;
  };
  const placeFocal = img => {
    const r = (img.parentElement || img).getBoundingClientRect();
    if (!img.naturalWidth || !img.naturalHeight || !r.width || !r.height) return;
    const [fx, fy] = img.dataset.focal.split(',').map(Number);
    img.style.objectPosition = coverPos(fx, fy, img.naturalWidth, img.naturalHeight, r.width, r.height);
  };
  const focalRO = 'ResizeObserver' in window ? new ResizeObserver(es => es.forEach(e => $$(':scope > img[data-focal]', e.target).forEach(placeFocal))) : null;
  const focal = root => $$('img[data-focal]', root).forEach(img => {
    if (img.complete) placeFocal(img);
    img.addEventListener('load', () => placeFocal(img));
    focalRO?.observe(img.parentElement || img);
  });

  function model(C) {
    const mode = { gai: 'gai', chung: 'chung' }[params.get('nha')] || 'trai';
    const O = C.oliu || {}, P = C.photos || {};
    const G = C.groom || {}, B = C.bride || {};
    const first = mode === 'gai' ? B : G, second = mode === 'gai' ? G : B;
    const album = (P.album || []).map(photoSrc).filter(Boolean);
    const pick = (k, i) => photoSrc(P[k]) || album[i] || photoSrc(P.hero) || '';
    const event = (side, kind) => {
      const S = C[side] || {}, person = side === 'gai' ? B : G, cer = kind === 'ceremony';
      const at = when(cer ? S.ceremonyAt : S.partyAt);
      if (!at) return null;
      const venue = cer ? (S.ceremonyVenue ?? (person.address ? `Tư gia nhà ${side === 'gai' ? 'gái' : 'trai'}` : '')) : S.venue || '';
      const address = cer ? (S.ceremonyAddress ?? String(person.address || '').split('\n').join(', ')) : S.venueAddress || '';
      const q = cer ? (S.ceremonyMap || address) : (S.map || address);
      const map = cer ? '' : /^https:\/\//.test(S.directions || '') ? S.directions : q ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q) : '';
      return { name: cer ? (S.ceremonyName || (side === 'gai' ? 'Lễ Vu Quy' : 'Lễ Thành Hôn')) : (S.partyName || 'Tiệc Cưới'), at, venue, address, map };
    };
    const events = side => [event(side, 'ceremony'), event(side, 'party')].filter(Boolean).sort((a, b) => a.at.t - b.at.t);
    const mainSide = mode === 'chung' ? 'gai' : mode;
    // Ngày chính: lễ sớm nhất của bên mời (nhà trai 17.11, nhà gái 16.11); thiệp chung lấy lễ đầu của nhà gái
    const main = (mode === 'chung' ? (event(mainSide, 'ceremony') || event(mainSide, 'party'))?.at : events(mode)[0]?.at) || when(C.trai?.ceremonyAt) || when(C.trai?.partyAt);
    const guest = (params.get('to') || '').trim().slice(0, 60);
    const qrOf = p => photoSrc(p.bank?.qr) || (p.bank?.code && p.bank?.account
      ? `https://img.vietqr.io/image/${encodeURIComponent(p.bank.code)}-${encodeURIComponent(p.bank.account)}-qr_only.png?accountName=${encodeURIComponent(p.bank.holder || '')}` : '');
    const gifts = [['trai', G, 'Nhà trai · Chú rể', 'nhà trai'], ['gai', B, 'Nhà gái · Cô dâu', 'nhà gái']]
      .filter(([s]) => mode === 'chung' || mode === s).map(([s, p, label, sideName]) => ({ side: s, name: p.name || '', label, sideName, qr: qrOf(p) })).filter(g => g.qr);
    const sched = s => ((C.schedule?.length ? C.schedule : C[s]?.schedule) || []).filter(r => r.time || r.title); // C.schedule: một lịch trình chung cho cả hai bên
    return {
      mode, C, O, first, second, main, guest, gifts, events,
      names: [first.name || (first === G ? 'Chú rể' : 'Cô dâu'), second.name || (second === G ? 'Chú rể' : 'Cô dâu')],
      families: (mode === 'gai' ? [['Nhà gái', B], ['Nhà trai', G]] : [['Nhà trai', G], ['Nhà gái', B]]).filter(([, p]) => p.father || p.mother),
      timeline: mode === 'chung' && !C.schedule?.length ? [['Nhà trai', sched('trai')], ['Nhà gái', sched('gai')]].filter(([, r]) => r.length) : [['', sched(mode === 'chung' ? 'trai' : mode)]].filter(([, r]) => r.length),
      photos: { right: pick('hero', 0), left: pick('hero2', 1), calendar: pick('calendar', 2), couple: pick('couple', 3) || photoSrc(P.groom) || photoSrc(P.bride), board: pick('guestbook', 5), footer: pick('footer', 6), album },
      focus: P.focus || {},
    };
  }

  function welcomeHTML(M) {
    const prefix = M.O.prefix || M.C.inviteLabel || 'Thân mời', guest = M.guest || M.O.guest || 'Quý vị & Gia đình';
    const names = `${M.names[0]} & ${M.names[1]}`;
    return `<div class="welcome" role="dialog" aria-modal="true" aria-label="Thiệp mời — chạm để mở" aria-describedby="ol-welcome-head">
      <div role="button" tabindex="0" class="welcome-stage" aria-label="Mở thiệp">
        <div id="ol-welcome-head" class="abs welcome-head">${prefix ? `<p class="welcome-prefix">${esc(prefix)}</p>` : ''}<p class="welcome-guest" data-fit-one="0.6,0">${esc(guest)}</p></div>
        <div class="abs welcome-envelope">${decor('envelope-body', 'envelope-layer envelope-body')}${decor('hero-cluster-left', 'hero-cluster-left')}${decor('envelope-front', 'envelope-layer envelope-front')}<span class="abs envelope-layer welcome-sheen welcome-sheen-front" aria-hidden="true"></span>${decor('envelope-flap', 'envelope-layer welcome-flap')}<span class="abs envelope-layer welcome-sheen welcome-sheen-flap" aria-hidden="true"></span><div class="abs monogram welcome-monogram" aria-hidden="true"><span>${esc(initial(M.names[0]))}</span><span>${esc(initial(M.names[1]))}</span></div>${decor('hero-bouquet-right', 'hero-bouquet-right')}${decor('hero-bouquet-left', 'hero-bouquet-left')}</div>
        <p class="abs welcome-tap">Chạm vào thiệp để mở</p>
        <div class="abs welcome-names" data-fit-one="0.4,0.04"><p>${esc(names)}</p></div>
        ${M.main ? `<p class="abs welcome-date">${M.main.dot}</p>` : ''}
      </div></div>`;
  }

  function heroHTML(M) {
    const date = M.main?.dot || '--.--.----', names = `${M.names[0]} & ${M.names[1]}`;
    const pol = (src, i, side) => src ? reveal('slideInUp', `abs polaroid hero-polaroid-${side}`, `<div class="polaroid-card"></div><div class="polaroid-window">${photo(src, `Ảnh cưới ${i + 1}`, M.focus[src], true)}</div>`, { play: true }) : '';
    let cal = '';
    if (M.main) {
      const { y, m } = M.main, lead = (new Date(y, m - 1, 1).getDay() + 6) % 7, days = new Date(y, m, 0).getDate(), rows = Math.ceil((lead + days) / 7);
      const marked = new Set([M.main.d]);
      if (M.mode === 'chung') ['gai', 'trai'].forEach(s => M.events(s).forEach(e => { if (e.at.y === y && e.at.m === m) marked.add(e.at.d); })); // thiệp riêng: chỉ tim ngày chính
      const u = v => `calc(${v} * var(--u))`;
      cal = `<div class="section calendar" style="height:${u(Math.max(259, 112.5 + 21 * rows + 26))}" aria-label="Lịch tháng cưới">
        ${reveal('slideInLeft', 'abs calendar-polaroid', `<div class="polaroid-card"></div><div class="polaroid-window">${photo(M.photos.calendar, 'Ảnh lịch cưới', M.focus[M.photos.calendar])}</div>${reveal('fadeIn', 'calendar-caption', esc(M.O.caption || 'Moments'), { tag: 'p' })}`)}
        ${reveal('zoomIn', 'abs calendar-title', `Tháng ${p2(m)} - ${y}`, { tag: 'p' })}
        ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((w, i) => `<p class="abs calendar-cell calendar-weekday" style="top:${u(86.5)};left:${u(173 + 32 * i)}">${w}</p>`).join('')}
        ${Array.from({ length: days }, (_, i) => { const c = lead + i, mk = marked.has(i + 1); return `<p class="abs calendar-cell${mk ? ' calendar-marked' : ''}" style="top:${u(112.5 + 21 * INT(c / 7))};left:${u(173 + 32 * (c % 7))}">${mk ? heartShape('calendar-heart pulse-fast') : ''}<span>${i + 1}</span></p>`; }).join('')}
      </div>`;
    }
    return `<section id="home" aria-label="Thiệp cưới"><div class="section hero">
      ${decor('envelope-back', 'envelope-layer envelope-back')}${decor('hero-cluster-left', 'hero-cluster-left')}
      ${pol(M.photos.right, 0, 'right')}
      ${reveal('fadeIn', 'abs hero-bouquet-top', decor('hero-bouquet-top', '', 'position:static;width:100%'), { play: true, attrs: ' aria-hidden="true"' })}
      ${pol(M.photos.left, 1, 'left')}
      ${reveal('fadeIn', 'abs hero-cluster-mid', decor('hero-cluster-mid', '', 'position:static;width:100%'), { play: true, attrs: ' aria-hidden="true"' })}
      ${reveal('slideInLeft', 'abs ticket', `<img class="ticket-art" src="${IMG}ticket.webp" alt="" draggable="false"><p class="ticket-text ticket-save">Save our date</p><p class="ticket-text ticket-date">${date}</p><p class="ticket-text ticket-married">We’re getting married!</p><p class="ticket-text ticket-stub" data-fit-one="0.5,0.02">${esc(initial(M.names[0]))} &amp; ${esc(initial(M.names[1]))}</p>`, { play: true, attrs: ` aria-label="Save our date ${M.main?.dot || ''}"` })}
      ${decor('envelope-front', 'envelope-layer envelope-front')}${decor('hero-bouquet-right', 'hero-bouquet-right')}
      <div class="abs hero-mask" aria-hidden="true"></div>
      ${decor('hero-bouquet-left', 'hero-bouquet-left')}
      <div class="abs monogram hero-monogram" aria-hidden="true"><span>${esc(initial(M.names[0]))}</span><span>${esc(initial(M.names[1]))}</span></div>
      ${reveal('fadeInLeft', 'abs hero-names', `<div data-fit-one="0.4,0.04"><h1 class="sr-only">${esc(M.names[0])} và ${esc(M.names[1])}</h1><p aria-hidden="true">${esc(names)}</p></div>`, { play: true })}
      ${reveal('fadeInRight', 'abs hero-date', date, { tag: 'p', play: true })}
    </div>${cal}</section>`;
  }

  function coupleHTML(M) {
    const prefix = M.O.prefix || M.C.inviteLabel || 'Thân mời', guest = M.guest || M.O.guest || 'Quý vị & Gia đình';
    const lines = String(M.O.invite || 'tham dự tiệc chung vui\ncùng gia đình chúng tôi').split('\n').map(s => s.trim()).filter(Boolean);
    const src = M.photos.couple;
    const card = src ? reveal('fadeIn', 'abs person-card person-couple', `<div class="polaroid-card"></div><div class="polaroid-window">${photo(src, 'Ảnh cô dâu và chú rể', M.focus[src])}</div>`) : '';
    return `<section id="couple" class="section couple" aria-label="Cô dâu và chú rể">
      ${reveal('zoomIn', 'couple-invite', `<div data-fit-group="0.6,0.03">${prefix ? `<p class="couple-invite-line" data-fit-text>${esc(prefix)}</p>` : ''}<p class="couple-invite-guest" data-fit-one="0.6,0">${esc(guest)}</p>${lines.map(l => `<p class="couple-invite-line" data-fit-text>${esc(l)}</p>`).join('')}</div>`)}
      <div class="couple-stage">
        ${card}
        <div class="abs couple-names" data-fit-group="0.45,0.05">${reveal('zoomIn', 'couple-and', '<span>&amp;</span>', { tag: 'p', attrs: ' aria-hidden="true"' })}${reveal('fadeInLeft', 'couple-name couple-name-first', `<span data-fit-text>${esc(M.names[0])}</span>`, { tag: 'h2' })}${reveal('fadeInRight', 'couple-name couple-name-second', `<span data-fit-text>${esc(M.names[1])}</span>`, { tag: 'h2' })}</div>
        ${reveal('fadeIn', 'abs couple-bouquet-right', decor('couple-bouquet-right', '', 'position:static;width:100%'), { dur: 2, attrs: ' aria-hidden="true"' })}
        ${decor('couple-bouquet-left', 'couple-bouquet-left')}
      </div></section>`;
  }

  const familyHTML = M => M.families.length ? `<section id="family" aria-label="Gia đình hai bên"><div class="section family" data-fit-group="0.55,0.04">${M.families.map(([side, p]) =>
    reveal('fadeInUp', 'family-col', `<p class="family-side">${side}</p>${p.father ? `<p data-fit-text>Ông ${esc(p.father)}</p>` : ''}${p.mother ? `<p data-fit-text>Bà ${esc(p.mother)}</p>` : ''}`)).join('')}</div></section>` : '';

  function eventGroupHTML(M, side) {
    const list = M.events(side);
    return `<div class="event-group event-group-unlabeled" data-invitation-side="${side === 'gai' ? 'bride' : 'groom'}"><div class="event-card">${list.map((e, i) =>
      `${i ? '<div class="event-divider" aria-hidden="true"></div>' : ''}<div class="event-block">${reveal('zoomIn', 'event-name', esc(e.name), { tag: 'p' })}${reveal('fadeIn', 'event-time', `Được tổ chức vào lúc ${e.at.hm} - ${e.at.wd}`, { tag: 'p' })}<div class="event-date-box">${reveal('zoomIn', 'event-date', e.at.dot, { tag: 'p' })}</div>${reveal('fadeIn', 'event-lunar', `(<!-- -->Nhằm ${lunar(e.at)}<!-- -->)`, { tag: 'p' })}</div>`
      + (e.venue || e.address ? `<div class="event-venue-block">${reveal('zoomIn', '', PIN)}${e.venue ? reveal('fadeIn', 'event-venue', `Tại ${esc(e.venue)}`, { tag: 'p' }) : ''}${e.address ? reveal('fadeIn', 'event-address', esc(e.address), { tag: 'p' }) : ''}${e.map ? `<a class="map-button pulse" href="${esc(e.map)}" target="_blank" rel="noreferrer">Xem bản đồ</a>` : ''}</div>` : '')).join('')}</div></div>`;
  }
  const eventsHTML = M => {
    const sides = M.mode === 'chung' ? ['gai', 'trai'].filter(s => M.events(s).length) : [M.mode];
    if (!M.events(sides[0] || 'trai').length) return '';
    const sw = M.mode === 'chung' && sides.length > 1 ? `<div class="side-switch" role="group" aria-label="Chọn thiệp nhà trai hoặc nhà gái">${sides.map((s, i) => `<button type="button" data-side="${s}" aria-pressed="${!i}">${s === 'gai' ? 'Nhà gái' : 'Nhà trai'}</button>`).join('')}</div>` : '';
    return `<section id="invitation" class="section events" aria-label="Thông tin lễ cưới">${sw}${eventGroupHTML(M, sides[0])}</section>`;
  };

  function timelineHTML(M) {
    const colors = (M.C.dressCode?.colors || []).filter(c => /^#[0-9a-f]{6}$/i.test(c));
    if (!M.timeline.length && !colors.length) return '';
    const rows = r => r.map(it => `<div class="timeline-row"><span class="timeline-time">${esc(it.time)}</span>${heartShape('timeline-dot')}<div><p class="timeline-title">${esc(it.title)}</p></div></div>`).join('');
    return `<section id="timeline" class="section timeline" aria-label="Lịch trình ngày cưới">${reveal('fadeIn', 'script-title', 'Lịch Trình', { tag: 'h2' })}
      ${M.timeline.length ? reveal('zoomIn', 'timeline-card', M.timeline.map(([t, r], i) => `${t ? `<p class="timeline-group-title"${i ? ' style="margin-top:calc(14 * var(--u))"' : ''}>${t}</p>` : ''}${rows(r)}`).join(''), { dur: 2 }) : ''}
      ${colors.length ? reveal('fadeIn', 'dress-code', `<span>Dress code</span><div class="dress-code-swatches" aria-label="Màu trang phục gợi ý">${colors.map(c => `<i style="background-color:${c.toUpperCase()}" title="${c.toUpperCase()}"></i>`).join('')}</div>`, { dur: 2 }) : ''}
    </section>`;
  }

  // Album: ảnh dọc hai ảnh một hàng, ảnh ngang chiếm cả hàng theo đúng tỉ lệ ảnh (albumLayout() xếp lại khi biết cỡ ảnh)
  const albumHTML = M => M.photos.album.length ? `<section id="gallery" class="section album" aria-label="Album ảnh cưới">${reveal('fadeIn', 'script-title', 'Album Hình Cưới', { tag: 'h2' })}<div class="album-grid">${M.photos.album.map((src, i, a) =>
    reveal('zoomIn', `album-item${a.length % 2 && i === a.length - 1 ? ' album-item-solo' : ''}`, `<button type="button" class="album-button" data-i="${i}" aria-label="Xem ảnh ${i + 1} trong album">${photo(src, `Ảnh album ${i + 1}`, M.focus[src])}</button>`)).join('')}</div></section>` : '';

  function rsvpHTML(M) {
    const lead = M.O.rsvpLead || 'Mong quý khách báo trước giúp chúng tôi để việc đón tiếp được chu đáo nhất. Trân trọng!';
    const choice = (name, value, label, checked) => `<label class="choice"><input type="radio" name="${name}"${value ? ` value="${value}"` : ''}${checked ? ' checked=""' : ''}><span>${label}</span></label>`;
    return `<section id="rsvp" class="section rsvp" aria-label="Xác nhận tham dự">${reveal('fadeIn', 'script-title', 'Xác Nhận Tham Dự', { tag: 'h2' })}${lead ? reveal('fadeIn', 'section-lead', esc(lead), { tag: 'p' }) : ''}
      <form><fieldset class="form-stack"><label><span class="sr-only">Tên của bạn</span><input class="pill-input" name="name" placeholder="Tên của bạn là gì?" required="" maxlength="100" value="${esc(M.guest)}" autocomplete="name"></label>
      ${M.mode === 'chung' ? `<fieldset><legend class="choice-label">Bạn là khách mời của</legend><div class="choice-row">${choice('ol-guest-side', 'groom', 'Nhà trai', true)}${choice('ol-guest-side', 'bride', 'Nhà gái')}</div></fieldset>` : ''}
      <fieldset><legend class="choice-label">Bạn có tham dự không?</legend><div class="choice-row">${choice('ol-attendance', '', `${ICONS.check()} <!-- -->Có, mình sẽ đến`, true)}${choice('ol-attendance', '', `${ICONS.x()} <!-- -->Rất tiếc, mình bận`)}</div></fieldset>
      <div class="counter"><span>Số người tham dự<small>(gồm cả bạn)</small></span><div class="counter-controls"><button type="button" data-step="-1" aria-label="Giảm số người tham dự" disabled="">${ICONS.minus()}</button><output aria-live="polite" aria-label="Số người tham dự">1</output><button type="button" data-step="1" aria-label="Tăng số người tham dự">${ICONS.plus()}</button></div></div>
      <button type="submit" class="pill-button">${ICONS.heart()}Gửi xác nhận tham dự</button></fieldset></form></section>`;
  }

  // Phần tĩnh của Sổ lưu bút; bảng chữ ký, nút, quy trình ký và danh sách lời chúc do guestbook() dựng
  const guestbookHTML = M => `<svg class="signature-filter" aria-hidden="true"><filter id="ol-ink"><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0"></feColorMatrix></filter></svg>
    <section id="guestbook" class="section guestbook" aria-label="Sổ lưu bút">${reveal('fadeIn', 'script-title', 'Sổ Lưu Bút', { tag: 'h2' })}${reveal('fadeIn', 'section-lead', esc(M.O.guestbookLead || 'Ký tên và gửi lời chúc đến chúng mình.'), { tag: 'p' })}
      ${reveal('zoomIn', 'guestbook-board-wrap', '<div class="guestbook-board" tabindex="-1" aria-label="Bảng chữ ký"></div>', { dur: 2 })}
      <div class="wishes"><div class="wishes-head"><strong>Lời chúc</strong><span></span></div><div class="wish-list" aria-live="polite"></div></div>
    </section>`;

  // Nút "Tải mã QR" như mẫu: kiểu chữ trắng viền trắng trong thẻ mừng cưới, kiểu mặc định trong hộp phóng to
  const qrButton = (i, name, onCard) => `<div class="flex max-w-full flex-col items-center"><button type="button" data-qr="${i}" aria-label="Tải mã QR ${esc(name)}" title="Tải mã QR" class="inline-flex min-h-9 max-w-full items-center justify-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium leading-none tracking-normal shadow-sm transition hover:-translate-y-px hover:shadow disabled:cursor-wait disabled:opacity-65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2${onCard ? '' : ' mx-auto'}" style="appearance:none;position:relative;display:inline-flex;width:fit-content;min-height:36px;align-items:center;justify-content:center;gap:6px;padding:6px 12px;border-width:1px;border-style:solid;border-radius:9999px;${onCard
    ? 'border-color:rgb(255 255 255 / 0.8);background:transparent;color:#fff;font-family:var(--f-tinos);font-size:calc(11 * var(--u));font-weight:500;line-height:1;letter-spacing:0.04em;text-transform:uppercase'
    : 'border-color:rgba(120, 90, 70, 0.28);background:rgba(255, 255, 255, 0.9);color:#665047;font-family:inherit;font-size:11px;font-weight:500;line-height:1;letter-spacing:normal;text-transform:none'}">${lucide('download', ['M12 15V3', 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'm7 10 5 5 5-5'], 24, 'h-3.5 w-3.5 shrink-0')}<span class="truncate">Tải mã QR</span></button></div>`;
  const giftHTML = M => M.gifts.length ? `<section id="wedding-gift" class="section gift" aria-label="Gửi quà mừng cưới">${reveal('fadeIn', 'script-title', 'Gửi Quà Mừng Cưới', { tag: 'h2' })}<div class="gift-cards" data-fit-group="0.55,0.02">${M.gifts.map((g, i) =>
    `<div class="gift-card"><button type="button" class="gift-qr" data-i="${i}" aria-label="Phóng to mã QR mừng cưới ${g.sideName}">${photo(g.qr, `Mã QR mừng cưới ${g.sideName}`)}</button><div class="gift-info">${reveal('fadeIn', 'gift-name', `<span data-fit-text>${esc(g.name)}</span>`, { tag: 'p' })}${reveal('fadeIn', 'gift-side', g.label.replace(' · ', '<!-- --> · <!-- -->'), { tag: 'p' })}${reveal('fadeIn', 'gift-thanks', esc(M.O.giftThanks || 'Sự hiện diện của bạn là món quà quý giá nhất đối với chúng tôi'), { tag: 'p' })}<div class="gift-download">${qrButton(i, g.name, true)}</div></div></div>`).join('')}</div></section>` : '';

  const countdownHTML = M => M.main ? `<section id="countdown" class="section countdown" aria-label="Đếm ngược tới ngày cưới">${decor('ranunculus-green', 'countdown-flower-left')}${decor('sweet-pea-mauve', 'countdown-flower-right')}${reveal('zoomIn', 'script-title', 'Cùng Đếm Ngược', { tag: 'h2' })}${reveal('fadeIn', 'countdown-date', `${M.main.wd} · ${M.main.dot}`, { tag: 'p' })}<div class="countdown-grid" role="timer" aria-live="off">${['Ngày', 'Giờ', 'Phút', 'Giây'].map((u, i) =>
    reveal('fadeInUp', 'countdown-tile', `<strong data-cd="${i}">00</strong><span>${u}</span>`, { dur: 2, delay: i * 0.15 })).join('')}</div></section>` : '';

  const footerHTML = M => `<footer id="footer" class="section footer" aria-label="Lời cảm ơn"><div class="abs footer-photo">${photo(M.photos.footer, 'Ảnh cuối thiệp', M.focus[M.photos.footer])}</div><div class="footer-band">${reveal('zoomIn', 'footer-title', esc(M.O.thanksTitle || 'Lời cảm ơn!'), { tag: 'h2' })}${reveal('fadeInUp', 'footer-text', esc(M.O.thanks || M.C.footer || 'Cảm ơn bạn đã dành tình cảm cho chúng mình! Sự hiện diện của bạn là món quà quý giá nhất, khiến ngày trọng đại của chúng mình thêm trọn vẹn và đáng nhớ.'), { tag: 'p' })}</div></footer>`;

  const musicHTML = () => `<div class="music-box"><button type="button" class="music-tip" data-music><span><span>Bấm để nghe nhạc</span><svg aria-hidden="true" width="12" height="7" viewBox="0 0 12 7"><path d="M0 0H12L6 7Z" fill="currentColor"></path></svg></span></button><button type="button" class="music-btn" data-music title="Bật nhạc" aria-label="Bật nhạc">${ICONS.music()}</button></div>`;

  // Chữ tách thành nhiều đoạn như trang mẫu (<!-- --> đánh dấu chỗ tách, rồi bỏ đi): cách tách ảnh hưởng vị trí nét chữ
  const tidy = s => s.replace(/>\s*\n\s*</g, '><');
  const unmark = root => { const w = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT), c = []; while (w.nextNode()) c.push(w.currentNode); c.forEach(n => n.remove()); };

  // ---------- Thu chữ cho vừa khung (như mẫu: tên dài thì nhỏ lại, không xuống dòng) ----------
  const FREE = [['width', 'max-content'], ['min-width', '0'], ['max-width', 'none'], ['padding-left', '0'], ['padding-right', '0'], ['flex-grow', '0'], ['flex-shrink', '0'], ['flex-basis', 'auto']];
  function measure(els, min, gutter) {
    const room = els.map(e => { const cs = getComputedStyle(e); return e.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0); });
    const saved = els.map(e => FREE.map(([p]) => e.style.getPropertyValue(p)));
    els.forEach(e => FREE.forEach(([p, v]) => e.style.setProperty(p, v)));
    const need = els.map(e => e.clientWidth);
    els.forEach((e, i) => FREE.forEach(([p], j) => saved[i][j] ? e.style.setProperty(p, saved[i][j]) : e.style.removeProperty(p)));
    let k = null;
    els.forEach((_, i) => { if (room[i] > 0 && need[i] > 0) { const s = Math.max(min, Math.min(1, room[i] * (1 - gutter) / need[i])); k = k === null ? s : Math.min(k, s); } });
    return k;
  }
  function fitAll(root) {
    $$('[data-fit-one], [data-fit-group]', root).forEach(el => {
      const [min, gutter] = (el.dataset.fitOne || el.dataset.fitGroup).split(',').map(Number);
      el.style.setProperty('--fit-scale', '1');
      const k = measure(el.dataset.fitOne ? [el] : $$('[data-fit-text]', el), min, gutter);
      if (k !== null) el.style.setProperty('--fit-scale', String(k));
    });
  }

  // ---------- Hiện dần khi cuộn tới (như mẫu: IntersectionObserver, lề dưới -8%) ----------
  let started = false;
  const show = el => el.classList.add('reveal-in', 'fx-' + el.dataset.fx);
  function reveals(root) {
    const els = $$('.reveal', root);
    if (reduce || !('IntersectionObserver' in window)) { els.forEach(el => { el.dataset.seen = '1'; if (started || !('play' in el.dataset)) show(el); }); return; }
    const io = new IntersectionObserver(list => list.forEach(en => {
      if (!en.isIntersecting) return;
      const el = en.target; el.dataset.seen = '1'; io.unobserve(el);
      if (started || !('play' in el.dataset)) show(el);
    }), { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    els.forEach(el => io.observe(el));
  }
  const playIntro = root => { started = true; $$('.reveal[data-play][data-seen]', root).forEach(show); };

  // ---------- Tim rơi (như mẫu: 20 tim, màu hồng, rơi chậm, lắc nhẹ) ----------
  function hearts() {
    const cv = $('canvas.hearts'), g = cv?.getContext('2d');
    if (!g || TEST.noHearts) { cv?.remove(); return; }
    const COLORS = ['#e8758a', '#d4546c', '#f0a0b0', '#c94060'], CHARS = ['♥', 'vector', '♡'], R = (a, b) => Math.random() * (b - a) + a;
    const size = () => { cv.width = innerWidth; cv.height = innerHeight; };
    size(); addEventListener('resize', size);
    const make = first => ({ x: R(0, cv.width), y: first ? R(-50, cv.height) : R(-120, -10), vx: R(-0.4, 0.4), vy: R(0.6, 1.4), size: R(12, 24), op: R(0.35, 0.7), rot: R(0, 2 * Math.PI), ch: CHARS[INT(Math.random() * 3)], color: COLORS[INT(Math.random() * 4)], fade: first ? 1 : 0 });
    const list = Array.from({ length: 20 }, () => make(true));
    (function frame() {
      g.clearRect(0, 0, cv.width, cv.height);
      for (const h of list) {
        if (h.fade < 1) h.fade = Math.min(1, h.fade + 0.02);
        h.x += h.vx; h.y += h.vy; h.vx = Math.max(-0.8, Math.min(0.8, h.vx + R(-0.01, 0.01)));
        if (h.y > cv.height + 40) { Object.assign(h, make(false)); continue; }
        if (h.x < -40) h.x = cv.width + 20;
        if (h.x > cv.width + 40) h.x = -20;
        g.save(); g.translate(h.x, h.y); g.rotate(h.rot); g.globalAlpha = h.op * h.fade; g.fillStyle = h.color;
        if (h.ch === 'vector') {
          const s = 1.1 * h.size; g.scale(s, s); g.beginPath(); g.moveTo(0, -0.21);
          g.bezierCurveTo(0, -0.57, -0.5, -0.57, -0.5, -0.16); g.bezierCurveTo(-0.5, 0.15, -0.2, 0.28, 0, 0.47);
          g.bezierCurveTo(0.2, 0.28, 0.5, 0.15, 0.5, -0.16); g.bezierCurveTo(0.5, -0.57, 0, -0.57, 0, -0.21); g.closePath(); g.fill();
        } else { g.font = `${h.size}px serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(h.ch, 0, 0); }
        g.restore();
      }
      requestAnimationFrame(frame);
    })();
  }

  // ---------- Tự cuộn (chép đúng hook của mẫu, tốc độ "fast" như thiệp mẫu): bắt đầu 1,5 giây sau khi mở thiệp, 60px/giây (tăng dần trong 0,7 giây);
  // người xem tự cuộn / lăn chuột / chạm / bấm phím cuộn thì dừng, 3 giây sau chạy tiếp; ở cuối trang 2 giây thì thôi hẳn ----------
  function autoScroll() {
    if (TEST.noAutoScroll) return;
    const SPEED = 60, KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Spacebar']), P = { passive: true };
    let raf = 0, first = 0, idle = 0, on = false, done = false, y = 0, set = 0, last = 0, t0 = 0, endAt = 0, maxY = 0, maxAt = 0;
    const measure = () => (maxY = Math.max(0, document.documentElement.scrollHeight - innerHeight));
    const moved = () => Math.abs(scrollY - set) > 6;
    const step = t => {
      if (!on) return;
      if (last === 0) { last = t0 = t; set = y = scrollY; raf = requestAnimationFrame(step); return; }
      const dt = Math.min((t - last) / 1000, 0.1); last = t;
      if (moved()) { stop(); later(); return; }
      const max = t - maxAt >= 300 ? (maxAt = t, measure()) : maxY;
      if (y >= max - 2) { if (endAt === 0) endAt = t; else if (t - endAt >= 2000) { done = true; on = false; return; } } else endAt = 0;
      set = y = Math.min(y + SPEED * Math.min(1, (t - t0) / 700) * dt, max);
      scrollTo({ top: y, behavior: 'instant' });
      raf = requestAnimationFrame(step);
    };
    const go = () => { if (done || on) return; on = true; last = 0; endAt = 0; set = y = scrollY; raf = requestAnimationFrame(step); };
    function stop() { on = false; last = 0; endAt = 0; cancelAnimationFrame(raf); }
    function later() { clearTimeout(idle); if (!done) idle = setTimeout(go, 3000); }
    const user = () => { if (!done) { clearTimeout(first); stop(); later(); } };
    addEventListener('scroll', () => { if (done) return; if (!on) { clearTimeout(first); later(); return; } if (moved()) user(); }, P);
    ['wheel', 'touchstart', 'touchmove'].forEach(e => addEventListener(e, user, P));
    addEventListener('resize', () => { measure(); maxAt = 0; }, P);
    addEventListener('keydown', e => { if (KEYS.has(e.key)) user(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) { clearTimeout(idle); stop(); } else later(); });
    measure(); first = setTimeout(go, 1500);
  }

  // ---------- Nhạc (như mẫu): chạm mở thiệp chỉ "mồi" âm thanh; nhạc bật khi phong bì mở xong, cùng lúc hiện nút nhạc.
  // Chưa phát được thì lần chạm/bấm kế tiếp sẽ phát. File nhạc trong content.js, không có thì hộp nhạc Canon in D (js/music.js) ----------
  function music(C) {
    const tpl = document.createElement('template'); tpl.innerHTML = musicHTML();
    const box = tpl.content.firstElementChild, btn = $('.music-btn', box), tip = $('.music-tip', box);
    const ring = document.createElement('span'); ring.className = 'music-ring'; ring.setAttribute('aria-hidden', 'true');
    if (/^(https:|audio\/)/.test(C.music || '')) $('#bgm').src = C.music;
    const player = !preview && window.createMusic ? createMusic() : null; // trang xem thử trong admin: không nhạc, như trình sửa của mẫu
    if (!player) return { open() {} };
    let opened = false, primed = false, playing = false, played = false, started = false, manual = false, touchFailed = false;
    const set = on => {
      playing = on; box.classList.toggle('playing', on);
      btn.title = on ? 'Tắt nhạc' : 'Bật nhạc'; btn.setAttribute('aria-label', btn.title);
      if (on) player.play().then(ok => { if (ok) played = true; else if (playing) fail(); hint(); });
      else player.pause();
      hint();
    };
    const fail = () => { started = false; set(false); };
    const auto = type => {
      if (started || manual) return;
      started = true;
      player.play().then(ok => { if (manual) return; if (!ok) { if (type === 'touchstart') touchFailed = true; fail(); return; } set(true); });
    };
    $$('[data-music]', box).forEach(b => b.addEventListener('click', () => { manual = true; started = true; set(!playing); }));
    if (!TEST.noMusic) ['click', 'touchstart', 'touchend', 'keydown'].forEach(t => addEventListener(t, e => {
      if (e.target instanceof Element && e.target.closest('[data-music]')) return;
      if (opened) { if (e.type !== 'touchstart' || !touchFailed) auto(e.type); return; }
      primed = true; player.prime();
    }, { passive: true }));

    // Gợi ý "Bấm để nghe nhạc" (như mẫu): chỉ khi thiệp đã mở mà nhạc chưa từng phát được. Hiện sau 6 giây không thao tác
    // (lần hai: 20 giây), mỗi lần 7 giây; thao tác sau 2,5 giây hoặc bấm chỗ khác thì tắt sớm; tối đa 2 lần
    const WAIT = [6000, 20000], ACTS = ['pointerdown', 'touchstart', 'touchmove', 'wheel', 'keydown'], CAP = { capture: true, passive: true };
    let hintOn = false, hs = null, shown = 0, htimer = 0;
    const now = () => performance.now();
    const fresh = at => (shown >= WAIT.length ? { phase: 'done' } : { phase: 'waiting', idle: at });
    const show = v => { tip.classList.toggle('show', v); if (v) tip.after(ring); else ring.remove(); };
    const arm = () => {
      clearTimeout(htimer);
      const due = hs.phase === 'waiting' ? hs.idle + WAIT[shown] : hs.phase === 'visible' ? hs.since + 7000 : null;
      if (due !== null) htimer = setTimeout(tick, Math.max(0, due - now()));
    };
    const feed = (type, at) => {
      let next = hs;
      if (hs.phase === 'waiting') {
        if (type !== 'tick') next = { phase: 'waiting', idle: at };
        else if (at - hs.idle >= WAIT[shown]) { shown++; next = { phase: 'visible', since: at }; }
      } else if (hs.phase === 'visible') {
        const n = at - hs.since;
        if (!((type === 'activity' && n < 2500) || (type === 'tick' && n < 7000))) next = fresh(at);
      }
      const changed = next.phase !== hs.phase; hs = next;
      if (changed) { show(hs.phase === 'visible'); arm(); }
    };
    function tick() { feed(document.hidden && hs.phase === 'waiting' ? 'activity' : 'tick', now()); arm(); }
    const inside = e => e.target instanceof Node && box.contains(e.target);
    const activity = e => { if (!inside(e)) feed('activity', now()); };
    const dismiss = e => { if (hs.phase === 'visible' && !inside(e)) feed('dismiss', now()); };
    function hint() {
      const want = opened && !playing && !played;
      if (want === hintOn) return;
      hintOn = want;
      const how = want ? 'addEventListener' : 'removeEventListener';
      ACTS.forEach(t => window[how](t, activity, CAP)); window[how]('click', dismiss, CAP); document[how]('visibilitychange', activity);
      if (want) { hs = fresh(now()); arm(); } else { clearTimeout(htimer); show(false); }
    }

    return {
      // phong bì mở xong (autoplay) hoặc thiệp mở thẳng không phong bì
      open(autoplay) {
        opened = true; $('#app').append(box);
        if (autoplay && !TEST.noMusic) set(true);
        else if (primed && !playing) auto('gate');
        hint();
      },
    };
  }

  // ---------- Đếm ngược ----------
  function countdown(M) {
    const els = $$('[data-cd]'); if (!els.length || !M.main) return;
    const now = () => (TEST.now ?? Date.now());
    const tick = () => {
      const s = Math.max(0, INT((M.main.t - now()) / 1000));
      const v = [INT(s / 86400), INT(s / 3600) % 24, INT(s / 60) % 60, s % 60];
      els.forEach(el => { el.textContent = p2(v[+el.dataset.cd]); });
    };
    tick(); if (!TEST.now) setInterval(tick, 1000);
  }

  // ---------- Khoá cuộn trang khi mở hộp thoại (giữ chỗ thanh cuộn để trang không xô) ----------
  let locks = 0, lockPad = '';
  const lockScroll = on => {
    const b = document.body;
    if (on && !locks++) { const w = innerWidth - document.documentElement.clientWidth; lockPad = b.style.paddingRight; b.style.overflow = 'hidden'; if (w > 0) b.style.paddingRight = w + 'px'; }
    if (!on && locks && !--locks) { b.style.overflow = ''; b.style.paddingRight = lockPad; }
  };
  const isPhone = () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  // Lưu tệp: điện thoại thì mở bảng chia sẻ (lưu vào Ảnh), máy tính thì tải về
  async function saveFile(file, keep = 1000) {
    if (isPhone() && typeof navigator.share === 'function') {
      try { if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file] }); return; } }
      catch (e) { if (e?.name === 'AbortError') return; }
    }
    const url = URL.createObjectURL(file), a = Object.assign(document.createElement('a'), { href: url, download: file.name });
    a.style.display = 'none'; document.body.append(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, keep);
  }

  // ---------- Xem ảnh album (như mẫu): nền tối, số thứ tự, phóng to 100–400%, ảnh nhỏ bên dưới ----------
  function lightbox(M) {
    const list = M.photos.album; if (!list.length) return;
    let box = null, cur = -1, T = 1, pan = { x: 0, y: 0 }, drag = false, from = { x: 0, y: 0 }, back = null;
    let pinch = null, pinchT = 1, touch0 = { x: 0, y: 0 }, pan0 = { x: 0, y: 0 }, afterPinch = false, lastTap = 0;
    const zoomTo = z => {
      T = Math.min(4, Math.max(1, z)); if (T <= 1) pan = { x: 0, y: 0 };
      $('.lb-pct', box).textContent = Math.round(T * 100) + '%';
      $('[data-z="-1"]', box).disabled = T <= 1; $('[data-z="1"]', box).disabled = T >= 4;
      $$('.lb-nav', box).forEach(b => { b.hidden = T > 1; });
      $('.lb-stage', box).style.cursor = T > 1 ? 'grab' : 'default';
      setPan();
    };
    const setPan = () => { const p = $('.lb-pan', box); if (p) { p.style.transition = drag ? 'none' : 'transform 0.1s ease-out'; p.style.transform = `translate(${pan.x}px, ${pan.y}px) scale(${T})`; } };
    const show = i => {
      cur = (i + list.length) % list.length;
      $('.lb-count', box).textContent = `${cur + 1} / ${list.length}`;
      $('.lb-stage', box).innerHTML = `<div class="lb-frame"><div class="lb-pan"><img class="lb-img" src="${esc(list[cur])}" alt="Wedding photo ${cur + 1}" draggable="false"></div></div>`;
      $$('.lb-thumb', box).forEach((b, n) => {
        const on = n === cur;
        b.style.opacity = on ? '1' : '.55'; b.style.transform = on ? 'scale(1.08)' : 'scale(1)'; b.style.boxShadow = on ? '0 0 0 2px #fff, 0 2px 8px rgba(0,0,0,0.5)' : 'none';
        if (on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
        $('.lb-ring', b)?.remove(); if (on) b.insertAdjacentHTML('beforeend', '<div class="lb-ring"></div>');
      });
      $$('.lb-thumb', box)[cur].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      zoomTo(1);
    };
    const close = () => { if (!box) return; box.remove(); box = null; lockScroll(false); removeEventListener('keydown', onKey); back?.focus({ preventScroll: true }); };
    const onKey = e => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') { if (T <= 1) show(cur - 1); }
      else if (e.key === 'ArrowRight') { if (T <= 1) show(cur + 1); }
      else if (e.key === '+' || e.key === '=') zoomTo(T + 0.5);
      else if (e.key === '-') zoomTo(T - 0.5);
      else if (e.key === '0') zoomTo(1);
    };
    const open = i => {
      back = document.activeElement;
      box = document.createElement('div');
      box.className = 'lb';
      box.innerHTML = `<div class="lb-top"><div class="lb-count"></div><div class="lb-zoom"><button type="button" class="lb-btn lb-sm" data-z="-1" aria-label="Zoom out">${ICONS.zoomOut()}</button><span class="lb-pct">100%</span><button type="button" class="lb-btn lb-sm" data-z="1" aria-label="Zoom in">${ICONS.zoomIn()}</button></div><button type="button" class="lb-btn lb-close" aria-label="Close">${ICONS.x()}</button></div>`
        + '<div class="lb-stage"></div>'
        + `<button type="button" class="lb-btn lb-nav lb-prev" aria-label="Previous image">${ICONS.chevL()}</button><button type="button" class="lb-btn lb-nav lb-next" aria-label="Next image">${ICONS.chevR()}</button>`
        + `<div class="lb-bottom"><div class="lb-shade"></div><div class="lb-strip">${list.map((s, n) => `<button type="button" class="lb-thumb" aria-label="View image ${n + 1}"><img src="${esc(s)}" alt="Thumbnail ${n + 1}" draggable="false" style="object-position:${posOf(M.focus[s])}"${focalAttr(M.focus[s])}></button>`).join('')}</div></div>`;
      document.body.append(box); focal(box);
      lockScroll(true); addEventListener('keydown', onKey);
      box.addEventListener('click', close);
      $$('.lb-top > :not(.lb-count), .lb-bottom, .lb-stage', box).forEach(el => el.addEventListener('click', e => e.stopPropagation()));
      $('.lb-close', box).addEventListener('click', close);
      $$('[data-z]', box).forEach(b => b.addEventListener('click', () => zoomTo(T + 0.5 * b.dataset.z)));
      $('.lb-prev', box).addEventListener('click', e => { e.stopPropagation(); show(cur - 1); });
      $('.lb-next', box).addEventListener('click', e => { e.stopPropagation(); show(cur + 1); });
      $$('.lb-thumb', box).forEach((b, n) => b.addEventListener('click', () => show(n)));
      const st = $('.lb-stage', box);
      st.addEventListener('wheel', e => { e.preventDefault(); zoomTo(T + (e.deltaY > 0 ? -0.5 : 0.5)); }, { passive: false });
      st.addEventListener('dblclick', e => { e.stopPropagation(); zoomTo(T > 1 ? 1 : 2); });
      st.addEventListener('mousedown', e => { if (T <= 1) return; drag = true; from = { x: e.clientX - pan.x, y: e.clientY - pan.y }; });
      st.addEventListener('mousemove', e => { if (!drag) return; pan = { x: e.clientX - from.x, y: e.clientY - from.y }; setPan(); });
      ['mouseup', 'mouseleave'].forEach(t => st.addEventListener(t, () => { drag = false; }));
      const dist = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
      st.addEventListener('touchstart', e => {
        if (e.touches.length === 2) { pinch = dist(e.touches); pinchT = T; return; }
        pinch = null; touch0 = { x: e.touches[0].clientX, y: e.touches[0].clientY }; pan0 = { ...pan };
      }, { passive: true });
      st.addEventListener('touchmove', e => {
        if (pinch && e.touches.length === 2) { zoomTo(pinchT * dist(e.touches) / pinch); return; }
        if (T > 1 && !pinch && e.touches.length === 1) { pan = { x: pan0.x + e.touches[0].clientX - touch0.x, y: pan0.y + e.touches[0].clientY - touch0.y }; setPan(); }
      }, { passive: true });
      st.addEventListener('touchend', e => {
        if (pinch) { if (e.touches.length < 2) { pinch = null; afterPinch = true; if (e.touches.length === 1) { touch0 = { x: e.touches[0].clientX, y: e.touches[0].clientY }; pan0 = { ...pan }; } } return; }
        if (afterPinch) { afterPinch = false; return; }
        const t = e.changedTouches[0], dx = t.clientX - touch0.x, dy = t.clientY - touch0.y, now = Date.now();
        if (now - lastTap < 300 && Math.abs(dx) < 20 && Math.abs(dy) < 20) { lastTap = 0; zoomTo(T > 1 ? 1 : 2); return; }
        lastTap = now;
        if (T <= 1 && Math.abs(dx) >= 50) show(cur + (dx < 0 ? 1 : -1));
      });
      show(i);
    };
    $$('.album-button').forEach(b => b.addEventListener('click', () => open(+b.dataset.i)));
  }

  // ---------- Mã QR mừng cưới (như mẫu): phóng to trong hộp thoại, tải về ----------
  const qrName = name => `ma-qr-${String(name).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'mung-cuoi'}`;
  async function qrFile(src, base) {
    const b = await (await fetch(src)).blob();
    const ext = /jpe?g/.test(b.type) ? 'jpg' : b.type.includes('webp') ? 'webp' : b.type.includes('gif') ? 'gif' : b.type.includes('svg') ? 'svg' : 'png';
    return new File([b], `${base}.${ext}`, { type: b.type || 'image/png' });
  }
  function wireQrButton(btn, g) {
    let busy = false, file = null;
    qrFile(g.qr, qrName(g.name)).then(f => { file = f; }).catch(() => {});
    btn.addEventListener('click', async e => {
      e.preventDefault(); e.stopPropagation(); if (busy) return;
      busy = true; btn.disabled = true;
      const html = btn.innerHTML;
      btn.innerHTML = lucide('loader-circle', ['M21 12a9 9 0 1 1-6.219-8.56'], 24, 'h-3.5 w-3.5 shrink-0 animate-spin') + '<span class="truncate">Đang tải…</span>';
      try { await saveFile(file || await qrFile(g.qr, qrName(g.name))); }
      catch { if (!btn.parentElement.querySelector('.qr-hint')) btn.insertAdjacentHTML('afterend', '<span class="qr-hint mt-1.5 max-w-[180px] text-center text-[10px] leading-snug opacity-75">Nếu ảnh chưa tải, nhấn giữ mã QR để lưu ảnh.</span>'); }
      finally { busy = false; btn.disabled = false; btn.innerHTML = html; }
    });
  }
  function gifts(M) {
    if (!M.gifts.length) return;
    $$('#wedding-gift [data-qr]').forEach(b => wireQrButton(b, M.gifts[+b.dataset.qr]));
    let root = null, back = null;
    const close = () => { if (!root) return; root.remove(); root = null; lockScroll(false); removeEventListener('keydown', onKey, true); back?.focus({ preventScroll: true }); };
    const onKey = e => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      if (e.key === 'Tab') { // giữ phím Tab trong hộp thoại như Radix
        const f = $$('button, [href]', root).filter(el => !el.disabled), i = f.indexOf(document.activeElement);
        if (e.shiftKey ? i <= 0 : i === f.length - 1) { e.preventDefault(); f[e.shiftKey ? f.length - 1 : 0].focus(); }
      }
    };
    $$('.gift-qr').forEach(b => b.addEventListener('click', () => {
      const g = M.gifts[+b.dataset.i]; back = b;
      root = document.createElement('div');
      root.innerHTML = `<div class="dlg-overlay" data-state="open"></div><div role="dialog" id="ol-qr-dialog" aria-describedby="ol-qr-desc" aria-labelledby="ol-qr-title" data-state="open" class="dlg qr-dialog" tabindex="-1"><h2 id="ol-qr-title" class="dlg-title qr-dialog-title">Mừng hạnh phúc</h2><p id="ol-qr-desc" class="dlg-desc qr-dialog-desc">${esc(g.label.split(' · ')[0])} · ${esc(g.name)}</p><img class="qr-dialog-image" src="${esc(g.qr)}" alt="Mã QR mừng cưới ${esc(g.name)}">${qrButton(0, g.name, false)}<button type="button" class="dlg-close">${lucide('x', ['M18 6 6 18', 'm6 6 12 12'], 24, 'h-4 w-4')}<span class="sr-only">Close</span></button></div>`;
      document.body.append(root);
      lockScroll(true); addEventListener('keydown', onKey, true);
      $('.dlg-overlay', root).addEventListener('click', close);
      $('.dlg-close', root).addEventListener('click', close);
      const save = $('[data-qr]', root); wireQrButton(save, g);
      save.focus({ preventScroll: true });
    }));
  }

  // ---------- Gửi dữ liệu: Google Sheet qua Apps Script (rsvp-google-sheet.gs), chưa có thì email ----------
  const endpointOf = C => (/^https:\/\//.test(C.rsvp?.endpoint || '') ? C.rsvp.endpoint : '');
  const post = (url, data) => fetch(url, { method: 'POST', mode: 'no-cors', body: new URLSearchParams(data) });

  function rsvp(M) {
    const form = $('#rsvp form'); if (!form) return;
    const out = $('output', form), [minus, plus] = $$('[data-step]', form), submit = $('button[type=submit]', form), fs = $('fieldset', form);
    const attending = () => $('input[name=ol-attendance]', form).checked;
    let n = 1;
    const setN = v => { n = Math.max(1, Math.min(99, v)); out.textContent = n; minus.disabled = n <= 1; plus.disabled = n >= 99; };
    $$('[data-step]', form).forEach(b => b.addEventListener('click', () => setN(n + +b.dataset.step)));
    form.addEventListener('change', () => { $('.counter', form).hidden = !attending(); });
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const yes = attending(), name = form.name.value.trim();
      if (!name) { form.name.focus(); return; }
      const side = M.mode === 'chung' ? (form['ol-guest-side'].value === 'bride' ? 'gai' : 'trai') : M.mode;
      const data = { type: 'rsvp', name, attend: yes ? 'Có' : 'Không', guests: yes ? n : 0, message: `Khách nhà ${side === 'gai' ? 'gái' : 'trai'}` };
      const html = submit.innerHTML; fs.disabled = true; submit.innerHTML = ICONS.loader() + 'Đang gửi…';
      const done = msg => { // như mẫu: dòng thông báo chỉ có sau khi gửi, nằm ngay dưới form
        fs.disabled = false; submit.innerHTML = html;
        let p = $('#rsvp .form-notice');
        if (!p) { p = document.createElement('p'); p.className = 'form-notice'; p.setAttribute('role', 'status'); form.after(p); }
        p.textContent = msg;
      };
      const url = endpointOf(M.C);
      if (TEST.post) TEST.post(data);
      if (url) { try { await post(url, data); } catch { return done('Chưa gửi được xác nhận. Vui lòng thử lại.'); } }
      else if (M.C.rsvp?.email) location.href = `mailto:${M.C.rsvp.email}?subject=${encodeURIComponent('Xác nhận tham dự - ' + name)}&body=${encodeURIComponent(`Họ tên: ${name}\nTham dự: ${data.attend}\nSố người: ${data.guests}\n${data.message}`)}`;
      done(yes ? 'Đã ghi nhận! Hẹn gặp bạn trong ngày vui.' : 'Cảm ơn bạn đã phản hồi, chúng mình đã ghi nhận.');
    });
  }

  // ---------- Sổ lưu bút (như mẫu): ký tên → đặt chữ ký lên ảnh → gửi lời chúc ----------
  const SIG_W = 6, INK = '#000000', STEPS = ['sign', 'place', 'message'];
  const inkStyle = d => `filter:url(#ol-ink)${d ? ` drop-shadow(${d})` : ''}`;
  const vnDate = t => new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(t));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const okSig = s => (/^data:image\/(png;base64,[A-Za-z0-9+/=]+|svg\+xml,[^"<>]+)$/.test(s || '') ? s : '');
  const normWish = w => ({ id: String(w.id || `w-${+new Date(w.time) || 0}-${w.name}`), name: String(w.name || '').slice(0, 100), message: String(w.message || '').slice(0, 2000), time: +new Date(w.time) || Date.now(), sig: okSig(w.sig), x: Number.isFinite(+w.x) && w.x !== '' ? +w.x : 50, y: Number.isFinite(+w.y) && w.y !== '' ? +w.y : 50, s: +w.s > 0 ? +w.s : 1 });

  // Bút ký chép từ signature_pad 2.3 (react-signature-canvas) mà mẫu dùng: nét 1,5–3px to nhỏ theo tốc độ, đường cong Bézier,
  // bỏ điểm cách nhau dưới 5px, cập nhật tối đa 16ms một lần, đổi cỡ cửa sổ thì xoá (clearOnResize)
  function signaturePad(cv) {
    const ctx = cv.getContext('2d'), minW = 1.5, maxW = 3, minDist = 5, vw = 0.7, dotSize = (minW + maxW) / 2;
    let data = [], pts = [], lastV = 0, lastW = (minW + maxW) / 2, down = false, empty = true;
    const dist = (a, b) => Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
    const velocity = (b, a) => (b.t !== a.t ? dist(b, a) / (b.t - a.t) : 1);
    const reset = () => { pts = []; lastV = 0; lastW = (minW + maxW) / 2; ctx.fillStyle = INK; };
    const clear = () => { ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.clearRect(0, 0, cv.width, cv.height); ctx.fillRect(0, 0, cv.width, cv.height); data = []; reset(); empty = true; };
    const fit = () => { const r = Math.max(devicePixelRatio || 1, 1); cv.width = cv.offsetWidth * r; cv.height = cv.offsetHeight * r; ctx.scale(r, r); clear(); };
    const ctrl = (s1, s2, s3) => {
      const dx1 = s1.x - s2.x, dy1 = s1.y - s2.y, dx2 = s2.x - s3.x, dy2 = s2.y - s3.y;
      const m1 = { x: (s1.x + s2.x) / 2, y: (s1.y + s2.y) / 2 }, m2 = { x: (s2.x + s3.x) / 2, y: (s2.y + s3.y) / 2 };
      const l1 = Math.sqrt(dx1 * dx1 + dy1 * dy1), l2 = Math.sqrt(dx2 * dx2 + dy2 * dy2), hx = m1.x - m2.x, hy = m1.y - m2.y, k = l2 / (l1 + l2);
      const cm = { x: m2.x + hx * k, y: m2.y + hy * k }, tx = s2.x - cm.x, ty = s2.y - cm.y;
      return { c1: { x: m1.x + tx, y: m1.y + ty }, c2: { x: m2.x + tx, y: m2.y + ty } };
    };
    const bz = (t, a, b, c, d) => a * (1 - t) * (1 - t) * (1 - t) + 3 * b * (1 - t) * (1 - t) * t + 3 * c * (1 - t) * t * t + d * t * t * t;
    const length = (s, c1, c2, e) => {
      let L = 0, px, py;
      for (let i = 0; i <= 10; i += 1) { const t = i / 10, x = bz(t, s.x, c1.x, c2.x, e.x), y = bz(t, s.y, c1.y, c2.y, e.y); if (i > 0) { const dx = x - px, dy = y - py; L += Math.sqrt(dx * dx + dy * dy); } px = x; py = y; }
      return L;
    };
    const dot = (x, y, w) => { ctx.moveTo(x, y); ctx.arc(x, y, w, 0, 2 * Math.PI, false); empty = false; };
    const curve = (s, c1, c2, e, sw, ew) => {
      const d = ew - sw, n = Math.floor(length(s, c1, c2, e));
      ctx.beginPath();
      for (let i = 0; i < n; i += 1) {
        const t = i / n, tt = t * t, ttt = tt * t, u = 1 - t, uu = u * u, uuu = uu * u;
        let x = uuu * s.x; x += 3 * uu * t * c1.x + 3 * u * tt * c2.x + ttt * e.x;
        let y = uuu * s.y; y += 3 * uu * t * c1.y + 3 * u * tt * c2.y + ttt * e.y;
        dot(x, y, sw + ttt * d);
      }
      ctx.closePath(); ctx.fill();
    };
    const add = p => {
      pts.push(p);
      if (pts.length <= 2) return;
      if (pts.length === 3) pts.unshift(pts[0]);
      const c2 = ctrl(pts[0], pts[1], pts[2]).c2, c3 = ctrl(pts[1], pts[2], pts[3]).c1, s = pts[1], e = pts[2];
      const v = vw * velocity(e, s) + (1 - vw) * lastV, w = Math.max(maxW / (v + 1), minW), sw = lastW;
      lastV = v; lastW = w; pts.shift();
      curve(s, c2, c3, e, sw, w);
    };
    const update = ev => {
      const r = cv.getBoundingClientRect(), p = { x: ev.clientX - r.left, y: ev.clientY - r.top, t: new Date().getTime() };
      const g = data[data.length - 1], last = g && g[g.length - 1];
      if (last && dist(p, last) < minDist) return;
      add(p); g.push({ x: p.x, y: p.y, t: p.t });
    };
    const begin = ev => { data.push([]); reset(); update(ev); };
    const end = () => {
      const first = pts[0];
      if (pts.length <= 2 && first) { ctx.beginPath(); dot(first.x, first.y, dotSize); ctx.closePath(); ctx.fill(); }
      if (first) { const g = data[data.length - 1], last = g[g.length - 1]; if (!(last && first.x === last.x && first.y === last.y && first.t === last.t)) g.push({ ...first }); }
    };
    let prev = 0, timer = null, args = null; // throttle 16ms (gọi ngay lần đầu, gọi bù lần cuối) như signature_pad
    const moveUpdate = ev => {
      const t = Date.now(), left = 16 - (t - prev); args = ev;
      if (left <= 0 || left > 16) { if (timer) { clearTimeout(timer); timer = null; } prev = t; update(args); if (!timer) args = null; }
      else if (!timer) timer = setTimeout(() => { prev = Date.now(); timer = null; update(args); if (!timer) args = null; }, left);
    };
    const mdown = e => { if (e.which === 1) { down = true; begin(e); } };
    const mmove = e => { if (down) moveUpdate(e); };
    const mup = e => { if (e.which === 1 && down) { down = false; end(); } };
    const tstart = e => { if (e.targetTouches.length === 1) begin(e.changedTouches[0]); };
    const tmove = e => { e.preventDefault(); moveUpdate(e.targetTouches[0]); };
    const tend = e => { if (e.target === cv) { e.preventDefault(); end(); } };
    cv.style.msTouchAction = 'none'; cv.style.touchAction = 'none';
    cv.addEventListener('mousedown', mdown); cv.addEventListener('mousemove', mmove); document.addEventListener('mouseup', mup);
    cv.addEventListener('touchstart', tstart); cv.addEventListener('touchmove', tmove); cv.addEventListener('touchend', tend);
    addEventListener('resize', fit);
    fit();
    return {
      clear, isEmpty: () => empty,
      destroy() { document.removeEventListener('mouseup', mup); removeEventListener('resize', fit); clearTimeout(timer); },
      // getTrimmedCanvas (trim-canvas) rồi thu về rộng tối đa 320px, như mẫu
      png() {
        const w = cv.width, h = cv.height, a = ctx.getImageData(0, 0, w, h).data;
        let t = h, b = -1, l = w, r = -1;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (a[(y * w + x) * 4 + 3]) { if (y < t) t = y; if (y > b) b = y; if (x < l) l = x; if (x > r) r = x; }
        if (b < 0) return '';
        const c = document.createElement('canvas'); c.width = r - l + 1; c.height = b - t + 1;
        c.getContext('2d').putImageData(ctx.getImageData(l, t, c.width, c.height), 0, 0);
        if (c.width <= 320) return c.toDataURL('image/png');
        const o = document.createElement('canvas'); o.width = 320; o.height = Math.round(c.height * 320 / c.width);
        o.getContext('2d').drawImage(c, 0, 0, o.width, o.height);
        return o.toDataURL('image/png');
      },
    };
  }

  // Ảnh bảng chữ ký kèm chữ ký (như nút tải của mẫu)
  async function boardImage(board) {
    const n = board.getBoundingClientRect(); if (!n.width || !n.height) throw Error('board');
    const bg = $('img[data-board-background]', board), sigs = $$('img[data-board-signature]', board);
    const k = Math.min(4, Math.max(2, (bg?.naturalWidth || 0) / n.width)), cv = document.createElement('canvas');
    cv.width = Math.round(n.width * k); cv.height = Math.round(n.height * k);
    const g = cv.getContext('2d');
    const load = el => new Promise((ok, no) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => ok(i); i.onerror = () => no(Error('img')); i.src = el.currentSrc || el.src; });
    const box = el => { const r = el.getBoundingClientRect(); return { x: (r.left - n.left) / n.width * cv.width, y: (r.top - n.top) / n.height * cv.height, w: r.width / n.width * cv.width, h: r.height / n.height * cv.height }; };
    const clear = c => !c || c === 'transparent' || /^rgba\(.*,\s*0\)$/.test(c);
    const fill = getComputedStyle(board).backgroundColor;
    g.fillStyle = clear(fill) ? '#ffffff' : fill; g.fillRect(0, 0, cv.width, cv.height);
    if (bg) {
      const i = await load(bg), { x, y, w, h } = box(bg), fit = getComputedStyle(bg).objectFit;
      if ((fit === 'cover' || fit === 'contain') && i.naturalWidth && i.naturalHeight) {
        const s = (fit === 'cover' ? Math.max : Math.min)(w / i.naturalWidth, h / i.naturalHeight), iw = i.naturalWidth * s, ih = i.naturalHeight * s;
        g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.drawImage(i, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih); g.restore();
      } else g.drawImage(i, x, y, w, h);
    }
    for (const el of sigs) {
      const i = await load(el), { x, y, w, h } = box(el); if (!w || !h) continue;
      let op = 1; for (let p = el; p && p !== board; p = p.parentElement) { const o = parseFloat(getComputedStyle(p).opacity); if (Number.isFinite(o)) op *= o; }
      const t = document.createElement('canvas'); t.width = Math.max(1, Math.round(w)); t.height = Math.max(1, Math.round(h));
      const tg = t.getContext('2d'); tg.drawImage(i, 0, 0, t.width, t.height); tg.globalCompositeOperation = 'source-in'; tg.fillStyle = INK; tg.fillRect(0, 0, t.width, t.height);
      g.save(); g.globalAlpha = op; g.shadowColor = 'rgba(0, 0, 0, 0.28)'; g.shadowBlur = 2 * k; g.shadowOffsetY = k; g.drawImage(t, x, y, w, h); g.restore();
    }
    return new Promise((ok, no) => cv.toBlob(b => (b ? ok(b) : no(Error('png'))), 'image/png'));
  }

  function guestbook(M) {
    const sec = $('#guestbook'); if (!sec) return;
    const board = $('.guestbook-board', sec), wrap = board.closest('.guestbook-board-wrap'), wishesEl = $('.wishes', sec), list = $('.wish-list', sec);
    const url = endpointOf(M.C), sandbox = preview, KEY = 'ol-wishes-' + location.host, OWN = 'ol-own-' + location.host, SECRET = 'ol-key-' + location.host;
    const store = { get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
    let wishes = [], shown = 5, ownId = sandbox ? null : store.get(OWN, null), loading = false;
    let step = null, editing = null, sig = null, pos = { x: 50, y: 50 }, scale = 1.5, name = M.guest || '', side = M.mode === 'gai' ? 'bride' : 'groom', message = '', notice = '', sending = false, pad = null, dragging = false;
    const merge = arr => { const m = new Map(wishes.map(w => [w.id, w])); arr.map(normWish).forEach(w => { if (!m.has(w.id) || w.id !== ownId) m.set(w.id, w); }); wishes = [...m.values()].sort((a, b) => b.time - a.time); };
    merge(TEST.wishes || (sandbox ? [] : store.get(KEY, [])));
    const own = () => (ownId ? wishes.find(w => w.id === ownId) || null : null);
    // khoá sửa riêng của trình duyệt này: Google Sheet chỉ cho sửa lời chúc khi gửi kèm đúng khoá (mã lời chúc thì ai cũng thấy)
    const secret = () => { let k = store.get(SECRET, ''); if (!/^[a-z0-9]{24}$/.test(k)) { k = Array.from(crypto.getRandomValues(new Uint8Array(24)), b => (b % 36).toString(36)).join(''); store.set(SECRET, k); } return k; };
    const reset = () => { step = null; editing = null; sig = null; pos = { x: 50, y: 50 }; scale = 1.5; message = ''; };
    const scrollTo = what => setTimeout(() => (what === 'board' ? board : $('.workflow', sec))?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
    const go = (s, where) => { step = s; render(); if (where) scrollTo(where); };

    function drawBoard() {
      const all = wishes.filter(w => w.sig), vis = step === 'place' && editing ? all.filter(w => w.id !== editing) : all, placing = step === 'place';
      board.classList.toggle('guestbook-board-placing', placing);
      if (placing) board.setAttribute('role', 'application'); else board.removeAttribute('role');
      board.tabIndex = placing ? 0 : -1;
      board.setAttribute('aria-label', placing ? 'Bảng chọn vị trí chữ ký' : 'Bảng chữ ký');
      board.innerHTML = tidy((M.photos.board ? `<img data-board-background="true" class="guestbook-board-image" src="${esc(M.photos.board)}" alt="" draggable="false">` : '')
        + `<span class="guestbook-board-count">${all.length} chữ ký</span>`
        + vis.map(w => `<div class="board-signature" title="${esc(w.name)}" style="left:${w.x}%;top:${w.y}%;width:${SIG_W * (w.s || 1)}%"><img data-board-signature="true" src="${esc(w.sig)}" alt="Chữ ký của ${esc(w.name)}" draggable="false" style="${inkStyle('0 1px 2px rgba(40,38,25,.35)')}"></div>`).join('')
        + (placing && sig ? `<div class="board-signature board-signature-current" style="left:${pos.x}%;top:${pos.y}%;width:${SIG_W * scale}%"><img src="${esc(sig)}" alt="Chữ ký đang đặt" draggable="false" style="${inkStyle('0 2px 3px rgba(40,38,25,.4)')}"></div>` : '')
        + (all.length || placing ? '' : `<div class="board-empty">${ICONS.pen()} <!-- -->Chữ ký đầu tiên đang chờ bạn</div>`)
        + (placing ? `<div class="board-hint">${ICONS.move()} <!-- -->Chạm hoặc kéo để đặt chữ ký</div>` : '')
        + (!step && all.length ? `<button type="button" class="board-download" aria-label="Tải ảnh (kèm chữ ký)" title="Tải ảnh (kèm chữ ký)" data-board-download="true">${ICONS.download(15)}</button>` : ''));
      unmark(board);
      $('.board-download', board)?.addEventListener('click', download);
    }
    const moveCurrent = () => { const c = $('.board-signature-current', board); if (c) Object.assign(c.style, { left: pos.x + '%', top: pos.y + '%', width: SIG_W * scale + '%' }); };

    function workflowHTML() {
      const i = STEPS.indexOf(step), dis = sending ? ' disabled=""' : '';
      let body = '';
      if (step === 'sign') body = `<div><h3>${editing ? 'Ký lại tên của bạn' : 'Ký tên của bạn'}</h3><p class="workflow-note">Dùng ngón tay hoặc chuột để ký vào khung bên dưới</p><div class="pen-color"><i style="background-color:${INK}"></i> <!-- -->Màu mực ${INK.toUpperCase()}</div><div class="signature-pad"><canvas class="signature-canvas" aria-label="Khung ký tên"></canvas></div><div class="workflow-actions workflow-actions-3"><button type="button" class="pill-button pill-button-ghost" data-gb="clear">${ICONS.eraser()} <!-- -->Xoá</button><button type="button" class="pill-button pill-button-ghost" data-gb="skip">Bỏ qua</button><button type="button" class="pill-button" data-gb="next">Tiếp tục</button></div></div>`;
      if (step === 'place') body = `<div><h3>Chọn chỗ đặt chữ ký</h3><p class="workflow-note">Kéo chữ ký trên bảng giấy phía trên và chỉnh cỡ cho vừa ý</p><label class="size-control"><span><span>Kích thước</span><strong>${Math.round(100 * scale)}<!-- -->%</strong></span><input type="range" min="0.5" max="2.5" step="0.1" value="${scale}"></label><div class="workflow-actions"><button type="button" class="pill-button pill-button-ghost" data-gb="resign">${ICONS.pen()} <!-- -->Ký lại</button><button type="button" class="pill-button" data-gb="write">Viết lời chúc</button></div></div>`;
      if (step === 'message') {
        const askName = !M.guest && !ownId;
        body = `<div><h3>${editing ? 'Cập nhật lời chúc' : 'Gửi lời chúc'}</h3><div class="form-stack" style="margin-top:calc(8 * var(--u))">`
          + (askName ? `<label><span class="sr-only">Tên của bạn</span><input class="pill-input" data-f="name" maxlength="100" placeholder="Tên của bạn là gì?" value="${esc(name)}"${dis}></label>`
            + (M.mode === 'chung' ? `<fieldset><legend class="choice-label">Bạn là khách mời của</legend><div class="choice-row">${['groom', 'bride'].map(s => `<label class="choice"><input type="radio" name="ol-guestbook-side" data-side="${s}"${side === s ? ' checked=""' : ''}${dis}><span>${s === 'groom' ? 'Nhà trai' : 'Nhà gái'}</span></label>`).join('')}</div></fieldset>` : '')
            : `<p class="writing-as">Gửi với tên<!-- --> <!-- --><strong>${esc(name || M.guest)}</strong></p>`)
          + `<label><span class="sr-only">Lời chúc của bạn</span><textarea class="pill-input" data-f="message" maxlength="2000" rows="4" placeholder="Gửi lời chúc đến cô dâu chú rể…"${dis}>${esc(message)}</textarea></label></div>`
          + `<div class="workflow-actions"><button type="button" class="pill-button pill-button-ghost" data-gb="back"${dis}>Quay lại</button><button type="button" class="pill-button" data-gb="send"${dis}>${sending ? ICONS.loader() : ICONS.send()}${sending ? 'Đang gửi' : editing ? 'Cập nhật' : 'Gửi lời chúc'}</button></div></div>`;
      }
      return `<div class="workflow"><div class="workflow-head"><div class="workflow-steps" aria-label="Các bước ký sổ lưu bút">${STEPS.map((s, n) => `<span data-state="${s === step ? 'active' : i > n ? 'done' : 'todo'}">${n + 1}</span>`).join('')}</div><button type="button" class="icon-button" data-gb="close" aria-label="Đóng phần ký tên"${dis}>${ICONS.x()}</button></div>${body}</div>`;
    }

    function drawMiddle() {
      pad?.destroy(); pad = null;
      while (wrap.nextElementSibling && wrap.nextElementSibling !== wishesEl) wrap.nextElementSibling.remove();
      const me = own();
      let h = '';
      if (!step && !me) h += `<div class="guestbook-actions"><button type="button" class="pill-button" data-gb="start"${loading ? ' disabled=""' : ''}>${loading ? ICONS.loader() : ICONS.pen()}${loading ? 'Đang tải sổ lưu bút' : 'Ký tên &amp; gửi lời chúc'}</button></div>`;
      if (me && !step) h += `<p class="signed-note">${ICONS.msgHeart()} <!-- -->Lời chúc của bạn đã có trong sổ</p>`;
      if (step) h += workflowHTML();
      if (notice) h += `<p class="form-notice" role="status">${esc(notice)}</p>`;
      wrap.insertAdjacentHTML('afterend', tidy(h));
      unmark(sec);
      const cv = $('.signature-canvas', sec); if (cv) pad = signaturePad(cv);
      const range = $('.size-control input', sec);
      range?.addEventListener('input', () => { scale = +range.value; $('.size-control strong', sec).replaceChildren(String(Math.round(100 * scale)), '%'); moveCurrent(); });
      $$('[data-f]', sec).forEach(el => el.addEventListener('input', () => { if (el.dataset.f === 'name') name = el.value; else message = el.value; }));
      $$('[data-side]', sec).forEach(el => el.addEventListener('change', () => { side = el.dataset.side; }));
    }

    function wishHTML(w, mine) {
      const dis = sending || step ? ' disabled=""' : '';
      return `<article class="wish${mine ? ' wish-own' : ''}"><div class="wish-head"><div class="wish-author">${w.sig ? `<span class="wish-signature"><img src="${esc(w.sig)}" alt="Chữ ký của ${esc(w.name)}" style="${inkStyle()}"></span>` : ''}<div style="min-width:0"><strong>${esc(w.name)}</strong>${mine ? '<small>Lời chúc của bạn</small>' : ''}</div></div><time datetime="${new Date(w.time).toISOString()}">${vnDate(w.time)}</time></div><p>${esc(w.message)}</p>`
        + (mine ? `<div class="wish-actions"><button type="button" data-gb="edit"${dis}>${ICONS.pen()} <!-- -->Sửa lời chúc</button><button type="button" data-gb="resign-own"${dis}>${ICONS.pen()} <!-- -->${w.sig ? 'Ký lại' : 'Thêm chữ ký'}</button>${w.sig ? `<button type="button" data-gb="arrange"${dis}>${ICONS.move()} <!-- -->Sắp xếp</button>` : ''}</div>` : '') + '</article>';
    }
    function drawWishes() {
      const me = own(), rest = wishes.filter(w => w !== me), vis = rest.slice(0, shown);
      $('.wishes-head span', sec).textContent = `${wishes.length} lời chúc`;
      list.innerHTML = tidy((me ? wishHTML(me, true) : '') + (loading || vis.length || me ? '' : '<p class="wishes-empty">Hãy là người đầu tiên ký vào sổ lưu bút.</p>')
        + vis.map(w => wishHTML(w)).join('') + (rest.length > shown ? `<button type="button" class="load-more" data-gb="more">${ICONS.chevDown()} <!-- -->Xem thêm lời chúc</button>` : ''));
      unmark(list);
    }
    const render = () => { drawBoard(); drawMiddle(); drawWishes(); };

    const editFrom = w => { editing = w.id; name = w.name; message = w.message; sig = w.sig || null; pos = { x: w.x, y: w.y }; scale = w.s || 1.5; notice = ''; };
    async function send() {
      const nm = name.trim() || M.guest.trim(), msg = message.trim();
      if (!nm || !msg || sending) { notice = 'Vui lòng nhập tên và viết lời chúc trước khi gửi.'; drawMiddle(); return; }
      notice = ''; sending = true; drawMiddle(); drawWishes();
      const old = editing && wishes.find(w => w.id === editing);
      const w = { id: editing || `w${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`, name: nm, message: msg, time: old ? old.time : (TEST.now ?? Date.now()), sig: sig || '', x: Math.round(pos.x * 100) / 100, y: Math.round(pos.y * 100) / 100, s: scale, side };
      const updated = !!old;
      try {
        if (TEST.post) TEST.post({ type: 'wish', ...w });
        if (sandbox) { wishes = updated ? wishes.map(x => (x.id === w.id ? w : x)) : [w, ...wishes]; ownId = w.id; name = nm; reset(); notice = updated ? 'Đã cập nhật bản xem thử — thay đổi sẽ không được lưu.' : 'Đây là bản xem thử — lời chúc sẽ không được lưu.'; return; }
        if (url) await post(url, { type: 'wish', id: w.id, name: w.name, message: w.message, sig: w.sig, x: w.x, y: w.y, s: w.s, side: w.side, key: secret() });
        store.set(KEY, [w, ...store.get(KEY, []).filter(x => x.id !== w.id)].slice(0, 20)); store.set(OWN, w.id);
        wishes = updated ? wishes.map(x => (x.id === w.id ? w : x)) : [w, ...wishes]; ownId = w.id; name = nm; reset();
        notice = updated ? 'Lời chúc của bạn đã được cập nhật.' : 'Lời chúc đã được gửi. Cảm ơn bạn thật nhiều!';
      } catch { notice = 'Có lỗi xảy ra, vui lòng thử lại.'; }
      finally { sending = false; render(); }
    }
    async function download(e) {
      e.stopPropagation();
      const btn = e.currentTarget; if (btn.disabled) return;
      btn.disabled = true; btn.setAttribute('aria-busy', 'true'); btn.innerHTML = ICONS.loader(15, 'animate-spin');
      if (notice) { notice = ''; drawMiddle(); }
      try { await saveFile(new File([await boardImage(board)], 'so-luu-but.png', { type: 'image/png' }), 30000); }
      catch { notice = 'Không thể tải ảnh sổ lưu bút. Vui lòng thử lại.'; drawMiddle(); }
      finally { btn.disabled = false; btn.removeAttribute('aria-busy'); btn.innerHTML = ICONS.download(15); }
    }

    sec.addEventListener('click', e => {
      const b = e.target.closest('[data-gb]'); if (!b || b.disabled) return;
      const a = b.dataset.gb, me = own();
      if (a === 'start') { if (loading) return; reset(); notice = ''; go('sign', 'workflow'); }
      if (a === 'close') { reset(); render(); }
      if (a === 'clear') pad?.clear();
      if (a === 'skip') { sig = null; go('message'); }
      if (a === 'next') { if (!pad || pad.isEmpty()) { notice = 'Vui lòng ký tên trước khi tiếp tục.'; drawMiddle(); } else { sig = pad.png(); notice = ''; go('place', 'board'); } }
      if (a === 'resign') { sig = null; go('sign'); }
      if (a === 'write') go('message', 'workflow');
      if (a === 'back') go(sig ? 'place' : 'sign', sig ? 'board' : 'workflow');
      if (a === 'send') send();
      if (a === 'more') { shown += 5; drawWishes(); }
      if (a === 'edit' && me) { editFrom(me); go('message', 'workflow'); }
      if (a === 'resign-own' && me) { editFrom(me); sig = null; go('sign', 'workflow'); }
      if (a === 'arrange' && me) { editFrom(me); go('place', 'board'); }
    });
    // đặt chữ ký: chạm hoặc kéo trên ảnh, hoặc phím mũi tên (Shift: bước 5%)
    const placeAt = e => { const r = board.getBoundingClientRect(), half = SIG_W * scale / 2; pos = { x: clamp((e.clientX - r.left) / r.width * 100, half, 100 - half), y: clamp((e.clientY - r.top) / r.height * 100, 4, 96) }; moveCurrent(); };
    board.addEventListener('pointerdown', e => { if (step !== 'place') return; e.preventDefault(); dragging = true; board.setPointerCapture(e.pointerId); placeAt(e); });
    board.addEventListener('pointermove', e => { if (step === 'place' && dragging) { e.preventDefault(); placeAt(e); } });
    const end = e => { dragging = false; if (board.hasPointerCapture(e.pointerId)) board.releasePointerCapture(e.pointerId); };
    board.addEventListener('pointerup', end); board.addEventListener('pointercancel', end);
    board.addEventListener('keydown', e => {
      if (step !== 'place') return;
      const t = e.shiftKey ? 5 : 1, d = { ArrowLeft: [-t, 0], ArrowRight: [t, 0], ArrowUp: [0, -t], ArrowDown: [0, t] }[e.key];
      if (d) { e.preventDefault(); pos = { x: clamp(pos.x + d[0], 0, 100), y: clamp(pos.y + d[1], 0, 100) }; moveCurrent(); }
    });
    render();
    // lời chúc trên Google Sheet: tải khi khách cuộn gần tới sổ lưu bút
    if (url && !sandbox && !TEST.wishes) {
      const load = async () => {
        loading = true; render();
        try { const r = await fetch(url); if (!r.ok) throw Error(); const arr = await r.json(); merge(Array.isArray(arr) ? arr : []); }
        catch { notice = 'Chưa thể tải sổ lưu bút. Vui lòng thử lại sau.'; }
        finally { loading = false; render(); }
      };
      if ('IntersectionObserver' in window) { const io = new IntersectionObserver(es => { if (es.some(x => x.isIntersecting)) { io.disconnect(); load(); } }, { rootMargin: '600px 0px' }); io.observe(sec); }
      else load();
    }
  }

  // Đọc cỡ từng ảnh album: ảnh ngang chiếm cả hàng theo đúng tỉ lệ (không bị cắt); ảnh dọc đi thành cặp: ảnh dọc lẻ
  // ghép với ảnh dọc gần nhất phía sau (đổi chỗ ít nhất), còn lẻ một ảnh cuối thì đứng giữa hàng. Trình xem ảnh theo thứ tự mới.
  function albumLayout(M, root) {
    const grid = $('.album-grid', root), items = grid ? $$('.album-item', grid) : []; if (!items.length) return;
    const ratio = it => new Promise(r => {
      const img = $('img', it); if (!img) return r(0);
      const p = new Image(); p.onload = () => r(p.naturalWidth / p.naturalHeight || 0); p.onerror = () => r(0); p.src = img.src;
    });
    Promise.all(items.map(ratio)).then(rs => {
      const rows = []; let open = null;
      items.forEach((it, i) => {
        if (rs[i] > 1) rows.push([[it, rs[i]]]);
        else if (open) { open.push([it, rs[i]]); open = null; }
        else rows.push(open = [[it, rs[i]]]);
      });
      const src = M.photos.album.slice(), order = [];
      rows.forEach(row => row.forEach(([it, r]) => {
        const kind = r > 1 ? 'wide' : row.length === 1 ? 'solo' : '';
        it.classList.toggle('album-item-wide', kind === 'wide'); it.classList.toggle('album-item-solo', kind === 'solo');
        it.style.aspectRatio = kind === 'wide' ? String(r) : ''; it.style.height = kind === 'wide' ? 'auto' : '';
        const btn = $('.album-button', it), n = order.length;
        order.push(src[+btn.dataset.i]); btn.dataset.i = n; btn.setAttribute('aria-label', `Xem ảnh ${n + 1} trong album`);
        const img = $('img', it); if (img) img.alt = `Ảnh album ${n + 1}`;
        grid.append(it);
      }));
      M.photos.album.splice(0, order.length, ...order);
    });
  }

  // ---------- Chạy ----------
  function start(C) {
    const M = model(C);
    window.__oliu = M;
    const app = $('#app');
    app.innerHTML = tidy(`<main class="shell"><div class="page">${heroHTML(M)}${coupleHTML(M)}${familyHTML(M)}${eventsHTML(M)}${albumHTML(M)}${giftHTML(M)}${countdownHTML(M)}${footerHTML(M)}</div></main>`);
    document.title = `${M.names[0]} & ${M.names[1]} — Thiệp cưới`;
    if (!preview && !TEST.noWelcome) app.insertAdjacentHTML('afterbegin', tidy(welcomeHTML(M)));
    unmark(app);
    focal(app);
    const refit = () => fitAll(app);
    refit(); document.fonts?.ready.then(refit); document.fonts?.addEventListener?.('loadingdone', refit);
    let rw = innerWidth; addEventListener('resize', () => { if (innerWidth !== rw) { rw = innerWidth; refit(); } });
    reveals(app);
    // Chọn bên (chế độ cả hai bên)
    $$('.side-switch button', app).forEach(b => b.addEventListener('click', () => {
      $$('.side-switch button', app).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      const old = $('.event-group', app); old.insertAdjacentHTML('afterend', tidy(eventGroupHTML(M, b.dataset.side))); const neu = old.nextElementSibling; old.remove(); unmark(neu); reveals(neu);
    }));
    albumLayout(M, app); countdown(M); lightbox(M); gifts(M); hearts();
    const sound = music(C);
    const welcome = $('.welcome', app);
    if (!welcome) { sound.open(false); playIntro(app); return; }
    document.body.style.overflow = 'hidden';
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    scrollTo(0, 0);
    const stage = $('.welcome-stage', welcome);
    let opening = false;
    const open = () => {
      if (opening) return; opening = true;
      welcome.classList.add('welcome-leaving'); stage.classList.add('welcome-opening'); stage.setAttribute('aria-disabled', 'true');
      setTimeout(() => { welcome.remove(); document.body.style.overflow = ''; sound.open(true); playIntro(app); autoScroll(); }, reduce ? 0 : 1550);
    };
    stage.addEventListener('click', open);
    stage.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  }

  if (!preview) start(window.CONTENT || {});
  else {
    const trusted = o => o === location.origin || /^https:\/\/([a-z0-9-]+\.)?longxphuonganh\.pages\.dev$/.test(o);
    addEventListener('message', function onMsg(e) {
      if (e.source !== parent || !trusted(e.origin) || e.data?.type !== 'content') return;
      removeEventListener('message', onMsg);
      start(e.data.content);
      const y = e.data.scroll || 0;
      scrollTo(0, y); document.fonts?.ready.then(() => scrollTo(0, y));
      let t = 0;
      addEventListener('scroll', () => { clearTimeout(t); t = setTimeout(() => parent.postMessage({ type: 'preview-scroll', y: scrollY }, e.origin), 150); }, { passive: true });
    });
    parent.postMessage({ type: 'preview-ready' }, '*');
  }
})();
