// node o-liu/tools/oltest.mjs: kiểm thử chức năng thiệp chính (mẫu Ô Liu) trong Chrome không giao diện.
// Mọi request ra ngoài (Google Sheet, VietQR, bản đồ) được giả lập; giờ đóng băng 10:00 03/11/2026 giờ Việt Nam.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, mkdtempSync } from 'node:fs';
import { join, resolve, extname, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
const REPO = resolve(process.argv[2] || join(dirname(fileURLToPath(import.meta.url)), '../..')), OUT = mkdtempSync(join(tmpdir(), 'oliu-test-'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CJS = readFileSync(join(REPO, 'content.js'), 'utf8'), C0 = JSON.parse(CJS.slice(CJS.indexOf('{'), CJS.lastIndexOf('}') + 1));
const ENDPOINT = 'https://script.google.com/macros/s/THU-NGHIEM/exec';
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=';
const SAMPLE = Array.from({ length: 7 }, (_, i) => ({ id: 'mau' + i, name: 'Khách ' + (i + 1), message: 'Chúc mừng hạnh phúc ' + (i + 1), time: Date.UTC(2026, 9, 20 + i), sig: 'data:image/png;base64,' + PNG, x: 20 + i * 9, y: 30 + i * 5, s: 1.5, side: i % 2 ? 'bride' : 'groom' }));
let content = null, fakeMusic = null; // thay content.js / js/music.js theo từng phần
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.otf': 'font/otf' };
const server = createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const js = b => { res.writeHead(200, { 'content-type': types['.js'], 'cache-control': 'no-store' }); res.end(b); };
  if (p === '/content.js' && content) return js(`window.CONTENT = ${JSON.stringify(content)};`);
  if (p === '/js/music.js' && fakeMusic) return js(fakeMusic);
  if (p === '/__blank') { res.writeHead(200, { 'content-type': types['.html'] }); return res.end('<!doctype html><title>trống</title>'); }
  if (p === '/__preview.html') { // giống trang quản trị: khung xem thử nhận nội dung qua postMessage
    res.writeHead(200, { 'content-type': types['.html'] });
    return res.end(`<!doctype html><iframe id="f" src="/?preview=1&r=1" style="width:390px;height:844px;border:0"></iframe><script>
      addEventListener('message', e => { if (e.data?.type === 'preview-ready') document.getElementById('f').contentWindow.postMessage({ type: 'content', content: ${JSON.stringify({ ...C0, groom: { ...C0.groom, name: 'Tên Xem Thử' } })}, scroll: 0 }, location.origin); });</script>`);
  }
  for (const f of [join(REPO, p), join(REPO, p, 'index.html')]) { try { const b = readFileSync(f); res.writeHead(200, { 'content-type': types[extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' }); return res.end(b); } catch {} }
  res.writeHead(404); res.end();
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:' + server.address().port, HOST = new URL(BASE).host;
const port = 10300 + Math.floor(Math.random() * 90);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${join(OUT, '.profile')}`, '--no-first-run', '--autoplay-policy=no-user-gesture-required', 'about:blank'], { stdio: 'ignore' });
let tab; for (let i = 0; i < 60 && !tab; i++) { await sleep(250); try { tab = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page'); } catch {} }
const ws = new WebSocket(tab.webSocketDebuggerUrl); await new Promise(r => ws.addEventListener('open', r, { once: true }));
let seq = 0; const pend = new Map(), errors = [], posts = [], gets = [];
const send = (method, params = {}) => new Promise(r => { const id = ++seq; pend.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description?.split('\n')[0]);
  if (m.method === 'Fetch.requestPaused') {
    const { requestId, request: q } = m.params, img = /vietqr|\.png|\.jpg/.test(q.url);
    if (q.url.startsWith(ENDPOINT)) { if (q.method === 'POST') posts.push(Object.fromEntries(new URLSearchParams(q.postData || ''))); else gets.push(q.url); }
    const body = q.url.startsWith(ENDPOINT) && q.method === 'GET' ? JSON.stringify(SAMPLE) : img ? PNG : Buffer.from('ok').toString('base64');
    send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'content-type', value: img ? 'image/png' : q.method === 'GET' && q.url.startsWith(ENDPOINT) ? 'application/json' : 'text/plain' }, { name: 'access-control-allow-origin', value: '*' }], body: img ? PNG : q.url.startsWith(ENDPOINT) && q.method === 'GET' ? Buffer.from(body).toString('base64') : body });
  }
});
const ev = async x => { const r = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || x.slice(0, 80)); return r.result.result.value; };
const mouse = (type, x, y, buttons = 0) => send('Input.dispatchMouseEvent', { type, x, y, button: type === 'mouseMoved' ? 'none' : 'left', buttons, clickCount: 1 });
const tap = async (x, y) => { await mouse('mouseMoved', x, y); await mouse('mousePressed', x, y, 1); await mouse('mouseReleased', x, y); };
const center = async sel => JSON.parse(await ev(`JSON.stringify((() => { const e = document.querySelector(${JSON.stringify(sel)}); e.scrollIntoView({ block: 'center', behavior: 'instant' }); const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2, r.width, r.height]; })())`));
const click = sel => ev(`document.querySelector(${JSON.stringify(sel)}).click()`);
const text = sel => ev(`[...document.querySelectorAll(${JSON.stringify(sel)})].map(e => e.textContent.replace(/\\s+/g, ' ').trim())`);
const until = async (x, ms = 5000) => { for (let t = 0; t < ms; t += 100) { if (await ev(x).catch(() => false)) return true; await sleep(100); } return false; };
await send('Page.enable'); await send('Runtime.enable'); await send('Fetch.enable', { patterns: [{ urlPattern: 'https://*' }] });
await send('Emulation.setTimezoneOverride', { timezoneId: 'Asia/Ho_Chi_Minh' });
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => { const T = Date.UTC(2026, 10, 3, 3, 0, 0), D = Date; class FD extends D { constructor(...a) { a.length ? super(...a) : super(T); } static now() { return T; } } FD.UTC = D.UTC; FD.parse = D.parse; window.Date = FD;
  const t = sessionStorage.getItem('oliu-test'); if (t) window.OLIU_TEST = JSON.parse(t); })();` });
let testOpts = null;
const open = async (path, opts = null, fresh = false) => { // opts → window.OLIU_TEST (qua sessionStorage, áp dụng trước khi trang chạy); fresh: xoá localStorage
  testOpts = opts;
  await send('Page.navigate', { url: BASE + '/__blank' }); await until(`location.pathname === '/__blank' && document.readyState === 'complete'`, 3000);
  if (fresh) await ev(`localStorage.clear(); 1`);
  await ev(`${opts ? `sessionStorage.setItem('oliu-test', ${JSON.stringify(JSON.stringify(opts))})` : `sessionStorage.removeItem('oliu-test')`}; 1`).catch(() => {});
  await send('Page.navigate', { url: BASE + path });
  await until(`!!document.querySelector('#app main')`, 8000); await sleep(400);
};
const results = []; let fails = 0;
const check = (n, ok, info = '') => { results.push(`${ok ? 'ĐẠT ' : 'LỖI '} ${n}${info ? ' — ' + info : ''}`); if (!ok) fails++; };
const N1 = C0.groom.name, N2 = C0.bride.name;

// ---------- 1. Mở thiệp: phong bì, nhạc, tự cuộn ----------
await open('/?to=Anh%20Minh');
check('phong bì: lời mời đúng tên khách (?to=)', JSON.stringify(await text('.welcome-guest')) === '["Anh Minh"]', JSON.stringify(await text('.welcome-guest')));
check('phong bì: tên cô dâu chú rể, tiêu đề trang', (await text('.welcome-names'))[0] === `${N1} & ${N2}` && (await ev('document.title')) === `${N1} & ${N2} — Thiệp cưới`, await ev('document.title'));
check('phong bì: khoá cuộn, chưa có nút nhạc', (await ev(`document.body.style.overflow === 'hidden' && !document.querySelector('.music-box')`)) === true);
const [wx, wy] = await center('.welcome-stage'); await tap(wx, wy);
const t0 = Date.now();
check('chạm phong bì: bắt đầu mở', (await ev(`!!document.querySelector('.welcome.welcome-leaving')`)) === true);
await sleep(1200);
check('1,2 giây: phong bì vẫn còn, chưa hiện nút nhạc', (await ev(`!!document.querySelector('.welcome') && !document.querySelector('.music-box')`)) === true);
await until(`!document.querySelector('.welcome')`, 2000); const tClose = Date.now() - t0;
check('phong bì đóng sau ~1,55 giây', tClose >= 1450 && tClose <= 1900, tClose + 'ms');
check('đóng phong bì: mở khoá cuộn, hiện nút nhạc đang phát', (await ev(`document.body.style.overflow === '' && !!document.querySelector('.music-box.playing') && document.querySelector('.music-btn').title === 'Tắt nhạc' && !document.querySelector('.music-tip.show')`)) === true);
await sleep(1100); const y1 = await ev('scrollY');
await sleep(1200); const y2 = await ev('scrollY');
check('tự cuộn: chưa cuộn trong 1,5 giây đầu, sau đó cuộn xuống', y1 === 0 && y2 > 10, `${y1} → ${y2}`);
await ev(`dispatchEvent(new WheelEvent('wheel')); 1`); await sleep(100); const y3 = await ev('scrollY'); await sleep(1000);
check('lăn chuột: tự cuộn dừng', Math.abs((await ev('scrollY')) - y3) <= 1);
await click('.music-btn');
check('bấm nút nhạc: tắt nhạc, không hiện gợi ý (nhạc đã từng phát)', (await ev(`!document.querySelector('.music-box.playing') && document.querySelector('.music-btn').title === 'Bật nhạc' && !document.querySelector('.music-tip.show')`)) === true);
check('không lỗi JavaScript (mở thiệp)', !errors.length, errors.join(' | '));

// ---------- 2. Nội dung nhà trai ----------
await open('/?to=Anh%20Minh', { noWelcome: true, noAutoScroll: true, post: null });
await ev(`window.__posts = []; 1`);
check('phần đầu: tên, ngày cưới', (await text('.hero-names p[aria-hidden]'))[0] === `${N1} & ${N2}` && (await text('.hero-date'))[0] === '17.11.2026', (await text('.hero-date')).join());
check('lịch: tháng 11/2026, đánh dấu ngày 17', (await text('.calendar-title'))[0] === 'Tháng 11 - 2026' && JSON.stringify(await text('.calendar-marked')) === '["17"]', JSON.stringify(await text('.calendar-marked')));
const evn = await text('#invitation .event-name'), lun = await text('#invitation .event-lunar');
check('nhà trai: Lễ Thành Hôn + Tiệc Cưới', JSON.stringify(evn) === '["Lễ Thành Hôn","Tiệc Cưới"]', JSON.stringify(evn));
check('ngày âm lịch 17/11/2026 = ngày 9 tháng 10 năm Bính Ngọ', lun.every(t => t === '(Nhằm ngày 9 tháng 10 năm Bính Ngọ)'), JSON.stringify(lun));
check('địa điểm tiệc + nút bản đồ', (await text('#invitation .event-venue')).includes(`Tại ${C0.trai.venue}`) && (await ev(`[...document.querySelectorAll('#invitation .map-button')].every(a => /^https:\\/\\//.test(a.href) && a.target === '_blank')`)) === true);
check('đếm ngược: còn 14 ngày 00 giờ 30 phút', JSON.stringify(await text('[data-cd]')) === '["14","00","30","00"]', JSON.stringify(await text('[data-cd]')));
check('album: 18 ảnh', (await ev(`document.querySelectorAll('.album-button').length`)) === 18);
await click('.album-button');
check('bấm ảnh album: mở trình xem 1 / 18', await until(`document.querySelector('.lb-count')?.textContent === '1 / 18'`, 2000), (await text('.lb-count')).join());
await ev(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); 1`);
check('phím → : ảnh 2 / 18', await until(`document.querySelector('.lb-count')?.textContent === '2 / 18'`, 1500), (await text('.lb-count')).join());
await ev(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); 1`);
check('Esc: đóng trình xem, mở khoá cuộn', await until(`!document.querySelector('.lb') && document.body.style.overflow === ''`, 1500));
check('chưa có số tài khoản: ẩn phần mừng cưới', (await ev(`!document.querySelector('#wedding-gift')`)) === true);
// xác nhận tham dự (chưa có Google Sheet: mở thư điện tử)
await ev(`(() => { const f = document.querySelector('#rsvp form'); f.name.value = ''; f.requestSubmit(); return 1; })()`);
check('xác nhận tham dự: bỏ trống tên thì không gửi', (await ev(`!document.querySelector('#rsvp .form-notice') && document.activeElement === document.querySelector('#rsvp form').name`)) === true);
await ev(`(() => { const f = document.querySelector('#rsvp form'); f.name.value = 'Anh Minh'; f.querySelector('[data-step="1"]').click(); f.requestSubmit(); return 1; })()`);
check('xác nhận tham dự: báo đã ghi nhận', await until(`document.querySelector('#rsvp .form-notice')?.textContent === 'Đã ghi nhận! Hẹn gặp bạn trong ngày vui.'`, 2000), (await text('#rsvp .form-notice')).join());
// sổ lưu bút (chưa có Google Sheet: lưu trong máy khách)
check('sổ lưu bút trống', (await text('.wishes-empty'))[0] === 'Hãy là người đầu tiên ký vào sổ lưu bút.');
async function signWish(msg) {
  await click('[data-gb="start"]'); await until(`!!document.querySelector('.signature-canvas')`, 2000); await sleep(150);
  const [cx, cy, cw, ch] = await center('.signature-canvas');
  await mouse('mousePressed', cx - cw / 3, cy, 1);
  for (let i = 1; i <= 24; i++) { await mouse('mouseMoved', cx - cw / 3 + (cw * 2 / 3) * i / 24, cy + Math.sin(i / 3) * ch / 4, 1); await sleep(18); }
  await mouse('mouseReleased', cx + cw / 3, cy);
  await click('[data-gb="next"]');
  const ok = await until(`!!document.querySelector('.board-signature-current')`, 2000);
  const [bx, by, bw, bh] = await center('.guestbook-board'); await tap(bx + bw / 4, by - bh / 5);
  await click('[data-gb="write"]'); await until(`!!document.querySelector('[data-f="message"]')`, 2000);
  await ev(`(() => { const t = document.querySelector('[data-f="message"]'); t.value = ${JSON.stringify(msg)}; t.dispatchEvent(new Event('input', { bubbles: true })); return 1; })()`);
  await click('[data-gb="send"]');
  return ok;
}
check('ký tên → đặt chữ ký lên ảnh', await signWish('Chúc hai bạn trăm năm hạnh phúc!'));
check('gửi lời chúc: báo đã gửi, lời chúc của bạn hiện đầu danh sách', await until(`document.querySelector('#guestbook .form-notice')?.textContent === 'Lời chúc đã được gửi. Cảm ơn bạn thật nhiều!'`, 3000) && (await ev(`!!document.querySelector('.wish-own img[src^="data:image/png;base64,"]') && document.querySelector('.wish-own strong').textContent === 'Anh Minh' && !!document.querySelector('.signed-note')`)) === true, (await text('#guestbook .form-notice')).join());
check('chữ ký nằm trên bảng, có nút tải ảnh', (await ev(`document.querySelectorAll('.board-signature').length === 1 && !!document.querySelector('.board-download') && document.querySelector('.guestbook-board-count').textContent === '1 chữ ký'`)) === true);
const stored = JSON.parse(await ev(`JSON.stringify([localStorage.getItem('ol-own-${HOST}'), JSON.parse(localStorage.getItem('ol-wishes-${HOST}') || '[]').length])`));
check('lời chúc lưu trong máy khách', !!stored[0] && stored[1] === 1, JSON.stringify(stored));
await open('/?to=Anh%20Minh', { noWelcome: true, noAutoScroll: true });
check('tải lại trang: vẫn thấy lời chúc của mình', (await ev(`!!document.querySelector('.wish-own') && !!document.querySelector('.signed-note') && !document.querySelector('[data-gb="start"]')`)) === true);
await click('[data-gb="edit"]'); await until(`!!document.querySelector('[data-f="message"]')`, 2000);
check('sửa lời chúc: hiện lời chúc cũ', (await ev(`document.querySelector('[data-f="message"]').value`)) === 'Chúc hai bạn trăm năm hạnh phúc!');
await ev(`(() => { const t = document.querySelector('[data-f="message"]'); t.value = 'Đã sửa lời chúc'; t.dispatchEvent(new Event('input', { bubbles: true })); return 1; })()`); await click('[data-gb="send"]');
check('cập nhật lời chúc', await until(`document.querySelector('#guestbook .form-notice')?.textContent === 'Lời chúc của bạn đã được cập nhật.' && document.querySelector('.wish-own p')?.textContent.includes('Đã sửa lời chúc')`, 3000), (await text('#guestbook .form-notice')).join());
check('không lỗi JavaScript (nhà trai)', !errors.length, errors.join(' | '));

// ---------- 3. Nhà gái, cả hai bên ----------
await open('/?nha=gai', { noWelcome: true, noAutoScroll: true });
check('nhà gái: tên cô dâu trước', (await text('.hero-names p[aria-hidden]'))[0] === `${N2} & ${N1}`);
check('nhà gái: Lễ Vu Quy 17/11 (ngày 9/10 âm), Tiệc Cưới 16/11 (ngày 8/10 âm)', JSON.stringify(await text('#invitation .event-name')) === '["Lễ Vu Quy","Tiệc Cưới"]' && JSON.stringify(await text('#invitation .event-lunar')) === '["(Nhằm ngày 9 tháng 10 năm Bính Ngọ)","(Nhằm ngày 8 tháng 10 năm Bính Ngọ)"]', JSON.stringify(await text('#invitation .event-lunar')));
check('nhà gái: lịch đánh dấu 16 và 17', JSON.stringify(await text('.calendar-marked')) === '["16","17"]', JSON.stringify(await text('.calendar-marked')));
await open('/?nha=chung', { noWelcome: true, noAutoScroll: true });
check('cả hai bên: nút chọn Nhà gái / Nhà trai', JSON.stringify(await text('.side-switch button')) === '["Nhà gái","Nhà trai"]' && JSON.stringify(await text('#invitation .event-name')) === '["Lễ Vu Quy","Tiệc Cưới"]');
await click('.side-switch button[data-side="trai"]');
check('chọn Nhà trai: đổi sang lễ nhà trai', JSON.stringify(await text('#invitation .event-name')) === '["Lễ Thành Hôn","Tiệc Cưới"]' && (await ev(`document.querySelector('.side-switch button[data-side="trai"]').getAttribute('aria-pressed')`)) === 'true');
check('cả hai bên: xác nhận tham dự hỏi khách nhà nào', (await ev(`document.querySelectorAll('input[name="ol-guest-side"]').length`)) === 2);

// ---------- 4. Có Google Sheet + số tài khoản ----------
content = { ...C0, rsvp: { ...C0.rsvp, endpoint: ENDPOINT }, groom: { ...C0.groom, bank: { ...C0.groom.bank, account: '0123456789' } }, bride: { ...C0.bride, bank: { code: 'VCB', name: 'Vietcombank', account: '9876543210', holder: 'NGUYEN PHUONG ANH' } } };
await open('/?nha=chung&to=Lan', { noWelcome: true, noAutoScroll: true }, true);
check('mừng cưới: 2 mã QR (VietQR)', (await ev(`document.querySelectorAll('.gift-qr').length === 2 && [...document.querySelectorAll('.gift-qr img')].some(i => i.src.startsWith('https://img.vietqr.io/image/ICB-0123456789-qr_only.png'))`)) === true);
await click('.gift-qr');
check('bấm mã QR: mở hộp phóng to', await until(`!!document.querySelector('.dlg.qr-dialog [data-qr]')`, 2000));
await ev(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); 1`);
check('Esc: đóng hộp QR', await until(`!document.querySelector('.dlg')`, 2000));
check('chưa cuộn tới sổ lưu bút: chưa tải lời chúc', gets.length === 0);
await center('#guestbook');
check('cuộn tới sổ lưu bút: tải lời chúc từ Google Sheet', await until(`document.querySelector('.wishes-head span')?.textContent === '7 lời chúc'`, 4000) && gets.length === 1, (await text('.wishes-head span')).join());
check('hiện 5 lời chúc + nút xem thêm, 7 chữ ký trên bảng', (await ev(`document.querySelectorAll('.wish').length === 5 && !!document.querySelector('.load-more') && document.querySelectorAll('.board-signature').length === 7`)) === true);
await click('.load-more');
check('xem thêm: đủ 7 lời chúc', (await ev(`document.querySelectorAll('.wish').length`)) === 7);
await signWish('Chúc mừng đám cưới!');
await until(`document.querySelector('#guestbook .form-notice')?.textContent === 'Lời chúc đã được gửi. Cảm ơn bạn thật nhiều!'`, 3000);
const w = posts.find(p => p.type === 'wish') || {};
check('gửi lời chúc lên Google Sheet: đủ trường', w.name === 'Lan' && w.message === 'Chúc mừng đám cưới!' && /^w[a-z0-9]+$/.test(w.id) && w.sig?.startsWith('data:image/png;base64,') && +w.x > 0 && +w.y > 0 && w.s === '1.5' && w.side === 'groom' && /^[a-z0-9]{24}$/.test(w.key), JSON.stringify({ ...w, sig: (w.sig || '').length }));
await ev(`(() => { const f = document.querySelector('#rsvp form'); f.querySelector('input[name="ol-guest-side"][value="bride"]').checked = true; f.requestSubmit(); return 1; })()`);
await until(`!!document.querySelector('#rsvp .form-notice')`, 3000);
const r = posts.find(p => p.type === 'rsvp') || {};
check('xác nhận tham dự lên Google Sheet', r.name === 'Lan' && r.attend === 'Có' && r.guests === '1' && r.message === 'Khách nhà gái', JSON.stringify(r));
check('không lỗi JavaScript (Google Sheet)', !errors.length, errors.join(' | '));
content = null;

// ---------- 5. Khung xem thử của trang quản trị ----------
await send('Page.navigate', { url: BASE + '/__preview.html' }); await sleep(2500);
const pv = JSON.parse(await ev(`JSON.stringify((() => { const d = document.getElementById('f').contentDocument; return [d.querySelector('.hero-names p[aria-hidden]')?.textContent, !!d.querySelector('.welcome'), !!d.querySelector('.music-box')]; })())`));
check('xem thử: hiện nội dung gửi từ trang quản trị, không phong bì, không nhạc', pv[0] === `Tên Xem Thử & ${N2}` && !pv[1] && !pv[2], JSON.stringify(pv));

// ---------- 6. Trình duyệt chặn tự phát nhạc: gợi ý "Bấm để nghe nhạc" ----------
fakeMusic = `function createMusic() { return { prime() { window.__primed = (window.__primed || 0) + 1; }, play() { window.__plays = (window.__plays || 0) + 1; return Promise.resolve(window.__allow === true); }, pause() {} }; }`;
await open('/', { noAutoScroll: true });
const [sx, sy] = await center('.welcome-stage'); await tap(sx, sy);
await until(`!document.querySelector('.welcome')`, 2500);
check('chạm phong bì: chỉ mồi âm thanh; phong bì đóng mới phát', (await ev(`window.__primed >= 1 && window.__plays >= 1`)) === true);
await sleep(300);
check('phát không được: nút nhạc tắt, chưa hiện gợi ý ngay', (await ev(`!document.querySelector('.music-box.playing') && !document.querySelector('.music-tip.show')`)) === true);
await sleep(5000);
check('5 giây sau: vẫn chưa hiện gợi ý', (await ev(`!document.querySelector('.music-tip.show')`)) === true);
check('6 giây không thao tác: hiện gợi ý + vòng sáng', await until(`!!document.querySelector('.music-tip.show') && !!document.querySelector('.music-ring')`, 2500));
await ev(`window.__allow = true; 1`); await tap(200, 300);
check('chạm vào trang: tắt gợi ý, phát nhạc', await until(`!document.querySelector('.music-tip.show') && !document.querySelector('.music-ring') && !!document.querySelector('.music-box.playing')`, 2000));
fakeMusic = null;
check('không lỗi JavaScript (xem thử, nhạc)', !errors.length, errors.join(' | '));

console.log(results.join('\n')); console.log(`\n${results.length - fails}/${results.length} đạt`);
ws.close(); chrome.kill(); server.close(); process.exit(fails ? 1 : 0);
