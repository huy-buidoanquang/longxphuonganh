'use strict';
/* Nhạc nền. Nếu <audio id="bgm"> có src thì phát file đó; nếu không, tự chơi "Canon in D" (Pachelbel, 1680 —
   phạm vi công cộng) theo kiểu hộp nhạc bằng Web Audio, không cần file mp3. Phải gọi start() trong một cú chạm. */
function createMusic() {
  const file = document.getElementById('bgm');
  if (file && file.getAttribute('src')) {
    file.volume = 0.7;
    return {
      start() { file.play().catch(() => {}); return true; },
      toggle() { file.paused ? file.play().catch(() => {}) : file.pause(); return !file.paused; },
    };
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;

  const midi = m => 440 * Math.pow(2, (m - 69) / 12);
  const BEAT = 60 / 68, CHORD = 2 * BEAT, LOOP = 8 * CHORD;
  // D – A – Bm – F#m – G – D – G – A
  const BASS = [50, 45, 47, 42, 43, 38, 43, 45];
  const ARP = [[62, 66, 69, 74], [61, 64, 69, 73], [62, 66, 71, 74], [61, 66, 69, 73], [62, 67, 71, 74], [62, 66, 69, 74], [62, 67, 71, 74], [61, 64, 69, 73]];
  const MELODY = [[78, 76, 74, 73, 71, 69, 71, 73], [74, 73, 71, 69, 67, 66, 67, 64]];
  let ctx, out, nextAt = 0, loop = 0, playing = false;

  function note(t, m, gain, decay, partials) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    g.connect(out);
    for (const [ratio, amp] of partials) {
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.frequency.value = midi(m) * ratio; og.gain.value = amp;
      o.connect(og); og.connect(g);
      o.start(t); o.stop(t + decay + 0.05);
    }
  }

  function scheduleLoop(t0) {
    const mel = MELODY[loop % 2], lift = loop % 4 >= 2 ? 12 : 0; // vòng 3–4: giai điệu lên một quãng tám
    for (let c = 0; c < 8; c++) {
      const tc = t0 + c * CHORD;
      note(tc, BASS[c], 0.16, 3.4, [[1, 1], [2, 0.08]]);
      ARP[c].forEach((m, k) => note(tc + k * BEAT / 2, m, 0.08, 1.8, [[1, 0.7], [2, 0.12]]));
      if (loop > 0) note(tc, mel[c] + lift, 0.12, 2.6, [[1, 1], [2, 0.18], [4.07, 0.06]]); // vòng đầu chỉ có đệm
    }
    loop++;
  }

  function impulse(sec) { // tiếng vang phòng: nhiễu tắt dần
    const len = ctx.sampleRate * sec, buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    return buf;
  }

  function tick() { // lên lịch trước từng vòng nhạc khi sắp hết vòng hiện tại
    if (ctx.state === 'running' && nextAt - ctx.currentTime < 1.5) {
      const t0 = Math.max(nextAt, ctx.currentTime + 0.05);
      scheduleLoop(t0);
      nextAt = t0 + LOOP;
    }
    setTimeout(tick, 500);
  }

  function init() {
    ctx = new AC();
    const master = ctx.createGain(), lp = ctx.createBiquadFilter(), verb = ctx.createConvolver(), wet = ctx.createGain();
    master.gain.value = 0;
    master.gain.setTargetAtTime(0.6, ctx.currentTime, 0.8); // nhỏ dần lên
    lp.type = 'lowpass'; lp.frequency.value = 4200;
    verb.buffer = impulse(2.8); wet.gain.value = 0.5;
    out = ctx.createGain();
    out.connect(lp); out.connect(verb); verb.connect(wet); wet.connect(lp); lp.connect(master); master.connect(ctx.destination);
    nextAt = ctx.currentTime + 0.1;
    tick();
    document.addEventListener('visibilitychange', () => { if (document.hidden) ctx.suspend(); else if (playing) ctx.resume(); });
  }

  return {
    start() { if (!ctx) init(); playing = true; ctx.resume(); return true; },
    toggle() {
      if (!ctx) return this.start();
      playing = !playing;
      playing ? ctx.resume() : ctx.suspend();
      return playing;
    },
  };
}
