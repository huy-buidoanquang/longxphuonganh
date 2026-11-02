'use strict';
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const HEART = '<svg viewBox="0 0 24 24"><use href="#i-heart"/></svg>';
  const COLORS = ['#a8323b', '#ece4d8', '#c9a24a', '#7a1f26'];
  const params = new URLSearchParams(location.search);

  // ?nha=gai: thiệp bên nhà gái theo bản in nhà gái (tên cô dâu đứng trước, lễ vu quy, tiệc 16/11 ở NVH Tân Trại).
  // Không có tham số thì giữ nguyên thiệp nhà trai viết sẵn trong index.html.
  if (params.get('nha') === 'gai') {
    const swap = sel => { const [a, b] = $$(sel), t = document.createComment(''); a.replaceWith(t); b.replaceWith(a); t.replaceWith(b); };
    ['.intro-names > span:not(.amp)', '.hero-names p', '.parent', '.couple h3', '.couple .role', '.tline li'].forEach(swap);
    const set = (sel, text) => { $(sel).textContent = text; };
    set('.intro-date span', '16 tháng 11, 2026');
    set('.announce span', 'TRÂN TRỌNG BÁO TIN\nLỄ VU QUY CỦA CON CHÚNG TÔI');
    set('.when .big16', 'HÔN LỄ ĐƯỢC CỬ HÀNH TẠI\nTƯ GIA NHÀ GÁI');
    set('.when .time-row > span', 'VÀO LÚC 09:00');
    set('.party .time-row > span:last-child > span', 'THỨ HAI');
    set('.party .dd', '16');
    set('.party .lunar', '(Tức ngày 08 tháng 10 năm Bính Ngọ)');
    set('#venue-addr', 'Nhà Văn Hóa Tân Trại\nThôn Tân Trại, Xã Nội Bài, Hà Nội');
    set('.tline li:first-child .tl-name span', 'Tiệc cưới (16/11)');
    $('.tline li:last-child .rel').firstChild.nodeValue = '09:00';
    set('.tline li:last-child .tl-name span', 'Lễ vu quy (17/11)');
    set('.sign span', '♡ Phương Anh & Ngọc Long');
    $('.cal').dataset.date = '2026-11-16T16:30:00+07:00';
    $('.map').src = 'https://maps.google.com/maps?q=21.2087625,105.7975156&z=16&output=embed'; // plus code 6Q5X+G22 trong QR nhà gái
    $('.directions').href = 'https://maps.app.goo.gl/pbwnjAmeM1ftQhQS8';
    document.title = 'Phương Anh & Ngọc Long — Thiệp cưới';
  }

  // Ảnh giữ chỗ khi chưa có file ảnh trong images/
  $$('img[data-ph]').forEach(img => {
    const fallback = () => { img.src = window.artPhoto(+img.dataset.ph); };
    if (img.complete && !img.naturalWidth) fallback(); else img.addEventListener('error', fallback, { once: true });
  });

  // ?to=Anh%20Huy -> "Thân Mời / Anh Huy"
  const guest = (params.get('to') || '').trim().slice(0, 60);
  if (guest) { const el = $('#guest-name'); el.textContent = guest; el.hidden = false; }

  // ---------- Màn mở thiệp ----------
  const intro = $('#intro'), musicBox = $('.music'), musicBtn = $('#music-btn');
  const hearts = $('.intro-hearts');
  if (!reduce) for (let i = 0; i < 12; i++) {
    const d = document.createElement('div'), dur = rnd(18, 26);
    d.innerHTML = HEART;
    d.style.cssText = `left:${rnd(0, 100)}%;font-size:${rnd(12, 23)}px;color:${COLORS[i % 4]};--sway:${rnd(-30, 30)}px;--dur:${dur}s;--delay:${-rnd(0, dur)}s`;
    hearts.appendChild(d);
  }

  // Thẻ mời giữ nguyên bố cục, chỉ thu nhỏ cho vừa máy hẹp (Galaxy Fold) hoặc điện thoại xoay ngang
  const wrap = $('.intro-wrap');
  const fitIntro = () => { wrap.style.scale = Math.min(1, (innerWidth - 24) / wrap.offsetWidth, (innerHeight - 24) / wrap.offsetHeight).toFixed(3); };
  fitIntro();
  document.fonts?.ready.then(fitIntro);
  addEventListener('resize', fitIntro);

  let music = null;
  const setPlaying = on => { musicBox.classList.toggle('playing', on); musicBtn.setAttribute('aria-pressed', on); };
  musicBtn.addEventListener('click', () => { music = music || createMusic(); if (music) setPlaying(music.toggle()); });

  $('#open-btn').addEventListener('click', () => {
    if (intro.classList.contains('opening')) return;
    music = createMusic();
    if (music) setPlaying(music.start());
    intro.classList.add('opening');
    const ring = document.createElement('div');
    ring.className = 'seal-ring';
    $('.intro-wrap').appendChild(ring);
    // nhịp như mẫu: 0s dấu vỡ + hoa bay; 0,5s thiệp bay lên + tim bung; 1,3s lớp phủ mờ dần; 1,5s vào thiệp
    if (!reduce) setTimeout(() => {
      for (let i = 0; i < 32; i++) {
        const b = document.createElement('div'), a = rnd(0, Math.PI * 2), dist = rnd(90, 420);
        b.className = 'burst'; b.innerHTML = HEART;
        b.style.cssText = `font-size:${rnd(4, 32)}px;color:${COLORS[i % 4]};--dx:${Math.cos(a) * dist}px;--dy:${Math.sin(a) * dist}px;--rot-start:${rnd(-30, 30)}deg;--rot-end:${rnd(-220, 220)}deg;--delay:${rnd(0, 150)}ms`;
        intro.appendChild(b);
      }
    }, 500);
    setTimeout(() => intro.classList.add('fade'), 1300);
    setTimeout(() => { intro.remove(); removeEventListener('resize', fitIntro); document.body.classList.remove('locked'); musicBox.hidden = false; }, 1500);
    if (!reduce) autoScroll();
  });

  // Tự cuộn chậm ~50px/giây từ giây thứ 3,4; dừng hẳn khi người xem tự lăn, chạm, bấm phím hoặc nhấn chuột
  function autoScroll() {
    let stopped = false;
    const stop = () => { stopped = true; };
    ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(ev => addEventListener(ev, stop, { once: true, passive: true }));
    setTimeout(() => {
      let y = scrollY, last = performance.now();
      requestAnimationFrame(function step(t) {
        if (stopped) return;
        y += (t - last) * .05; last = t;
        if (y >= document.documentElement.scrollHeight - innerHeight) return;
        scrollTo(0, y);
        requestAnimationFrame(step);
      });
    }, 3400);
  }

  // ---------- Hoa trang trí trôi xuống theo 300px cuộn đầu tiên (0 → 40px) ----------
  const pars = $$('.bq-par');
  if (!reduce) {
    let ticking = false;
    const upd = () => {
      ticking = false;
      const t = `translateY(${(Math.min(scrollY / 300, 1) * 40).toFixed(1)}px)`;
      pars.forEach(el => { el.style.transform = t; });
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(upd); } }, { passive: true });
  }

  // ---------- Tên cô dâu chú rể: chung một cỡ, tối đa 46px, co lại để tên dài nhất vừa khung ----------
  const names = $$('.couple h3');
  const fitNames = () => {
    names.forEach(h => { h.style.fontSize = '46px'; });
    const r = document.createRange();
    const k = Math.min(1, ...names.map(h => { r.selectNodeContents(h); return .95 * h.clientWidth / r.getBoundingClientRect().width; }));
    names.forEach(h => { h.style.fontSize = Math.floor(46 * k) + 'px'; });
  };
  fitNames();
  document.fonts?.ready.then(fitNames);
  addEventListener('resize', fitNames);

  // ---------- Lịch tháng + "Thêm vào lịch" ----------
  const cal = $('.cal'), iso = cal.dataset.date;
  const [Y, M, D] = iso.slice(0, 10).split('-').map(Number), [hh, mm] = iso.slice(11, 16).split(':').map(Number);
  $('.cal-title').textContent = `Tháng ${M} / ${Y}`;
  let cells = '<div></div>'.repeat((new Date(Y, M - 1, 1).getDay() + 6) % 7);
  for (let d = 1, n = new Date(Y, M, 0).getDate(); d <= n; d++) {
    cells += d === D
      ? `<div><div class="cal-heart" aria-label="Ngày cưới ${d}"><svg viewBox="0 0 24 22"><use href="#i-cal-heart"/></svg><span>${d}</span></div></div>`
      : `<div><span>${d}</span></div>`;
  }
  $('.cal-days').innerHTML = cells;
  const p2 = v => String(v).padStart(2, '0'), day = `${Y}${p2(M)}${p2(D)}`;
  $('#add-cal').href = 'https://calendar.google.com/calendar/render?' + new URLSearchParams({
    action: 'TEMPLATE', text: 'Tiệc cưới ' + $$('.hero-names p').map(p => p.textContent).join(' & '),
    dates: `${day}T${p2(hh)}${p2(mm)}00/${day}T${p2(Math.min(hh + 2, 23))}${p2(mm)}00`,
    details: 'Rất hân hạnh được đón tiếp!', location: $('#venue-addr').textContent.replace(/\s*\n\s*/g, ', '), ctz: 'Asia/Ho_Chi_Minh',
  });

  // ---------- Album xoay 3D ----------
  const items = $$('.cf-item'), N = items.length, dots = $('#cf-dots');
  let cur = 0;
  items.forEach((el, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.setAttribute('aria-label', `Ảnh ${i + 1}`);
    b.addEventListener('click', () => nav(i));
    dots.appendChild(b);
    el.tabIndex = 0; el.setAttribute('role', 'button'); el.setAttribute('aria-label', `Xem ảnh ${i + 1}`);
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); } });
  });
  function go(i) {
    cur = (i + N) % N;
    items.forEach((el, j) => {
      let k = (j - cur + N) % N;
      if (k > N / 2) k -= N;
      const a = Math.abs(k);
      el.style.transform = `translateX(${k * 60}%) translateZ(${-150 * a}px) rotateY(${k * 45}deg) scale(${[1, .85][a] || .7})`;
      el.style.opacity = [1, .75, .5][a] || .3;
      el.style.zIndex = 100 - a;
      el.classList.toggle('active', !k);
    });
    [...dots.children].forEach((d, j) => d.classList.toggle('on', j === cur));
  }
  go(0);
  // Tự chuyển ảnh mỗi 1,4 giây kể từ khi người xem cuộn tới album (như mẫu); không chạy khi đang xem ảnh lớn
  let timer = 0;
  const play = () => { clearInterval(timer); timer = setInterval(() => { if (lb.hidden) go(cur + 1); }, 1400); };
  const nav = i => { go(i); if (timer) play(); };
  const cf = $('#cf');
  if (!reduce) {
    let seen = false;
    new IntersectionObserver(([e]) => { seen = e.isIntersecting; }).observe(cf);
    addEventListener('scroll', function onScroll() { if (seen) { play(); removeEventListener('scroll', onScroll); } }, { passive: true });
  }
  const swipe = (el, fn) => {
    let sx = null;
    el.addEventListener('pointerdown', e => { sx = e.clientX; el.swiped = false; });
    el.addEventListener('pointercancel', () => { sx = null; });
    el.addEventListener('pointerup', e => {
      if (sx === null) return;
      const dx = e.clientX - sx; sx = null;
      if (Math.abs(dx) > 40) { el.swiped = true; fn(dx < 0 ? 1 : -1); }
    });
  };
  swipe(cf, s => nav(cur + s));
  $('.cf-arrow.prev').addEventListener('click', () => nav(cur - 1));
  $('.cf-arrow.next').addEventListener('click', () => nav(cur + 1));
  items.forEach((el, j) => el.addEventListener('click', () => { if (!cf.swiped) j === cur ? openLb(j) : nav(j); }));

  // ---------- Hộp thoại dùng chung ----------
  let lastFocus = null;
  function openModal(m) {
    lastFocus = document.activeElement;
    m.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    $('button[data-close], .lb-close', m)?.focus({ preventScroll: true });
  }
  function closeModal(m) {
    m.hidden = true;
    if (!$('[role=dialog]:not([hidden])')) document.documentElement.style.overflow = '';
    lastFocus?.focus({ preventScroll: true });
  }
  $$('[data-close]').forEach(el => el.addEventListener('click', () => closeModal(el.closest('[role=dialog]'))));
  addEventListener('keydown', e => {
    const m = $$('[role=dialog]:not([hidden])').pop();
    if (!m) return;
    if (e.key === 'Escape') closeModal(m);
    if (m === lb && e.key === 'ArrowLeft') showLb(li - 1);
    if (m === lb && e.key === 'ArrowRight') showLb(li + 1);
    if (e.key === 'Tab') { // giữ phím Tab trong hộp thoại đang mở
      const f = $$('button, input, textarea, a[href], [tabindex="0"]', m).filter(x => x.offsetParent && !x.disabled);
      if (!f.length) return;
      const first = f[0], end = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); end.focus(); }
      else if (!e.shiftKey && document.activeElement === end) { e.preventDefault(); first.focus(); }
    }
  });

  // ---------- Xem ảnh lớn ----------
  const lb = $('#lightbox'), lbImg = $('.lb-img'), lbCount = $('.lb-count'), thumbs = $('.lb-thumbs'), lbMain = $('.lb-main');
  let li = 0;
  const srcs = () => items.map(el => $('img', el).src);
  function showLb(i) {
    li = (i + N) % N;
    lbImg.src = srcs()[li];
    lbCount.textContent = `${li + 1} / ${N}`;
    [...thumbs.children].forEach((t, j) => t.classList.toggle('on', j === li));
    const t = thumbs.children[li];
    if (t) thumbs.scrollLeft = t.offsetLeft - (thumbs.clientWidth - t.offsetWidth) / 2;
  }
  function openLb(i) {
    thumbs.innerHTML = srcs().map((s, j) => `<button type="button" aria-label="Ảnh ${j + 1}"><img src="${s}" alt=""></button>`).join('');
    [...thumbs.children].forEach((t, j) => t.addEventListener('click', () => showLb(j)));
    openModal(lb);
    showLb(i);
  }
  $('.lb-prev').addEventListener('click', () => showLb(li - 1));
  $('.lb-next').addEventListener('click', () => showLb(li + 1));
  $('.lb-close').addEventListener('click', () => closeModal(lb));
  $('.lb-box').addEventListener('click', e => { if ((e.target === e.currentTarget || e.target === lbMain) && !lbMain.swiped) closeModal(lb); });
  swipe(lbMain, s => showLb(li + s));

  // ---------- Hộp quà: mã QR chuyển khoản (VietQR) ----------
  $$('.qr-item').forEach(it => {
    const { bank, account, name, bankName } = it.dataset;
    if (!bank || !account) return it.remove(); // chưa có số tài khoản thật thì không hiện mã QR
    const qr = `https://img.vietqr.io/image/${encodeURIComponent(bank)}-${encodeURIComponent(account)}-qr_only.png?accountName=${encodeURIComponent(name)}`;
    it.insertAdjacentHTML('beforeend', `<div class="qr-box"><img loading="lazy" alt="Mã QR chuyển khoản ${bankName}" src="${qr}"></div>
      <div class="qr-info"><p>${bankName}</p><p class="acc">${account}</p><p class="hold">${name}</p>
      <a class="qr-save" href="${qr}" download="QR-${account}.png" target="_blank" rel="noopener noreferrer"><svg><use href="#i-down"/></svg>Lưu QR</a></div>`);
  });
  if (!$('.qr-item')) $('#gift-btn').closest('.sec-castle').hidden = true;
  $('#gift-btn').addEventListener('click', () => openModal($('#gift-sheet')));

  // ---------- Xác nhận tham dự ----------
  const rsvp = $('#rsvp-modal'), form = $('#rsvp-form'), submit = $('.submit', form);
  const guests = $('.guests', form), msg = $('.msg', form), count = $('#rsvp-guests');
  let nGuests = 1;
  $('#rsvp-open').addEventListener('click', () => openModal(rsvp));
  if (guest) $('#rsvp-name').value = guest;
  const valid = () => { submit.disabled = !form.attend.value; }; // như mẫu: chọn có/không là bấm gửi được, tên kiểm tra khi gửi
  form.addEventListener('input', valid);
  form.addEventListener('change', () => {
    $$('.opt', form).forEach(o => o.classList.toggle('sel', $('input', o).checked));
    guests.hidden = form.attend.value !== 'yes';
    msg.hidden = !form.attend.value;
    valid();
  });
  const stepBtns = $$('[data-step]', form);
  const setGuests = v => { nGuests = Math.min(Math.max(v, 1), 20); count.textContent = nGuests; stepBtns[1].disabled = nGuests >= 20; };
  stepBtns.forEach(b => b.addEventListener('click', () => setGuests(nGuests + +b.dataset.step)));
  setGuests(1);
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (submit.disabled) return;
    const data = { name: $('#rsvp-name').value.trim(), attend: form.attend.value === 'yes' ? 'Có' : 'Không', guests: form.attend.value === 'yes' ? nGuests : 0, message: form.message.value.trim() };
    submit.disabled = true;
    if (form.dataset.endpoint) { // Google Sheet qua Apps Script (xem rsvp-google-sheet.gs)
      try { await fetch(form.dataset.endpoint, { method: 'POST', mode: 'no-cors', body: new URLSearchParams({ type: 'rsvp', ...data }) }); }
      catch { submit.disabled = false; alert('Chưa gửi được, bạn thử lại giúp mình nhé.'); return; }
    } else {
      const body = `Họ tên: ${data.name}\nTham dự: ${data.attend}\nSố người: ${data.guests}\nLời nhắn: ${data.message}`;
      location.href = `mailto:${form.dataset.email}?subject=${encodeURIComponent('Xác nhận tham dự - ' + data.name)}&body=${encodeURIComponent(body)}`;
    }
    $('#done-name').textContent = data.name;
    $('#done-msg').textContent = data.attend === 'Có' ? 'Hẹn gặp bạn trong ngày vui của chúng mình!' : 'Cảm ơn bạn đã báo tin, chúng mình vẫn luôn nhớ đến bạn.';
    $('#rsvp-body').hidden = true;
    $('#rsvp-done').hidden = false;
  });

  // ---------- Sổ lưu bút ----------
  const wishForm = $('#wish-form'), list = $('#wishes'), endpoint = form.dataset.endpoint;
  const KEY = 'wishes-long-phuonganh';
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const fmt = t => { const d = new Date(t); return `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())} ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`; };
  const render = arr => {
    list.hidden = !arr.length;
    list.innerHTML = arr.map(w => `<div class="wish"><div class="wish-top"><span class="wish-name">${esc(w.name)}</span><span class="wish-time">${fmt(w.time)}</span></div><p>${esc(w.message)}</p></div>`).join('');
  };
  const local = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
  let wishes = local();
  render(wishes);
  if (endpoint) fetch(endpoint).then(r => r.json()).then(arr => {
    const seen = new Set(arr.map(w => w.name + w.message));
    wishes = [...wishes.filter(w => !seen.has(w.name + w.message)), ...arr].sort((a, b) => b.time - a.time);
    render(wishes);
  }).catch(() => {});
  wishForm.addEventListener('submit', async e => {
    e.preventDefault();
    const w = { name: wishForm.name.value.trim(), message: wishForm.message.value.trim(), time: Date.now() };
    if (!w.name || !w.message) return;
    const send = $('.send', wishForm);
    send.disabled = true;
    if (endpoint) {
      try { await fetch(endpoint, { method: 'POST', mode: 'no-cors', body: new URLSearchParams({ type: 'wish', name: w.name, message: w.message }) }); }
      catch { send.disabled = false; alert('Chưa gửi được, bạn thử lại giúp mình nhé.'); return; }
    }
    try { localStorage.setItem(KEY, JSON.stringify([w, ...local()].slice(0, 50))); } catch {}
    wishes = [w, ...wishes];
    render(wishes);
    wishForm.reset();
    send.disabled = false;
  });

  // ---------- Gợi ý lời chúc ----------
  const IDEAS = [
    'Chúc hai bạn trăm năm hạnh phúc, mãi yêu thương và luôn nắm chặt tay nhau trên mọi chặng đường!',
    'Chúc mừng hạnh phúc! Mong tổ ấm nhỏ của hai bạn luôn ngập tràn tiếng cười.',
    'Chúc cô dâu chú rể bách niên giai lão, sớm có tin vui nhé!',
    'Cuối cùng cũng tới ngày trọng đại rồi, chúc hai bạn mãi hạnh phúc như hôm nay!',
    'Chúc hai bạn luôn là bạn đời, người thương và tri kỷ của nhau.',
    'Chúc mừng đám cưới! Mong mỗi ngày bên nhau đều là một ngày đẹp.',
    'Chúc hai bạn cùng nhau đi qua thật nhiều mùa yêu thương, vững vàng và bình yên.',
    'Thật vui khi thấy hai bạn về chung một nhà. Chúc mãi mặn nồng!',
    'Chúc gia đình nhỏ luôn đầy ắp niềm vui, sức khoẻ và may mắn.',
    'Trăm năm tình viên mãn, bạc đầu nghĩa phu thê. Chúc mừng hai bạn!',
  ];
  const wand = $('#wand-modal'), wandList = $('#wand-list');
  const shuffle = () => {
    const pick = [...IDEAS].sort(() => Math.random() - .5).slice(0, 3);
    wandList.innerHTML = pick.map(t => `<button type="button"><p>${esc(t)}</p></button>`).join('');
    $$('button', wandList).forEach((b, i) => b.addEventListener('click', () => { wishForm.message.value = pick[i]; closeModal(wand); wishForm.message.focus(); }));
  };
  $('#wand-btn').addEventListener('click', () => { shuffle(); openModal(wand); });
  $('#wand-more').addEventListener('click', shuffle);
})();
