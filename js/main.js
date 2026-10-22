'use strict';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const guest = new URLSearchParams(location.search).get('to'); // ?to=Anh%20Huy -> "Kính gửi Anh Huy"
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let scene3d = null;
const celebrate = (x, y) => scene3d && scene3d.celebrate(x, y);

history.scrollRestoration = 'manual'; // luôn bắt đầu từ màn mở thiệp
scrollTo(0, 0);

/* ================= Hoa trang trí (Canvas 2D) ================= */
const staticFlorals = $$('canvas.florals:not([data-frame])');
const heroFrame = floralFrame($('.hero .florals'));
const vineArt = vine($('#vine'));
staticFlorals.forEach(drawFlorals);
document.fonts && document.fonts.ready.then(() => staticFlorals.forEach(drawFlorals)); // chiều cao section đổi khi font tải xong
let lastWidth = innerWidth;
addEventListener('resize', () => {
  if (innerWidth === lastWidth) return; // thanh địa chỉ mobile ẩn/hiện chỉ đổi chiều cao
  lastWidth = innerWidth;
  staticFlorals.forEach(drawFlorals); heroFrame.build(); vineArt.build();
  if (reduceMotion) requestAnimationFrame(frame); // không có vòng lặp chuyển động thì vẽ lại một lần
});

