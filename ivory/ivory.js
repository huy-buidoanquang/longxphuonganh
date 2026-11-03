'use strict';
// Thiệp mẫu Ivory: dựng trang từ IVORY_DESIGN (bố cục) + CONTENT (content.js). Co giãn giống trang Canva gốc:
// màn rộng >= 0.8*1366 thì cả khung 1366 thu theo bề ngang; màn hẹp thì phóng từng khối theo cột nội dung.
(() => {
  const D = window.IVORY_DESIGN, C = window.CONTENT || {}, REF = window.IVORY_REF; // IVORY_REF: chỉ có khi chạy test đối chiếu
  const W = D.W, PAGE = document.body.dataset.page, P = D.pages[PAGE];
  const params = new URLSearchParams(location.search);
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const p2 = v => String(v).padStart(2, '0');
  if (REF?.css) document.head.insertAdjacentHTML('beforeend', `<style>${REF.css}</style>`);
  const FONTS = REF?.fonts || { script: "'Iv Script'", display: "'Iv Display'", serif: "'Iv Serif'", caps: "'Iv Caps'", cardo: "'Iv Cardo'", young: "'Iv Young'", italic: "'Iv Italic'", mono: "'Iv Mono'" };

  // ---------- Nội dung ----------
  const side = params.get('nha') === 'gai' ? 'gai' : 'trai', S = C[side] || {};
  const [A, B] = side === 'gai' ? [C.bride || {}, C.groom || {}] : [C.groom || {}, C.bride || {}];
  const I = C.ivory || {};
  const when = s => { const [y, m, d, h, mi] = String(s || '').split(/\D/).map(Number); return { y, m, d, h, mi, ok: y > 2000 }; };
  const party = when(S.partyAt);
  const last = s => String(s || '').trim().split(/\s+/).pop() || '';
  const lines = s => String(s ?? '').split('\n');
  const up = (path, ok) => (ok.test(path || '') ? (/^https:/.test(path) ? path : '../' + path) : '');
  const photoSrc = p => up(p, /^(https:|images\/)/);
  const directions = /^https:\/\//.test(S.directions || '') ? S.directions : 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(S.map || S.venueAddress || '');
  const banks = [A, B].filter(p => p.bank?.code && p.bank?.account);
  const parentsLine = P_ => [P_.father && 'Ông ' + P_.father, P_.mother && 'Bà ' + P_.mother].filter(Boolean).join(' & ');
  const addrSplit = a => { const s = String(a || ''), i = s.lastIndexOf(','); return i < 0 ? [s] : [s.slice(0, i + 1), s.slice(i + 1).trim()]; };
  const rsvpBy = () => { if (!party.ok) return ''; const t = new Date(Date.UTC(party.y, party.m - 1, party.d - 7)); return `trước ngày ${p2(t.getUTCDate())}.${p2(t.getUTCMonth() + 1)}`; };
  const sched = (S.schedule || []).slice(0, 5);
  const row0 = Math.floor((5 - sched.length) / 2); // ít mục thì đặt các dòng vào giữa thẻ
  const TXT = {
    'p1.invite': I.invite || 'Trân trọng\nkính mời!',
    'p1.tap': I.tap || 'Chạm vào phong bì\nđể mở thiệp...',
    'p1.mono': [last(A.name).charAt(0), last(B.name).charAt(0)],
    's0.wedo': I.wedo || 'Cưới thôi!',
    's0.join': I.join || 'Thân mời bạn đến dự\nlễ cưới của',
    's0.names': [A.name || '', I.and || 'và', B.name || ''],
    's0.date': party.ok ? `${party.d} tháng ${party.m} năm ${party.y}\nvào lúc ${party.h} giờ ${p2(party.mi)}` : '',
    's0.addr': [S.venue ? S.venue + ',' : '', ...addrSplit(S.venueAddress)].filter(Boolean).join('\n'),
    's1.mood': I.mood || 'Chạm để\nbật nhạc!',
    's1.left': I.left || 'Đếm ngược đến',
    's1.wedding': I.wedding || 'ngày cưới',
    's2.our': I.our || 'Địa',
    's2.location': I.location || 'điểm',
    's2.venue': S.venue || '',
    's2.desc': S.venueAddress || '',
    's2.view': I.view || 'Xem bản đồ',
    's2.stay': [I.stayTitle || 'Gia đình hai bên', ...(I.stay ? lines(I.stay) : [
      `Nhà ${side === 'gai' ? 'gái' : 'trai'}: ${parentsLine(A)}`, lines(A.address).join(', '),
      `Nhà ${side === 'gai' ? 'trai' : 'gái'}: ${parentsLine(B)}`, lines(B.address).join(', ')])],
    's3.the': I.the || 'Ngày', 's3.day': I.day || 'Vui',
    's4.the': I.detailsThe || 'Gửi', 's4.details': I.details || 'quý khách',
    's4.attire': I.attire || 'Trang phục',
    's4.attireTxt': I.attireTxt || 'Rất mong quý khách diện trang phục\nlịch sự, trang nhã.\nƯu tiên tông màu nhẹ nhàng, trung tính.',
    's4.trans': I.trans || 'Đi lại',
    's4.transTxt': I.transTxt || 'Quý khách vui lòng xem bản đồ chỉ đường\nđể đến đúng địa điểm và giờ tiệc.\nCần hỗ trợ đi lại, xin báo chúng mình\nở phần xác nhận tham dự bên dưới.',
    's4.acc': I.acc || 'Chỗ nghỉ',
    's4.accTxt': I.accTxt || 'Quý khách ở xa cần hỗ trợ chỗ nghỉ,\nxin báo chúng mình ở phần\nxác nhận tham dự bên dưới.',
    's4.book': I.book || 'Xác nhận',
    's4.gifts': I.gifts || 'Mừng cưới',
    's4.giftsTxt': I.giftsTxt || 'Sự hiện diện của quý khách là món quà\nquý giá nhất với chúng mình.',
    's4.registry': I.registry || 'Mừng cưới',
    's5.kindly': I.kindly || 'Vui lòng', 's5.rsvp': I.rsvp || 'Xác nhận', 's5.by': I.rsvpBy || rsvpBy(), 's5.fill': I.fill || 'Điền thông tin bên dưới nhé!',
    's7.thanks': I.thanks || 'Cảm ơn!',
    's7.msg': I.msg || `${C.footer || 'Sự hiện diện của quý khách là niềm vinh hạnh của gia đình chúng tôi!'}\nThân thương,`,
    's7.sign': `${A.name || ''} & ${B.name || ''}`,
  };
  sched.forEach((it, i) => { TXT[`s3.t${row0 + i + 1}`] = it.time || ''; TXT[`s3.l${row0 + i + 1}`] = it.title || ''; });
  const ICON = { cake: 'ic.rings', cook: 'ic.dinner', rings: 'ic.rings', glass: 'ic.glass', camera: 'ic.camera', dinner: 'ic.dinner', disco: 'ic.disco' };
  const rowOf = k => +(/^(?:s3\.[tl]|orn\.u)(\d)$/.exec(k)?.[1] || 0) || ['ic.rings', 'ic.glass', 'ic.camera', 'ic.dinner', 'ic.disco'].indexOf(k) + 1;
  const rowItem = k => { const r = rowOf(k); return r ? sched[r - 1 - row0] : undefined; };
  const PHOTO = { 'photo.hero': C.photos?.hero, 'photo.a1': C.photos?.album?.[0], 'photo.a2': C.photos?.album?.[1], 'photo.close': C.photos?.album?.[2], 'photo.venue': I.venuePhoto };
  const hidden = k => (rowOf(k) && !REF ? !rowItem(k) : false) || (/registry$/.test(k) && !REF && !banks.length);

  // ---------- Dựng DOM ----------
  const paraHTML = (p, st) => {
    const runs = Array.isArray(p) ? p : [{ t: p }];
    const css = `font-family:${FONTS[st.f]};font-size:${st.s}px;line-height:${st.lh}px;color:${st.c};text-align:${st.a}` +
      (st.ls ? `;letter-spacing:${st.ls}` : '') + (st.tt ? `;text-transform:${st.tt}` : '') + (st.kn ? ';font-kerning:normal' : '');
    const br = t => esc(t).replace(/\n/g, '<br>'); // như Canva: dấu cách gộp lại, xuống dòng bằng <br>
    return `<p style="${css}">${runs.map(r => r.sup != null ? `<span class="sup" style="font-size:${r.fs || '.6em'};bottom:${r.sup / 100 * st.s}px">${br(r.t)}</span>` : br(r.t)).join('')}</p>`;
  };
  function textEl(e) {
    let v = REF ? REF.txt[e.k] : TXT[e.k];
    const paras = REF ? v : Array.isArray(v) ? v : [v ?? ''];
    if (!REF && !e.wrap && paras.length > e.ps.length) paras.splice(e.ps.length - 1, paras.length, paras.slice(e.ps.length - 1).join('\n'));
    const html = paras.map((p, i) => paraHTML(p, e.ps[Math.min(i, e.ps.length - 1)])).join('');
    return `<div class="tb" style="width:${e.bw}px;height:${e.bh}px;transform:scale(${e.sc})"><div class="ti${e.wrap && !REF ? ' wrap' : ''}" style="transform:translate(${e.dx}px,${e.dy}px)${e.sh ? ';text-shadow:' + e.sh : ''}">${html}</div></div>`;
  }
  function imgEl(e) {
    if (/^photo\./.test(e.k) && !REF) {
      const src = photoSrc(PHOTO[e.k]) || photoSrc(C.photos?.hero);
      if (e.k === 'photo.venue' && !photoSrc(PHOTO[e.k])) { // chưa có ảnh nơi tổ chức: hiện bản đồ
        const q = encodeURIComponent(S.map || S.venueAddress || '');
        return `<div class="clip"><iframe class="map" title="Bản đồ" loading="lazy" src="https://maps.google.com/maps?q=${q}&z=16&output=embed"></iframe></div>`;
      }
      return `<div class="clip"><img class="photo" alt="" src="${esc(src)}"></div>`;
    }
    let src = REF ? REF.img[e.k] : `art/${e.k}.webp`;
    if (!REF && /^ic\.(rings|glass|camera|dinner|disco)$/.test(e.k)) src = `art/${ICON[rowItem(e.k)?.icon] || e.k}.webp`;
    const fit = !REF && /^ic\./.test(e.k) ? ' class="contain"' : ''; // biểu tượng có thể đổi theo lịch trình nên giữ nguyên tỉ lệ
    const flip = e.fl && REF ? ' style="transform:scaleX(-1)"' : ''; // ảnh gốc Canva lật ngang; ảnh tự vẽ đã vẽ đúng chiều
    return `<div class="clip"${flip}><img${fit} alt="" src="${esc(src)}"${e.op ? ` style="opacity:${e.op}"` : ''}></div>`; // vị trí ảnh do layout() đặt
  }
  const embedEl = e => ({ music: () => '<button class="music" type="button" aria-label="Bật/tắt nhạc"></button><audio preload="none" loop></audio>', countdown: countdownHTML, form: formHTML }[e.k] || (() => ''))();
  function elHTML(e) {
    const k = esc(e.k), hide = hidden(e.k) ? ' hidden' : '';
    if (e.t === 'a') return `<a class="el open" data-k="${k}" href="page-2${esc(location.search)}" aria-label="Mở thiệp"></a>`;
    if (e.t === 'e') return `<div class="el emb" data-k="${k}"${hide}>${embedEl(e)}</div>`;
    const inner = e.t === 't' ? textEl(e) : imgEl(e);
    const link = { 's2.view': directions, 's4.book': '#rsvp', 's4.registry': '#mung-cuoi' }[e.k];
    if (link && !REF) return `<a class="el t" data-k="${k}" href="${esc(link)}"${/^https/.test(link) ? ' target="_blank" rel="noopener"' : ''}${hide}>${inner}</a>`;
    return `<div class="el ${e.t}" data-k="${k}"${hide}>${inner}</div>`;
  }
  const bgSrc = (i) => (REF ? REF.bg[PAGE][i] : 'art/bg.paper.webp');
  const root = $('#page');
  root.innerHTML = P.secs.map((s, i) => `<section class="sec" data-i="${i}"><img class="bg" alt="" src="${esc(bgSrc(i))}"><div class="box"><div class="stage">${s.els.map(elHTML).join('')}</div></div></section>`).join('');

  // ---------- Co giãn ----------
  const rotBox = e => { // khung bao sau khi xoay quanh tâm
    if (!e.r) return [e.x, e.x + e.w];
    const a = e.r * Math.PI / 180, hw = (Math.abs(Math.cos(a)) * e.w + Math.abs(Math.sin(a)) * e.h) / 2, cx = e.x + e.w / 2;
    return [cx - hw, cx + hw];
  };
  P.secs.forEach(s => { let l = 1e9, r = -1e9; s.els.forEach(e => { const [a, b] = rotBox(e); l = Math.min(l, a); r = Math.max(r, b); }); s.L = l; s.C = r - l; });
  let lastW = 0;
  function layout() {
    const vw = document.documentElement.clientWidth;
    if (vw === lastW) return; lastW = vw;
    const desk = vw >= 0.8 * W;
    $$('.sec', root).forEach((sec, i) => {
      const s = P.secs[i];
      const k = desk ? Math.min(1, vw / W) : Math.min(0.92 * vw / s.C, vw / (0.9 * vw + 0.1 * W));
      const ox = desk ? (vw - W * k) / 2 : (vw - s.C * k) / 2 - s.L * k, h = s.h * k;
      sec.style.minHeight = h + 'px';
      sec.dataset.k = k; sec.dataset.ox = ox;
      $('.box', sec).style.height = h + 'px';
      // như Canva: mỗi phần tử đặt bằng px thật (không thu cả khối bằng scale) để ảnh và chữ vẽ ra y hệt
      $$('.stage > .el', sec).forEach((el, j) => {
        const e = s.els[j];
        Object.assign(el.style, { width: e.w * k + 'px', height: e.h * k + 'px', transform: `translate(${e.x * k + ox}px,${e.y * k}px)${e.r ? ` rotate(${e.r}deg)` : ''}` });
        if (e.t === 'a') el.style.borderRadius = e.rr * k + 'px';
        if (e.t === 't') $('.tb', el).style.transform = `scale(${e.sc * k})`;
        if (e.t === 'e') { const c = $('.cd, .rsvp', el); if (c) c.style.transform = `scale(${e.w * k / (c.classList.contains('cd') ? 595.238 : 1732.19)})`; }
        if (e.t === 'i') {
          const img = $('img:not(.photo):not(.contain)', el), ib = e.ib || [0, 0, e.w, e.h];
          if (img) Object.assign(img.style, { left: ib[0] * k + 'px', top: ib[1] * k + 'px', width: ib[2] * k + 'px', height: ib[3] * k + 'px' });
          if (e.k === 'photo.venue') $('.clip', el).style.borderRadius = 17 * k + 'px';
        }
      });
    });
    placeBg();
  }
  function placeBg() {
    const vw = document.documentElement.clientWidth, desk = vw >= 0.8 * W;
    $$('.sec', root).forEach((sec, i) => {
      const s = P.secs[i], bg = $('.bg', sec), k = +sec.dataset.k, ox = +sec.dataset.ox, H = sec.offsetHeight, hBox = s.h * k;
      const [dx, dy, dw, dh] = s.bg.d, ar = dw / dh;
      let x, y, w, h;
      if (desk && H <= hBox + 1) { // khung nền theo thiết kế; thiếu chỗ thì phóng quanh tâm cho phủ kín
        x = dx * k + ox; y = dy * k; w = dw * k; h = dh * k;
        const f = Math.max(1, (x > 0 ? (w / 2) / (w / 2 - x) : 1), (x + w < vw ? (w / 2) / (vw - x - w / 2) : 1), (y > 0 ? (h / 2) / (h / 2 - y) : 1), (y + h < H ? (h / 2) / (H - y - h / 2) : 1));
        if (f > 1) { const cx = x + w / 2, cy = y + h / 2; w *= f; h *= f; x = cx - w / 2; y = cy - h / 2; }
      } else { // màn hẹp (hoặc khối bị kéo cao): phủ theo chiều cao với độ phóng đo từ trang gốc
        const [z, fy] = s.bg.m || [1, 0];
        h = Math.max(z * H, vw / ar); w = h * ar; x = (vw - w) / 2; y = -fy * h;
      }
      Object.assign(bg.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
    });
  }

  // ---------- Chữ vừa khung (nội dung thật có thể dài hơn chữ mẫu) ----------
  function fit() {
    if (REF) return;
    $$('.el.t .ti', root).forEach(ti => {
      const tb = ti.parentElement, bw = parseFloat(tb.style.width), bh = parseFloat(tb.style.height), ps = $$('p', ti);
      ps.forEach(p => { p.style.fontSize = p.dataset.fs || (p.dataset.fs = p.style.fontSize); p.style.lineHeight = p.dataset.lh || (p.dataset.lh = p.style.lineHeight); });
      const [dx, dy] = (ti.dataset.tr || (ti.dataset.tr = ti.style.transform)).match(/-?[\d.]+/g).map(Number);
      ti.style.width = ''; ti.style.transform = ti.dataset.tr;
      const wide = () => Math.max(...ps.map(p => { const r = document.createRange(); r.selectNodeContents(p); return r.getBoundingClientRect().width / (tb.getBoundingClientRect().width / bw || 1); }));
      const tall = () => ti.scrollHeight;
      const wrap = ti.classList.contains('wrap');
      let room = bw;
      if (!wrap && wide() > bw + 0.5) { // chữ một dòng dài hơn chữ mẫu: nới khung sang hai bên (tối đa 1,2 lần) rồi mới co chữ
        const extra = Math.min(wide() - bw + 1, bw * 0.2), al = ps[0].style.textAlign, shift = al === 'center' ? extra / 2 : al === 'right' ? extra : 0;
        room = bw + extra; ti.style.width = room + 'px'; ti.style.transform = `translate(${dx - shift}px,${dy}px)`;
      }
      let f = 1;
      for (let n = 0; n < 12 && ((!wrap && wide() > room + 0.5) || tall() > bh * 1.12 + 2) && f > 0.55; n++) {
        f *= 0.94;
        ps.forEach(p => { p.style.fontSize = parseFloat(p.dataset.fs) * f + 'px'; p.style.lineHeight = parseFloat(p.dataset.lh) * f + 'px'; });
      }
    });
  }

  // ---------- Đếm ngược ----------
  function countdownHTML() {
    const g = (id, u) => `<span class="g"><b data-cd="${id}">00</b><i>${u}</i></span>`;
    return `<div class="cd">${g('d', 'Ngày')}<span class="c">:</span>${g('h', 'Giờ')}<span class="c">:</span>${g('m', 'Phút')}<span class="c">:</span>${g('s', 'Giây')}</div>`;
  }
  function tick() {
    const end = party.ok ? Date.UTC(party.y, party.m - 1, party.d, party.h - 7, party.mi) : 0; // giờ Việt Nam UTC+7
    const t = Math.max(0, Math.floor((end - Date.now()) / 1000));
    const v = { d: Math.floor(t / 86400), h: p2(Math.floor(t / 3600) % 24), m: p2(Math.floor(t / 60) % 60), s: p2(t % 60) };
    v.d = v.d < 10 ? p2(v.d) : String(v.d);
    $$('[data-cd]', root).forEach(b => { b.textContent = v[b.dataset.cd]; });
  }

  // ---------- Xác nhận tham dự ----------
  function formHTML() {
    const F = { name: 'Họ và tên*', attend: 'Bạn sẽ đến chung vui cùng chúng mình chứ?*', yes: 'Có, mình sẽ đến!', no: 'Tiếc quá, mình không đến được.',
      count: 'Bạn đi cùng mấy người (tính cả bạn)?*', song: 'Gợi ý một bài hát cho buổi tiệc nhé!', menu: 'Chọn thực đơn:*',
      menus: I.menus ? lines(I.menus).map(t => t.trim()).filter(Boolean) : ['Thực đơn thường', 'Thực đơn chay', 'Không ăn được hải sản'], help: 'Bạn có cần hỗ trợ chỗ nghỉ hoặc đi lại không?*',
      helpNo: 'Không, mình tự lo được.', helpYes: 'Có, nhờ hỗ trợ giúp mình!', phone: 'Số điện thoại để tiện liên lạc khi cần*', send: 'Gửi', note: 'Thông tin chỉ gửi tới cô dâu chú rể.', ...(REF?.form || I.form || {}) };
    let n = 0;
    const opt = (nm, v, t) => `<label class="opt"><input type="radio" name="${nm}" value="${esc(v)}"><span>${esc(t)}</span></label>`;
    const field = (lab, body, group) => { const id = 'q' + ++n; return group ? `<div class="fld" role="radiogroup" aria-labelledby="${id}"><span class="lab" id="${id}">${esc(lab)}</span><div class="opts">${body}</div></div>` : `<label class="fld"><span class="lab">${esc(lab)}</span>${body}</label>`; };
    const guest = REF ? '' : params.get('to') || '';
    return `<form class="rsvp" novalidate><div class="flds">${[
      field(F.name, `<input name="name" autocomplete="name" maxlength="80" value="${esc(guest)}">`),
      field(F.attend, opt('attend', 'Có', F.yes) + opt('attend', 'Không', F.no), 1),
      field(F.count, '<input name="guests" inputmode="numeric" maxlength="2">'),
      field(F.song, '<input name="song" maxlength="120">'),
      field(F.menu, (F.menus || []).filter(Boolean).map(m => opt('menu', m, m)).join(''), 1),
      field(F.help, opt('help', 'Không', F.helpNo) + opt('help', 'Có', F.helpYes), 1),
      field(F.phone, '<input name="phone" type="tel" autocomplete="tel" maxlength="20">'),
    ].join('')}</div><div class="foot"><button class="send" type="submit">${esc(F.send)}</button><p class="note">${esc(F.note)}</p><p class="msg" role="status"></p></div></form>`;
  }
  function wireForm() {
    const f = $('form.rsvp', root); if (!f || REF) return;
    const msg = $('.msg', f), endpoint = /^https:\/\//.test(C.rsvp?.endpoint || '') ? C.rsvp.endpoint : '';
    f.addEventListener('submit', async e => {
      e.preventDefault();
      const v = Object.fromEntries(new FormData(f));
      const bad = !String(v.name || '').trim() ? 'name' : !v.attend ? 'attend' : v.attend === 'Có' && !/^\d{1,2}$/.test(String(v.guests || '').trim()) ? 'guests' : !v.menu && v.attend === 'Có' ? 'menu' : !v.help ? 'help' : !/^[\d +().-]{8,20}$/.test(String(v.phone || '').trim()) ? 'phone' : '';
      if (bad) { msg.textContent = 'Bạn điền giúp mình các mục có dấu * nhé.'; f.elements[bad]?.[0]?.focus?.() || f.elements[bad]?.focus?.(); return; }
      const data = { name: v.name.trim(), attend: v.attend, guests: v.attend === 'Có' ? +v.guests : 0,
        message: [v.song && 'Bài hát: ' + v.song, v.menu && 'Thực đơn: ' + v.menu, 'Cần hỗ trợ chỗ nghỉ/đi lại: ' + v.help, 'SĐT: ' + v.phone.trim()].filter(Boolean).join(' | ') };
      const btn = $('.send', f); btn.disabled = true;
      if (endpoint) {
        try { await fetch(endpoint, { method: 'POST', mode: 'no-cors', body: new URLSearchParams({ type: 'rsvp', ...data }) }); }
        catch { btn.disabled = false; msg.textContent = 'Chưa gửi được, bạn thử lại giúp mình nhé.'; return; }
      } else {
        const body = `Họ tên: ${data.name}\nTham dự: ${data.attend}\nSố người: ${data.guests}\n${data.message.replace(/ \| /g, '\n')}`;
        location.href = `mailto:${C.rsvp?.email || ''}?subject=${encodeURIComponent('Xác nhận tham dự - ' + data.name)}&body=${encodeURIComponent(body)}`;
      }
      msg.textContent = data.attend === 'Có' ? `Cảm ơn ${data.name}! Hẹn gặp bạn trong ngày vui của chúng mình.` : `Cảm ơn ${data.name} đã báo tin, chúng mình vẫn luôn nhớ đến bạn.`;
    });
  }

  // ---------- Nhạc ----------
  function wireMusic() {
    const btn = $('.music', root), au = $('audio', root); if (!btn || REF) return;
    const src = up(C.music, /^(https:|audio\/)/);
    if (!src) { btn.disabled = true; return; }
    au.src = src;
    btn.addEventListener('click', () => { if (au.paused) au.play().catch(() => {}); else au.pause(); });
    au.addEventListener('play', () => root.classList.add('playing'));
    au.addEventListener('pause', () => root.classList.remove('playing'));
  }

  // ---------- Mừng cưới ----------
  function wireGift() {
    if (REF || !banks.length) return;
    const dlg = document.createElement('dialog'); dlg.className = 'gift'; dlg.id = 'mung-cuoi-dlg';
    dlg.innerHTML = `<form method="dialog"><button class="x" aria-label="Đóng">×</button></form>` + banks.map(p => {
      const b = p.bank, qr = `https://img.vietqr.io/image/${encodeURIComponent(b.code)}-${encodeURIComponent(b.account)}-qr_only.png?accountName=${encodeURIComponent(b.holder)}`;
      return `<div class="qr"><h3>${esc(p.role)}</h3><img loading="lazy" alt="Mã QR ${esc(b.name)}" src="${esc(qr)}"><p>${esc(b.name)}</p><p class="acc">${esc(b.account)}</p><p>${esc(b.holder)}</p></div>`;
    }).join('');
    document.body.append(dlg);
    $$('a[href="#mung-cuoi"]', root).forEach(a => a.addEventListener('click', e => { e.preventDefault(); dlg.showModal(); }));
  }

  // ---------- Chạy ----------
  if (PAGE === 'p2' && !REF) $$('.sec', root)[6]?.setAttribute('id', 'rsvp');
  document.title = `${A.name || ''} & ${B.name || ''} — Thiệp cưới`;
  layout();
  addEventListener('resize', layout);
  (document.fonts?.ready || Promise.resolve()).then(() => { fit(); placeBg(); document.documentElement.classList.add('ready'); });
  if (!REF) { tick(); setInterval(tick, 1000); }
  wireForm(); wireMusic(); wireGift();
})();
