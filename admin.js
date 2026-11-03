'use strict';
/* Trang quản trị thiệp cưới: https://admin.longxphuonganh.pages.dev hoặc https://longxphuonganh-wedding.site/admin/
   - Mã nguồn ở thư mục admin/ trên nhánh main. Nhánh "admin" chỉ chứa thư mục này (ở gốc) để Cloudflare Pages đưa lên tên miền admin.
     Sau khi sửa admin/ và commit lên main:
       git push origin "$(git commit-tree HEAD:admin -p origin/admin -m 'Cập nhật trang quản trị')":refs/heads/admin
   - Nội dung thiệp nằm ở content.js (nhánh main), lưu qua GitHub API bằng mã truy cập của người quản trị.
     Mỗi lần lưu là một commit; Cloudflare Pages tự đưa bản mới lên thiệp.
   - Danh sách khách mời lưu trong trình duyệt và đồng bộ qua kho riêng tư longxphuonganh-khach (kho của thiệp để công khai). */
(() => {
  const REPO = 'huy-buidoanquang/longxphuonganh', BRANCH = 'main', API = 'https://api.github.com/repos/' + REPO;
  const GUEST_REPO = 'longxphuonganh-khach', DATA = 'https://api.github.com/repos/huy-buidoanquang/' + GUEST_REPO;
  // Thiệp chính (link mời khách, ảnh xem trước khi gửi link): mở admin ở tên miền thật (admin., <mã bản dựng>.pages.dev, tên miền riêng)
  // thì luôn là tên miền riêng; mở ở máy cục bộ thì thiệp ở thư mục cha.
  const SITE = /(^|\.)longxphuonganh\.pages\.dev$|^longxphuonganh-wedding\.site$/.test(location.hostname)
    ? 'https://longxphuonganh-wedding.site/' : new URL('../', location.href).href;
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
    if (b.dataset.tab === 'guests') sync();
  }));

  // ---------- GitHub ----------
  let token = store.get('gh-token', '');
  async function gh(path, { method = 'GET', body, raw } = {}) { // path: đường dẫn trong kho thiệp, hoặc URL đầy đủ
    const r = await fetch(path.startsWith('https:') ? path : API + path, {
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
      initSync();
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
    ['ceremonyAt', 'Giờ làm lễ (lễ cử hành tại tư gia; ngày âm lịch tự tính)', '', 'datetime-local'], ['partyAt', 'Giờ tiệc cưới', '', 'datetime-local'],
    ['venue', 'Nơi đãi tiệc'], ['venueAddress', 'Địa chỉ nơi đãi tiệc'],
    ['map', 'Vị trí trên bản đồ', 'Toạ độ như 21.18,105.89 hoặc địa chỉ'], ['directions', 'Link nút "Chỉ đường"', 'https://maps.app.goo.gl/…', 'url'],
  ];
  const IVORY = [
    ['invite', 'Lời mời trên phong bì', 'Trân trọng\nkính mời!', 'area'], ['tap', 'Dòng nhắc mở thiệp', 'Chạm vào phong bì\nđể mở thiệp...', 'area'],
    ['wedo', 'Dòng chữ dưới ảnh bìa', 'Cưới thôi!'], ['join', 'Lời mời trước tên cô dâu chú rể', 'Thân mời bạn đến dự\nlễ cưới của', 'area'],
    ['stayTitle', 'Tiêu đề khối dưới bản đồ', 'Gia đình hai bên'], ['stay', 'Nội dung khối dưới bản đồ', 'Để trống: tên bố mẹ và địa chỉ hai nhà', 'area'],
    ['attireTxt', 'Trang phục', 'Rất mong quý khách diện trang phục…', 'area'], ['transTxt', 'Đi lại', 'Quý khách vui lòng xem bản đồ chỉ đường…', 'area'],
    ['accTxt', 'Chỗ nghỉ', 'Quý khách ở xa cần hỗ trợ chỗ nghỉ…', 'area'], ['giftsTxt', 'Mừng cưới', 'Sự hiện diện của quý khách là món quà…', 'area'],
    ['menus', 'Thực đơn cho khách chọn (mỗi dòng một lựa chọn)', 'Thực đơn thường\nThực đơn chay\nKhông ăn được hải sản', 'area'],
    ['msg', 'Lời cảm ơn cuối thiệp', 'Để trống: dùng lời cảm ơn cuối trang ở mục Khác', 'area'],
  ];
  // Chữ trên thiệp chính (mẫu Ô Liu); ô trống thì dùng chữ mặc định của mẫu
  const OLIU = [
    ['guest', 'Tên khách khi link không có tên', 'Quý vị & Gia đình'], ['invite', 'Lời mời dưới tên khách', 'tham dự tiệc chung vui\ncùng gia đình chúng tôi', 'area'],
    ['caption', 'Chữ dưới ảnh cạnh lịch', 'Moments'], ['rsvpLead', 'Lời nhắn ở mục Xác nhận tham dự', 'Mong quý khách báo trước giúp chúng tôi để việc đón tiếp được chu đáo nhất. Trân trọng!', 'area'],
    ['guestbookLead', 'Lời nhắn ở Sổ lưu bút', 'Ký tên và gửi lời chúc đến chúng mình.'], ['giftThanks', 'Lời cảm ơn dưới mã QR mừng cưới', 'Sự hiện diện của bạn là món quà quý giá nhất đối với chúng tôi', 'area'],
    ['thanksTitle', 'Tiêu đề cuối thiệp', 'Lời cảm ơn!'],
  ];
  // Các ô ảnh của thiệp chính; ô trống thì lấy ảnh trong album
  const SLOTS = [['hero', 'Ảnh bìa: khung lớn bên phải phong bì (cũng là ảnh khi gửi link qua Zalo, Messenger)'], ['hero2', 'Khung nhỏ bên trái phong bì'], ['calendar', 'Ảnh cạnh lịch'],
    ['groom', 'Ảnh chú rể'], ['bride', 'Ảnh cô dâu'], ['guestbook', 'Ảnh nền Sổ lưu bút (khách ký tên lên ảnh)'], ['footer', 'Ảnh cuối thiệp']];
  const field = (k, label, hint = '', type = 'text', wide) => `<label class="f${wide ? ' wide' : ''}"><span>${label}</span>${type === 'area'
    ? `<textarea data-k="${k}" rows="2" placeholder="${esc(hint)}"></textarea>`
    : `<input data-k="${k}" type="${type}" placeholder="${esc(hint)}">`}</label>`;
  const fields = (base, list) => list.map(([k, ...r]) => field(base + k, ...r)).join('');
  const bank = p => `<fieldset class="wide"><legend>Tài khoản nhận mừng cưới <small>(bỏ trống thì không hiện)</small></legend>
    ${field(p + '.bank.name', 'Ngân hàng', 'Gõ để chọn: Vietcombank, MBBank…')}${field(p + '.bank.account', 'Số tài khoản')}${field(p + '.bank.holder', 'Tên chủ tài khoản', 'VIẾT HOA KHÔNG DẤU')}</fieldset>`;
  const sec = (title, body, open) => `<details class="sec"${open ? ' open' : ''}><summary>${title}</summary><div class="sec-body">${body}</div></details>`;
  const list = (k, kind) => `<div class="list wide${kind === 'colors' ? ' colors' : ''}" data-list="${k}" data-kind="${kind}"></div>`;
  const ICONS = [['', 'Không'], ['cake', 'Bánh cưới'], ['cook', 'Bàn tiệc'], ['camera', 'Máy ảnh'], ['glass', 'Ly rượu (thiệp Ivory)'], ['disco', 'Khiêu vũ (thiệp Ivory)']];
  const LISTS = {
    schedule: {
      title: 'Lịch trình ngày cưới (bỏ hết thì ẩn mục này)', add: '+ Thêm mốc', blank: () => ({ time: '18:00', title: '', icon: '' }),
      row: it => `<input type="time" data-f="time" value="${esc(it.time)}" aria-label="Giờ"><input data-f="title" value="${esc(it.title)}" placeholder="VD: Đón khách" aria-label="Tên mốc">`
        + `<select data-f="icon" aria-label="Biểu tượng">${ICONS.map(([v, n]) => `<option value="${v}"${v === (it.icon || '') ? ' selected' : ''}>${n}</option>`).join('')}</select>`,
    },
    colors: { title: 'Màu trang phục gợi ý (bỏ hết thì ẩn mục Dress code)', add: '+ Thêm màu', blank: () => '#c9a24a', row: c => `<input type="color" data-f="" value="${esc(c)}" aria-label="Màu">` },
    album: {
      title: 'Album ảnh (bấm ảnh trên thiệp để xem lớn; bỏ hết thì ẩn album)',
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
      sec('Ảnh cưới', `<div class="wide photos slots">${SLOTS.map(([k, label]) => `<div class="photo" id="ph-${k}" data-slot="${k}" title="${esc(label)}"></div>`).join('')}</div>` + list('photos.album', 'album')),
      sec('Nhạc nền', '<div class="wide" id="music"></div>'),
      sec('Xác nhận tham dự & lời chúc', field('rsvp.email', 'Email nhận xác nhận tham dự', 'VD: tencuaban@gmail.com', 'email')
        + field('rsvp.endpoint', 'Link Google Apps Script (không bắt buộc)', 'https://script.google.com/macros/s/…/exec', 'url')
        + '<p class="note wide">Có link Google Apps Script thì xác nhận và lời chúc của khách được lưu vào Google Sheet (xem file rsvp-google-sheet.gs trong kho). Để trống thì nút gửi mở email soạn sẵn tới email ở trên.</p>'),
      sec('Chữ trên thiệp <small>— ô trống thì dùng chữ của mẫu</small>', fields('oliu.', OLIU)
        + '<p class="note wide">Link thiệp: mặc định là thiệp nhà trai, thêm ?nha=gai là thiệp nhà gái, ?nha=chung là thiệp chung (khách tự chọn nhà trai hoặc nhà gái). Ngày âm lịch, lịch tháng và đếm ngược tự tính theo giờ làm lễ.</p>'),
      sec('Thiệp mẫu Ivory <small>— trang /ivory/, ô trống thì dùng chữ mặc định</small>', fields('ivory.', IVORY)
        + '<p class="note wide">Thiệp Ivory dùng chung tên, ngày giờ, địa điểm, lịch trình, ảnh và tài khoản mừng cưới ở các mục trên (tối đa 5 mốc lịch trình).</p>'),
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
    for (const [k, label] of SLOTS) {
      const p = draft.photos[k], short = label.split(/[:(]/)[0].trim();
      $('#ph-' + k).innerHTML = `<div class="lh">${esc(short)}</div>` + (p ? `<img class="thumb" src="${esc(media(p))}" alt="${esc(short)}">` : '<div class="thumb">Chưa có ảnh<br>(dùng ảnh trong album)</div>')
        + `<div class="acts"><label class="btn">Chọn ảnh<input type="file" accept="image/*" data-img="${k}"></label>${p ? `<button type="button" data-act="clear" data-target="photos.${k}">Bỏ ảnh</button>` : ''}</div>`;
    }
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
    if (b.dataset.act === 'clear') {
      set(draft, b.dataset.target, '');
      if (b.dataset.target === 'photos.hero') draft.photos.og = '';
      drawHero(); drawMusic(); return changed();
    }
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
        if (inp.dataset.img !== 'album') { draft.photos[inp.dataset.img] = paths[0]; if (inp.dataset.img === 'hero') draft.photos.og = await addShareImage(files[0]); drawHero(); }
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
  // Ảnh hiện khi gửi link (1200×630, Zalo/Messenger cắt về khổ ngang): ảnh bìa đặt trọn ở giữa, nền là chính ảnh đó phóng to, mờ và tối đi
  async function addShareImage(file) {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }), W = 1200, H = 630;
    const c = Object.assign(document.createElement('canvas'), { width: W, height: H }), g = c.getContext('2d');
    const draw = k => g.drawImage(bmp, (W - bmp.width * k) / 2, (H - bmp.height * k) / 2, bmp.width * k, bmp.height * k);
    g.fillStyle = '#6f6b47'; g.fillRect(0, 0, W, H);
    g.filter = 'blur(24px) brightness(.55)'; draw(Math.max(W / bmp.width, H / bmp.height) * 1.15);
    g.filter = 'none'; draw(Math.min(W / bmp.width, H / bmp.height));
    bmp.close();
    const path = `images/og-${uid()}.jpg`;
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
  // Thẻ xem trước khi gửi link (Zalo, Messenger đọc từ HTML, không chạy JS); data-gai là bản cho link ?nha=gai (functions/index.js chọn)
  const WD = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const partyLine = s => {
    const [y, m, d, h, mi] = s.partyAt.split(/\D/).map(Number);
    return `Tiệc cưới ${p2(h)}:${p2(mi)} ${WD[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ${p2(d)}.${p2(m)}.${y}${s.venue ? ' · ' + s.venue : ''}`;
  };
  function patchMeta(html) {
    const g = draft.groom.name, b = draft.bride.name, names = `${g} & ${b}`, og = draft.photos.og;
    const meta = (prop, v, gai = v) => {
      html = html.replace(new RegExp(`(<meta (?:property|name)="${prop}" content=")[^"]*(?:(" data-gai=")[^"]*)?`), (_, a, d) => a + esc(v) + (d ? d + esc(gai) : ''));
    };
    html = html.replace(/<title>[^<]*<\/title>/, () => `<title>${esc(names)} — Thiệp cưới</title>`);
    meta('description', 'Trân trọng kính mời bạn đến dự lễ cưới của ' + names);
    meta('og:site_name', 'Thiệp cưới ' + names);
    meta('og:title', names + ' — Thiệp cưới', `${b} & ${g} — Thiệp cưới`);
    meta('og:description', partyLine(draft.trai), partyLine(draft.gai));
    meta('og:image', new URL(og || 'images/og.jpg', SITE).href, new URL(og || 'images/og-gai.jpg', SITE).href);
    meta('og:image:alt', 'Thiệp cưới ' + names);
    return html;
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

  // ---------- Khách mời: link mời riêng, gửi qua Zalo / Messenger, đồng bộ giữa các máy ----------
  // Mỗi khách có t (lúc sửa sau cùng) để gộp giữa các máy; khách bị xoá còn lại {id, del: 1, t} để máy khác xoá theo.
  let guests = store.get('guests', []);
  const live = () => guests.filter(g => !g.del);
  const linkOf = g => SITE + '?' + new URLSearchParams(g.side === 'gai' ? { nha: 'gai', to: g.name } : { to: g.name });
  const sideOf = (v, def) => (/gai|co dau/.test(norm(v)) ? 'gai' : /trai|chu re/.test(norm(v)) ? 'trai' : def);
  const saveGuests = () => { store.set('guests', guests); drawGuests(); later(); };
  const markSent = g => { g.sent = g.t = Date.now(); saveGuests(); };
  const gmsg = m => { $('#g-msg').textContent = m; };
  $('#link-trai').value = SITE;
  $('#link-gai').value = SITE + '?nha=gai';
  $$('[data-copy]').forEach(b => b.addEventListener('click', () => copy($('#' + b.dataset.copy).value)));

  // Gửi lời mời. Điện thoại: mở bảng chia sẻ của máy, chọn Zalo / Messenger rồi chọn người nhận.
  // Máy tính: Zalo, Messenger không cho mở sẵn cuộc trò chuyện từ trang web, nên copy lời mời rồi mở bản web để dán.
  const APPS = { zalo: ['Zalo', 'https://chat.zalo.me/'], messenger: ['Messenger', 'https://www.messenger.com/'] };
  const couple = side => (draft ? (side === 'gai' ? [draft.bride, draft.groom] : [draft.groom, draft.bride]).map(p => p.name).join(' & ') : '');
  const invite = (who, side, link) => `Trân trọng kính mời ${who} đến dự lễ cưới của ${couple(side) || 'chúng tôi'}.\nThiệp mời: ${link}`;
  async function send(app, text) {
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      try { await navigator.share({ text }); return true; } catch (e) { if (e.name === 'AbortError') return false; } // lỗi khác: copy như máy tính
    }
    await copy(text, 'lời mời');
    window.open(APPS[app][1], '_blank', 'noopener');
    toast(`Đã copy lời mời. Mở cuộc trò chuyện trên ${APPS[app][0]} rồi dán (Ctrl+V) để gửi.`);
    return true;
  }
  $$('[data-send]').forEach(b => b.addEventListener('click', () => {
    const link = $('#' + b.dataset.of).value;
    send(b.dataset.send, invite('bạn', link.includes('nha=gai') ? 'gai' : 'trai', link));
  }));

  function drawGuests() {
    const q = norm($('#g-q').value), f = $('#g-filter').value, all = live();
    const shown = all.filter(g => (!q || norm(g.name + ' ' + g.note).includes(q)) && (!f || (f === 'todo' ? !g.sent : g.side === f)));
    $('#g-count').textContent = all.length ? `· ${all.length} khách, ${all.filter(g => g.sent).length} đã gửi` : '';
    $('#g-body').innerHTML = shown.map(g => {
      const l = linkOf(g);
      return `<tr data-id="${g.id}"${g.sent ? ' class="sent"' : ''}>
        <td class="g-name"><b>${esc(g.name)}</b>${g.note ? `<small>${esc(g.note)}</small>` : ''}</td>
        <td><select data-act="side" aria-label="Bên của ${esc(g.name)}"><option value="trai">Nhà trai</option><option value="gai"${g.side === 'gai' ? ' selected' : ''}>Nhà gái</option></select></td>
        <td class="g-link"><a href="${esc(l)}" target="_blank" rel="noopener">${esc(decodeURIComponent(l.replace(/\+/g, ' ')).replace(/^https?:\/\//, ''))}</a></td>
        <td class="g-send"><button type="button" data-act="zalo" aria-label="Gửi ${esc(g.name)} qua Zalo">Zalo</button><button type="button" data-act="messenger" aria-label="Gửi ${esc(g.name)} qua Messenger">Messenger</button><button type="button" data-act="copy">${g.sent ? 'Copy lại' : 'Copy link'}</button></td>
        <td class="g-del"><button type="button" data-act="del" aria-label="Xoá ${esc(g.name)}">×</button></td></tr>`;
    }).join('') || `<tr><td colspan="5" class="empty">${all.length ? 'Không có khách khớp bộ lọc.' : 'Chưa có khách nào. Nhập danh sách ở trên hoặc thêm từng khách.'}</td></tr>`;
  }
  $('#g-body').addEventListener('click', async e => {
    const b = e.target.closest('button[data-act]'), g = b && guests.find(x => x.id === b.closest('tr').dataset.id);
    if (!g) return;
    const act = b.dataset.act;
    if (act === 'copy') { copy(linkOf(g), 'link mời ' + g.name); markSent(g); }
    if (act in APPS && await send(act, invite(g.name, g.side, linkOf(g)))) markSent(g);
    if (act === 'del' && confirm(`Xoá khách "${g.name}"?`)) { guests = guests.map(x => (x === g ? { id: g.id, del: 1, t: Date.now() } : x)); saveGuests(); }
  });
  $('#g-body').addEventListener('change', e => {
    const g = guests.find(x => x.id === e.target.closest('tr')?.dataset.id);
    if (g && e.target.dataset.act === 'side') { g.side = e.target.value; g.t = Date.now(); saveGuests(); }
  });
  $('#g-q').addEventListener('input', drawGuests);
  $('#g-filter').addEventListener('change', drawGuests);
  $('#g-add').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target, name = f.gname.value.normalize('NFC').trim().replace(/\s+/g, ' '), side = f.gside.value;
    if (!name) return;
    if (live().some(g => norm(g.name) === norm(name) && g.side === side)) return toast('Khách này đã có trong danh sách');
    guests.unshift({ id: uid(), name, side, note: '', t: Date.now() });
    saveGuests();
    f.gname.value = ''; f.gname.focus();
  });

  // Đồng bộ: guests.json trong kho riêng tư (kho thiệp để công khai nên không đưa tên khách vào đó).
  // Tải bản trên kho, gộp với máy này (mỗi khách lấy bản sửa sau cùng), có khác thì lưu lại; máy khác vừa lưu (409) thì làm lại.
  let syncOn = false, syncing = false, again = false, syncTimer = 0;
  const syncMsg = (m, cls = '') => { const s = $('#g-sync'); s.textContent = m; s.className = 'note ' + cls; };
  const sig = l => l.map(g => JSON.stringify(g, Object.keys(g).sort())).sort().join('\n');
  const b64 = s => { const u = new TextEncoder().encode(s); let r = ''; for (let i = 0; i < u.length; i += 32768) r += String.fromCharCode(...u.subarray(i, i + 32768)); return btoa(r); };
  const unb64 = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g, '')), c => c.charCodeAt(0)));
  // shortcut: t lấy theo đồng hồ từng máy, máy chạy nhanh vài giây có thể thắng bản sửa mới hơn; cần chặt hơn thì đánh số phiên bản theo kho.
  function merge(a, b) {
    const m = new Map(), newer = (x, y) => (x.t || 0) > (y.t || 0) || ((x.t || 0) === (y.t || 0) && x.del && !y.del);
    for (const g of [...a, ...b]) if (!m.has(g.id) || newer(g, m.get(g.id))) m.set(g.id, g);
    // Hai máy cùng nhập một danh sách trước khi đồng bộ: trùng tên + bên thì giữ khách có id nhỏ nhất (máy nào cũng chọn như nhau)
    const first = new Map();
    for (const g of [...m.values()].filter(x => !x.del).sort((x, y) => (x.id < y.id ? -1 : 1))) {
      const k = norm(g.name) + g.side, s = first.get(k);
      if (!s) { first.set(k, g); continue; }
      const t = Math.max(s.t || 0, g.t || 0), keep = { ...s, t };
      if (!keep.note) keep.note = g.note;
      if ((g.sent || 0) > (keep.sent || 0)) keep.sent = g.sent;
      first.set(k, keep); m.set(s.id, keep); m.set(g.id, { id: g.id, del: 1, t });
    }
    return [...m.values()];
  }
  async function pull() {
    try { const f = await gh(`${DATA}/contents/guests.json?t=${Date.now()}`); return { list: JSON.parse(unb64(f.content)), sha: f.sha }; }
    catch (e) { if (e.status === 404) return { list: [] }; throw e; } // kho mới chưa có file
  }
  const push = (list, sha) => gh(`${DATA}/contents/guests.json`, {
    method: 'PUT', body: { message: 'Cập nhật danh sách khách mời', content: b64(`[\n${list.map(g => JSON.stringify(g)).join(',\n')}\n]\n`), ...(sha && { sha }) },
  });
  const later = () => { clearTimeout(syncTimer); if (syncOn) syncTimer = setTimeout(sync, 1500); };
  async function sync() {
    if (!syncOn) return;
    if (syncing) { again = true; return; }
    syncing = true; syncMsg('Đang đồng bộ…');
    try {
      for (let i = 0; ; i++) {
        const { list, sha } = await pull(), merged = merge(guests, list);
        if (sig(merged) !== sig(guests)) { guests = merged; store.set('guests', guests); drawGuests(); }
        if (sig(merged) === sig(list)) break;
        try { await push(merged, sha); break; } catch (e) { if (i >= 3 || (e.status !== 409 && e.status !== 422)) throw e; }
      }
      syncMsg(`Đã đồng bộ lúc ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}. Máy nào đăng nhập cũng thấy cùng danh sách.`, 'ok');
    } catch (e) {
      syncMsg(e.status === 401 ? 'Mã truy cập hết hạn, hãy đăng xuất rồi đăng nhập lại để đồng bộ.'
        : e.status === 403 || e.status === 404 ? `Mã truy cập chưa có quyền ghi vào kho ${GUEST_REPO}. Danh sách vẫn lưu trên máy này.`
          : `Chưa đồng bộ được (${e.message}). Danh sách vẫn lưu trên máy này, sẽ thử lại khi có thay đổi.`, 'err');
    } finally {
      syncing = false;
      if (again) { again = false; sync(); }
    }
  }
  async function initSync() {
    $('#g-setup').hidden = true; $('#g-public').hidden = true;
    try {
      const r = await gh(DATA);
      if (!r.private) { syncOn = false; $('#g-public').hidden = false; return syncMsg('Chưa đồng bộ: kho danh sách khách đang để công khai.', 'err'); }
      syncOn = true; sync();
    } catch (e) {
      syncOn = false;
      if (e.status === 404 || e.status === 403) { $('#g-setup').hidden = false; syncMsg('Danh sách đang lưu trong trình duyệt này.'); }
      else syncMsg('Chưa kết nối được kho danh sách khách: ' + e.message, 'err');
    }
  }
  $('#g-retry').addEventListener('click', initSync);
  $('#g-retry2').addEventListener('click', initSync);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); }); // quay lại trang: lấy thay đổi từ máy khác
  syncMsg('Danh sách đang lưu trong trình duyệt này. Đăng nhập ở tab Nội dung thiệp để đồng bộ giữa các máy.');

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
    const have = new Set(live().map(g => norm(g.name) + g.side)), t = Date.now();
    let added = 0, dup = 0;
    for (const r of rows) {
      const name = (r[iName] || '').normalize('NFC').replace(/\s+/g, ' ').slice(0, 60);
      if (!name) continue;
      const side = iSide >= 0 ? sideOf(r[iSide] || '', def) : def, key = norm(name) + side;
      if (have.has(key)) { dup++; continue; }
      have.add(key); added++;
      guests.push({ id: uid(), name, side, note: iNote >= 0 ? (r[iNote] || '').slice(0, 100) : '', t });
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
    const rows = [['Tên khách', 'Bên', 'Ghi chú', 'Link mời', 'Đã gửi'],
      ...live().map(g => [g.name, g.side === 'gai' ? 'Nhà gái' : 'Nhà trai', g.note, linkOf(g), g.sent ? new Date(g.sent).toLocaleString('vi-VN') : ''])];
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob(['\ufeff' + rows.map(r => r.map(q).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' })), download: 'khach-moi.csv',
    });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  $('#g-clear').addEventListener('click', () => {
    const n = live().length, t = Date.now();
    if (n && confirm(`Xoá toàn bộ ${n} khách khỏi danh sách${syncOn ? ' (trên mọi máy)' : ''}?`)) { guests = guests.map(g => (g.del ? g : { id: g.id, del: 1, t })); saveGuests(); }
  });

  drawGuests();
  if (token) login(); else $('#login').hidden = false;
})();
