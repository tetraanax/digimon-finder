/* 세계 사건 연출: 호메오스타시스의 도래 · 호메오스타시스의 정화 · 이그드라실의 손길
   진화 연출처럼 화면 전체에 캔버스를 띄워 몇 초 동안 보여 주고, 누르거나 건너뛰기로 넘길 수 있어요.
   window.eventFx.play(kind, { zone, mon, saved, speed }) → Promise (끝나면 풀려요)
     warn  — 하늘이 하얗게 갈라지고 빛의 기둥이 내려와 구역을 봉쇄해요
     purge — 빛의 창이 쏟아지고 하얗게 덮인 뒤, 구역의 데이터가 칸칸이 지워져요 (mon: 휘말린 파트너 · saved: 손길이 막아 냄)
     ygg   — 세계수의 금빛 가지가 자라나 파트너를 감싸는 고리를 이뤄요 */
(function () {
  'use strict';
  const TAU = Math.PI * 2, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = t => t < 0 ? 0 : t > 1 ? 1 : 1 - Math.pow(1 - t, 3);
  const win = (t, a, b) => clamp((t - a) / (b - a), 0, 1);           // a~b 사이 진행도 0~1
  const bell = (t, a, b, c, d) => t < a || t > d ? 0 : t < b ? (t - a) / (b - a) : t < c ? 1 : 1 - (t - c) / (d - c);
  const DUR = { warn: 4400, purge: 5200, ygg: 4400 };
  const TEXT = {
    warn: ['HOMEOSTASIS DESCENDS', '호메오스타시스의 도래'],
    purge: ['HOMEOSTASIS PURIFICATION', '호메오스타시스의 정화'],
    ygg: ["YGGDRASIL'S TOUCH", '이그드라실의 손길'],
  };
  function rnd(seed) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

  const api = { active: false, _skip: null };
  api.skip = () => { if (api._skip) api._skip(); };

  api.play = async function (kind, { zone = '', mon = '', saved = false, speed = () => 1, at = 0 } = {}) {   // at: 이 시각(ms)부터 (연출 확인용)
    if (!DUR[kind]) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    // 파트너 그림 (흰 배경을 지운 것): 정화에 휘말리거나 손길에 감싸일 때
    let sprite = null;
    if (mon && window.evoCinematic && window.evoCinematic.preload) { try { const c = await window.evoCinematic.preload(mon); sprite = c && c.color; } catch (e) {} }
    const host = document.getElementById('net') || document.body;
    const cv = document.createElement('canvas'); cv.className = 'evofx evtfx'; cv.setAttribute('aria-hidden', 'true');
    host.appendChild(cv);
    const live = document.createElement('p'); live.className = 'sr-only'; live.setAttribute('aria-live', 'assertive');
    live.textContent = `${TEXT[kind][1]}${zone ? ' · ' + zone : ''}`; host.appendChild(live);
    const g = cv.getContext('2d');
    let W = 0, H = 0, dpr = 1, U = 1;
    const size = () => { dpr = Math.min(2, devicePixelRatio || 1); W = cv.width = Math.round(innerWidth * dpr); H = cv.height = Math.round(innerHeight * dpr); U = Math.min(W, H); };
    size(); addEventListener('resize', size);
    const R = rnd(kind.length * 7919 + (zone.length || 3) * 104729);

    /* ---------- 미리 만들어 두는 모양 ---------- */
    // 도래: 하늘의 균열 (위에서 아래로 갈라지는 지그재그 + 곁가지)
    const crack = [], cracks = [];
    { let x = 0, y = -.62; crack.push([x, y]); while (y < -.08) { y += .035 + R() * .03; x = clamp(x + (R() - .5) * .06, -.04, .04); crack.push([x, y]); }
      for (let k = 2; k < crack.length - 1; k += 2) { const [bx, by] = crack[k], dir = R() < .5 ? -1 : 1, br = [[bx, by]]; let cx = bx, cy = by;
        for (let j = 0; j < 3 + (R() * 3 | 0); j++) { cx += dir * (.03 + R() * .05); cy += .01 + R() * .03; br.push([cx, cy]); } cracks.push({ pts: br, at: k / crack.length }); } }
    // 정화: 빛의 창 (떨어지는 시각과 자리)
    const beams = Array.from({ length: 26 }, (_, i) => ({ x: (R() - .5) * 1.8, t: 500 + i * 48 + R() * 260, w: .006 + R() * .014 }));
    // 정화: 지워지는 칸 (화면을 덮는 격자)
    const cells = []; { const n = 22; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) cells.push({ i, j, n, d: R() * 700 }); }
    // 정화: 파트너가 흩어지는 입자
    const bits = sprite ? Array.from({ length: 260 }, () => ({ x: R() - .5, y: R() - .5, vx: (R() - .5) * .5, vy: -.2 - R() * .7, s: .004 + R() * .008, d: R() * 500 })) : [];
    // 이그드라실: 아래에서 자라는 금빛 가지 (가운데 고리 쪽으로 휘어 올라가요)
    const branches = [];
    // 굽이치며 가늘어지는 가지: 가운데로 휘어 올라가다 고리(반지름 RING)에 닿으면 멈춰요
    const RING = .22;
    const grow = (x, y, a, len, depth, t0, w) => {
      const toC = Math.atan2(-y, -x), bend = (toC - a + Math.PI * 3) % TAU - Math.PI;
      const a2 = a + bend * .35 + (R() - .5) * .3;
      let x2 = x + Math.cos(a2) * len, y2 = y + Math.sin(a2) * len;
      const d2 = Math.hypot(x2, y2), hit = d2 < RING + .02;
      if (hit) { x2 = x2 / d2 * RING; y2 = y2 / d2 * RING; }
      const bow = (R() - .5) * len * .5, mx = (x + x2) / 2 - Math.sin(a2) * bow, my = (y + y2) / 2 + Math.cos(a2) * bow;
      const dur = 220 + len * 1500;
      branches.push({ x, y, mx, my, x2, y2, t0, dur, w0: w, w1: w * .62, tip: depth <= 0 || hit });
      if (depth <= 0 || hit) return;
      grow(x2, y2, a2 + (R() - .5) * .2, len * (.8 + R() * .1), depth - 1, t0 + dur * .8, w * .62);          // 줄기는 계속
      if (R() < .75) grow(x2, y2, a2 + (R() < .5 ? -1 : 1) * (.55 + R() * .35), len * (.55 + R() * .15), depth - 2, t0 + dur * .9, w * .45);   // 곁가지
    };
    [[-.62, .66, -1.0], [.62, .66, -2.15], [-.2, .74, -1.35], [.2, .74, -1.8], [-1.0, .2, -.45], [1.0, .2, -2.7]].forEach(([x, y, a], i) => grow(x, y, a, .17, 5, 100 + i * 80, .012));
    const motes = Array.from({ length: 70 }, () => ({ x: (R() - .5) * 1.8, y: .2 + R() * .6, v: .05 + R() * .12, p: R() * TAU, s: .002 + R() * .004 }));

    /* ---------- 그리기 도우미 ---------- */
    const cx = () => W / 2, cy = () => H / 2;
    const P = (x, y) => [cx() + x * U, cy() + y * U];
    function title(t, a, color, sub) {
      if (a <= 0) return;
      const [en, ko] = TEXT[kind];
      g.save(); g.globalAlpha = a; g.textAlign = 'center'; g.textBaseline = 'middle';
      const y0 = H * .76, rise = (1 - ease(a)) * 18 * dpr;
      // 글씨 뒤의 어두운 띠 (뒤에 무엇이 지나가도 읽히게)
      const band = g.createLinearGradient(0, y0 - 70 * dpr, 0, y0 + 80 * dpr);
      band.addColorStop(0, 'rgba(3,4,15,0)'); band.addColorStop(.35, 'rgba(3,4,15,.72)'); band.addColorStop(.7, 'rgba(3,4,15,.72)'); band.addColorStop(1, 'rgba(3,4,15,0)');
      g.fillStyle = band; g.fillRect(0, y0 - 70 * dpr, W, 150 * dpr);
      g.font = `${Math.round(11 * dpr)}px Silkscreen, monospace`; g.fillStyle = color; g.fillText(en.split('').join(' '), cx(), y0 - 34 * dpr + rise);
      g.font = `${Math.round(Math.min(46, innerWidth / 11) * dpr)}px "Do Hyeon", sans-serif`;
      g.shadowColor = color; g.shadowBlur = 24 * dpr; g.fillStyle = '#ffffff'; g.fillText(ko, cx(), y0 + rise); g.shadowBlur = 0;
      if (sub) { g.font = `${Math.round(17 * dpr)}px "Gowun Dodum", sans-serif`; g.fillStyle = color; g.fillText(sub, cx(), y0 + 40 * dpr + rise); }
      g.restore();
    }
    function poly(pts, upto, width, color, blur) {
      const n = Math.max(1, Math.floor(upto * (pts.length - 1)));
      g.save(); g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = color; g.lineWidth = width; g.shadowColor = color; g.shadowBlur = blur;
      g.beginPath(); pts.slice(0, n + 1).forEach(([x, y], i) => { const [px, py] = P(x, y); i ? g.lineTo(px, py) : g.moveTo(px, py); });
      const f = upto * (pts.length - 1) - n; if (n < pts.length - 1 && f > 0) { const [ax, ay] = pts[n], [bx, by] = pts[n + 1], [px, py] = P(ax + (bx - ax) * f, ay + (by - ay) * f); g.lineTo(px, py); }
      g.stroke(); g.restore();
    }
    function drawSprite(x, y, s, alpha) {
      if (!sprite || alpha <= 0) return;
      const k = s * U / Math.max(sprite.width, sprite.height), w = sprite.width * k, h = sprite.height * k, [px, py] = P(x, y);
      g.save(); g.globalAlpha = alpha; g.drawImage(sprite, px - w / 2, py - h / 2, w, h); g.restore();
    }

    /* ---------- 장면 ---------- */
    function warn(t) {
      // 어두워지고, 붉은 경고 테두리가 맥박처럼 뛰어요
      g.fillStyle = `rgba(3,4,15,${.84 * ease(win(t, 0, 600)) * (1 - win(t, 3900, 4400))})`; g.fillRect(0, 0, W, H);
      const pulse = (.5 + .5 * Math.sin(t / 140)) * bell(t, 0, 300, 3600, 4300);
      const vg = g.createRadialGradient(cx(), cy(), U * .35, cx(), cy(), Math.hypot(W, H) * .6);
      vg.addColorStop(0, 'rgba(248,113,113,0)'); vg.addColorStop(1, `rgba(248,113,113,${.45 * pulse})`); g.fillStyle = vg; g.fillRect(0, 0, W, H);
      // 하늘이 갈라져요
      const fade = 1 - win(t, 3700, 4300), cr = ease(win(t, 350, 1500));
      if (cr > 0) {
        poly(crack, cr, 3.2 * dpr, `rgba(255,255,255,${fade})`, 22 * dpr);
        cracks.forEach(b => { const k = win(cr, b.at, b.at + .25); if (k > 0) poly(b.pts, ease(k), 1.4 * dpr, `rgba(226,232,240,${.85 * fade})`, 10 * dpr); });
      }
      // 갈라진 틈이 벌어지며 빛의 기둥이 내려와요
      const open = ease(win(t, 1400, 2400)) * fade;
      if (open > 0) {
        const bw = U * (.02 + .16 * open), [, top] = P(0, -.62), [, bot] = P(0, .62);
        const col = g.createLinearGradient(cx() - bw, 0, cx() + bw, 0);
        col.addColorStop(0, 'rgba(255,255,255,0)'); col.addColorStop(.5, `rgba(255,255,255,${.85 * open})`); col.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = col; g.fillRect(cx() - bw, top, bw * 2, bot - top);
        // 기둥 안을 따라 내려오는 고리
        g.save(); g.strokeStyle = `rgba(255,255,255,${.9 * open})`; g.lineWidth = 1.6 * dpr; g.shadowColor = '#fff'; g.shadowBlur = 14 * dpr;
        for (let k = 0; k < 5; k++) { const f = ((t - 1400) / 1300 + k / 5) % 1, [, ry] = P(0, -.5 + f * 1.0), rw = bw * (1.6 + f * 1.4);
          g.globalAlpha = Math.sin(f * Math.PI) * open; g.beginPath(); g.ellipse(cx(), ry, rw, rw * .16, 0, 0, TAU); g.stroke(); }
        g.restore();
        // 떨어지는 빛 조각
        for (let k = 0; k < 40; k++) { const f = ((t / 900) + k * .137) % 1, x = (Math.sin(k * 12.9) * .5) * bw * 3 / U;
          const [px, py] = P(x, -.6 + f * 1.25); g.fillStyle = `rgba(255,255,255,${.6 * open * (1 - f)})`; g.fillRect(px, py, 1.5 * dpr, 14 * dpr); }
      }
      // 경고 줄무늬
      const st = bell(t, 1900, 2300, 3700, 4200);
      if (st > 0) {
        const y = H * .76 + 64 * dpr, h = 10 * dpr, w = Math.min(W * .7, 520 * dpr);
        g.save(); g.globalAlpha = st; g.beginPath(); g.rect(cx() - w / 2, y, w, h); g.clip();
        g.fillStyle = '#7f1d1d'; g.fillRect(cx() - w / 2, y, w, h); g.fillStyle = '#fca5a5';
        for (let x = -w / 2 - 40 * dpr + (t / 12 % (24 * dpr)); x < w / 2 + 40 * dpr; x += 24 * dpr) { g.beginPath(); g.moveTo(cx() + x, y + h); g.lineTo(cx() + x + 10 * dpr, y); g.lineTo(cx() + x + 22 * dpr, y); g.lineTo(cx() + x + 12 * dpr, y + h); g.fill(); }
        g.restore();
      }
      title(t, bell(t, 1800, 2300, 3700, 4300), '#fca5a5', zone ? `「${zone}」 봉쇄 · 다음 이동 뒤 리셋` : '');
    }
    function purge(t) {
      // 차갑게 가라앉는 화면 + 주사선
      const out = 1 - win(t, 4600, 5200);
      g.fillStyle = `rgba(8,12,28,${.82 * ease(win(t, 0, 400)) * out})`; g.fillRect(0, 0, W, H);
      g.fillStyle = `rgba(186,230,253,${.05 * out})`; for (let y = (t / 6) % (6 * dpr); y < H; y += 6 * dpr) g.fillRect(0, y, W, dpr);
      // 파트너: 빛 한가운데 서 있다가 (정화에 휘말리면) 흩어져요
      const here = !!sprite, mid = [0, -.05];
      if (here) {
        const gone = !saved ? win(t, 1700, 2300) : 0;
        drawSprite(mid[0], mid[1], .34, ease(win(t, 150, 600)) * (1 - gone) * (saved ? (1 - win(t, 4500, 5100)) : 1));
        if (!saved && gone > 0) bits.forEach(b => { const k = win(t, 1700 + b.d, 3600 + b.d); if (k <= 0 || k >= 1) return;
          const [px, py] = P(mid[0] + b.x * .3 + b.vx * k * .5, mid[1] + b.y * .34 + b.vy * k * .6);
          g.fillStyle = `rgba(255,255,255,${1 - k})`; g.fillRect(px, py, b.s * U, b.s * U); });
      }
      // 이그드라실의 손길이 막아 내는 금빛 결계
      if (saved) {
        const sh = ease(win(t, 900, 1500)) * (1 - win(t, 3800, 4600)), [px, py] = P(mid[0], mid[1]);
        if (sh > 0) { g.save(); g.globalAlpha = sh; const r = U * .27;
          const rg = g.createRadialGradient(px, py, r * .6, px, py, r); rg.addColorStop(0, 'rgba(253,224,71,0)'); rg.addColorStop(1, 'rgba(253,224,71,.35)'); g.fillStyle = rg; g.beginPath(); g.arc(px, py, r, 0, TAU); g.fill();
          g.strokeStyle = '#fde68a'; g.lineWidth = 2 * dpr; g.shadowColor = '#facc15'; g.shadowBlur = 26 * dpr;
          for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + t / 900; g.beginPath(); g.arc(px, py, r, a, a + .7); g.stroke(); }
          g.beginPath(); g.arc(px, py, r * .92, 0, TAU); g.globalAlpha = sh * .5; g.stroke(); g.restore(); }
      }
      // 빛의 창이 하나씩 내리꽂혀요
      beams.forEach(b => { const k = t - b.t; if (k < 0 || k > 900) return;
        const a = k < 120 ? k / 120 : 1 - (k - 120) / 780, [x] = P(b.x, 0), w = b.w * U * (1 + (1 - a));
        let yEnd = H; if (saved) { const [px, py] = P(mid[0], mid[1]), r = U * .27; if (Math.abs(x - px) < r) yEnd = py - Math.sqrt(r * r - (x - px) ** 2); }
        const lg = g.createLinearGradient(0, 0, 0, yEnd); lg.addColorStop(0, `rgba(255,255,255,${.2 * a})`); lg.addColorStop(1, `rgba(255,255,255,${a})`);
        g.fillStyle = lg; g.fillRect(x - w / 2, 0, w, yEnd);
        g.fillStyle = `rgba(${saved && yEnd < H ? '253,224,71' : '224,242,254'},${.7 * a})`; g.beginPath(); g.ellipse(x, yEnd, w * 3, w * .9, 0, 0, TAU); g.fill(); });
      // 하얗게 덮여요 (손길이 막아 내면 덜 하얗게)
      const flood = bell(t, 1900, 2400, 2700, 3300) * (saved ? .55 : 1);
      if (flood > 0) { g.fillStyle = `rgba(255,255,255,${flood})`; g.fillRect(0, 0, W, H); }
      // 리셋: 위에서 아래로 훑으며 칸칸이 지워져요
      const sc = win(t, 2900, 4200);
      if (sc > 0 && sc < 1) {
        const sy = sc * H, cw = W / 22, ch = H / 22;
        cells.forEach(c => { const y = c.j * ch; if (y > sy) return; const k = win(t, 2900 + (y / H) * 1300 + c.d * .4, 3500 + (y / H) * 1300 + c.d * .4);
          if (k >= 1) return; g.fillStyle = `rgba(${(c.i + c.j) % 3 ? '125,211,252' : '255,255,255'},${.35 * (1 - k)})`; g.fillRect(c.i * cw + 1, y + 1 + k * ch * .6, (cw - 2) * (1 - k), (ch - 2) * (1 - k)); });
        g.fillStyle = 'rgba(224,242,254,.9)'; g.shadowColor = '#7dd3fc'; g.shadowBlur = 18 * dpr; g.fillRect(0, sy - dpr, W, 2 * dpr); g.shadowBlur = 0;
      }
      const sub = zone ? (saved ? `「${zone}」 리셋 · 이그드라실의 손길이 막아 냈어요` : here ? `「${zone}」 리셋 · ${mon} 삭제` : `「${zone}」 리셋`) : '';
      title(t, bell(t, 3000, 3500, 4600, 5200), saved ? '#fde68a' : '#bae6fd', sub);
    }
    function ygg(t) {
      const out = 1 - win(t, 3900, 4400);
      const bg = g.createRadialGradient(cx(), cy(), 0, cx(), cy(), Math.hypot(W, H) * .6);
      bg.addColorStop(0, `rgba(20,30,10,${.7 * out})`); bg.addColorStop(1, `rgba(3,6,4,${.86 * ease(win(t, 0, 500)) * out})`); g.fillStyle = bg; g.fillRect(0, 0, W, H);
      // 가지가 자라요
      g.save(); g.lineCap = 'round'; g.shadowColor = '#facc15'; g.shadowBlur = 14 * dpr;
      const qp = (b, u) => { const v = 1 - u; return [v * v * b.x + 2 * v * u * b.mx + u * u * b.x2, v * v * b.y + 2 * v * u * b.my + u * u * b.y2]; };
      branches.forEach(b => { const k = ease(win(t, b.t0, b.t0 + b.dur)); if (k <= 0) return;
        // 곡선을 잘게 나눠 그리며 점점 가늘게
        const n = 8; let [px0, py0] = P(b.x, b.y);
        for (let i = 1; i <= n; i++) { const u = i / n * k, [qx, qy] = qp(b, u), [px1, py1] = P(qx, qy);
          g.strokeStyle = `rgba(253,230,138,${(.75 + .25 * (1 - u)) * out})`; g.lineWidth = Math.max(.8 * dpr, (b.w0 + (b.w1 - b.w0) * u) * U);
          g.beginPath(); g.moveTo(px0, py0); g.lineTo(px1, py1); g.stroke(); px0 = px1; py0 = py1; }
        if (k >= 1 && b.tip) { const tw = .5 + .5 * Math.sin(t / 200 + b.x * 40); g.fillStyle = `rgba(254,249,195,${tw * out})`; g.beginPath(); g.arc(px0, py0, 2.6 * dpr, 0, TAU); g.fill(); } });
      g.restore();
      // 가운데: 파트너를 감싸는 금빛 고리
      const ring = ease(win(t, 1500, 2600)) * out, [px, py] = P(0, -.04);
      drawSprite(0, -.04, .3, ease(win(t, 900, 1600)) * out);
      if (ring > 0) {
        g.save(); g.shadowColor = '#facc15'; g.shadowBlur = 22 * dpr; g.strokeStyle = `rgba(253,224,71,${.95 * out})`; g.lineWidth = 2 * dpr;
        const r = U * .22; g.beginPath(); g.arc(px, py, r, -Math.PI / 2, -Math.PI / 2 + TAU * ring); g.stroke();
        g.lineWidth = 1 * dpr; g.globalAlpha = .6 * out; g.beginPath(); g.arc(px, py, r * 1.12, Math.PI / 2, Math.PI / 2 + TAU * ring); g.stroke();
        // 고리 위의 잎사귀 문양
        for (let k = 0; k < 12; k++) { const a = k / 12 * TAU + t / 2400; if (k / 12 > ring) break; const lx = px + Math.cos(a) * r, ly = py + Math.sin(a) * r;
          g.save(); g.translate(lx, ly); g.rotate(a + Math.PI / 2); g.globalAlpha = out; g.fillStyle = '#fef08a'; g.beginPath(); g.ellipse(0, 0, 3 * dpr, 7 * dpr, 0, 0, TAU); g.fill(); g.restore(); }
        g.restore();
      }
      // 떠오르는 빛 알갱이
      motes.forEach(m => { const y = m.y - ((t / 1000) * m.v) % 1.4, x = m.x + Math.sin(t / 700 + m.p) * .02, [mx, my] = P(x, y);
        g.fillStyle = `rgba(254,240,138,${(.4 + .4 * Math.sin(t / 300 + m.p)) * ease(win(t, 300, 900)) * out})`; g.beginPath(); g.arc(mx, my, m.s * U, 0, TAU); g.fill(); });
      title(t, bell(t, 2000, 2500, 3800, 4400), '#fde68a', '호메오스타시스의 정화를 한 번 막아 줘요');
    }
    const SCENE = { warn, purge, ygg };

    /* ---------- 재생 ---------- */
    api.active = true;
    const total = DUR[kind] * (reduce ? .6 : 1);
    await new Promise(resolve => {
      let t = at, last = performance.now(), done = false, raf = 0;
      const finish = () => { if (done) return; done = true; cancelAnimationFrame(raf); clearTimeout(guard); resolve(); };
      // 탭이 가려져 그림이 멈춰도 여행이 멈추지 않게, 시간이 지나면 끝내요
      const guard = setTimeout(finish, at ? 6e5 : total / Math.max(.2, speed() || 1) + 2000);
      api._skip = finish; cv.addEventListener('click', finish);
      const frame = now => {
        if (done) return;
        t += Math.min(64, now - last) * (speed() || 1) / (reduce ? .6 : 1); last = now;
        g.clearRect(0, 0, W, H); SCENE[kind](t);
        if (t >= DUR[kind]) return finish();
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    });
    api.active = false; api._skip = null;
    removeEventListener('resize', size);
    cv.remove(); live.remove();
  };
  window.eventFx = api;
})();
