/* 진화 연출 — 화면 전체를 덮는 캔버스 시퀀스 (약 9초, 빠르게 모드에서는 3배 빠르게)
   1) 콜아웃: 화면이 흔들리며 「○○몬 진화—!」 띠가 사선으로 박혀요 (집중선)
   2) 변신: 무지개 빛살이 돌고, 몸이 빛으로 변해 심장박동처럼 세 번 뛰어요. 코드 나선이 몸을 감아 올라가요
   3) 응축: 빛이 회전하며 작아져 빛 구슬이 되고, 데이터 입자가 빨려 들어가요
   4) 임팩트: 검은 프레임 → 새 모습의 검은 실루엣 → 하얀 섬광 (강한 흔들림)
   5) 재구성: 새 모습의 빛이 회전하며 커지고, 아래에서 위로 스캔하며 색이 입혀져요
   6) 등장: 줌 펀치 + 충격파 + 입자 폭발, 이름이 옆에서 쾅 박히고 설명이 나와요
   사용: await window.evoCinematic.play({ from, to, partner, kind, label, cap, desc, speed, alive })
   화면을 누르거나 건너뛰기 / Esc → 마지막 장면으로. 마지막 장면에서 한 번 더 누르면 닫혀요. */
(function () {
  'use strict';
  const T = { in: 400, call: 450, callOut: 1450, trans: 1450, beats: [1750, 2100, 2450], spin: 2650, gone: 3300,
              black: 3370, sil: 3450, grow: 3500, grown: 4400, scanTo: 5000, slam: 5000, hold: 9000, end: 9700 };
  const TINT = { 'EVOLUTION': '#38bdf8', 'JOGRESS EVOLUTION': '#f472b6', 'CAPSULE EVOLUTION': '#facc15', 'SPECIAL EVOLUTION': '#a78bfa' };
  const SHOUT = { 'EVOLUTION': '진화', 'JOGRESS EVOLUTION': '조그레스 진화', 'CAPSULE EVOLUTION': '아머 진화', 'SPECIAL EVOLUTION': '진화' };
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const prog = (t, a, b) => clamp((t - a) / (b - a));
  const easeOut = p => 1 - Math.pow(1 - p, 3);
  const easeIn = p => p * p * p;
  const easeInOut = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
  const backOut = p => { const c = 1.7; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };

  /* 흰 배경 jpg에서 배경만 투명하게 오려 내고, 흰/검은/빨강/하늘색 실루엣도 만들어요 */
  const cache = new Map();
  function tinted(src, color) {
    const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
    const g = c.getContext('2d'); g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
    return c;
  }
  function cutout(src) {
    if (!src) return Promise.resolve(null);
    if (cache.has(src)) return cache.get(src);
    const p = new Promise(resolve => {
      const im = new Image();
      im.onload = () => {
        try {
          const W = im.naturalWidth, H = im.naturalHeight;
          const c = document.createElement('canvas'); c.width = W; c.height = H;
          const g = c.getContext('2d'); g.drawImage(im, 0, 0);
          const data = g.getImageData(0, 0, W, H), px = data.data;
          const gone = new Uint8Array(W * H), stack = [];
          const light = i => px[i * 4] > 232 && px[i * 4 + 1] > 232 && px[i * 4 + 2] > 232;
          for (let x = 0; x < W; x++) stack.push(x, (H - 1) * W + x);
          for (let y = 0; y < H; y++) stack.push(y * W, y * W + W - 1);
          while (stack.length) {                       // 가장자리에서부터 이어진 흰 배경만 지워요
            const i = stack.pop();
            if (gone[i] || !light(i)) continue;
            gone[i] = 1; px[i * 4 + 3] = 0;
            const x = i % W, y = (i / W) | 0;
            if (x > 0) stack.push(i - 1); if (x < W - 1) stack.push(i + 1);
            if (y > 0) stack.push(i - W); if (y < H - 1) stack.push(i + W);
          }
          for (let i = 0; i < W * H; i++) {            // 경계의 밝은 픽셀은 반투명하게 (흰 테두리 방지)
            if (gone[i]) continue;
            const x = i % W, y = (i / W) | 0;
            if ((x > 0 && gone[i - 1]) || (x < W - 1 && gone[i + 1]) || (y > 0 && gone[i - W]) || (y < H - 1 && gone[i + W])) {
              const l = (px[i * 4] + px[i * 4 + 1] + px[i * 4 + 2]) / 3;
              if (l > 180) px[i * 4 + 3] = clamp(255 - (l - 180) * 3.4, 0, 255);
            }
          }
          g.putImageData(data, 0, 0);
          resolve({ color: c, white: tinted(c, '#ffffff'), black: tinted(c, '#05060f'), red: tinted(c, '#ff3b6b'), cyan: tinted(c, '#3bf0ff'), W, H });
        } catch (e) { resolve(null); }
      };
      im.onerror = () => resolve(null);
      im.src = src;
    });
    cache.set(src, p);
    return p;
  }

  /* 글자를 폭에 맞춰 여러 줄로 */
  function wrap(g, text, maxW, maxLines) {
    const out = []; let line = '';
    for (const ch of String(text)) {
      const test = line + ch;
      if (g.measureText(test).width > maxW && line) { out.push(line); line = ch.trimStart(); if (out.length === maxLines) break; }
      else line = test;
    }
    if (out.length < maxLines && line) out.push(line);
    else if (out.length === maxLines && line) out[maxLines - 1] = out[maxLines - 1].replace(/.$/, '…');
    return out;
  }

  const api = { active: false, _skip: null };
  api.skip = () => { if (api._skip) api._skip(); };
  api.preload = name => cutout(window.digiImage && window.digiImage(name));

  api.play = async function ({ from, to, partner = null, kind = 'EVOLUTION', label = '', cap = '', desc = '', speed = () => 1, alive = () => true, at = 0 } = {}) {   // at: 시작 시점(ms) — 시험용
    const img = n => (n && window.digiImage) ? window.digiImage(n) : null;
    const [A, B, P] = await Promise.all([cutout(img(from)), cutout(img(to)), cutout(img(partner))]);
    if (!alive()) return;
    const host = document.getElementById('net') || document.body;
    const cv = document.createElement('canvas');
    cv.className = 'evofx'; cv.setAttribute('aria-hidden', 'true');
    host.appendChild(cv);
    const live = document.createElement('p');
    live.className = 'sr-only'; live.setAttribute('aria-live', 'assertive');
    live.textContent = `${from}${partner ? ' + ' + partner : ''} → ${to} 진화. ${desc}`;
    host.appendChild(live);
    const g = cv.getContext('2d');
    const tint = TINT[kind] || TINT.EVOLUTION, shout = SHOUT[kind] || '진화';
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let t = at, last = performance.now(), W = 0, H = 0, dpr = 1, cols = [], parts = [], pulled = 0, burst = false;
    const shakes = [], fired = new Set();
    const shake = (amp, dur) => shakes.push({ t0: t, amp, dur });
    const once = (key, fn) => { if (!fired.has(key)) { fired.add(key); fn(); } };
    api.active = true;
    api._skip = () => { if (t < T.slam) { t = T.slam; fired.add('slamFx'); burst = true; } else if (t < T.hold) t = T.hold; };
    cv.addEventListener('click', api._skip);

    function size() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      const w = Math.round(innerWidth * dpr), h = Math.round(innerHeight * dpr);
      if (w === W && h === H) return;
      W = cv.width = w; H = cv.height = h;
      const step = 22 * dpr; cols = [];
      for (let x = step / 2; x < W; x += step)
        cols.push({ x, y: Math.random() * H, v: (0.25 + Math.random() * 0.6) * dpr, n: 6 + (Math.random() * 14 | 0) });
    }
    const CH = '01ABCDEF<>/#';
    const glyph = k => CH[(k * 7 + (t / 90 | 0)) % CH.length];

    // 디지몬 그리기: white(빛으로 변한 정도), reveal(아래에서 위로 색이 입혀진 비율), split(색 번짐)
    function sprite(sp, x, y, s, o) {
      const { a = 1, white = 0, sx = 1, glow = 0, reveal = null, split = 0, black = false } = o;
      if (a <= 0 || s <= 0) return;
      g.save(); g.translate(x, y); g.scale(Math.abs(sx) < 0.04 ? 0.04 * (Math.sign(sx) || 1) : sx, 1);
      if (!sp) {                                         // 그림이 없으면 빛나는 디지알
        g.globalAlpha = a; g.shadowColor = tint; g.shadowBlur = glow * dpr;
        g.fillStyle = black ? '#05060f' : white > 0.5 ? '#ffffff' : tint;
        g.beginPath(); g.ellipse(0, s * 0.06, s * 0.3, s * 0.4, 0, 0, Math.PI * 2); g.fill(); g.restore(); return;
      }
      const r = s / Math.max(sp.W, sp.H), w = sp.W * r, h = sp.H * r;
      if (black) { g.globalAlpha = a; g.drawImage(sp.black, -w / 2, -h / 2, w, h); g.restore(); return; }
      if (split > 0) {
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = a * 0.55;
        g.drawImage(sp.red, -w / 2 - split, -h / 2, w, h); g.drawImage(sp.cyan, -w / 2 + split, -h / 2, w, h);
        g.globalCompositeOperation = 'source-over';
      }
      if (reveal != null) {
        g.globalAlpha = a; g.shadowColor = tint; g.shadowBlur = glow * dpr;
        g.drawImage(sp.white, -w / 2, -h / 2, w, h); g.shadowBlur = 0;
        const yCut = h / 2 - h * reveal;
        g.save(); g.beginPath(); g.rect(-w, yCut, w * 2, h); g.clip(); g.drawImage(sp.color, -w / 2, -h / 2, w, h); g.restore();
        if (reveal > 0 && reveal < 1) {               // 스캔 막대
          g.globalCompositeOperation = 'lighter'; g.fillStyle = '#ffffff'; g.shadowColor = tint; g.shadowBlur = 30 * dpr;
          g.fillRect(-w * 0.62, yCut - 2 * dpr, w * 1.24, 4 * dpr);
          g.globalAlpha = a * 0.35; g.fillRect(-w * 0.7, yCut - 14 * dpr, w * 1.4, 28 * dpr);
        }
      } else {
        if (white < 1) { g.globalAlpha = a * (1 - white * 0.6); g.drawImage(sp.color, -w / 2, -h / 2, w, h); }
        if (white > 0) { g.globalAlpha = a * white; g.shadowColor = tint; g.shadowBlur = glow * dpr; g.drawImage(sp.white, -w / 2, -h / 2, w, h); }
      }
      g.restore();
    }
    function ring(cx, cy, r, a, wdt) {
      if (a <= 0 || r <= 0) return;
      g.save(); g.globalAlpha = a; g.strokeStyle = tint; g.lineWidth = wdt * dpr; g.shadowColor = tint; g.shadowBlur = 18 * dpr;
      g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke(); g.restore();
    }
    function focusLines(cx, cy, k) {                      // 만화 집중선
      if (k <= 0) return;
      const R = Math.hypot(W, H);
      g.save(); g.fillStyle = '#ffffff';
      for (let i = 0; i < 90; i++) {
        const ang = Math.random() * Math.PI * 2, wdt = (0.002 + Math.random() * 0.006), inner = R * (0.22 + Math.random() * 0.2);
        g.globalAlpha = k * (0.15 + Math.random() * 0.45);
        g.beginPath();
        g.moveTo(cx + Math.cos(ang - wdt) * R, cy + Math.sin(ang - wdt) * R);
        g.lineTo(cx + Math.cos(ang + wdt) * R, cy + Math.sin(ang + wdt) * R);
        g.lineTo(cx + Math.cos(ang) * inner, cy + Math.sin(ang) * inner);
        g.fill();
      }
      g.restore();
    }
    function prism(cx, cy, k, rot) {                      // 돌아가는 무지개 빛살
      if (k <= 0) return;
      const R = Math.hypot(W, H), N = 20;
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < N; i++) {
        const a0 = rot + i * Math.PI * 2 / N, a1 = a0 + Math.PI / N * 0.7, hue = (i * 360 / N + t * 0.06) % 360;
        const gr = g.createRadialGradient(cx, cy, 0, cx, cy, R);
        gr.addColorStop(0, `hsla(${hue},95%,70%,${0.32 * k})`); gr.addColorStop(0.6, `hsla(${hue},95%,60%,${0.12 * k})`); gr.addColorStop(1, `hsla(${hue},95%,55%,0)`);
        g.fillStyle = gr; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R, a0, a1); g.closePath(); g.fill();
      }
      g.restore();
    }
    function helix(cx, cy, S, k, front) {                 // 몸을 감아 올라가는 코드 나선
      if (k <= 0) return;
      g.save(); g.font = `${13 * dpr}px Silkscreen, monospace`; g.textAlign = 'center';
      for (let s = 0; s < 2; s++) for (let i = 0; i < 34; i++) {
        const ph = i * 0.42 + t * 0.006 + s * Math.PI, depth = Math.sin(ph);
        if ((depth > 0) !== front) continue;
        const span = S * 1.5, y = cy + S * 0.75 - ((i * span / 34 + t * 0.18 * dpr) % span);
        const x = cx + Math.cos(ph) * S * (0.42 + 0.06 * Math.sin(t / 300));
        g.globalAlpha = k * (0.35 + 0.65 * (depth + 1) / 2);
        g.fillStyle = s ? tint : '#e0f2fe'; g.shadowColor = tint; g.shadowBlur = 10 * dpr;
        g.fillText(CH[(i + s * 5 + (t / 70 | 0)) % CH.length], x, y);
      }
      g.restore();
    }
    function banner(lines, p, out, y, fromLeft, size1, size2, color) {   // 사선 띠 + 큰 글자
      const a = clamp(p) * (1 - clamp(out));
      if (a <= 0) return;
      const slide = (1 - easeOut(clamp(p))) * W * (fromLeft ? -1 : 1) + easeIn(clamp(out)) * W * (fromLeft ? 1 : -1);
      const bandH = (size1 + size2 + 34) * dpr;
      g.save(); g.translate(W / 2 + slide, y); g.rotate(-0.08);
      g.globalAlpha = a;
      g.fillStyle = 'rgba(2,4,12,.82)'; g.fillRect(-W, -bandH / 2, W * 2, bandH);
      g.fillStyle = color; g.fillRect(-W, -bandH / 2 - 5 * dpr, W * 2, 4 * dpr); g.fillRect(-W, bandH / 2 + 1 * dpr, W * 2, 4 * dpr);
      g.transform(1, 0, -0.18, 1, 0, 0); g.textAlign = 'center';
      if (lines[0]) { g.fillStyle = '#cbd5e1'; g.font = `${size1 * dpr}px "Do Hyeon", sans-serif`; g.fillText(lines[0], 0, -bandH / 2 + (size1 + 10) * dpr); }
      g.font = `${size2 * dpr}px "Do Hyeon", sans-serif`;
      g.lineWidth = 6 * dpr; g.strokeStyle = color; g.lineJoin = 'round';
      const y2 = bandH / 2 - 16 * dpr;
      g.strokeText(lines[1], 0, y2); g.fillStyle = '#ffffff'; g.fillText(lines[1], 0, y2);
      g.restore();
    }

    await new Promise(done => {
      function frame(now) {
        const dt = Math.min(64, now - last); last = now;
        const sp = (speed() || 1) * (reduce ? 3 : 1);
        t += dt * sp;
        if (!alive() || t >= T.end) return done();
        size();
        const cx = W / 2, cy = H * 0.42, S = Math.min(W, H) * 0.44;
        const fadeIn = prog(t, 0, T.in), fadeOut = 1 - prog(t, T.hold, T.end), A0 = fadeIn * fadeOut;

        // 박자에 맞춘 흔들림
        once('call', () => t >= T.call && shake(16, 320));
        T.beats.forEach((b, i) => once('beat' + i, () => t >= b && shake(5 + i * 3, 180)));
        once('impact', () => t >= T.gone && shake(26, 520));
        once('slamFx', () => { if (t >= T.slam) shake(30, 650); });
        let ox = 0, oy = 0;
        for (const s of shakes) { const q = 1 - (t - s.t0) / s.dur; if (q > 0) { ox += (Math.random() - .5) * 2 * s.amp * q * dpr; oy += (Math.random() - .5) * 2 * s.amp * q * dpr; } }
        if (reduce) { ox = oy = 0; }

        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
        g.setTransform(1, 0, 0, 1, ox, oy);
        g.fillStyle = `rgba(3,5,16,${0.95 * A0})`; g.fillRect(-60, -60, W + 120, H + 120);

        // 빛살 + 가운데 빛
        const prismK = (prog(t, T.trans - 100, T.trans + 450) * (1 - prog(t, T.gone - 100, T.gone)) + prog(t, T.grow, T.grown) * (1 - 0.55 * prog(t, T.slam + 600, T.hold))) * A0;
        prism(cx, cy, prismK, t * (t < T.gone ? 0.0006 : 0.0011));
        const rg = g.createRadialGradient(cx, cy, 0, cx, cy, S * 1.3);
        rg.addColorStop(0, tint + '77'); rg.addColorStop(1, tint + '00');
        g.globalAlpha = A0 * (0.4 + 0.6 * prog(t, T.trans, T.gone)); g.fillStyle = rg; g.fillRect(0, 0, W, H); g.globalAlpha = 1;

        // 데이터 비
        const rainFast = 1 + 6 * prog(t, T.spin, T.gone) * (1 - prog(t, T.gone, T.grown));
        g.font = `${12 * dpr}px Silkscreen, monospace`; g.textAlign = 'center';
        for (const c of cols) {
          c.y += c.v * dt * rainFast * sp; if (c.y - c.n * 14 * dpr > H) c.y = -Math.random() * H * 0.3;
          for (let k = 0; k < c.n; k++) {
            const yy = c.y - k * 14 * dpr; if (yy < -20 || yy > H + 20) continue;
            g.fillStyle = k === 0 ? `rgba(255,255,255,${0.5 * A0})` : `rgba(125,211,252,${(0.28 - k * 0.016) * A0})`;
            g.fillText(glyph(k + (c.x | 0)), c.x, yy);
          }
        }

        // 집중선: 콜아웃, 재구성, 등장 때 강하게
        const focusK = (prog(t, T.call, T.call + 120) * (1 - prog(t, T.callOut - 200, T.callOut + 100)) * 0.9
                      + prog(t, T.grow, T.grow + 200) * (1 - prog(t, T.grown, T.slam)) * 0.5
                      + prog(t, T.slam, T.slam + 80) * (1 - 0.7 * prog(t, T.slam + 300, T.slam + 1600))) * A0;
        focusLines(cx, cy, focusK);

        // 빛기둥
        const beam = prog(t, T.spin - 300, T.gone) * (1 - prog(t, T.gone, T.gone + 100)) + prog(t, T.grow, T.grow + 300) * (1 - prog(t, T.grown, T.scanTo));
        if (beam > 0) {
          const bw = S * (0.25 + 0.5 * beam), lg = g.createLinearGradient(cx - bw, 0, cx + bw, 0);
          lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, `rgba(255,255,255,${0.4 * beam * A0})`); lg.addColorStop(1, 'rgba(255,255,255,0)');
          g.fillStyle = lg; g.fillRect(cx - bw, -60, bw * 2, H + 120);
        }

        // 1~3) 지금 모습 → 빛 → 심장박동 → 회전하며 빛 구슬로
        if (t < T.gone) {
          const white = easeOut(prog(t, T.trans, T.trans + 500));
          const spP = prog(t, T.spin, T.gone), theta = easeIn(spP) * Math.PI * 8;
          const sc = (1 - easeIn(prog(t, T.spin + 250, T.gone))) * (1 + T.beats.reduce((m, b) => m + (t >= b ? 0.09 * Math.exp(-(t - b) / 110) : 0), 0));
          const bob = Math.sin(t / 380) * 6 * dpr * (1 - spP);
          helix(cx, cy, S, prog(t, T.trans + 100, T.trans + 500) * (1 - prog(t, T.spin + 300, T.gone)) * A0, false);
          if (P) {                                     // 조그레스: 둘이 가운데로 모여 하나가 돼요
            const m = easeInOut(prog(t, T.trans, T.beats[2])), off = (1 - m) * Math.min(W * 0.25, S * 0.9);
            const s2 = S * (0.78 + 0.22 * m) * sc;
            sprite(A, cx - off, cy + bob, s2, { a: fadeIn, white, sx: Math.cos(theta), glow: 30 + 40 * spP });
            sprite(P, cx + off, cy - bob, s2, { a: fadeIn * (1 - prog(t, T.beats[2], T.beats[2] + 200)), white, sx: Math.cos(theta), glow: 30 + 40 * spP });
          } else {
            sprite(A, cx, cy + bob, S * sc, { a: fadeIn, white, sx: Math.cos(theta), glow: 30 + 40 * spP });
          }
          helix(cx, cy, S, prog(t, T.trans + 100, T.trans + 500) * (1 - prog(t, T.spin + 300, T.gone)) * A0, true);
          T.beats.forEach(b => { const q = prog(t, b, b + 500); ring(cx, cy, S * (0.45 + q * 0.7), (1 - q) * 0.7 * (t >= b ? 1 : 0), 2.5); });
          if (t > T.spin && t < T.gone - 120) {        // 빨려 들어가는 입자
            const want = Math.floor(prog(t, T.spin, T.gone) * 200);
            for (; pulled < want; pulled++) { const a = Math.random() * Math.PI * 2, r = S * (0.9 + Math.random() * 0.9); parts.push({ a, r, v: -1, life: 1, s: (1 + Math.random() * 2) * dpr }); }
          }
          const orb = prog(t, T.spin + 300, T.gone);    // 빛 구슬
          if (orb > 0) {
            const og = g.createRadialGradient(cx, cy, 0, cx, cy, S * 0.22 * orb + 1);
            og.addColorStop(0, 'rgba(255,255,255,1)'); og.addColorStop(0.4, tint); og.addColorStop(1, tint + '00');
            g.globalAlpha = A0; g.fillStyle = og; g.beginPath(); g.arc(cx, cy, S * 0.22 * orb + 1, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
          }
        }

        // 5~6) 새 모습: 빛으로 회전하며 커지고 → 스캔으로 색 → 줌 펀치로 등장
        if (t >= T.grow) {
          const gp = prog(t, T.grow, T.grown), theta = Math.pow(1 - gp, 2) * Math.PI * 8;
          const punch = 1 + 0.14 * (1 - easeOut(prog(t, T.slam, T.slam + 380))) * (t >= T.slam ? 1 : 0);
          const sc = backOut(clamp(gp * 1.1)) * punch;
          const reveal = easeInOut(prog(t, T.grown, T.scanTo));
          const bob = Math.sin(t / 420) * 5 * dpr * prog(t, T.slam, T.slam + 800);
          const by = cy - S * 0.08 * prog(t, T.slam, T.slam + 600);   // 설명 자리를 위해 살짝 위로
          // 잔상 (회전하며 커질 때)
          if (gp < 1) for (let k = 1; k <= 3; k++) sprite(B, cx, by, S * 1.05 * backOut(clamp((gp - k * 0.05) * 1.1)), { a: fadeOut * 0.18, white: 1, sx: Math.cos(theta + k * 0.5), glow: 20 });
          sprite(B, cx, by + bob, S * 1.05 * sc, { a: fadeOut, reveal, sx: Math.cos(theta), glow: 46 * (1 - reveal) + 14, split: (t < T.slam ? 7 * (1 - reveal) : 9 * (1 - prog(t, T.slam, T.slam + 300))) * dpr });
          if (!burst && t >= T.slam) {
            burst = true;
            for (let i = 0; i < 180; i++) { const a = Math.random() * Math.PI * 2; parts.push({ a, r: S * 0.15, v: 1, sp: (0.3 + Math.random() * 1.1) * dpr, life: 1, s: (1.2 + Math.random() * 2.8) * dpr }); }
          }
          const rp = prog(t, T.slam, T.slam + 900);
          ring(cx, by, S * (0.3 + rp * 1.3), (1 - rp) * 0.9 * fadeOut, 4);
          ring(cx, by, S * (0.2 + easeOut(rp) * 0.9), (1 - rp) * 0.5 * fadeOut, 1.5);
        }

        // 입자
        g.save(); g.globalCompositeOperation = 'lighter';
        for (const p of parts) {
          if (p.v < 0) { p.r -= dt * 0.6 * dpr * sp; p.a += dt * 0.004 * sp; if (p.r < 4) p.life = 0; }
          else { p.r += dt * p.sp * sp; p.life -= dt * 0.001 * sp; }
          if (p.life <= 0) continue;
          g.globalAlpha = clamp(p.life) * A0; g.fillStyle = p.v < 0 ? '#e0f2fe' : (Math.random() < .3 ? '#ffffff' : tint);
          g.fillRect(cx + Math.cos(p.a) * p.r - p.s / 2, cy + Math.sin(p.a) * p.r - p.s / 2, p.s, p.s);
        }
        g.restore();
        parts = parts.filter(p => p.life > 0);

        // 4) 임팩트 프레임: 검은 화면 → 새 모습의 검은 실루엣 → 섬광
        if (t >= T.gone && t < T.black) { g.fillStyle = '#000'; g.fillRect(-60, -60, W + 120, H + 120); }
        else if (t >= T.black && t < T.sil) {
          g.fillStyle = '#fff'; g.fillRect(-60, -60, W + 120, H + 120);
          sprite(B, cx, cy, S * 1.25, { a: 1, black: true });
        }
        const fl = t < T.sil ? 0 : 1 - prog(t, T.sil, T.sil + 420);
        if (fl > 0) { g.fillStyle = `rgba(255,255,255,${fl})`; g.fillRect(-60, -60, W + 120, H + 120); }
        const sfl = t >= T.slam ? 0.55 * (1 - prog(t, T.slam, T.slam + 220)) : 0;
        if (sfl > 0) { g.fillStyle = `rgba(255,255,255,${sfl})`; g.fillRect(-60, -60, W + 120, H + 120); }

        // 콜아웃 띠
        const bigF = Math.min(78, W / dpr / 8), smallF = Math.min(28, W / dpr / 20);
        banner([P ? `${from} + ${partner}` : from, `${shout}—!`], prog(t, T.call, T.call + 260), prog(t, T.callOut - 200, T.callOut + 50), H * 0.78, true, smallF, bigF, tint);

        // 이름 띠 + 설명
        if (t >= T.slam) {
          const nameY = cy + S * 0.62;
          banner([`${kind.replace(' EVOLUTION', '')} · ${[label, cap].filter(Boolean).join(' · ')}`, `${to}!`], prog(t, T.slam, T.slam + 220), prog(t, T.hold, T.end), nameY, false, smallF * 0.8, bigF, tint);
          const dA = easeOut(prog(t, T.slam + 500, T.slam + 1100)) * fadeOut;
          if (desc && dA > 0) {
            const fs = Math.max(15, Math.min(21, W / dpr / 40)) * dpr, boxW = Math.min(W - 40 * dpr, 640 * dpr);
            g.font = `${fs}px "Gowun Dodum", sans-serif`;
            const lines = wrap(g, desc, boxW - 48 * dpr, 3), lh = fs * 1.55;
            const boxH = lines.length * lh + 30 * dpr, bx = cx - boxW / 2;
            const bandH = (smallF * 0.8 + bigF + 34) * dpr;
            const byy = nameY + bandH / 2 + 34 * dpr + (1 - dA) * 14 * dpr;
            g.save(); g.globalAlpha = dA;
            g.fillStyle = 'rgba(8,10,26,.82)'; g.strokeStyle = tint + '88'; g.lineWidth = 1.5 * dpr;
            g.beginPath(); g.roundRect ? g.roundRect(bx, byy, boxW, boxH, 16 * dpr) : g.rect(bx, byy, boxW, boxH); g.fill(); g.stroke();
            g.fillStyle = '#e2e8f0'; g.textAlign = 'center';
            lines.forEach((ln, i) => g.fillText(ln, cx, byy + 15 * dpr + fs + i * lh));
            g.restore();
          }
          const hA = prog(t, T.slam + 1800, T.slam + 2300) * fadeOut;
          if (hA > 0) { g.globalAlpha = hA * 0.7; g.fillStyle = '#94a3b8'; g.font = `${12 * dpr}px Silkscreen, monospace`; g.textAlign = 'center'; g.fillText('TAP TO CONTINUE', cx, H - 24 * dpr); g.globalAlpha = 1; }
        }
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });

    cv.removeEventListener('click', api._skip);
    cv.remove(); live.remove();
    api.active = false; api._skip = null;
  };

  window.evoCinematic = api;
})();
