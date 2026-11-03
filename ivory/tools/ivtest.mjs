// node ivory/tools/ivtest.mjs: kiểm thử chức năng thiệp Ivory (bản thật, nội dung tiếng Việt) trong Chrome không giao diện
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { join, resolve, extname, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
const REPO = resolve(process.argv[2] || join(dirname(fileURLToPath(import.meta.url)), '../..')), OUT = mkdtempSync(join(tmpdir(), 'ivory-test-')); // ảnh chụp, hồ sơ Chrome: thư mục tạm
const sleep = ms => new Promise(r => setTimeout(r, ms));
const BASE_CONTENT = readFileSync(join(REPO, 'content.js'), 'utf8');
const C0 = JSON.parse(BASE_CONTENT.slice(BASE_CONTENT.indexOf('{'), BASE_CONTENT.lastIndexOf('}') + 1));
let contentOverride = null; // nội dung thử (thay content.js khi cần)
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/content.js' && contentOverride) { res.writeHead(200, { 'content-type': types['.js'], 'cache-control': 'no-store' }); return res.end(`window.CONTENT = ${JSON.stringify(contentOverride)};`); }
  for (const f of [join(REPO, p), join(REPO, p, 'index.html'), join(REPO, p) + '.html']) { // như Cloudflare Pages: /ivory/page-2 -> page-2.html
    try { const b = readFileSync(f); res.writeHead(200, { 'content-type': types[extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' }); return res.end(b); } catch {}
  }
  res.writeHead(404); res.end();
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:' + server.address().port;
const port = 10100 + Math.floor(Math.random() * 90);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${join(OUT, '.profile')}`, '--no-first-run', '--autoplay-policy=no-user-gesture-required', 'about:blank'], { stdio: 'ignore' });
let tab; for (let i = 0; i < 60 && !tab; i++) { await sleep(250); try { tab = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page'); } catch {} }
const ws = new WebSocket(tab.webSocketDebuggerUrl); await new Promise(r => ws.addEventListener('open', r, { once: true }));
let seq = 0; const pend = new Map(), errors = [], posts = [], extReq = [];
ws.addEventListener('message', async e => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description?.split('\n')[0]);
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map(a => a.value ?? a.description).join(' '));
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error' && !/maps\.google|gstatic|googleapis|google\.com/.test(m.params.entry.url || '')) errors.push('log: ' + m.params.entry.text + ' ' + (m.params.entry.url || ''));
  if (m.method === 'Fetch.requestPaused') { // chặn mọi request ra ngoài: ghi lại, trả lời giả
    const { requestId, request } = m.params; extReq.push(request.method + ' ' + request.url);
    if (request.method === 'POST') posts.push({ url: request.url, body: request.postData });
    const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=';
    const isImg = /vietqr|\.png|\.jpg/.test(request.url);
    send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'content-type', value: isImg ? 'image/png' : 'text/html' }, { name: 'access-control-allow-origin', value: '*' }], body: isImg ? png : Buffer.from('<html><body>ok</body></html>').toString('base64') });
  }
});
const send = (method, params = {}) => new Promise(r => { const id = ++seq; pend.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
const ev = async x => { const r = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description); return r.result.result.value; };
await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');
await send('Fetch.enable', { patterns: [{ urlPattern: 'https://*' }] });
async function open(path, w = 390, h = 844) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 768 });
  await send('Page.navigate', { url: BASE + path });
  for (let i = 0; i < 60; i++) { await sleep(150); if (await ev(`document.readyState === 'complete' && document.documentElement.classList.contains('ready')`).catch(() => false)) break; }
  await sleep(300);
}
const results = []; let fails = 0;
const lo = v => JSON.stringify(v).toLocaleLowerCase('vi');
const eq = (a, b) => lo(a) === lo(b);
const check = (name, ok, info = '') => { results.push(`${ok ? 'ĐẠT ' : 'LỖI '} ${name}${info ? ' — ' + info : ''}`); if (!ok) fails++; };

// ---------- Trang 1 ----------
for (const [w, h] of [[390, 844], [1440, 900]]) {
  errors.length = 0;
  await open('/ivory/?to=Anh%20T%C3%BA', w, h);
  const p1 = await ev(`(() => { const a = document.querySelector('a.open'); const r = a.getBoundingClientRect();
    return { title: document.title, href: a.getAttribute('href'), tap: [r.left, r.top, r.width, r.height], imgsBad: [...document.images].filter(i => !i.naturalWidth).length,
      invite: document.querySelector('[data-k="p1.invite"]').innerText, mono: document.querySelector('[data-k="p1.mono"]').innerText,
      hScroll: document.documentElement.scrollWidth > innerWidth }; })()`);
  check(`[${w}] trang 1: tiêu đề`, p1.title === 'Ngọc Long & Phương Anh — Thiệp cưới', p1.title);
  check(`[${w}] trang 1: chữ mời`, eq(p1.invite.replace(/\s+/g, ' '), 'Trân trọng kính mời!'), JSON.stringify(p1.invite));
  check(`[${w}] trang 1: dấu sáp có chữ cái đầu tên`, p1.mono.replace(/\s/g, '') === 'LA', JSON.stringify(p1.mono));
  check(`[${w}] trang 1: phong bì dẫn sang trang 2 giữ ?to=`, p1.href === 'page-2?to=Anh%20T%C3%BA', p1.href);
  check(`[${w}] trang 1: ảnh tải đủ`, p1.imgsBad === 0, p1.imgsBad + ' ảnh lỗi');
  check(`[${w}] trang 1: không cuộn ngang`, !p1.hScroll);
  await send('Page.captureScreenshot', { format: 'png' }).then(r => writeFileSync(join(OUT, `p1-${w}.png`), Buffer.from(r.result.data, 'base64')));
  check(`[${w}] trang 1: không lỗi console`, !errors.length, errors.join(' | '));
}
// chạm phong bì -> trang 2
await open('/ivory/', 390, 844);
await ev(`document.querySelector('a.open').click()`); await sleep(1500);
check('chạm phong bì mở trang 2', /\/ivory\/page-2$/.test(await ev('location.pathname')), await ev('location.pathname'));

// ---------- Trang 2: nội dung thật ----------
const textFit = `(() => { const bad = [];
  for (const el of document.querySelectorAll('.el.t:not([hidden])')) { const tb = el.querySelector('.tb'), ti = el.querySelector('.ti'), box = el.getBoundingClientRect();
    if (!box.width) continue;
    const wrap = ti.classList.contains('wrap');
    for (const p of ti.querySelectorAll('p')) { const r = document.createRange(); r.selectNodeContents(p); const b = r.getBoundingClientRect();
      if (b.width && !wrap && (b.width > box.width * 1.22 + 2)) bad.push(el.dataset.k + ' rộng ' + b.width.toFixed(0) + '>' + box.width.toFixed(0)); }
    const tr = ti.getBoundingClientRect(); if (tr.height > box.height * 1.2 + 3) bad.push(el.dataset.k + ' cao ' + tr.height.toFixed(0) + '>' + box.height.toFixed(0)); }
  return bad; })()`;
const T = k => `(document.querySelector('[data-k="${k}"]')?.innerText || '').replace(/\\s+/g, ' ').trim()`;
for (const [w, h] of [[360, 740], [390, 844], [768, 1024], [1440, 900]]) {
  errors.length = 0;
  await open('/ivory/page-2', w, h);
  const r = await ev(`({ names: ${T('s0.names')}, date: ${T('s0.date')}, addr: ${T('s0.addr')}, venue: ${T('s2.venue')}, t1: [${T('s3.t2')}, ${T('s3.l2')}], t2: [${T('s3.t3')}, ${T('s3.l3')}],
    rowsShown: [...document.querySelectorAll('[data-k]')].filter(e => e.dataset.k.length === 5 && e.dataset.k.startsWith('s3.t') && !e.hidden).length, registryHidden: document.querySelector('[data-k="s4.registry"]').hidden && document.querySelector('[data-k="btn.registry"]').hidden,
    view: document.querySelector('a[data-k="s2.view"]')?.href, book: document.querySelector('a[data-k="s4.book"]')?.getAttribute('href'), rsvpTarget: !!document.getElementById('rsvp'),
    map: document.querySelector('[data-k="photo.venue"] iframe')?.src || '', music: document.querySelector('.music')?.disabled,
    imgsBad: [...document.images].filter(i => !i.naturalWidth && !i.closest('dialog')).map(i => i.src.split('/').pop()), hScroll: document.documentElement.scrollWidth > innerWidth,
    })`);
  const vi = await ev(`(async () => { const VI = 'ạảãáàăắằẳẵặâấầẩẫậđêếềểễệôốồổỗộơớờởỡợưứừửữựĐƠƯẠẢÃÁÀĂẮẰẲẴẶÂẤẦẨẪẬÊẾỀỂỄỆÔỐỒỔỖỘỚỜỞỠỢỨỪỬỮỰÌÍỈĨỊÒÓỎÕỌÙÚỦŨỤỲÝỶỸỴìíỉĩịòóỏõọùúủũụỳýỷỹỵ', c = document.createElement('canvas').getContext('2d'), bad = [];
    for (const [f, wt] of [['Iv Script', 400], ['Iv Display', 400], ['Iv Serif', 400], ['Iv Serif', 200], ['Iv Caps', 400], ['Iv Cardo', 400], ['Iv Young', 400], ['Iv Italic', 400], ['Iv Mono', 400]]) {
      await document.fonts.load(wt + ' 40px "' + f + '"', VI); c.font = wt + ' 40px "' + f + '", monospace'; const a = c.measureText(VI).width; c.font = wt + ' 40px "' + f + '", serif'; const b = c.measureText(VI).width;
      if (Math.abs(a - b) > 0.01) bad.push(f + ' ' + wt); } return bad; })()`);
  check(`[${w}] tên cô dâu chú rể`, r.names === 'Ngọc Long và Phương Anh', r.names);
  check(`[${w}] ngày giờ tiệc nhà trai`, r.date === '17 tháng 11 năm 2026 vào lúc 16 giờ 30', r.date);
  check(`[${w}] địa chỉ tiệc`, r.addr === 'Nhà Văn Hóa Yên Phú, Thôn Yên Phú, Xã Đa Phúc, Hà Nội', r.addr);
  check(`[${w}] nơi đãi tiệc`, eq(r.venue, 'Nhà Văn Hóa Yên Phú'), r.venue);
  check(`[${w}] lịch trình 2 mốc ở giữa thẻ`, r.rowsShown === 2 && eq(r.t1.join(' '), '10:30 Lễ thành hôn') && eq(r.t2.join(' '), '16:30 Tiệc cưới'), JSON.stringify([r.rowsShown, r.t1, r.t2]));
  check(`[${w}] chưa có tài khoản: ẩn nút mừng cưới`, r.registryHidden);
  check(`[${w}] nút xem bản đồ mở link chỉ đường`, r.view === C0.trai.directions, r.view);
  check(`[${w}] nút xác nhận trỏ tới form`, r.book === '#rsvp' && r.rsvpTarget);
  check(`[${w}] chưa có ảnh nơi tiệc: hiện bản đồ đúng toạ độ`, r.map.includes(encodeURIComponent(C0.trai.map)), r.map);
  check(`[${w}] chưa có nhạc: nút máy hát tắt`, r.music === true);
  check(`[${w}] ảnh tải đủ`, !r.imgsBad.length, r.imgsBad.join(','));
  check(`[${w}] không cuộn ngang`, !r.hScroll);
  check(`[${w}] đủ glyph tiếng Việt ở mọi font`, !vi.length, vi.join(','));
  const bad = await ev(textFit);
  check(`[${w}] chữ nằm gọn trong khung`, !bad.length, bad.join('; '));
  const c1 = await ev(`document.querySelector('[data-cd="s"]').textContent`); await sleep(1200); const c2 = await ev(`[...document.querySelectorAll('[data-cd]')].map(b => b.textContent)`);
  const left = (Date.UTC(2026, 10, 17, 16 - 7, 30) - Date.now()) / 1000;
  check(`[${w}] đồng hồ đếm ngược chạy và đúng số ngày`, c1 !== c2[3] && +c2[0] === Math.floor(left / 86400), `${c1} -> ${c2.join(':')} (mong ${Math.floor(left / 86400)} ngày)`);
  await send('Page.captureScreenshot', { format: 'png' }).then(x => writeFileSync(join(OUT, `p2-${w}.png`), Buffer.from(x.result.data, 'base64')));
  check(`[${w}] không lỗi console`, !errors.length, errors.join(' | '));
}

// ---------- Form xác nhận: thiếu thông tin, gửi qua Apps Script, gửi qua email ----------
contentOverride = { ...C0, rsvp: { email: 'test@example.com', endpoint: 'https://script.google.com/macros/s/TEST/exec' } };
await open('/ivory/page-2?to=Anh%20T%C3%BA', 390, 844);
const pre = await ev(`document.querySelector('form.rsvp [name=name]').value`);
check('?to= điền sẵn tên khách', pre === 'Anh Tú', pre);
await ev(`(() => { const f = document.querySelector('form.rsvp'); f.name.value = ''; f.requestSubmit(); })()`); await sleep(300);
check('thiếu tên: báo điền mục có *', (await ev(`document.querySelector('form.rsvp .msg').textContent`)).includes('dấu *'));
posts.length = 0;
await ev(`(() => { const f = document.querySelector('form.rsvp'); f.name.value = 'Anh Tú';
  f.querySelector('[name=attend][value="Có"]').click(); f.guests.value = '2'; f.song.value = 'Có chàng trai viết lên cây';
  f.querySelector('[name=menu]').click(); f.querySelector('[name=help][value="Không"]').click(); f.phone.value = '0912 345 678'; f.requestSubmit(); })()`);
await sleep(1500);
const post = posts.find(p => p.url.includes('script.google.com'));
const q = new URLSearchParams(post?.body || '');
check('gửi xác nhận tới Apps Script đúng trường', post && q.get('type') === 'rsvp' && q.get('name') === 'Anh Tú' && q.get('attend') === 'Có' && q.get('guests') === '2' && /Bài hát: Có chàng trai viết lên cây \| Thực đơn: Thực đơn thường \| Cần hỗ trợ chỗ nghỉ\/đi lại: Không \| SĐT: 0912 345 678/.test(q.get('message')), post?.body);
check('sau khi gửi: lời cảm ơn', (await ev(`document.querySelector('form.rsvp .msg').textContent`)).startsWith('Cảm ơn Anh Tú'));
contentOverride = { ...C0, rsvp: { email: 'test@example.com', endpoint: '' } };
await open('/ivory/page-2', 390, 844);
await ev(`window.__nav = null; addEventListener('beforeunload', () => {}); (() => { const f = document.querySelector('form.rsvp'); f.name.value = 'Bác Hùng'; f.querySelector('[name=attend][value="Không"]').click(); f.querySelector('[name=help][value="Không"]').click(); f.phone.value = '0987654321'; f.requestSubmit(); })()`);
await sleep(800);
check('không có Apps Script: không gửi đi đâu, báo cảm ơn (mở email soạn sẵn)', !posts.some(p => p.body?.includes('B%C3%A1c+H%C3%B9ng')) && (await ev(`document.querySelector('form.rsvp .msg')?.textContent || ''`)).includes('Bác Hùng'));

// ---------- Mừng cưới, nhạc, nhà gái, menu tuỳ chỉnh ----------
contentOverride = JSON.parse(JSON.stringify(C0));
contentOverride.groom.bank = { code: 'ICB', name: 'VietinBank', account: '123456789', holder: 'HOANG NGOC LONG' };
contentOverride.music = 'audio/test.mp3';
contentOverride.ivory = { invite: 'Kính mời\nquý khách!', menus: 'Cỗ mặn\nCỗ chay', wedo: '' };
await open('/ivory/page-2', 390, 844);
const g1 = await ev(`(() => { const a = document.querySelector('a[data-k="s4.registry"]'); return { shown: !a.hidden && !document.querySelector('[data-k="btn.registry"]').hidden, text: a.innerText.trim() }; })()`);
check('có tài khoản: hiện nút mừng cưới', g1.shown && eq(g1.text, 'Mừng cưới'), JSON.stringify(g1));
await ev(`document.querySelector('a[data-k="s4.registry"]').click()`); await sleep(400);
const g2 = await ev(`(() => { const d = document.querySelector('dialog.gift'); return { open: d.open, qr: d.querySelector('img').getAttribute('src'), acc: d.querySelector('.acc').textContent }; })()`);
check('bấm mừng cưới: mở mã QR VietQR đúng tài khoản', g2.open && g2.qr.startsWith('https://img.vietqr.io/image/ICB-123456789-qr_only.png') && g2.acc === '123456789', JSON.stringify(g2));
check('có nhạc: nút máy hát bật', (await ev(`document.querySelector('.music').disabled`)) === false && (await ev(`document.querySelector('audio').getAttribute('src')`)) === '../audio/test.mp3');
check('ô để trống trong quản trị dùng chữ mặc định', eq(await ev(T('s0.wedo')), 'Cưới thôi!'));
check('thực đơn tuỳ chỉnh', JSON.stringify(await ev(`[...document.querySelectorAll('[name=menu]')].map(i => i.value)`)) === '["Cỗ mặn","Cỗ chay"]');
await open('/ivory/', 390, 844);
check('lời mời tuỳ chỉnh ở trang 1', eq(await ev(T('p1.invite')), 'Kính mời quý khách!'));
contentOverride = null;
await open('/ivory/page-2?nha=gai', 390, 844);
const gai = await ev(`({ names: ${T('s0.names')}, date: ${T('s0.date')}, venue: ${T('s2.venue')}, l: [${T('s3.l2')}, ${T('s3.l3')}], view: document.querySelector('a[data-k="s2.view"]').href, title: document.title, sign: ${T('s7.sign')} })`);
check('?nha=gai: tên cô dâu trước, ngày/nơi tiệc nhà gái', gai.names === 'Phương Anh và Ngọc Long' && gai.date === '16 tháng 11 năm 2026 vào lúc 16 giờ 30' && eq(gai.venue, 'Nhà Văn Hóa Tân Trại') && gai.view === C0.gai.directions && eq(gai.l.join('|'), 'Tiệc cưới (16/11)|Lễ vu quy (17/11)') && gai.sign === 'Phương Anh & Ngọc Long', JSON.stringify(gai));
await open('/ivory/?nha=gai', 390, 844);
check('?nha=gai: phong bì giữ tham số', (await ev(`document.querySelector('a.open').getAttribute('href')`)) === 'page-2?nha=gai');

console.log(results.join('\n'));
console.log(`\n${results.length - fails}/${results.length} đạt`);
console.log('request ra ngoài (đã chặn):', [...new Set(extReq.map(u => u.replace(/\?.*/, '').slice(0, 90)))].join('\n  '));
ws.close(); chrome.kill(); server.close(); process.exit(fails ? 1 : 0);
