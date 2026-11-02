'use strict';
/* Trang quản trị thiệp cưới: https://admin.longxphuonganh.pages.dev
   - Mã nguồn ở thư mục admin/ trên nhánh main. Nhánh "admin" chỉ chứa thư mục này (ở gốc) để Cloudflare Pages đưa lên tên miền admin.
     Sau khi sửa admin/ và commit lên main:
       git push origin "$(git commit-tree HEAD:admin -p origin/admin -m 'Cập nhật trang quản trị')":refs/heads/admin
   - Nội dung thiệp nằm ở content.js (nhánh main), lưu qua GitHub API bằng mã truy cập của người quản trị.
     Mỗi lần lưu là một commit; Cloudflare Pages tự đưa bản mới lên thiệp.
   - Danh sách khách mời chỉ lưu trong trình duyệt (localStorage) vì kho GitHub để công khai. */
(() => {
  const REPO = 'huy-buidoanquang/longxphuonganh', BRANCH = 'main', API = 'https://api.github.com/repos/' + REPO;
  // admin.<tên miền> -> thiệp ở <tên miền>; mở ở /admin/ của chính trang thiệp (hoặc máy cục bộ) thì thiệp ở thư mục cha
  const SITE = location.hostname.startsWith('admin.') ? `https://${location.hostname.slice(6)}/` : new URL('../', location.href).href;
  const ORIGIN = new URL(SITE).origin;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const p2 = v => String(v).padStart(2, '0');
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const norm = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().trim();
  const store = {
    get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };
  const get = (o, k) => k.split('.').reduce((v, p) => v?.[p], o);
  const set = (o, k, v) => { const ks = k.split('.'), last = ks.pop(); ks.reduce((x, p) => (x[p] ??= {}), o)[last] = v; };
  let toastTimer = 0;
  const toast = m => { const t = $('#toast'); t.textContent = m; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2200); };
  async function copy(text, what = 'link') {
    try { await navigator.clipboard.writeText(text); }
    catch { const t = Object.assign(document.createElement('textarea'), { value: text }); document.body.append(t); t.select(); document.execCommand('copy'); t.remove(); }
    toast('Đã copy ' + what);
  }

  $('#site-link').href = SITE;
  $$('[data-tab]').forEach(b => b.addEventListener('click', () => {
    $$('[data-tab]').forEach(x => x.setAttribute('aria-selected', x === b));
    $$('.tab').forEach(s => { s.hidden = s.id !== 'tab-' + b.dataset.tab; });
    $('#bar').hidden = b.dataset.tab !== 'content' || !draft;
  }));

  // ---------- GitHub ----------
  let token = store.get('gh-token', '');
  async function gh(path, { method = 'GET', body, raw } = {}) {
    const r = await fetch(API + path, {
      method, body: body && JSON.stringify(body),
      headers: { Authorization: 'Bearer ' + token, Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json', ...(body && { 'Content-Type': 'application/json' }) },
    });
    if (!r.ok) throw Object.assign(new Error('GitHub trả lỗi ' + r.status), { status: r.status });
    return raw ? r.text() : r.json();
  }
  const head = async () => (await gh(`/git/ref/heads/${BRANCH}?t=${Date.now()}`)).object.sha; // ?t=: không dùng bản lưu tạm của trình duyệt
  const readFile = (path, sha) => gh(`/contents/${path}?ref=${sha}`, { raw: true });

  // ---------- Nội dung thiệp ----------
  let draft = null, saved = '';
  const uploads = new Map(); // đường dẫn trong kho -> { url: data URL, pending: chưa lưu lên GitHub }
  const dirty = () => !!draft && JSON.stringify(draft) !== saved;
  const media = p => uploads.get(p)?.url || (p ? SITE + p : '');
  const toJS = c => `/* Nội dung thiệp cưới. Sửa ở trang quản trị https://admin.longxphuonganh.pages.dev (trang đó ghi đè file này). */\nwindow.CONTENT = ${JSON.stringify(c, null, 2)};\n`;
  const fromJS = t => JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1));
  const status = (m, cls = '') => { const s = $('#status'); s.textContent = m; s.className = cls; };
  function changed() {
    $('#publish').disabled = !dirty();
    if (dirty()) status('Có thay đổi chưa lưu');
    refreshPreview();
  }

  async function login() {
    $('#login').hidden = true; $('#loading').hidden = false; $('#login-err').textContent = '';
    try {
      draft = fromJS(await readFile('content.js', await head()));
      saved = JSON.stringify(draft);
      buildForm();
      $('#editor').hidden = false; $('#logout').hidden = false;
      $('#bar').hidden = $('#tab-content').hidden;
      status('Chưa có thay đổi');
      refreshPreview(true);
    } catch (e) {
      draft = null;
      if (e.status === 401) { token = ''; store.set('gh-token', ''); }
      $('#login').hidden = false;
      $('#login-err').textContent = e.status === 401 ? 'Mã không đúng hoặc đã hết hạn.'
        : e.status === 403 || e.status === 404 ? 'Mã chưa được cấp quyền vào kho longxphuonganh.' : 'Không tải được nội dung: ' + e.message;
    } finally { $('#loading').hidden = true; }
  }
  $('#login').addEventListener('submit', e => { e.preventDefault(); token = $('#token').value.trim(); store.set('gh-token', token); login(); });
  $('#logout').addEventListener('click', () => {
    if (dirty() && !confirm('Có thay đổi chưa lưu. Vẫn đăng xuất?')) return;
    store.set('gh-token', ''); draft = null; location.reload();
  });
  addEventListener('beforeunload', e => { if (dirty()) { e.preventDefault(); e.returnValue = ''; } });

  // ---------- Biểu mẫu ----------
  const PERSON = [
    ['name', 'Tên gọi trên thiệp', 'VD: Ngọc Long'], ['fullName', 'Họ và tên'], ['role', 'Danh xưng', 'Chú Rể / Cô Dâu / Trưởng Nam…'],
    ['father', 'Bố (Ông)'], ['mother', 'Mẹ (Bà)'], ['address', 'Địa chỉ gia đình', '', 'area'],
  ];
  const SIDE = [
    ['announce', 'Dòng báo tin', '', 'area'], ['ceremonyPlace', 'Nơi cử hành hôn lễ', '', 'area'],
    ['ceremonyAt', 'Giờ làm lễ', '', 'datetime-local'], ['ceremonyLunar', 'Ngày âm lịch của lễ', 'Tự điền khi đổi ngày'],
    ['partyAt', 'Giờ tiệc cưới', '', 'datetime-local'], ['partyLunar', 'Ngày âm lịch của tiệc', 'Tự điền khi đổi ngày'],
    ['venue', 'Nơi đãi tiệc'], ['venueAddress', 'Địa chỉ nơi đãi tiệc'],
    ['map', 'Vị trí trên bản đồ', 'Toạ độ như 21.18,105.89 hoặc địa chỉ'], ['directions', 'Link nút "Chỉ đường"', 'https://maps.app.goo.gl/…', 'url'],
  ];
  const field = (k, label, hint = '', type = 'text', wide) => `<label class="f${wide ? ' wide' : ''}"><span>${label}</span>${type === 'area'
    ? `<textarea data-k="${k}" rows="2" placeholder="${esc(hint)}"></textarea>`
    : `<input data-k="${k}" type="${type}" placeholder="${esc(hint)}">`}</label>`;
  const fields = (base, list) => list.map(([k, ...r]) => field(base + k, ...r)).join('');
  const bank = p => `<fieldset class="wide"><legend>Tài khoản nhận mừng cưới <small>(bỏ trống thì không hiện)</small></legend>
    ${field(p + '.bank.name', 'Ngân hàng', 'Gõ để chọn: Vietcombank, MBBank…')}${field(p + '.bank.account', 'Số tài khoản')}${field(p + '.bank.holder', 'Tên chủ tài khoản', 'VIẾT HOA KHÔNG DẤU')}</fieldset>`;
  const sec = (title, body, open) => `<details class="sec"${open ? ' open' : ''}><summary>${title}</summary><div class="sec-body">${body}</div></details>`;
  const list = (k, kind) => `<div class="list wide${kind === 'colors' ? ' colors' : ''}" data-list="${k}" data-kind="${kind}"></div>`;
  const ICONS = [['', 'Không'], ['cake', 'Bánh cưới'], ['cook', 'Bàn tiệc'], ['camera', 'Máy ảnh']];
  const LISTS = {
    schedule: {
      title: 'Lịch trình ngày cưới (bỏ hết thì ẩn mục này)', add: '+ Thêm mốc', blank: () => ({ time: '18:00', title: '', icon: '' }),
      row: it => `<input type="time" data-f="time" value="${esc(it.time)}" aria-label="Giờ"><input data-f="title" value="${esc(it.title)}" placeholder="VD: Đón khách" aria-label="Tên mốc">`
        + `<select data-f="icon" aria-label="Biểu tượng">${ICONS.map(([v, n]) => `<option value="${v}"${v === (it.icon || '') ? ' selected' : ''}>${n}</option>`).join('')}</select>`,
    },
    colors: { title: 'Màu trang phục gợi ý (bỏ hết thì ẩn mục Dress code)', add: '+ Thêm màu', blank: () => '#c9a24a', row: c => `<input type="color" data-f="" value="${esc(c)}" aria-label="Màu">` },
    album: {
      title: 'Album ảnh (ô trống hiện ảnh minh hoạ; bỏ hết thì ẩn album)',
      row: (p, i) => (p ? `<img class="thumb" src="${esc(media(p))}" alt="Ảnh ${i + 1}">` : '<div class="thumb">Chưa có ảnh</div>')
        + '<label class="btn">Chọn ảnh<input type="file" accept="image/*" data-img="album"></label>',
    },
  };

  function buildForm() {
    $('#form').innerHTML = [
      sec('Chú rể', fields('groom.', PERSON) + bank('groom'), true),
      sec('Cô dâu', fields('bride.', PERSON) + bank('bride')),
      sec('Thiệp nhà trai <small>— link mặc định</small>', fields('trai.', SIDE) + list('trai.schedule', 'schedule')),
      sec('Thiệp nhà gái <small>— link có ?nha=gai</small>', fields('gai.', SIDE) + list('gai.schedule', 'schedule')),
      sec('Ảnh cưới', '<div class="wide"><div class="lh">Ảnh bìa (trong phong bì; cũng là ảnh hiện khi gửi link qua Zalo, Messenger)</div><div class="photo hero-photo" id="hero"></div></div>' + list('photos.album', 'album')),
      sec('Nhạc nền', '<div class="wide" id="music"></div>'),
      sec('Xác nhận tham dự & lời chúc', field('rsvp.email', 'Email nhận xác nhận tham dự', 'VD: tencuaban@gmail.com', 'email')
        + field('rsvp.endpoint', 'Link Google Apps Script (không bắt buộc)', 'https://script.google.com/macros/s/…/exec', 'url')
        + '<p class="note wide">Có link Google Apps Script thì xác nhận và lời chúc của khách được lưu vào Google Sheet (xem file rsvp-google-sheet.gs trong kho). Để trống thì nút gửi mở email soạn sẵn tới email ở trên.</p>'),
      sec('Khác', field('inviteLabel', 'Lời mời trên màn mở thiệp', 'Thân Mời') + field('dressCode.note', 'Dòng ghi chú Dress code')
        + field('footer', 'Lời cảm ơn cuối trang', '', 'area', true) + list('dressCode.colors', 'colors')),
    ].join('');
    $$('[data-k$=".bank.name"]').forEach(i => i.setAttribute('list', 'banks'));
    $$('#form [data-k]').forEach(el => { el.value = get(draft, el.dataset.k) ?? ''; });
    $$('[data-list]').forEach(drawList);
    drawHero(); drawMusic();
  }
  function drawList(el) {
    const kind = el.dataset.kind, L = LISTS[kind], arr = get(draft, el.dataset.list), album = kind === 'album';
    const ctl = i => `<button type="button" data-act="up" aria-label="Đưa lên trước"${i ? '' : ' disabled'}>${album ? '←' : '↑'}</button><button type="button" data-act="del" aria-label="Xoá">×</button>`;
    el.innerHTML = `<div class="lh">${L.title}</div><div class="${album ? 'photos' : 'rows'}">`
      + arr.map((it, i) => (album ? `<div class="photo" data-i="${i}">${L.row(it, i)}<div class="acts">${ctl(i)}</div></div>` : `<div class="row" data-i="${i}">${L.row(it, i)}${ctl(i)}</div>`)).join('')
      + '</div>' + (album ? '<label class="btn add">+ Thêm ảnh<input type="file" accept="image/*" multiple data-img="album"></label>' : `<button type="button" class="add" data-act="add">${L.add}</button>`);
  }
  function drawHero() {
    const p = draft.photos.hero;
    $('#hero').innerHTML = (p ? `<img class="thumb" src="${esc(media(p))}" alt="Ảnh bìa">` : '<div class="thumb">Chưa có ảnh<br>(đang dùng ảnh minh hoạ)</div>')
      + `<div class="acts"><label class="btn">Chọn ảnh<input type="file" accept="image/*" data-img="hero"></label>${p ? '<button type="button" data-act="clear" data-target="photos.hero">Bỏ ảnh</button>' : ''}</div>`;
  }
  function drawMusic() {
    const p = draft.music;
    $('#music').innerHTML = (p ? `<audio controls preload="none" src="${esc(media(p))}"></audio>` : '<p class="note">Đang dùng nhạc hộp nhạc "Canon in D" có sẵn.</p>')
      + `<div class="row-inline"><label class="btn">Chọn file nhạc (mp3, tối đa 15 MB)<input type="file" accept="audio/*" data-audio></label>${p ? '<button type="button" data-act="clear" data-target="music">Dùng nhạc có sẵn</button>' : ''}</div>`;
  }

  const form = $('#form');
  form.addEventListener('submit', e => e.preventDefault());
  form.addEventListener('input', e => {
    const el = e.target, k = el.dataset.k;
    if (k) {
      let v = el.value;
      if (k.endsWith('.bank.holder')) { v = v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'D').toUpperCase(); if (el.value !== v) el.value = v; }
      if (k.endsWith('.bank.account')) v = v.replace(/\s/g, '');
      set(draft, k, v);
      if (k.endsWith('.bank.name')) { // mã ngân hàng cho ảnh QR (VietQR); không có trong danh sách thì dùng luôn tên đã gõ
        const b = BANKS.find(x => [x.shortName, x.code, x.name].some(n => norm(n) === norm(v)));
        set(draft, k.replace(/name$/, 'code'), b ? b.code : v.trim());
      }
      if (k.endsWith('At') && /^\d{4}-\d\d-\d\dT/.test(v)) { // đổi ngày thì điền lại dòng âm lịch
        const [y, m, d] = v.split(/\D/).map(Number), lk = k.replace(/At$/, 'Lunar'), txt = lunarText(d, m, y);
        set(draft, lk, txt); $(`[data-k="${lk}"]`).value = txt;
      }
      return changed();
    }
    const row = el.closest('[data-i]'), lst = el.closest('[data-list]');
    if (row && lst && 'f' in el.dataset) {
      const arr = get(draft, lst.dataset.list), i = +row.dataset.i;
      if (el.dataset.f) arr[i][el.dataset.f] = el.value; else arr[i] = el.value;
      changed();
    }
  });
  form.addEventListener('click', e => {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    if (b.dataset.act === 'clear') { set(draft, b.dataset.target, ''); drawHero(); drawMusic(); return changed(); }
    const lst = b.closest('[data-list]'), arr = get(draft, lst.dataset.list), i = +b.closest('[data-i]')?.dataset.i;
    if (b.dataset.act === 'add') arr.push(LISTS[lst.dataset.kind].blank());
    if (b.dataset.act === 'del') arr.splice(i, 1);
    if (b.dataset.act === 'up' && i > 0) [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
    drawList(lst); changed();
  });
  form.addEventListener('change', async e => {
    const inp = e.target;
    if (inp.type !== 'file' || !inp.files.length) return;
    const files = [...inp.files], row = inp.closest('[data-i]'), lst = inp.closest('[data-list]');
    inp.value = '';
    status('Đang xử lý file…');
    try {
      if ('audio' in inp.dataset) { draft.music = await addAudio(files[0]); drawMusic(); }
      else {
        const paths = [];
        for (const f of files) paths.push(await addImage(f, inp.dataset.img));
        if (inp.dataset.img === 'hero') { draft.photos.hero = paths[0]; drawHero(); }
        else { if (row) draft.photos.album[+row.dataset.i] = paths[0]; else draft.photos.album.push(...paths); drawList(lst); }
      }
      changed();
    } catch (err) { status('Không dùng được file: ' + err.message, 'err'); }
  });

  // Ảnh thu nhỏ còn cạnh dài 1600px, nén JPEG cho nhẹ trên điện thoại; tên file mới mỗi lần để không dính bản lưu tạm cũ
  async function addImage(file, name) {
    let bmp;
    try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch { throw new Error(`"${file.name}" không phải ảnh JPG, PNG hoặc WebP`); }
    const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height)), c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    bmp.close();
    const path = `images/${name}-${uid()}.jpg`;
    uploads.set(path, { url: c.toDataURL('image/jpeg', .85), pending: true });
    return path;
  }
  async function addAudio(file) {
    const ext = file.name.match(/\.(mp3|m4a|aac|ogg|oga|wav)$/i)?.[1]?.toLowerCase();
    if (!file.type.startsWith('audio/') && !ext) throw new Error(`"${file.name}" không phải file nhạc`);
    if (file.size > 15e6) throw new Error('file nhạc lớn hơn 15 MB, hãy chọn bản nhẹ hơn');
    const url = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(file); });
    const path = `audio/nhac-${uid()}.${ext || 'mp3'}`;
    uploads.set(path, { url, pending: true });
    return path;
  }

  // ---------- Xem trước: thiệp thật trong iframe, nhận nội dung nháp qua postMessage ----------
  const frame = $('#pv-frame');
  let pvScroll = 0, pvTimer = 0;
  const previewContent = () => {
    const c = JSON.parse(JSON.stringify(draft), (k, v) => (typeof v === 'string' && uploads.has(v) ? uploads.get(v).url : v));
    c.music = ''; // không phát nhạc trong khung xem trước
    return c;
  };
  function refreshPreview(now) {
    clearTimeout(pvTimer);
    pvTimer = setTimeout(() => { if (draft && frame.offsetParent) frame.src = `${SITE}?preview=1${$('#pv-side').value === 'gai' ? '&nha=gai' : ''}&r=${Date.now()}`; }, now ? 0 : 800);
  }
  addEventListener('message', e => {
    if (e.origin !== ORIGIN || e.source !== frame.contentWindow) return;
    if (e.data?.type === 'preview-ready') frame.contentWindow.postMessage({ type: 'content', content: previewContent(), scroll: pvScroll }, ORIGIN);
    if (e.data?.type === 'preview-scroll') pvScroll = e.data.y;
  });
  $('#pv-side').addEventListener('change', () => { pvScroll = 0; refreshPreview(true); });
  $('#pv-open').addEventListener('click', () => { document.body.classList.add('show-pv'); refreshPreview(true); });
  $('#pv-close').addEventListener('click', () => document.body.classList.remove('show-pv'));

  // ---------- Lưu: một commit gồm content.js, thẻ meta của index.html và ảnh/nhạc mới ----------
  function validate() {
    const bad = (k, m) => { const el = $(`[data-k="${k}"]`); el?.closest('details')?.setAttribute('open', ''); el?.focus(); return m; };
    for (const k of ['groom.name', 'groom.fullName', 'bride.name', 'bride.fullName']) if (!get(draft, k)?.trim()) return bad(k, 'Chưa điền tên cô dâu / chú rể');
    for (const s of ['trai', 'gai']) for (const k of ['ceremonyAt', 'partyAt']) if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(get(draft, `${s}.${k}`) || '')) return bad(`${s}.${k}`, 'Chưa chọn đủ ngày giờ');
    for (const k of ['trai.directions', 'gai.directions', 'rsvp.endpoint']) { const v = get(draft, k); if (v && !/^https:\/\/\S+$/.test(v)) return bad(k, 'Link phải bắt đầu bằng https://'); }
    if (draft.rsvp.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(draft.rsvp.email)) return bad('rsvp.email', 'Email chưa đúng');
    for (const p of ['groom', 'bride']) { const b = draft[p].bank; if (b.account && !b.code) return bad(p + '.bank.name', 'Chưa chọn ngân hàng cho số tài khoản'); }
    return '';
  }
  // Tiêu đề và ảnh xem trước khi gửi link (Zalo, Messenger đọc từ HTML, không chạy JS)
  function patchMeta(html) {
    const names = `${draft.groom.name} & ${draft.bride.name}`, hero = draft.photos.hero;
    html = html.replace(/<title>[^<]*<\/title>/, () => `<title>${esc(names)} — Thiệp cưới</title>`)
      .replace(/(<meta name="description" content=")[^"]*/, (_, a) => a + esc('Trân trọng kính mời bạn đến dự lễ cưới của ' + names))
      .replace(/(<meta property="og:title" content=")[^"]*/, (_, a) => a + esc(names + ' — Thiệp cưới'))
      .replace(/\n[ \t]*<meta property="og:image" content="[^"]*">/, '');
    return hero ? html.replace(/<meta property="og:description"[^>]*>/, m => `${m}\n  <meta property="og:image" content="${esc(new URL(hero, SITE).href)}">`) : html;
  }
  async function publish() {
    const err = validate();
    if (err) return status(err, 'err');
    $('#publish').disabled = true;
    status('Đang lưu…');
    try {
      const sha = await head(), commit = await gh('/git/commits/' + sha), used = JSON.stringify(draft);
      const tree = [{ path: 'content.js', mode: '100644', type: 'blob', content: toJS(draft) }];
      const html = await readFile('index.html', sha), html2 = patchMeta(html);
      if (html2 !== html) tree.push({ path: 'index.html', mode: '100644', type: 'blob', content: html2 });
      for (const [path, u] of uploads) if (u.pending && used.includes(JSON.stringify(path))) {
        status(`Đang tải lên ${path}…`);
        const b = await gh('/git/blobs', { method: 'POST', body: { content: u.url.slice(u.url.indexOf(',') + 1), encoding: 'base64' } });
        tree.push({ path, mode: '100644', type: 'blob', sha: b.sha });
      }
      const t = await gh('/git/trees', { method: 'POST', body: { base_tree: commit.tree.sha, tree } });
      const c = await gh('/git/commits', { method: 'POST', body: { message: 'Cập nhật nội dung thiệp từ trang quản trị', tree: t.sha, parents: [sha] } });
      await gh('/git/refs/heads/' + BRANCH, { method: 'PATCH', body: { sha: c.sha } });
      uploads.forEach(u => { u.pending = false; });
      saved = used;
      status(`Đã lưu lúc ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}. Thiệp thật cập nhật sau khoảng 1 phút.`, 'ok');
    } catch (e) {
      status(e.status === 401 ? 'Mã truy cập hết hạn, hãy đăng xuất rồi đăng nhập lại.'
        : e.status === 403 || e.status === 404 ? 'Mã truy cập chưa có quyền ghi (Contents: Read and write) vào kho longxphuonganh.'
          : e.status === 409 || e.status === 422 ? 'Kho vừa có thay đổi khác, bấm Lưu lần nữa.' : 'Chưa lưu được: ' + e.message, 'err');
    } finally { $('#publish').disabled = !dirty(); }
  }
  $('#publish').addEventListener('click', publish);

  // Danh sách ngân hàng của VietQR để gợi ý khi gõ tên ngân hàng
  let BANKS = [];
  fetch('https://api.vietqr.io/v2/banks').then(r => r.json()).then(j => {
    BANKS = j.data || [];
    $('#banks').innerHTML = BANKS.map(b => `<option value="${esc(b.shortName)}">${esc(b.code)} · ${esc(b.name)}</option>`).join('');
  }).catch(() => {});

  // ---------- Âm lịch (thuật toán Hồ Ngọc Đức, giờ Việt Nam) để tự điền "(Tức ngày … tháng … năm …)" ----------
  const lunarText = (() => {
    const PI = Math.PI, INT = Math.floor, TZ = 7;
    const jdFromDate = (dd, mm, yy) => {
      const a = INT((14 - mm) / 12), y = yy + 4800 - a, m = mm + 12 * a - 3;
      const jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - INT(y / 100) + INT(y / 400) - 32045;
      return jd < 2299161 ? dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - 32083 : jd;
    };
    const newMoon = k => {
      const T = k / 1236.85, T2 = T * T, T3 = T2 * T, dr = PI / 180;
      let Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
      Jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
      const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
      const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
      const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
      let C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
      C1 = C1 - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr) - 0.0004 * Math.sin(dr * 3 * Mpr);
      C1 = C1 + 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr));
      C1 = C1 - 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M));
      C1 = C1 - 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr));
      C1 = C1 + 0.0010 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M));
      const deltat = T < -11 ? 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3 : -0.000278 + 0.000265 * T + 0.000262 * T2;
      return Jd1 + C1 - deltat;
    };
    const newMoonDay = k => INT(newMoon(k) + 0.5 + TZ / 24);
    const sunLong = dn => {
      const T = (dn - 0.5 - TZ / 24 - 2451545.0) / 36525, T2 = T * T, dr = PI / 180;
      const M = 357.52910 + 35999.05030 * T - 0.0001559 * T2 - 0.00000048 * T * T2, L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
      const DL = (1.914600 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M) + (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.000290 * Math.sin(dr * 3 * M);
      let L = (L0 + DL) * dr;
      L -= PI * 2 * INT(L / (PI * 2));
      return INT(L / PI * 6);
    };
    const month11 = yy => {
      const k = INT((jdFromDate(31, 12, yy) - 2415021) / 29.530588853);
      const nm = newMoonDay(k);
      return sunLong(nm) >= 9 ? newMoonDay(k - 1) : nm;
    };
    const leapOffset = a11 => {
      const k = INT((a11 - 2415021.076998695) / 29.530588853 + 0.5);
      let last, i = 1, arc = sunLong(newMoonDay(k + i));
      do { last = arc; i++; arc = sunLong(newMoonDay(k + i)); } while (arc !== last && i < 14);
      return i - 1;
    };
    const CAN = ['Canh', 'Tân', 'Nhâm', 'Quý', 'Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ'];
    const CHI = ['Thân', 'Dậu', 'Tuất', 'Hợi', 'Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi'];
    return (dd, mm, yy) => {
      const dn = jdFromDate(dd, mm, yy), k = INT((dn - 2415021.076998695) / 29.530588853);
      let start = newMoonDay(k + 1);
      if (start > dn) start = newMoonDay(k);
      let a11 = month11(yy), b11 = a11, ly;
      if (a11 >= start) { ly = yy; a11 = month11(yy - 1); } else { ly = yy + 1; b11 = month11(yy + 1); }
      const diff = INT((start - a11) / 29);
      let leap = false, lm = diff + 11;
      if (b11 - a11 > 365) { const lo = leapOffset(a11); if (diff >= lo) { lm = diff + 10; leap = diff === lo; } }
      if (lm > 12) lm -= 12;
      if (lm >= 11 && diff < 4) ly -= 1;
      return `(Tức ngày ${p2(dn - start + 1)} tháng ${p2(lm)}${leap ? ' nhuận' : ''} năm ${CAN[ly % 10]} ${CHI[ly % 12]})`;
    };
  })();

  // ---------- Khách mời: tạo link mời riêng, copy để gửi ----------
  let guests = store.get('guests', []);
  const linkOf = g => SITE + '?' + new URLSearchParams(g.side === 'gai' ? { nha: 'gai', to: g.name } : { to: g.name });
  const sideOf = (v, def) => (/gai|co dau/.test(norm(v)) ? 'gai' : /trai|chu re/.test(norm(v)) ? 'trai' : def);
  const saveGuests = () => { store.set('guests', guests); drawGuests(); };
  const gmsg = m => { $('#g-msg').textContent = m; };
  $('#link-trai').value = SITE;
  $('#link-gai').value = SITE + '?nha=gai';
  $$('[data-copy]').forEach(b => b.addEventListener('click', () => copy($('#' + b.dataset.copy).value)));

  function drawGuests() {
    const q = norm($('#g-q').value), f = $('#g-filter').value;
    const shown = guests.filter(g => (!q || norm(g.name + ' ' + g.note).includes(q)) && (!f || (f === 'todo' ? !g.sent : g.side === f)));
    $('#g-count').textContent = guests.length ? `· ${guests.length} khách, ${guests.filter(g => g.sent).length} đã copy link` : '';
    $('#g-body').innerHTML = shown.map(g => {
      const l = linkOf(g);
      return `<tr data-id="${g.id}"${g.sent ? ' class="sent"' : ''}>
        <td class="g-name"><b>${esc(g.name)}</b>${g.note ? `<small>${esc(g.note)}</small>` : ''}</td>
        <td><select data-act="side" aria-label="Bên của ${esc(g.name)}"><option value="trai">Nhà trai</option><option value="gai"${g.side === 'gai' ? ' selected' : ''}>Nhà gái</option></select></td>
        <td class="g-link"><a href="${esc(l)}" target="_blank" rel="noopener">${esc(decodeURIComponent(l.replace(/\+/g, ' ')).replace(/^https?:\/\//, ''))}</a></td>
        <td><button type="button" data-act="copy">${g.sent ? 'Copy lại' : 'Copy link'}</button></td>
        <td><button type="button" data-act="del" aria-label="Xoá ${esc(g.name)}">×</button></td></tr>`;
    }).join('') || `<tr><td colspan="5" class="empty">${guests.length ? 'Không có khách khớp bộ lọc.' : 'Chưa có khách nào. Nhập danh sách ở trên hoặc thêm từng khách.'}</td></tr>`;
  }
  $('#g-body').addEventListener('click', e => {
    const b = e.target.closest('button[data-act]'), g = b && guests.find(x => x.id === b.closest('tr').dataset.id);
    if (!g) return;
    if (b.dataset.act === 'copy') { copy(linkOf(g), 'link mời ' + g.name); g.sent = Date.now(); saveGuests(); }
    if (b.dataset.act === 'del' && confirm(`Xoá khách "${g.name}"?`)) { guests = guests.filter(x => x !== g); saveGuests(); }
  });
  $('#g-body').addEventListener('change', e => {
    const g = guests.find(x => x.id === e.target.closest('tr')?.dataset.id);
    if (g && e.target.dataset.act === 'side') { g.side = e.target.value; saveGuests(); }
  });
  $('#g-q').addEventListener('input', drawGuests);
  $('#g-filter').addEventListener('change', drawGuests);
  $('#g-add').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target, name = f.gname.value.normalize('NFC').trim().replace(/\s+/g, ' '), side = f.gside.value;
    if (!name) return;
    if (guests.some(g => norm(g.name) === norm(name) && g.side === side)) return toast('Khách này đã có trong danh sách');
    guests.unshift({ id: uid(), name, side, note: '' });
    saveGuests();
    f.gname.value = ''; f.gname.focus();
  });

  // CSV/TSV có ô trong ngoặc kép (Excel dán ra dạng tab)
  function parseRows(t, d) {
    const rows = [];
    let row = [], cell = '', q = false;
    for (let i = 0; i < t.length; i++) {
      const ch = t[i];
      if (q) { if (ch !== '"') cell += ch; else if (t[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else if (ch === '"' && !cell) q = true;
      else if (ch === d) { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += ch;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }
  const loadXLSX = () => (window.XLSX ? Promise.resolve() : new Promise((res, rej) => {
    document.head.append(Object.assign(document.createElement('script'), {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', crossOrigin: 'anonymous',
      integrity: 'sha512-r22gChDnGvBylk90+2e/ycr3RVrDi8DIOkIGNhJlKfuyQM4tIRAI062MaV8sfjQKYVGjOBaZBOA87z+IhZE9DA==',
      onload: res, onerror: () => rej(new Error('không tải được bộ đọc Excel, hãy thử lại hoặc dán từ Excel')),
    }));
  }));
  async function readTable(file) {
    if (/\.xlsx?$/i.test(file.name)) {
      await loadXLSX();
      const wb = XLSX.read(await file.arrayBuffer());
      return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '', raw: false });
    }
    const buf = await file.arrayBuffer();
    let t;
    try { t = new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch { t = new TextDecoder('windows-1258').decode(buf); } // CSV từ Excel cũ không phải UTF-8
    const first = t.split('\n')[0];
    return parseRows(t, /\.csv$/i.test(file.name) ? (first.split(';').length > first.split(',').length ? ';' : ',') : '\t');
  }
  function addRows(rows, def) {
    rows = rows.map(r => r.map(c => String(c ?? '').trim())).filter(r => r.some(Boolean));
    const head = (rows[0] || []).map(norm), col = re => head.findIndex(h => re.test(h));
    let iName = col(/^(ho va ten|ho ten|ten|ten khach|ten khach moi|ten tren thiep|khach|khach moi|name|guest)$/);
    let iSide = col(/^(ben|nha|side|phia|ben nha|thuoc ben|khach ben|khach cua)$/), iNote = col(/^(ghi chu|note|nhom|quan he|moi quan he)$/);
    if (iName >= 0 || iSide >= 0 || iNote >= 0) rows.shift();
    else if (rows[0]?.length > 1) { // không có dòng tiêu đề: bỏ cột STT; cột sau tên là "bên" nếu ghi nhà trai/nhà gái, không thì là ghi chú
      iName = /^\d+$/.test(rows[0][0]) ? 1 : 0;
      if (rows.some(r => sideOf(r[iName + 1] || '', ''))) { iSide = iName + 1; iNote = iName + 2; } else iNote = iName + 1;
    }
    if (iName < 0) iName = 0;
    const have = new Set(guests.map(g => norm(g.name) + g.side));
    let added = 0, dup = 0;
    for (const r of rows) {
      const name = (r[iName] || '').normalize('NFC').replace(/\s+/g, ' ').slice(0, 60);
      if (!name) continue;
      const side = iSide >= 0 ? sideOf(r[iSide] || '', def) : def, key = norm(name) + side;
      if (have.has(key)) { dup++; continue; }
      have.add(key); added++;
      guests.push({ id: uid(), name, side, note: iNote >= 0 ? (r[iNote] || '').slice(0, 100) : '' });
    }
    saveGuests();
    return { added, dup };
  }
  $('#g-import').addEventListener('click', async () => {
    const file = $('#g-file').files[0], text = $('#g-paste').value;
    if (!file && !text.trim()) return gmsg('Chọn file hoặc dán danh sách trước đã.');
    let rows;
    try { rows = file ? await readTable(file) : parseRows(text, '\t'); }
    catch (e) { return gmsg('Không đọc được file: ' + e.message); }
    const { added, dup } = addRows(rows, $('#g-side').value);
    gmsg(`Đã thêm ${added} khách${dup ? `, bỏ qua ${dup} khách trùng tên` : ''}.`);
    if (added) { $('#g-file').value = ''; $('#g-paste').value = ''; }
  });
  $('#g-export').addEventListener('click', () => {
    const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [['Tên khách', 'Bên', 'Ghi chú', 'Link mời', 'Đã copy link'],
      ...guests.map(g => [g.name, g.side === 'gai' ? 'Nhà gái' : 'Nhà trai', g.note, linkOf(g), g.sent ? new Date(g.sent).toLocaleString('vi-VN') : ''])];
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob(['\ufeff' + rows.map(r => r.map(q).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' })), download: 'khach-moi.csv',
    });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  $('#g-clear').addEventListener('click', () => { if (guests.length && confirm(`Xoá toàn bộ ${guests.length} khách khỏi danh sách?`)) { guests = []; saveGuests(); } });

  drawGuests();
  if (token) login(); else $('#login').hidden = false;
})();
