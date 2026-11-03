// node o-liu/tools/admtest.mjs: kiểm thử phần thiệp chính (mẫu Ô Liu) trong trang quản trị: 5 ô ảnh, mục "Chữ trên thiệp", lưu.
// GitHub API được giả lập (mã truy cập giả, không ghi gì lên GitHub)
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, mkdtempSync } from 'node:fs';
import { join, resolve, extname, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
const REPO = resolve(process.argv[2] || join(dirname(fileURLToPath(import.meta.url)), '../..')), OUT = mkdtempSync(join(tmpdir(), 'oliu-admin-test-'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const server = createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  for (const f of [join(REPO, p), join(REPO, p, 'index.html')]) { try { const b = readFileSync(f); res.writeHead(200, { 'content-type': types[extname(f)] || 'application/octet-stream' }); return res.end(b); } catch {} }
  res.writeHead(404); res.end();
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:' + server.address().port;
const CONTENT_JS = readFileSync(join(REPO, 'content.js'), 'utf8'), INDEX = readFileSync(join(REPO, 'index.html'), 'utf8');
const C0 = JSON.parse(CONTENT_JS.slice(CONTENT_JS.indexOf('{'), CONTENT_JS.lastIndexOf('}') + 1));
const IMG = join(REPO, C0.photos.album[0]); // ảnh thử: một ảnh album có sẵn

const port = 10400 + Math.floor(Math.random() * 90);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${join(OUT, '.profile')}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' });
let tab; for (let i = 0; i < 60 && !tab; i++) { await sleep(250); try { tab = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page'); } catch {} }
const ws = new WebSocket(tab.webSocketDebuggerUrl); await new Promise(r => ws.addEventListener('open', r, { once: true }));
let seq = 0, blobs = 0; const pend = new Map(), errors = [], calls = []; let treeBody = null;
const send = (method, params = {}) => new Promise(r => { const id = ++seq; pend.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
const reply = (requestId, code, body, ct = 'application/json') => send('Fetch.fulfillRequest', { requestId, responseCode: code, responseHeaders: [{ name: 'content-type', value: ct }, { name: 'access-control-allow-origin', value: '*' }], body: Buffer.from(typeof body === 'string' ? body : JSON.stringify(body)).toString('base64') });
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description?.split('\n')[0]);
  if (m.method === 'Fetch.requestPaused') {
    const { requestId, request: q } = m.params, u = new URL(q.url), p = u.pathname.replace('/repos/huy-buidoanquang/longxphuonganh', '');
    calls.push(q.method + ' ' + u.pathname);
    if (q.method === 'OPTIONS') return send('Fetch.fulfillRequest', { requestId, responseCode: 204, responseHeaders: [{ name: 'access-control-allow-origin', value: '*' }, { name: 'access-control-allow-headers', value: '*' }, { name: 'access-control-allow-methods', value: 'GET,POST,PATCH,PUT' }] });
    if (u.host === 'api.vietqr.io') return reply(requestId, 200, { data: [] });
    if (u.host !== 'api.github.com' || u.pathname.includes('longxphuonganh-khach')) return reply(requestId, 404, { message: 'Not Found' });
    if (p === '/git/ref/heads/main') return reply(requestId, 200, { object: { sha: 'testsha' } });
    if (p === '/contents/content.js') return reply(requestId, 200, CONTENT_JS, 'text/plain');
    if (p === '/contents/index.html') return reply(requestId, 200, INDEX, 'text/plain');
    if (p === '/git/commits/testsha') return reply(requestId, 200, { tree: { sha: 't0' } });
    if (p === '/git/blobs' && q.method === 'POST') { const b = JSON.parse(q.postData); return reply(requestId, 201, { sha: 'blob' + (++blobs) + '-' + b.content.length }); }
    if (p === '/git/trees' && q.method === 'POST') { treeBody = JSON.parse(q.postData); return reply(requestId, 201, { sha: 't1' }); }
    if (p === '/git/commits' && q.method === 'POST') return reply(requestId, 201, { sha: 'c1' });
    if (p === '/git/refs/heads/main' && q.method === 'PATCH') return reply(requestId, 200, { object: { sha: 'c1' } });
    return reply(requestId, 404, { message: 'Not Found' });
  }
});
const ev = async x => { const r = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description); return r.result.result.value; };
const until = async (x, ms = 5000) => { for (let t = 0; t < ms; t += 100) { if (await ev(x).catch(() => false)) return true; await sleep(100); } return false; };
const upload = async (sel, file) => { const doc = await send('DOM.getDocument', { depth: 0 }); const q = await send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: sel }); await send('DOM.setFileInputFiles', { nodeId: q.result.nodeId, files: [file] }); };
await send('Page.enable'); await send('Runtime.enable'); await send('DOM.enable');
await send('Fetch.enable', { patterns: [{ urlPattern: 'https://*' }] });
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: BASE + '/admin/index.html' }); await sleep(1500);
await ev(`localStorage.setItem('gh-token', JSON.stringify('test-token-khong-that'))`); // mã giả cho bản chạy thử trên máy
await send('Page.reload');
await until(`!!document.querySelector('#editor') && !document.querySelector('#editor').hidden`, 10000);
const results = []; let fails = 0;
const check = (n, ok, info = '') => { results.push(`${ok ? 'ĐẠT ' : 'LỖI '} ${n}${info ? ' — ' + info : ''}`); if (!ok) fails++; };
const SLOTS = ['hero', 'hero2', 'calendar', 'couple', 'footer'];