/* ================= Chuyển động theo khung hình: hoa đung đưa, parallax hero, đường lịch trình ================= */
const hero = $('.hero'), heroCanvas = $('.hero .florals'), heroContent = $('.hero-content'), timeline = $('.timeline');
let heroVisible = true, heroMostlyVisible = true, rsvpVisible = false;
new IntersectionObserver(([e]) => {
  heroVisible = e.isIntersecting; heroMostlyVisible = e.intersectionRatio > 0.4; syncFab();
}, { threshold: [0, 0.4] }).observe(hero);
function frame(ms) {
  const t = ms / 1000, y = scrollY;
  if (heroVisible) {
    heroFrame.draw(t);
    heroCanvas.style.transform = `translateY(${y * 0.3}px) scale(${1 + y / 4000})`;
    heroContent.style.transform = `translateY(${y * 0.15}px)`;
    heroContent.style.opacity = Math.max(0, 1 - y / (innerHeight * 0.85));
  }
  vineArt.draw(t);
  const r = timeline.getBoundingClientRect();
  timeline.style.setProperty('--progress', Math.min(1, Math.max(0, (innerHeight * 0.75 - r.top) / r.height)));
  if (!reduceMotion) requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* ================= Nội dung trang ================= */
if (guest) {
  $('#guest-name').textContent = guest;
  $('.guest').hidden = false;
  $('#rsvp-form').elements.name.value = guest;
}

// Hiện dần từng phần khi cuộn tới, các phần tử con lần lượt trễ nhau
const io = new IntersectionObserver(entries => entries.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
$$('.reveal').forEach(sec => { [...sec.children].forEach((el, i) => el.style.setProperty('--d', i)); io.observe(sec); });

// Lời ngỏ: tách từng chữ để chữ hiện dần từ mờ sang rõ
$$('.blur-text').forEach(p => {
  const words = p.textContent.trim().split(/\s+/);
  p.textContent = '';
  words.forEach((w, i) => { const s = document.createElement('span'); s.textContent = w; s.style.setProperty('--w', i); p.append(s, ' '); });
});

// Đếm ngược, số lật kiểu 3D mỗi khi đổi
const countdown = $('.countdown'), weddingAt = new Date(countdown.dataset.date);
function tick() {
  const s = Math.max(0, Math.floor((weddingAt - Date.now()) / 1000));
  const v = { d: Math.floor(s / 86400), h: Math.floor(s / 3600) % 24, m: Math.floor(s / 60) % 60, s: s % 60 };
  for (const el of $$('[data-unit]', countdown)) {
    const txt = String(v[el.dataset.unit]).padStart(2, '0');
    if (el.textContent !== txt) { el.textContent = txt; el.classList.remove('flip'); void el.offsetWidth; el.classList.add('flip'); }
  }
}
tick(); setInterval(tick, 1000);

// Lưu vào lịch: Google Calendar + file .ics (iPhone, Outlook)
const evTitle = 'Đám cưới Long & Phương Anh', evEnd = new Date(weddingAt.getTime() + 4 * 3600e3);
const evPlace = `${$('.venue-name').textContent}, ${$('.address').textContent}`;
const stamp = d => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const icsText = s => s.replace(/[\\;,]/g, m => '\\' + m);
$('#gcal').href = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(evTitle)
  + `&dates=${stamp(weddingAt)}/${stamp(evEnd)}&location=` + encodeURIComponent(evPlace);
$('#ics').href = URL.createObjectURL(new Blob([[
  'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//thiep-cuoi//VI', 'BEGIN:VEVENT',
  `UID:${stamp(weddingAt)}-long-phuonganh`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(weddingAt)}`, `DTEND:${stamp(evEnd)}`,
  `SUMMARY:${icsText(evTitle)}`, `LOCATION:${icsText(evPlace)}`, 'END:VEVENT', 'END:VCALENDAR',
].join('\r\n')], { type: 'text/calendar' }));

// Album: vòng ảnh 3D bằng CSS (rotateY + translateZ), tự xoay, kéo/vuốt để quay
(function galleryRing() {
  const stage = $('#ring-stage'), ring = $('#ring'), figs = $$('figure', ring), N = figs.length, step = 360 / N;
  const AUTO = reduceMotion ? 0 : 14;
  let angle = 0, vel = AUTO, drag = null, visible = false, radius = 0, last = 0;
  figs.forEach((f, i) => {
    const img = $('img', f), fix = () => document.fonts.ready.then(() => { img.src = placeholderPhoto(i); });
    if (img.complete && !img.naturalWidth) fix(); else img.addEventListener('error', fix, { once: true });
  });
  function layout() {
    radius = Math.round(figs[0].offsetWidth / 2 / Math.tan(Math.PI / N)) + 24;
    figs.forEach((f, i) => { f.style.transform = `rotateY(${i * step}deg) translateZ(${radius}px)`; });
  }
  function update(ms) {
    const dt = Math.min(0.05, (ms - last) / 1000 || 0); last = ms;
    if (!drag) { angle += vel * dt; vel += (AUTO - vel) * Math.min(1, dt * 1.2); }
    ring.style.transform = `translateZ(${-radius}px) rotateY(${angle}deg)`;
    figs.forEach((f, i) => { f.style.opacity = 0.3 + 0.7 * Math.max(0, Math.cos((i * step + angle) * Math.PI / 180)); });
    if (visible) requestAnimationFrame(update);
  }
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) { last = performance.now(); requestAnimationFrame(update); }
  }).observe(stage);
  stage.addEventListener('pointerdown', e => { drag = { x: e.clientX, a: angle, t: e.timeStamp }; stage.setPointerCapture(e.pointerId); });
  stage.addEventListener('pointermove', e => {
    if (!drag) return;
    const next = drag.a + (e.clientX - drag.x) * 0.35;
    vel = (next - angle) / Math.max(1, e.timeStamp - drag.t) * 1000; drag.t = e.timeStamp;
    angle = next;
  });
  for (const ev of ['pointerup', 'pointercancel']) stage.addEventListener(ev, () => { drag = null; });
  layout();
  addEventListener('resize', layout);
})();

// Hộp mừng cưới: mở ra thì nạp mã VietQR + bắn pháo giấy
const giftBtn = $('#gift-btn'), giftCards = $('#gift-cards');
giftBtn.addEventListener('click', () => {
  const opening = giftCards.hidden;
  giftCards.hidden = !opening;
  giftBtn.setAttribute('aria-expanded', opening);
  if (!opening) return;
  for (const card of $$('.bank-card')) {
    const { bank, account, name } = card.dataset, qr = $('.qr', card);
    // shortcut: ảnh QR lấy từ dịch vụ công khai img.vietqr.io (chuẩn VietQR/Napas); muốn không phụ thuộc bên ngoài thì thay bằng ảnh QR tải từ app ngân hàng
    if (!qr.src) qr.src = `https://img.vietqr.io/image/${bank}-${account}-qr_only.png?accountName=${encodeURIComponent(name)}&addInfo=${encodeURIComponent('Mung cuoi Long Phuong Anh')}`;
  }
  const r = giftBtn.getBoundingClientRect();
  celebrate(r.left + r.width / 2, r.top);
});
$$('.bank-card .copy').forEach(btn => btn.addEventListener('click', async () => {
  const account = btn.closest('.bank-card').dataset.account;
  try { await navigator.clipboard.writeText(account); btn.lastChild.textContent = ' Đã chép'; }
  catch { btn.lastChild.textContent = ' ' + account; } // trình duyệt chặn clipboard: hiện số để khách tự chép
  setTimeout(() => { btn.lastChild.textContent = ' Sao chép'; }, 2500);
}));

/* ================= Xác nhận tham dự ================= */
const form = $('#rsvp-form'), guestsField = $('#guests-field'), guestsInput = form.elements.guests;
const LABELS = { name: 'Họ tên', phone: 'Điện thoại', side: 'Khách của', attend: 'Tham dự', guests: 'Số người', diet: 'Lưu ý món ăn', song: 'Bài hát muốn nghe', message: 'Lời chúc' };
form.addEventListener('change', () => { guestsField.hidden = form.elements.attend.value === 'Không'; });
$$('[data-step]', form).forEach(b => b.addEventListener('click', () => {
  guestsInput.value = Math.min(10, Math.max(1, (parseInt(guestsInput.value, 10) || 1) + +b.dataset.step));
}));
form.addEventListener('submit', async e => {
  e.preventDefault();
  const d = new FormData(form), btn = $('button[type=submit]', form);
  const data = { ...Object.fromEntries(d), diet: d.getAll('diet').join(', '), guests: d.get('attend') === 'Có' ? d.get('guests') : '0' };
  btn.disabled = true;
  let saved = false;
  if (form.dataset.endpoint) { // Google Sheet qua Apps Script (xem rsvp-google-sheet.gs)
    try { await fetch(form.dataset.endpoint, { method: 'POST', mode: 'no-cors', body: new URLSearchParams(data) }); saved = true; }
    catch (err) { console.warn(err); }
  }
  if (!saved) { // chưa cấu hình (hoặc lỗi mạng): mở email soạn sẵn gửi cô dâu chú rể
    const body = Object.entries(LABELS).map(([k, label]) => `${label}: ${data[k] || '-'}`).join('\n');
    location.href = `mailto:${form.dataset.email}?subject=${encodeURIComponent('Xác nhận dự tiệc cưới - ' + data.name)}&body=${encodeURIComponent(body)}`;
  }
  form.hidden = true;
  const thanks = $('#thanks');
  $('#thanks-name').textContent = data.name;
  $('#thanks-msg').textContent = saved ? 'Chúng mình đã nhận được phản hồi của bạn ♥' : 'Bạn bấm “Gửi” trong email vừa mở để hoàn tất nhé ♥';
  thanks.hidden = false;
  const r = thanks.getBoundingClientRect();
  celebrate(r.left + r.width / 2, r.top + 40);
});

/* ================= Nút nổi: nhạc + xác nhận tham dự ================= */
const music = createMusic(), musicBtn = $('#music-btn'), fab = $('#rsvp-fab');
const setPlaying = on => { musicBtn.classList.toggle('playing', on); musicBtn.setAttribute('aria-pressed', on); };
musicBtn.addEventListener('click', () => setPlaying(music ? music.toggle() : false));
function syncFab() { fab.classList.toggle('hide', heroMostlyVisible || rsvpVisible); } // không che hero và form
new IntersectionObserver(([e]) => { rsvpVisible = e.isIntersecting; syncFab(); }, { threshold: 0.05 }).observe($('#rsvp'));

/* ================= Màn mở thiệp ================= */
function onOpen() { if (music) setPlaying(music.start()); $('#intro-ui').classList.add('fade'); }
function onReveal() { $('#intro').classList.add('fade'); }
function onDone() {
  for (const id of ['intro', 'intro-ui']) { const el = document.getElementById(id); if (el) el.remove(); }
  document.body.classList.remove('intro');
  musicBtn.hidden = !music;
  fab.hidden = false;
}

// Texture 3D có chữ nên chờ font (tối đa 3s); không có WebGL / three.js thì bỏ qua màn mở thiệp
const fontsReady = document.fonts ? Promise.all(['72px "Pinyon Script"', '60px "Great Vibes"', 'italic 30px "Cormorant Garamond"', '600 36px "Playfair Display"']
  .map(f => document.fonts.load(f, 'Long & Phương Anh 0123'))).catch(() => {}) : Promise.resolve();
Promise.race([fontsReady, new Promise(r => setTimeout(r, 3000))]).then(() => {
  try {
    if (!window.THREE) throw new Error('Không tải được three.js');
    scene3d = startScene({ guest, onOpen, onReveal, onDone });
    $('#open-btn').addEventListener('click', scene3d.open);
  } catch (err) {
    console.warn(err);
    onDone();
  }
});