check('trang quản trị tải nội dung (GitHub giả lập)', (await ev(`document.querySelector('#status').textContent`)).includes('Chưa có thay đổi'));
const slots = JSON.parse(await ev(`JSON.stringify([...document.querySelectorAll('.slots .photo')].map(d => [d.dataset.slot, d.querySelector('.lh').textContent, d.querySelector('img.thumb')?.getAttribute('src') || '']))`));
check('mục Ảnh cưới: 5 ô ảnh theo thứ tự trên thiệp', JSON.stringify(slots.map(s => s[0])) === JSON.stringify(SLOTS), slots.map(s => s[0] + ':' + s[1]).join(', '));
check('mỗi ô hiện ảnh đang dùng trong content.js', slots.every(([k, , src]) => src.endsWith(C0.photos[k])), slots.map(s => s[2].split('/').pop()).join(', '));
check('album: 18 ảnh', (await ev(`document.querySelectorAll('[data-list="photos.album"] .photo').length`)) === C0.photos.album.length);
const ol = JSON.parse(await ev(`JSON.stringify((() => { const sec = [...document.querySelectorAll('details.sec')].find(d => d.querySelector('summary').textContent.startsWith('Chữ trên thiệp'));
  return sec ? [...sec.querySelectorAll('[data-k]')].map(e => [e.dataset.k, e.placeholder]) : null; })())`));
check('mục "Chữ trên thiệp": 5 ô chữ của thiệp chính', ol?.length === 5 && ol.every(([k]) => k.startsWith('oliu.')) && ol.find(([k]) => k === 'oliu.invite')?.[1] === 'tham dự tiệc chung vui\ncùng gia đình chúng tôi', ol?.map(o => o[0]).join(','));
check('giờ làm lễ nhà trai (ngày âm lịch tự tính)', (await ev(`(() => { const i = document.querySelector('[data-k="trai.ceremonyAt"]'); return i.type === 'datetime-local' && i.value === ${JSON.stringify(C0.trai.ceremonyAt)} && i.closest('label').textContent.includes('âm lịch tự tính'); })()`)) === true);

await upload('#ph-hero2 input[type=file]', IMG);
check('chọn ảnh ô "Khung nhỏ bên trái": hiện ảnh mới, bật nút Lưu', await until(`document.querySelector('#ph-hero2 img.thumb')?.src.startsWith('data:image/jpeg') && !document.querySelector('#publish').disabled`, 6000), await ev(`document.querySelector('#status').textContent`));
await upload('#ph-hero input[type=file]', IMG);
check('chọn ảnh bìa: hiện ảnh mới', await until(`document.querySelector('#ph-hero img.thumb')?.src.startsWith('data:image/jpeg')`, 4000));
await ev(`document.querySelector('#ph-calendar [data-act="clear"]').click()`);
check('bỏ ảnh cạnh lịch: báo dùng ảnh trong album', await until(`!document.querySelector('#ph-calendar img') && document.querySelector('#ph-calendar .thumb').textContent.includes('Chưa có ảnh')`, 2000));
await ev(`(() => { const el = document.querySelector('[data-k="oliu.invite"]'); el.value = 'Mời bạn\\nđến chung vui'; el.dispatchEvent(new Event('input', { bubbles: true })); })()`);
await ev(`document.querySelector('#publish').click()`);
await until(`document.querySelector('#status').textContent.startsWith('Đã lưu')`, 10000);
const st = await ev(`document.querySelector('#status').textContent`);
check('bấm Lưu: báo đã lưu', st.startsWith('Đã lưu'), st);
const cjs = treeBody?.tree?.find(t => t.path === 'content.js')?.content || '';
const C1 = cjs ? JSON.parse(cjs.slice(cjs.indexOf('{'), cjs.lastIndexOf('}') + 1)) : { photos: {} };
const P = C1.photos;
check('content.js: ảnh mới cho ô bìa, ô nhỏ; ảnh chia sẻ làm lại; bỏ ảnh cạnh lịch', /^images\/hero2-[a-z0-9]+\.jpg$/.test(P.hero2) && /^images\/hero-[a-z0-9]+\.jpg$/.test(P.hero) && /^images\/og-[a-z0-9]+\.jpg$/.test(P.og) && P.hero !== C0.photos.hero && P.hero2 !== C0.photos.hero2 && P.og !== C0.photos.og && !P.calendar, JSON.stringify({ hero: P.hero, hero2: P.hero2, og: P.og, calendar: P.calendar }));
check('content.js: lưu chữ "Lời mời dưới tên khách"', JSON.stringify(C1.oliu) === JSON.stringify({ invite: 'Mời bạn\nđến chung vui' }), JSON.stringify(C1.oliu));
const strip = c => { const { oliu, ...r } = c; const { hero, hero2, og, calendar, ...p } = r.photos; return JSON.stringify({ ...r, photos: p }); };
check('các mục khác của content.js giữ nguyên', strip(C1) === strip(C0));
const imgs = treeBody?.tree?.filter(t => t.path.startsWith('images/')).map(t => t.path).sort() || [];
check('tải lên đúng 3 ảnh (ô nhỏ, bìa, ảnh chia sẻ)', imgs.length === 3 && imgs.includes(P.hero) && imgs.includes(P.hero2) && imgs.includes(P.og), imgs.join(', '));
const html = treeBody?.tree?.find(t => t.path === 'index.html')?.content || '';
check('index.html: ảnh xem trước khi gửi link trỏ tới ảnh chia sẻ mới', html.includes(`<meta property="og:image" content="${BASE}/${P.og}" data-gai="${BASE}/${P.og}"`), (html.match(/<meta property="og:image"[^>]*>/) || [''])[0]);
check('không lỗi JavaScript', !errors.length, errors.join(' | '));
console.log(results.join('\n')); console.log(`\n${results.length - fails}/${results.length} đạt`);
console.log('gọi API (giả lập):', [...new Set(calls)].join(', '));
ws.close(); chrome.kill(); server.close(); process.exit(fails ? 1 : 0);
