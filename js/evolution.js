/* 진화 연출 — 데이터 증폭 폭발 (약 15초, 빠르게 모드에서는 3배 빠르게)
   1) 시작: 화면이 한 번 흔들리고 데이터 줄기가 화면을 가로질러요
   2) 스캔: 스캔선이 몸을 훑고, 몸이 디지털 데이터로 읽혀요
   3) 분해: 그림의 실제 픽셀이 아래에서부터 떨어져 나와 데이터 입자가 돼요
   4) 증폭: 입자가 소용돌이 구체를 이루고, 박자마다 ×2 ×4 ×8 … 로 복제되며 폭발적으로 커져요
            (주변 네트워크의 모든 노드가 라우팅 선을 따라 패킷을 보내고, 육각 프레임과 파동이 퍼져요)
            (용량 숫자가 치솟고, 구체가 화면을 가득 채워요)
   5) 임계: 모든 데이터가 한 점으로 빨려 들어갔다가 — 대폭발 (섬광 · 충격파 · 임팩트 프레임)
   6) 재구성: 사방으로 흩어진 입자가 새 모습의 픽셀 자리로 날아와 거대한 몸을 짜 맞추고, 실제 모습이 드러나요
   7) 결과: 회전하는 디스크 플랫폼과 빛기둥 위에 새 모습 · LIMIT BREAK · 이름 · 용량 막대 · 한 글자씩 써지는 설명
   단계(power 1 성숙기 · 2 완전체 · 3 궁극체 · 4 특별/초궁극)가 오를수록 화려해져요:
     입자 수 · 복제 박자(×8 → ×256) · 흔들림 · 폭발 파동과 파편이 커지고,
     3단계부터 번개와 회전하는 빛살, 4단계는 두 번째 폭발 · 무지개 파동 · 반짝이는 별가루까지 더해져요
   사용: await window.evoCinematic.play({ from, to, partner, kind, label, cap, fromCap, desc, speed, alive, at, power })
   화면을 누르거나 건너뛰기 / Esc → 이름 장면으로, 한 번 더 누르면 닫혀요. */
(function () {
  'use strict';
  const T = {
    in: 400, call: 500, callOut: 1600,
    scan: 1700, scanEnd: 3000, dis: 2900, disEnd: 4300,
    amp: [4600, 5400, 6100, 6700, 7200, 7600],        // 복제 박자 (점점 빨라져요)
    implode: 7900, boom: 8500, rebuild: 8800, rebuilt: 10700, solid: 10500,
    slam: 11200, hold: 15000, end: 15700,
  };
  let MAX_PARTS = 5200;
  // 단계별 세기 (index = power)
  const POWER = {
    parts: [0, 1500, 2800, 4400, 6400],
    amp: [null, [4600, 5600, 6600], [4600, 5400, 6200, 7000], [4600, 5400, 6100, 6700, 7200, 7600], [4400, 5000, 5550, 6050, 6500, 6900, 7250, 7550]],
    shake: [0, .45, .7, 1, 1.45], burst: [0, 90, 180, 300, 560], rings: [0, 2, 3, 4, 7], glow: [0, .55, .8, 1, 1.3],
    stars: ['', '★☆☆☆', '★★☆☆', '★★★☆', '★★★★'],
  };
  const TINT = { 'EVOLUTION': '#38bdf8', 'JOGRESS EVOLUTION': '#f472b6', 'CAPSULE EVOLUTION': '#facc15', 'SPECIAL EVOLUTION': '#a78bfa' };
  /* 진화 형태별 테마
     data    — 데이터 증폭 (기본): 네트워크 · 육각 프레임 · 디스크
     holy    — 백신종 / 로열나이츠 · 사성수 · 올림포스: 위에서 내려오는 빛기둥, 빛의 깃털, 성스러운 문양 원, 머리 위 광륜, 입자가 하늘에서 내려와요
     virus   — 바이러스종 / 칠대마왕: 가장자리에서 자라는 검은 촉수, 몸을 갉아먹는 오염 블록, 가운데의 검은 핵이 데이터를 흡수, 화면 찢김
     free    — 프리종: 무지갯빛 입자
     capsule — 캡슐(아머) 진화: 궤도를 도는 캡슐 판, 조각들이 날아와 캡슐 껍질로 맞물렸다가 깨지며 등장
     jogress — 조그레스: 두 디지몬의 데이터가 분홍 · 하늘색 이중 나선으로 꼬이다 하나로 합쳐져요 */
  const THEMES = {
    data:    { title: 'LIMIT BREAK',      hud: ['SCANNING', 'DECOMPILE', 'AMPLIFY', 'LIMIT BREAK', 'RECOMPILE'], mult: 'EXPAND', rain: '125,211,252' },
    holy:    { tint: '#fcd34d', tint2: '#fff7d6', title: 'HOLY ASCENSION', hud: ['SCANNING', 'PURIFY', 'BLESS', 'ASCEND', 'DESCEND'], mult: 'BLESS', rain: '253,230,138', flash: '255,251,234' },
    virus:   { tint: '#f43f5e', tint2: '#a855f7', title: 'SYSTEM CORRUPTED', hud: ['SCANNING', 'INFECT', 'ABSORB', 'OVERFLOW', 'MUTATE'], mult: 'ABSORB', rain: '244,63,94', flash: '255,40,90', bg: '10,2,12' },
    free:    { tint: '#34d399', title: 'FREE FORM',        hud: ['SCANNING', 'DECOMPILE', 'AMPLIFY', 'LIMIT BREAK', 'RECOMPILE'], mult: 'EXPAND', rain: '167,243,208' },
    capsule: { tint: '#facc15', tint2: '#fde68a', title: 'CAPSULE UNLOCKED', hud: ['SCANNING', 'DECOMPILE', 'AMPLIFY', 'LIMIT BREAK', 'ARMOR LOCK'], mult: 'EXPAND', rain: '253,224,71', flash: '255,247,214' },
    jogress: { tint: '#f472b6', tint2: '#38bdf8', title: 'DNA SYNCHRONIZED', hud: ['SCANNING', 'DNA SPLIT', 'SYNC', 'FUSION', 'RECOMPILE'], mult: 'SYNC', rain: '249,168,212' },
  };
  function pickTheme(kind, attr, label) {
    if (kind === 'CAPSULE EVOLUTION') return 'capsule';
    if (kind === 'JOGRESS EVOLUTION') return 'jogress';
    if (/마왕|타천사/.test(label)) return 'virus';
    if (/로열나이츠|사성수|올림포스/.test(label)) return 'holy';
    return { vac: 'holy', vir: 'virus', fre: 'free' }[attr] || 'data';
  }
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const prog = (t, a, b) => clamp((t - a) / (b - a));
  const lerp = (a, b, k) => a + (b - a) * k;
  const easeOut = p => 1 - Math.pow(1 - p, 3);
  const easeIn = p => p * p * p;
  const easeInOut = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
  const backOut = p => { const c = 1.7; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };

  /* ---------- 그림 준비: 흰 배경을 오려 내고, 실루엣과 픽셀 표본(입자 자리)을 만들어요 ---------- */
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
          while (stack.length) {
            const i = stack.pop();
            if (gone[i] || !light(i)) continue;
            gone[i] = 1; px[i * 4 + 3] = 0;
            const x = i % W, y = (i / W) | 0;
            if (x > 0) stack.push(i - 1); if (x < W - 1) stack.push(i + 1);
            if (y > 0) stack.push(i - W); if (y < H - 1) stack.push(i + W);
          }
          for (let i = 0; i < W * H; i++) {
            if (gone[i]) continue;
            const x = i % W, y = (i / W) | 0;
            if ((x > 0 && gone[i - 1]) || (x < W - 1 && gone[i + 1]) || (y > 0 && gone[i - W]) || (y < H - 1 && gone[i + W])) {
              const l = (px[i * 4] + px[i * 4 + 1] + px[i * 4 + 2]) / 3;
              if (l > 180) px[i * 4 + 3] = clamp(255 - (l - 180) * 3.4, 0, 255);
            }
          }
          g.putImageData(data, 0, 0);
          // 픽셀 표본: 불투명한 곳을 고르게 골라 입자 자리로 (좌표는 그림 크기를 1로 본 -0.5~0.5)
          let opaque = 0; for (let i = 0; i < W * H; i++) if (px[i * 4 + 3] > 140) opaque++;
          const step = Math.max(2, Math.round(Math.sqrt(opaque / 1500))), M = Math.max(W, H), pts = [];
          for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) {
            const i = (y * W + x) * 4; if (px[i + 3] <= 140) continue;
            pts.push({ x: (x - W / 2) / M, y: (y - H / 2) / M, c: `rgb(${px[i]},${px[i + 1]},${px[i + 2]})` });
          }
          resolve({ color: c, white: tinted(c, '#ffffff'), black: tinted(c, '#05060f'), W, H, pts });
        } catch (e) { resolve(null); }
      };
      im.onerror = () => resolve(null);
      im.src = src;
    });
    cache.set(src, p);
    return p;
  }
  // 그림이 없을 때: 디지알 모양의 입자 자리
  function eggPts(color) {
    const pts = [];
    for (let y = -0.4; y <= 0.4; y += 0.022) for (let x = -0.3; x <= 0.3; x += 0.022)
      if ((x / 0.3) ** 2 + ((y - 0.05) / 0.4) ** 2 <= 1) pts.push({ x, y, c: color });
    return pts;
  }

  /* ---------- 용량 문자열 ↔ 숫자 (24MB, 5.5GB, 1.2TB) ---------- */
  const UNIT = { KB: 1 / 1024, MB: 1, GB: 1024, TB: 1024 * 1024 };
  const toMB = s => { const m = String(s || '').match(/([\d.]+)\s*(KB|MB|GB|TB)/i); return m ? parseFloat(m[1]) * UNIT[m[2].toUpperCase()] : 0; };
  const fmtMB = v => v >= 1024 * 1024 ? (v / 1024 / 1024).toFixed(2) + 'TB' : v >= 1024 ? (v / 1024).toFixed(v >= 10240 ? 0 : 1) + 'GB' : v.toFixed(v >= 100 ? 0 : 1) + 'MB';

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

  api.play = async function ({ from, to, partner = null, kind = 'EVOLUTION', label = '', attr = '', cap = '', fromCap = '', desc = '', speed = () => 1, alive = () => true, at = 0, power = 2 } = {}) {
    const PW = Math.max(1, Math.min(4, power | 0)), SHK = POWER.shake[PW], GLW = POWER.glow[PW];
    MAX_PARTS = POWER.parts[PW]; T.amp = POWER.amp[PW];
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
    const themeId = pickTheme(kind, attr, label), TH = THEMES[themeId];
    const tint = themeId !== 'data' && TH.tint ? TH.tint : (TINT[kind] || TINT.EVOLUTION), tint2 = TH.tint2 || '#ffffff';
    const FLASH = TH.flash || '255,255,255';
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mbFrom = toMB(fromCap) || 1, mbTo = Math.max(toMB(cap) || mbFrom * 8, mbFrom * 2);

    /* ---------- 입자 만들기 ---------- */
    const srcA = A ? A.pts : eggPts(tint), srcP = P ? P.pts : (partner ? eggPts(tint) : []);
    const dstPts = B ? B.pts : eggPts('#ffffff');
    const parts = [];
    const addFrom = (pts, offX) => {
      const stepK = Math.max(1, Math.ceil(pts.length / (partner ? 650 : 1100)));
      for (let i = 0; i < pts.length; i += stepK) {
        const q = pts[i];
        parts.push({
          ox: q.x, oy: q.y, offX, col: q.c,
          td: T.dis + (0.5 - q.y) * 1300 + Math.random() * 250,      // 아래에서부터 떨어져 나와요
          a0: Math.random() * Math.PI * 2, lat: (Math.random() - .5) * 2.6, rr: .55 + Math.random() * .75,
          w: (.0011 + Math.random() * .0016) * (Math.random() < .5 ? 1 : -1), hue: `hsl(${Math.random() * 360 | 0},95%,65%)`, born: 0, es: .7 + Math.random() * .8, st: Math.random() * 900,
        });
      }
    };
    addFrom(srcA, partner ? -1 : 0);
    if (partner) addFrom(srcP, 1);
    const baseCount = parts.length;
    const assignHome = () => parts.forEach((p, i) => { const d = dstPts[(i * 7919) % dstPts.length]; p.hx = d.x; p.hy = d.y; p.hc = d.c; });
    assignHome();
    function clone(atT) {                                   // 박자마다 복제: 입자 수가 두 배로 (최대 MAX_PARTS)
      const n = Math.min(parts.length, MAX_PARTS - parts.length);
      for (let i = 0; i < n; i++) {
        const p = parts[i];
        parts.push({ ...p, a0: p.a0 + (Math.random() - .5) * .35, lat: clamp(p.lat + (Math.random() - .5) * .3, -1.4, 1.4), rr: p.rr * (.9 + Math.random() * .25),
                     w: p.w * (.85 + Math.random() * .4), born: atT, es: .7 + Math.random() * .9, st: Math.random() * 900 });
      }
      assignHome();
    }

    let t = at, last = performance.now(), W = 0, H = 0, dpr = 1, cols = [], burst = [], mult = 1, beatsDone = 0;
    const shakes = [], fired = new Set();
    const shake = (amp, dur) => shakes.push({ t0: t, amp: amp * SHK, dur });
    const once = (key, fn) => { if (!fired.has(key)) { fired.add(key); fn(); } };
    // 시작 시점을 건너뛴 경우(at, 건너뛰기) 지나간 박자의 복제를 미리 해 둬요
    const catchUp = () => { T.amp.forEach((b, i) => { if (t >= b && beatsDone <= i) { clone(b); mult *= 2; beatsDone = i + 1; fired.add('amp' + i); } }); };
    catchUp();
    api.active = true;
    api._skip = () => { if (t < T.slam) { t = T.slam; catchUp(); ['boom', 'slamFx', 'call', 'scan'].forEach(k => fired.add(k)); } else if (t < T.hold) t = T.hold; };
    cv.addEventListener('click', api._skip);

    /* ---------- 배경 요소: 네트워크 성좌(노드 · 라우팅 선 · 패킷), 16진수 데이터 열 ---------- */
    let nodes = [], links = [], adj = [], packets = [], infectK = 0;
    function buildNet(cx, cy, S) {
      let seed = 1337; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      nodes = []; links = []; adj = []; packets = [];
      const N = Math.round(clamp(W * H / (dpr * dpr) / 16000, 26, 60));
      for (let i = 0, tries = 0; nodes.length < N && tries < 2000; tries++) {
        const x = rnd() * W, y = rnd() * H;
        if (((x - cx) / (S * .7)) ** 2 + ((y - cy) / (S * .75)) ** 2 < 1) continue;   // 가운데(디지몬 자리)는 비워 둬요
        nodes.push({ x, y, s: (1.5 + rnd() * 2.5) * dpr, ph: rnd() * 6.28, inf: rnd() }); i++;
      }
      nodes.forEach((_, i) => adj[i] = []);
      nodes.forEach((a, i) => {
        const near = nodes.map((b, j) => [j, (a.x - b.x) ** 2 + (a.y - b.y) ** 2]).filter(q => q[0] !== i).sort((p, q) => p[1] - q[1]).slice(0, 2);
        near.forEach(([j]) => { if (!links.some(l => (l[0] === i && l[1] === j) || (l[0] === j && l[1] === i))) { links.push([i, j]); adj[i].push(j); adj[j].push(i); } });
      });
      for (let k = 0; k < Math.min(90, links.length * 2); k++) { const l = links[k % links.length]; packets.push({ a: l[0], b: l[1], p: rnd(), v: .0004 + rnd() * .0008 }); }
    }
    function size() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      const w = Math.round(innerWidth * dpr), h = Math.round(innerHeight * dpr);
      if (w === W && h === H) return;
      W = cv.width = w; H = cv.height = h;
      const step = 24 * dpr; cols = [];
      for (let x = step / 2; x < W; x += step)
        cols.push({ x, y: Math.random() * H, v: (0.25 + Math.random() * 0.6) * dpr, n: 5 + (Math.random() * 12 | 0) });
      buildNet(W / 2, H * .42, Math.min(W * .58, H * .44));
      if (themeId === 'virus') buildTendrils();
    }
    const HEX = '0123456789ABCDEF';
    const byte = (k, c) => HEX[(k * 7 + c + (t / 90 | 0)) % 16] + HEX[(k * 13 + c * 3 + (t / 140 | 0)) % 16];
    let hsh = 0; for (const ch of String(to)) hsh = (hsh * 31 + ch.charCodeAt(0)) >>> 0;
    const ADDR = '0x' + hsh.toString(16).toUpperCase().padStart(8, '0').slice(-8);

    function sprite(sp, x, y, s, o) {
      const { a = 1, white = 0, black = false, glow = 0, clipTop = null } = o;
      if (a <= 0 || s <= 0) return;
      g.save(); g.translate(x, y);
      if (!sp) { g.globalAlpha = a; g.fillStyle = black ? '#05060f' : white > .5 ? '#fff' : tint; g.beginPath(); g.ellipse(0, s * .06, s * .3, s * .4, 0, 0, Math.PI * 2); g.fill(); g.restore(); return; }
      const r = s / Math.max(sp.W, sp.H), w = sp.W * r, h = sp.H * r;
      if (clipTop != null) { g.beginPath(); g.rect(-w, -h / 2 - 2, w * 2, h * clipTop + 2); g.clip(); }
      if (black) { g.globalAlpha = a; g.drawImage(sp.black, -w / 2, -h / 2, w, h); g.restore(); return; }
      if (glow && white < 1) { g.globalAlpha = a * .5; g.shadowColor = tint; g.shadowBlur = glow * dpr; g.drawImage(sp.white, -w / 2, -h / 2, w, h); g.shadowBlur = 0; }
      if (white < 1) { g.globalAlpha = a * (1 - white * .6); g.drawImage(sp.color, -w / 2, -h / 2, w, h); }
      if (white > 0) { g.globalAlpha = a * white; g.shadowColor = tint; g.shadowBlur = glow * dpr; g.drawImage(sp.white, -w / 2, -h / 2, w, h); }
      g.restore();
    }
    function ring(cx, cy, r, a, wdt, color = tint) {
      if (a <= 0 || r <= 0) return;
      g.save(); g.globalAlpha = a; g.strokeStyle = color; g.lineWidth = wdt * dpr; g.shadowColor = color; g.shadowBlur = 18 * dpr;
      g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke(); g.restore();
    }
    function hexPath(x, y, r, rot) { g.beginPath(); for (let k = 0; k < 6; k++) { const a = rot + k * Math.PI / 3; g[k ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r, y + Math.sin(a) * r); } g.closePath(); }
    function hexRing(x, y, r, a, wdt, rot = 0, color = tint) {
      if (a <= 0 || r <= 0) return;
      g.save(); g.globalAlpha = clamp(a); g.strokeStyle = color; g.lineWidth = wdt * dpr; g.shadowColor = color; g.shadowBlur = 16 * dpr;
      hexPath(x, y, r, rot); g.stroke(); g.restore();
    }
    // 큰 육각 프레임: 눈금이 돌고, 꼭짓점마다 16진수 주소가 붙어요 (확장 · 증폭 단계)
    function hexFrame(x, y, r, k, rot, color = tint) {
      if (k <= 0) return;
      hexRing(x, y, r, k * .7, 1.6, rot, color);
      hexRing(x, y, r * 1.08, k * .3, 1, -rot * .7, color);
      g.save(); g.globalAlpha = k * .8; g.fillStyle = color; g.font = `${10 * dpr}px Silkscreen, monospace`; g.textAlign = 'center';
      for (let i = 0; i < 6; i++) {
        const a = rot + i * Math.PI / 3, px = x + Math.cos(a) * r * 1.16, py = y + Math.sin(a) * r * 1.16;
        g.fillText(`${byte(i, 3)}${byte(i, 9)}`, px, py);
        for (let j = 1; j < 8; j++) {                         // 변마다 눈금
          const b = a + Math.PI / 3, q = j / 8;
          const ex = lerp(x + Math.cos(a) * r, x + Math.cos(b) * r, q), ey = lerp(y + Math.sin(a) * r, y + Math.sin(b) * r, q);
          g.fillRect(ex - dpr, ey - dpr, 2 * dpr, 2 * dpr);
        }
      }
      g.restore();
    }
    // 네트워크: 노드끼리 이어진 라우팅 선과 그 위를 달리는 패킷. inward > 0 이면 노드에서 가운데로 데이터가 빨려 들어가요
    function network(k, inward, tx, ty, dt, sp) {
      if (k <= 0) return;
      g.save(); g.globalCompositeOperation = 'lighter';
      g.strokeStyle = tint; g.lineWidth = 1 * dpr; g.globalAlpha = k * .22; g.beginPath();
      for (const [a, b] of links) { g.moveTo(nodes[a].x, nodes[a].y); g.lineTo(nodes[b].x, nodes[b].y); }
      g.stroke();
      if (inward > 0) {
        g.globalAlpha = k * inward * .35; g.beginPath();
        nodes.forEach((n, i) => { if (i % 2 === 0) { g.moveTo(n.x, n.y); g.lineTo(tx, ty); } }); g.stroke();
        g.fillStyle = '#ffffff';
        nodes.forEach((n, i) => {
          if (i % 2) return;
          for (let j = 0; j < 3; j++) {
            const q = Math.pow(((t * .00055 * (1 + inward * 2) + j / 3 + i * .137) % 1), 1.6);
            g.globalAlpha = k * inward * (1 - q * .3);
            const x = lerp(n.x, tx, q), y = lerp(n.y, ty, q), s = 3 * dpr;
            g.fillRect(x - s / 2, y - s / 2, s, s);
          }
        });
      }
      for (const n of nodes) {
        const pulse = .6 + .4 * Math.sin(t / 300 + n.ph);
        g.globalAlpha = k * pulse; g.fillStyle = themeId === 'virus' ? (n.inf < infectK ? tint : '#38bdf8') : tint; g.fillRect(n.x - n.s, n.y - n.s, n.s * 2, n.s * 2);
        g.globalAlpha = k * pulse * .25; g.fillRect(n.x - n.s * 3, n.y - n.s * 3, n.s * 6, n.s * 6);
      }
      for (const pk of packets) {
        pk.p += pk.v * dt * sp;
        if (pk.p >= 1) { const nx = adj[pk.b][Math.random() * adj[pk.b].length | 0]; pk.a = pk.b; pk.b = nx ?? pk.a; pk.p = 0; }
        const A2 = nodes[pk.a], B2 = nodes[pk.b]; if (!A2 || !B2) continue;
        const x = lerp(A2.x, B2.x, pk.p), y = lerp(A2.y, B2.y, pk.p), bx = lerp(A2.x, B2.x, Math.max(0, pk.p - .08)), by = lerp(A2.y, B2.y, Math.max(0, pk.p - .08));
        g.globalAlpha = k * .9; g.strokeStyle = '#ffffff'; g.lineWidth = 2 * dpr; g.beginPath(); g.moveTo(bx, by); g.lineTo(x, y); g.stroke();
      }
      g.restore();
    }
    // 디스크 플랫폼: 원근으로 눕힌 원판 위에 트랙과 섹터가 돌아요
    function disk(x, y, R, k, rot) {
      if (k <= 0) return;
      g.save(); g.translate(x, y); g.scale(1, .24); g.globalCompositeOperation = 'lighter';
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, R);
      gr.addColorStop(0, tint + 'aa'); gr.addColorStop(.5, tint + '33'); gr.addColorStop(1, tint + '00');
      g.globalAlpha = k; g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.fill();
      if (themeId === 'holy') { sacredCircle(0, 0, R * .78, k, rot); g.restore(); return; }
      for (let i = 0; i < 9; i++) {
        const r = R * (.22 + i * .09), dir = i % 2 ? 1 : -1;
        g.globalAlpha = k * .25; g.strokeStyle = tint; g.lineWidth = 1.2 * dpr; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke();
        for (let s = 0; s < 5; s++) {
          const h1 = ((i * 97 + s * 31) % 100) / 100, a0 = rot * dir * (1 + i * .12) + s * 1.2566 + h1 * 2, len = .25 + h1 * .7;
          g.globalAlpha = k * (.5 + h1 * .5); g.strokeStyle = (i + s) % 3 ? tint : '#ffffff'; g.lineWidth = (2 + h1 * 4) * dpr;
          g.beginPath(); g.arc(0, 0, r, a0, a0 + len); g.stroke();
        }
      }
      g.restore();
    }
    // 빛기둥: 디스크에서 위로 솟는 데이터 기둥
    function pillar(x, yBottom, w, k) {
      if (k <= 0) return;
      g.save(); g.globalCompositeOperation = 'lighter';
      const hg = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
      hg.addColorStop(0, tint + '00'); hg.addColorStop(.35, tint + '55'); hg.addColorStop(.5, '#ffffff88'); hg.addColorStop(.65, tint + '55'); hg.addColorStop(1, tint + '00');
      g.fillStyle = hg;
      for (let i = 0; i < 10; i++) { const y0 = yBottom - yBottom * (i + 1) / 10; g.globalAlpha = k * (1 - i / 10) * .55; g.fillRect(x - w / 2, y0, w, yBottom / 10 + 1); }
      // 기둥을 타고 올라가는 바이트
      g.font = `${11 * dpr}px Silkscreen, monospace`; g.textAlign = 'center'; g.fillStyle = '#ffffff';
      for (let i = 0; i < 14; i++) {
        const q = ((t * .00025 + i * .071) % 1), yy = yBottom - q * yBottom, xx = x + (((i * 53) % 100) / 100 - .5) * w * .7;
        g.globalAlpha = k * (1 - q) * .7; g.fillText(byte(i, 5), xx, yy);
      }
      g.restore();
    }
    // 가로 데이터 줄기 (전송 중인 신호처럼 화면을 가로질러요)
    // 번개: 구체 가장자리에서 바깥으로 지그재그
    function lightning(x, y, r0, len, k, n) {
      g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = '#ffffff'; g.shadowColor = tint; g.shadowBlur = 22 * dpr; g.lineJoin = 'round';
      for (let b = 0; b < n; b++) {
        if (Math.random() > .55) continue;
        const a = Math.random() * Math.PI * 2, L = len * (.35 + Math.random() * .45), seg = 9;
        g.globalAlpha = k * (.5 + Math.random() * .5); g.lineWidth = (1 + Math.random() * (n > 2 ? 2.6 : 1.6)) * dpr;
        g.beginPath(); let px = x + Math.cos(a) * r0 * .8, py = y + Math.sin(a) * r0 * .8; g.moveTo(px, py);
        for (let i = 1; i <= seg; i++) { const d = r0 * .8 + L * i / seg, j = (Math.random() - .5) * L * .12; px = x + Math.cos(a) * d - Math.sin(a) * j; py = y + Math.sin(a) * d + Math.cos(a) * j; g.lineTo(px, py); }
        g.stroke();
      }
      g.restore();
    }
    // 회전하는 빛살 (결과 화면 뒤)
    function godRays(x, y, len, k, rot, n) {
      if (k <= 0) return;
      g.save(); g.globalCompositeOperation = 'lighter'; g.translate(x, y); g.rotate(rot);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, len); gr.addColorStop(0, tint2); gr.addColorStop(.25, tint + 'aa'); gr.addColorStop(1, tint + '00');
      g.fillStyle = gr;
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, w = Math.PI / n * (i % 2 ? .35 : .6); g.globalAlpha = k * (i % 2 ? .6 : 1);
        g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, len, a - w, a + w); g.closePath(); g.fill(); }
      g.restore();
    }
    // 반짝이는 별가루 (4단계 결과 화면)
    function sparkles(x, y, S, k, now) {
      if (k <= 0) return;
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 70; i++) {
        const a = rndS(i, 3) * Math.PI * 2, d = S * (.45 + rndS(i, 5) * 1.3), tw = Math.max(0, Math.sin(now * .004 + i * 2.3));
        const sx = x + Math.cos(a + now * .00008) * d, sy = y + Math.sin(a + now * .00008) * d * .8, r = (2 + rndS(i, 7) * 5) * dpr * tw;
        if (r < .5) continue;
        g.globalAlpha = k * tw; g.fillStyle = i % 3 ? '#ffffff' : `hsl(${(i * 37 + now * .1) % 360},95%,72%)`;
        g.beginPath(); g.moveTo(sx, sy - r * 2); g.lineTo(sx + r * .4, sy - r * .4); g.lineTo(sx + r * 2, sy); g.lineTo(sx + r * .4, sy + r * .4);
        g.lineTo(sx, sy + r * 2); g.lineTo(sx - r * .4, sy + r * .4); g.lineTo(sx - r * 2, sy); g.lineTo(sx - r * .4, sy - r * .4); g.closePath(); g.fill();
      }
      g.restore();
    }
    function streaks(k) {
      if (k <= 0) return;
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 34; i++) {
        const y = Math.random() * H, len = W * (.08 + Math.random() * .45), x = Math.random() * W - len / 2;
        g.globalAlpha = k * (.08 + Math.random() * .3); g.fillStyle = Math.random() < .35 ? tint : '#ffffff';
        g.fillRect(x, y, len, (1 + Math.random() * 2) * dpr);
      }
      g.restore();
    }
    function brackets(x, y, w, h, L, a, color = tint, lw = 2) {
      if (a <= 0) return;
      g.save(); g.globalAlpha = a; g.strokeStyle = color; g.lineWidth = lw * dpr; g.shadowColor = color; g.shadowBlur = 10 * dpr; g.beginPath();
      [[x, y, 1, 1], [x + w, y, -1, 1], [x + w, y + h, -1, -1], [x, y + h, 1, -1]].forEach(([px, py, sx, sy]) => { g.moveTo(px + sx * L, py); g.lineTo(px, py); g.lineTo(px, py + sy * L); });
      g.stroke(); g.restore();
    }
    // 결과 화면의 이름: 왼쪽부터 쓸어 열리며, 색 번짐이 가라앉고, 위에서 아래로 흰색→속성색 그라데이션
    function title(text, x, y, fs, p, a) {
      if (a <= 0) return;
      g.save(); g.font = `${fs}px "Do Hyeon", sans-serif`; g.textAlign = 'center';
      const tw = g.measureText(text).width, x0 = x - tw / 2 - 20 * dpr, wipeX = x0 + (tw + 40 * dpr) * easeOut(p);
      g.beginPath(); g.rect(x0 - 10, y - fs * 1.2, wipeX - x0 + 10, fs * 1.6); g.clip();
      const off = (1 - easeOut(prog(p, .3, 1))) * 10 * dpr + (Math.random() < .06 ? 4 * dpr : 0);
      g.globalAlpha = a * .7; g.globalCompositeOperation = 'lighter';
      g.fillStyle = '#ff2d6f'; g.fillText(text, x - off, y);
      g.fillStyle = '#22d3ee'; g.fillText(text, x + off, y);
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = a;
      const gr = g.createLinearGradient(0, y - fs * .85, 0, y + fs * .1);
      gr.addColorStop(0, '#ffffff'); gr.addColorStop(.55, '#ffffff'); gr.addColorStop(1, tint);
      g.shadowColor = tint; g.shadowBlur = 34 * dpr; g.fillStyle = gr; g.fillText(text, x, y);
      g.shadowBlur = 0; g.lineWidth = 1.2 * dpr; g.strokeStyle = 'rgba(255,255,255,.6)'; g.strokeText(text, x, y);
      g.restore();
      if (p < 1) { g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = '#ffffff'; g.shadowColor = tint; g.shadowBlur = 24 * dpr; g.globalAlpha = a; g.fillRect(wipeX - 2 * dpr, y - fs, 3 * dpr, fs * 1.25); g.restore(); }
      return tw;
    }

    /* ---------- 진화 형태별 테마 요소 ---------- */
    const rndS = (i, k = 0) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
    // 입자 색: 조그레스는 두 가닥 색, 프리는 무지갯빛, 바이러스는 붉은빛 · 보랏빛
    function vortexCol(p, depth) {
      if (themeId === 'jogress') return depth > .9 ? '#ffffff' : (p.offX < 0 ? '#f472b6' : '#38bdf8');
      if (themeId === 'free') return depth > .85 ? '#ffffff' : p.hue;
      if (themeId === 'virus') return depth > .3 ? '#ff4d7d' : tint2;
      return depth > .3 ? '#ffffff' : tint;
    }
    function themeFrame(x, y, r, k, rot) {
      if (k <= 0) return;
      if (themeId === 'holy') sacredCircle(x, y, r, k, rot * .6);
      else if (themeId === 'virus') { if (Math.random() > .12) hexFrame(x, y, r * (1 + (Math.random() - .5) * .05), k * (.45 + Math.random() * .55), rot + (Math.random() < .06 ? .35 : 0)); }
      else if (themeId === 'jogress') { hexFrame(x, y, r, k, rot, '#f472b6'); hexFrame(x, y, r * .88, k, -rot * 1.3, '#38bdf8'); }
      else hexFrame(x, y, r, k, rot);
    }

    // 백신: 위에서 내려오는 빛기둥
    function lightShafts(k) {
      if (k <= 0) return;
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 7; i++) {
        const x = W * (.1 + .8 * rndS(i, 1)) + Math.sin(t / 1500 + i) * W * .03, w = W * (.035 + .07 * rndS(i, 2));
        const gr = g.createLinearGradient(0, 0, 0, H);
        gr.addColorStop(0, `rgba(${FLASH},.55)`); gr.addColorStop(.55, tint + '30'); gr.addColorStop(1, tint + '00');
        g.globalAlpha = k * (.35 + .3 * Math.sin(t / 800 + i * 2));
        g.fillStyle = gr; g.beginPath(); g.moveTo(x - w * .35, -10); g.lineTo(x + w * .35, -10); g.lineTo(x + w, H); g.lineTo(x - w, H); g.closePath(); g.fill();
      }
      g.restore();
    }
    // 백신: 천천히 흔들리며 떨어지는 빛의 깃털
    const feathers = Array.from({ length: 46 }, (_, i) => ({ x: rndS(i, 3), y: rndS(i, 4), s: .6 + rndS(i, 5) * .9, v: .00004 + rndS(i, 6) * .00006, ph: rndS(i, 7) * 6.28 }));
    function featherFall(k) {
      if (k <= 0) return;
      g.save(); g.globalCompositeOperation = 'lighter';
      for (const f of feathers) {
        const y = (((f.y + t * f.v) % 1.1) - .05) * H, x = f.x * W + Math.sin(t / 900 + f.ph) * 30 * dpr, L = 12 * f.s * dpr;
        g.save(); g.translate(x, y); g.rotate(Math.sin(t / 700 + f.ph) * .8); g.globalAlpha = k * (.35 + .4 * f.s);
        const fg = g.createLinearGradient(-L, 0, L, 0); fg.addColorStop(0, tint + '00'); fg.addColorStop(.5, '#ffffff'); fg.addColorStop(1, tint + '00');
        g.fillStyle = fg; g.beginPath(); g.ellipse(0, 0, L, L * .3, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#ffffff'; g.fillRect(-L * .9, -.5 * dpr, L * 1.8, 1 * dpr);
        g.restore();
      }
      g.restore();
    }
    // 백신: 성스러운 문양 원 (겹 원 · 12각 · 16진수 글자 고리 · 빛 구슬)
    function sacredCircle(x, y, r, k, rot) {
      if (k <= 0 || r <= 0) return;
      g.save(); g.globalAlpha = clamp(k); g.strokeStyle = tint; g.fillStyle = '#ffffff'; g.shadowColor = tint; g.shadowBlur = 14 * dpr;
      g.lineWidth = 1.8 * dpr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke();
      g.lineWidth = 1 * dpr; g.beginPath(); g.arc(x, y, r * 1.12, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.arc(x, y, r * .74, 0, Math.PI * 2); g.stroke();
      g.beginPath(); for (let i = 0; i <= 12; i++) { const a = -rot + i * Math.PI / 6; g[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r * .74, y + Math.sin(a) * r * .74); } g.stroke();
      g.beginPath(); for (let i = 0; i < 12; i++) { const a = -rot + i * Math.PI / 6; g.moveTo(x + Math.cos(a) * r * .74, y + Math.sin(a) * r * .74); g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.stroke();
      g.font = `${Math.max(8, r / 16)}px Silkscreen, monospace`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowBlur = 6 * dpr;
      for (let i = 0; i < 40; i++) { const a = rot + i * Math.PI / 20; g.save(); g.translate(x + Math.cos(a) * r * 1.06, y + Math.sin(a) * r * 1.06); g.rotate(a + Math.PI / 2); g.fillText(HEX[(i * 7 + hsh) % 16], 0, 0); g.restore(); }
      for (let i = 0; i < 12; i++) { const a = -rot * .5 + i * Math.PI / 6; g.beginPath(); g.arc(x + Math.cos(a) * r * 1.2, y + Math.sin(a) * r * 1.2, Math.max(2, r / 70), 0, Math.PI * 2); g.fill(); }
      g.restore();
    }
    // 백신: 머리 위 광륜
    function halo(x, y, w, k) {
      if (k <= 0) return;
      g.save(); g.globalAlpha = k; g.strokeStyle = '#fff7d6'; g.lineWidth = 4 * dpr; g.shadowColor = tint; g.shadowBlur = 26 * dpr;
      g.beginPath(); g.ellipse(x, y, w, w * .22, 0, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = tint; g.lineWidth = 1.5 * dpr; g.beginPath(); g.ellipse(x, y, w * 1.14, w * .27, 0, 0, Math.PI * 2); g.stroke();
      g.restore();
    }

    // 바이러스: 화면 가장자리에서 가운데로 자라는 검은 촉수 (가지 포함)
    let tendrils = null;
    function buildTendrils() {
      tendrils = [];
      const step = Math.max(W, H) / 70, tx = W / 2, ty = H * .42;
      for (let i = 0; i < 16; i++) {
        const side = i % 4, u = rndS(i, 8);
        let x = side === 0 ? u * W : side === 1 ? W : side === 2 ? u * W : 0, y = side === 0 ? 0 : side === 1 ? u * H : side === 2 ? H : u * H;
        let ang = Math.atan2(ty - y, tx - x); const pts = [[x, y]];
        for (let j = 0; j < 40; j++) { ang += (rndS(i * 50 + j, 9) - .5) * .9; ang = lerp(ang, Math.atan2(ty - y, tx - x), .08); x += Math.cos(ang) * step; y += Math.sin(ang) * step; pts.push([x, y]); }
        tendrils.push({ pts, w: (3 + rndS(i, 10) * 5) * dpr, d: 0 });
        const b0 = 8 + (rndS(i, 11) * 18 | 0); let bx = pts[b0][0], by = pts[b0][1], ba = ang + (rndS(i, 12) < .5 ? 1 : -1) * 1.1; const bp = [[bx, by]];
        for (let j = 0; j < 16; j++) { ba += (rndS(i * 70 + j, 13) - .5) * 1.1; bx += Math.cos(ba) * step * .8; by += Math.sin(ba) * step * .8; bp.push([bx, by]); }
        tendrils.push({ pts: bp, w: (2 + rndS(i, 14) * 2) * dpr, d: b0 / 40 });
      }
    }
    function drawTendrils(grow, k) {
      if (k <= 0 || !tendrils || grow <= 0) return;
      g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
      for (const td of tendrils) {
        const n = Math.floor((td.pts.length - 1) * clamp((grow - td.d) / (1 - td.d * .5)));
        if (n < 1) continue;
        g.beginPath(); g.moveTo(td.pts[0][0], td.pts[0][1]);
        for (let j = 1; j <= n; j++) g.lineTo(td.pts[j][0], td.pts[j][1]);
        g.globalAlpha = k * .9; g.strokeStyle = '#14020d'; g.lineWidth = td.w; g.shadowBlur = 0; g.stroke();
        g.strokeStyle = tint; g.lineWidth = 1.2 * dpr; g.shadowColor = tint; g.shadowBlur = 10 * dpr; g.globalAlpha = k * (.55 + .35 * Math.sin(t / 160 + td.w)); g.stroke();
        const tip = td.pts[n]; g.fillStyle = tint2; g.globalAlpha = k; g.beginPath(); g.arc(tip[0], tip[1], 3 * dpr, 0, Math.PI * 2); g.fill();
      }
      g.restore();
    }
    // 바이러스: 몸을 갉아먹는 오염 블록
    function corrupt(sp, x, y, s, level, clipTop) {
      if (!sp || level <= 0) return;
      const M2 = Math.max(sp.W, sp.H), h = s * sp.H / M2, cut = -h / 2 + h * clipTop;
      const step = Math.max(1, Math.floor(sp.pts.length / 520)), bs = s * .028, tk = (t / 110) | 0;
      g.save();
      for (let i = 0; i < sp.pts.length; i += step) {
        if (rndS(i, 12) > level) continue;
        const q = sp.pts[i]; if (q.y * s > cut) continue;
        const fl = rndS(i, tk), w = bs * (fl > .92 ? 3 : 1);
        g.globalAlpha = .9; g.fillStyle = fl < .55 ? '#14020d' : fl < .8 ? tint2 : tint;
        g.fillRect(x + q.x * s - w / 2, y + q.y * s - bs / 2, w, bs);
      }
      g.restore();
    }
    // 바이러스: 데이터를 빨아들이는 검은 핵
    function darkCore(x, y, r, k) {
      if (k <= 0 || r <= 1) return;
      g.save(); g.globalAlpha = clamp(k);
      const cg = g.createRadialGradient(x, y, 0, x, y, r);
      cg.addColorStop(0, '#000000'); cg.addColorStop(.62, '#040008'); cg.addColorStop(.82, tint2 + 'cc'); cg.addColorStop(1, tint + '00');
      g.fillStyle = cg; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      g.strokeStyle = tint; g.lineWidth = 2 * dpr; g.shadowColor = tint; g.shadowBlur = 20 * dpr; g.globalAlpha = clamp(k) * (.6 + .4 * Math.sin(t / 90));
      g.beginPath();
      for (let i = 0; i <= 48; i++) { const a = i / 48 * Math.PI * 2, rr = r * .72 * (1 + .07 * Math.sin(a * 7 + t / 80)); g[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
      g.stroke(); g.restore();
    }
    // 바이러스: 화면이 가로로 찢겨 밀려요
    function glitch(k) {
      if (k <= 0 || Math.random() > k) return;
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
      const n = 2 + (Math.random() * 5 | 0);
      for (let i = 0; i < n; i++) {
        const y = Math.random() * H, h = (4 + Math.random() * 40) * dpr, dx = (Math.random() - .5) * 70 * dpr * Math.max(.3, k);
        g.drawImage(cv, 0, y, W, h, dx, y, W, h);
        if (Math.random() < .35) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = .22; g.fillStyle = Math.random() < .5 ? tint : tint2; g.fillRect(0, y, W, h); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
      }
      g.restore();
    }

    // 캡슐: 금빛 육각 판
    function plate(x, y, r, rot, a) {
      if (a <= 0) return;
      g.save(); g.translate(x, y); g.rotate(rot); g.globalAlpha = clamp(a);
      const pg = g.createLinearGradient(-r, -r, r, r); pg.addColorStop(0, '#3a2a05'); pg.addColorStop(.5, '#caa21a'); pg.addColorStop(1, '#1c1403');
      hexPath(0, 0, r, 0); g.fillStyle = pg; g.fill();
      g.strokeStyle = tint2; g.lineWidth = 1.5 * dpr; g.shadowColor = tint; g.shadowBlur = 10 * dpr; g.stroke();
      g.restore();
    }
    // 캡슐: 증폭되는 구체 둘레를 도는 판
    function capsuleOrbit(x, y, R, k, rot, S) {
      if (k <= 0) return;
      for (let i = 0; i < 10; i++) {
        const a = rot + i * Math.PI / 5, dz = Math.sin(a);
        plate(x + Math.cos(a) * R, y + dz * R * .3 + Math.cos(a * 2) * R * .08, (8 + 6 * (dz + 1)) * S / 300, rot * 3 + i, k * (.45 + .55 * (dz + 1) / 2));
      }
    }
    // 캡슐 껍질 조각: 타원을 고리 × 칸으로 나눈 판 (사방에서 날아와 맞물렸다가, 등장할 때 깨져 흩어져요)
    const shards = [];
    if (themeId === 'capsule') {
      const bands = [0, .4, .72, 1], segs = [5, 9, 14];
      for (let b = 0; b < 3; b++) for (let k2 = 0; k2 < segs[b]; k2++) {
        const off = b * .21, n = shards.length;
        shards.push({ r0: bands[b], r1: bands[b + 1], a0: k2 / segs[b] * Math.PI * 2 + off, a1: (k2 + 1) / segs[b] * Math.PI * 2 + off,
                      d: rndS(n, 15), fa: rndS(n, 16) * Math.PI * 2, spin: (rndS(n, 17) - .5) * 9 });
      }
    }
    function capsuleShell(x, y, S, M, k) {
      if (k <= 0 || !shards.length || t < T.rebuild) return;
      const rx = S * .6, ry = S * .8;
      const glowK = prog(t, T.solid - 300, T.slam), burst = easeOut(prog(t, T.slam, T.slam + 850));
      if (burst >= 1) return;
      for (const sh of shards) {
        const ti = T.rebuild + 250 + sh.d * 1350, fin = easeOut(prog(t, ti - 600, ti));
        if (fin <= 0) continue;
        const am = (sh.a0 + sh.a1) / 2, rm = sh.r0 ? (sh.r0 + sh.r1) / 2 : .2;
        const hx = Math.cos(am) * rx * rm, hy = Math.sin(am) * ry * rm;
        const fly = M * .85 * (1 - fin), out = burst * M * .75 * (.6 + sh.d);
        const px = x + hx + Math.cos(sh.fa) * fly + Math.cos(am) * out, py = y + hy + Math.sin(sh.fa) * fly + Math.sin(am) * out + burst * burst * S * .7;
        g.save(); g.translate(px, py); g.rotate(sh.spin * (1 - fin) + sh.spin * burst * .5); g.globalAlpha = k * (1 - burst);
        g.beginPath();
        for (let i = 0; i <= 6; i++) { const a = lerp(sh.a0, sh.a1, i / 6); g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rx * sh.r1 - hx, Math.sin(a) * ry * sh.r1 - hy); }
        for (let i = 6; i >= 0; i--) { const a = lerp(sh.a0, sh.a1, i / 6); g.lineTo(Math.cos(a) * rx * sh.r0 - hx, Math.sin(a) * ry * sh.r0 - hy); }
        g.closePath();
        const pg = g.createLinearGradient(-S * .15, -S * .15, S * .15, S * .15);
        pg.addColorStop(0, '#4a3505'); pg.addColorStop(.5, '#d4a91c'); pg.addColorStop(1, '#241903');
        g.fillStyle = pg; g.fill();
        g.lineWidth = (1.5 + glowK * 2.5) * dpr; g.strokeStyle = glowK > 0 ? `rgba(255,250,220,${.55 + .45 * glowK})` : tint2;
        g.shadowColor = tint; g.shadowBlur = (6 + glowK * 30) * dpr; g.stroke();
        g.shadowBlur = 0; g.fillStyle = 'rgba(255,240,180,.55)'; g.font = `${9 * dpr}px Silkscreen, monospace`; g.textAlign = 'center';
        if (sh.r0 > 0) g.fillText(byte(Math.round(sh.d * 99), 6), 0, 3 * dpr);
        g.restore();
        if (t >= ti && t < ti + 260) ring(x + hx, y + hy, (6 + (t - ti) * .12) * dpr, (1 - (t - ti) / 260) * k, 2, tint2);   // 맞물리는 불꽃
      }
      if (glowK > 0 && burst <= 0) {                         // 다 맞물리면 껍질 전체가 달아올라요
        g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = k * glowK * .5;
        const gg = g.createRadialGradient(x, y, 0, x, y, ry * 1.1); gg.addColorStop(0, '#fff7d6'); gg.addColorStop(1, tint + '00');
        g.fillStyle = gg; g.beginPath(); g.ellipse(x, y, rx * 1.1, ry * 1.1, 0, 0, Math.PI * 2); g.fill(); g.restore();
      }
    }

    await new Promise(done => {
      function frame(now) {
        const dt = Math.min(64, now - last); last = now;
        const sp = (speed() || 1) * (reduce ? 3 : 1);
        t += dt * sp;
        if (!alive() || t >= T.end) return done();
        size();
        const cx = W / 2, cy = H * .42, S = Math.min(W * .58, H * .44), M = Math.max(W, H);
        const fadeIn = prog(t, 0, T.in), fadeOut = 1 - prog(t, T.hold, T.end), A0 = fadeIn * fadeOut;

        // 박자: 흔들림 + 복제
        once('call', () => t >= T.call && shake(16, 320));
        T.amp.forEach((b, i) => { if (t >= b && beatsDone <= i) { clone(b); mult *= 2; beatsDone = i + 1; shake(6 + i * 3, 220); } });
        once('boom', () => { if (t >= T.boom) { shake(34, 900); burst = []; for (let i = 0; i < POWER.burst[PW]; i++) { const a = Math.random() * Math.PI * 2; burst.push({ a, v: (.5 + Math.random() * (1.4 + PW * .4)) * dpr, s: (1.5 + Math.random() * 3) * dpr, life: 1 }); } } });
        once('slamFx', () => { if (t >= T.slam) shake(22, 600); });
        if (PW >= 4) once('boom2', () => { if (t >= T.boom + 380) { shake(30, 700); for (let i = 0; i < 260; i++) { const a = Math.random() * Math.PI * 2; burst.push({ a, v: (.8 + Math.random() * 2.6) * dpr, s: (2 + Math.random() * 3.5) * dpr, life: 1 }); } } });
        let ox = 0, oy = 0;
        for (const s of shakes) { const q = 1 - (t - s.t0) / s.dur; if (q > 0) { ox += (Math.random() - .5) * 2 * s.amp * q * dpr; oy += (Math.random() - .5) * 2 * s.amp * q * dpr; } }
        if (reduce) ox = oy = 0;

        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
        g.setTransform(1, 0, 0, 1, ox, oy);
        g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
        g.fillStyle = `rgba(${TH.bg || '3,5,16'},${.96 * A0})`; g.fillRect(-60, -60, W + 120, H + 120);

        const ampP = prog(t, T.amp[0] - 300, T.implode);                 // 증폭 진행도
        const result = prog(t, T.rebuild, T.slam);                        // 결과 화면으로 넘어가는 정도
        // 배경 빛 (원형 광원)
        const rg = g.createRadialGradient(cx, cy, 0, cx, cy, S * (1.1 + ampP * 1.2));
        rg.addColorStop(0, tint + '88'); rg.addColorStop(1, tint + '00');
        g.globalAlpha = Math.min(1, A0 * GLW * (.3 + .6 * ampP * (1 - prog(t, T.boom, T.rebuild)) + .35 * result)); g.fillStyle = rg; g.fillRect(-60, -60, W + 120, H + 120); g.globalAlpha = 1;

        // 16진수 데이터 열 (증폭될수록 빨라져요)
        const rainFast = 1 + 8 * ampP * (1 - prog(t, T.boom, T.rebuilt));
        const rainA = 1 - .55 * prog(t, T.slam, T.slam + 800);
        g.font = `${11 * dpr}px Silkscreen, monospace`; g.textAlign = 'center';
        for (const c of cols) {
          c.y += c.v * dt * rainFast * sp; if (c.y - c.n * 14 * dpr > H) c.y = -Math.random() * H * .3;
          for (let k = 0; k < c.n; k++) {
            const yy = c.y - k * 14 * dpr; if (yy < -20 || yy > H + 20) continue;
            g.fillStyle = k === 0 ? `rgba(255,255,255,${.45 * A0 * rainA})` : `rgba(${TH.rain},${(.24 - k * .016) * A0 * rainA})`;
            g.fillText(byte(k, c.x | 0), c.x, yy);
          }
        }

        // 테마 배경: 백신은 빛기둥과 깃털, 바이러스는 가장자리에서 자라는 촉수
        if (themeId === 'holy') {
          const hk = A0 * (prog(t, T.scan, T.scan + 800) * (1 - .6 * prog(t, T.implode, T.boom)) + .7 * prog(t, T.rebuild, T.rebuilt));
          lightShafts(hk); featherFall(hk * (.35 + .65 * Math.max(ampP, result)));
        }
        if (themeId === 'virus') drawTendrils(prog(t, T.scan, T.implode), A0 * (1 - .45 * prog(t, T.slam, T.slam + 1000)));
        infectK = themeId === 'virus' ? prog(t, T.scan, T.implode) : 0;
        // 네트워크 성좌 — 처음부터 끝까지 깔리고, 증폭 때는 모든 노드가 가운데로 데이터를 보내요
        network(A0 * (.45 + .35 * ampP) * (1 - .6 * prog(t, T.implode, T.boom) * (1 - prog(t, T.boom, T.rebuilt))),
                ampP * (1 - prog(t, T.implode, T.boom)) + .5 * prog(t, T.rebuild, T.rebuilt) * (1 - prog(t, T.slam, T.slam + 900)), cx, cy, dt, sp);

        // 원근 격자 바닥 (스캔 ~ 증폭)
        const gridK = A0 * prog(t, T.scan, T.scan + 500) * (1 - prog(t, T.implode, T.boom));
        if (gridK > 0) {
          const y0 = cy + S * .55, scroll = (t / 1000) * (1 + ampP * 6);
          g.save(); g.strokeStyle = tint; g.lineWidth = 1 * dpr; g.shadowColor = tint; g.shadowBlur = 8 * dpr;
          for (let i = 0; i < 14; i++) { const f = ((i + scroll) % 14) / 14, y = y0 + (H - y0) * f * f; g.globalAlpha = gridK * .55 * f; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
          for (let i = -12; i <= 12; i++) { g.globalAlpha = gridK * .35; g.beginPath(); g.moveTo(cx + i * W * .012, y0); g.lineTo(cx + i * W * .2, H + 10); g.stroke(); }
          g.restore();
        }
        streaks((prog(t, T.call, T.call + 120) * (1 - prog(t, T.callOut - 300, T.callOut)) * .8
               + ampP * (1 - prog(t, T.implode, T.boom)) * .5
               + prog(t, T.boom, T.boom + 60) * (1 - prog(t, T.boom + 300, T.rebuild + 400)) * .9
               + prog(t, T.slam, T.slam + 60) * (1 - prog(t, T.slam + 200, T.slam + 700)) * .7) * A0);

        /* 1~3) 지금 모습 → 스캔 → 아래에서부터 입자로 분해 */
        if (t < T.disEnd + 200) {
          const disLine = 1 - prog(t, T.dis + 100, T.disEnd);
          const bob = Math.sin(t / 380) * 6 * dpr;
          const white = (themeId === 'virus' ? .12 : .55) * prog(t, T.scan, T.scanEnd);
          if (partner) {
            const off = Math.min(W * .24, S * .85), s2 = S * .8;
            sprite(A, cx - off, cy + bob, s2, { a: fadeIn, white, glow: 24, clipTop: disLine });
            sprite(P, cx + off, cy - bob, s2, { a: fadeIn, white, glow: 24, clipTop: disLine });
          } else sprite(A, cx, cy + bob, S, { a: fadeIn, white, glow: 24, clipTop: disLine });
          if (themeId === 'virus') corrupt(A, cx, cy + bob, S, .75 * easeIn(prog(t, T.scan, T.disEnd)) + .08 * prog(t, T.scan, T.scan + 300), disLine);
          const sc = prog(t, T.scan, T.scanEnd);
          if (sc > 0 && sc < 1) {
            const yy = cy - S * .55 + S * 1.1 * sc, half = S * (partner ? 1.4 : .75);
            g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = '#ffffff'; g.shadowColor = tint; g.shadowBlur = 30 * dpr;
            g.fillRect(cx - half, yy - 2 * dpr, half * 2, 4 * dpr);
            g.globalAlpha = .25; g.fillRect(cx - half, yy - 30 * dpr, half * 2, 30 * dpr);
            g.font = `${11 * dpr}px Silkscreen, monospace`; g.textAlign = 'left'; g.globalAlpha = .9; g.shadowBlur = 0;
            g.fillText(`READ ${Math.round(sc * 100)}%  ${byte(1, yy | 0)} ${byte(2, yy | 0)} ${byte(3, yy | 0)} ${byte(4, yy | 0)}`, cx + half + 8 * dpr, yy + 4 * dpr);
            g.restore();
          }
        }

        /* 확장 · 증폭: 큰 육각 프레임이 돌고, 박자마다 육각 파동이 퍼져요 */
        const Rbase = S * (.42 + 1.25 * easeIn(ampP)) * (1 + T.amp.reduce((m, b) => m + (t >= b ? .08 * Math.exp(-(t - b) / 140) : 0), 0));
        const implodeK = 1 - easeIn(prog(t, T.implode, T.boom));
        themeFrame(cx, cy, Math.max(S * .7, Rbase * 1.12) * implodeK, A0 * prog(t, T.dis, T.amp[0]) * (1 - prog(t, T.implode - 100, T.boom)), t * (.0003 + ampP * .0012));
        T.amp.forEach((b, i) => { const q = prog(t, b, b + 700); if (q > 0 && q < 1) { if (themeId === 'holy') ring(cx, cy, Rbase * (1 + q * 1.6), (1 - q) * A0, 4 - q * 3, i % 2 ? '#ffffff' : tint); else hexRing(cx, cy, Rbase * (1 + q * 1.6), (1 - q) * A0, 4 - q * 3, i * .3, i % 2 ? tint2 : tint); } });

        // 3단계부터: 구체에서 화면 끝으로 번개가 튀어요 (4단계는 더 자주, 더 굵게)
        if (PW >= 3) { const lk = A0 * ampP * (1 - prog(t, T.implode, T.boom)); if (lk > 0) lightning(cx, cy, Rbase, M, lk, PW === 4 ? 4 : 2); }
        /* 4~6) 입자: 분해 → 소용돌이 구체 → 증폭 → 응축 → 대폭발 → 새 모습으로 재조립 */
        const boomK = easeOut(prog(t, T.boom, T.boom + 650));
        const settle = lerp(1.32, 1, easeOut(prog(t, T.rebuilt - 600, T.slam + 300)));
        const homeS = S * 1.05 * settle;
        const spin = (t - T.dis) * (1 + 3 * ampP);
        const pa = t < T.solid ? 1 : 1 - prog(t, T.solid, T.slam);
        if (pa > 0 && t >= T.dis) {
          const rebuilding = t >= T.rebuild;
          g.save(); g.globalCompositeOperation = rebuilding && t > T.rebuild + 700 ? 'source-over' : 'lighter';
          const sz = (rebuilding ? 2.6 : 2) * dpr * (S / 300);
          let curCol = '';
          for (const p of parts) {
            if (t < p.td || t < p.born) continue;
            const ang = p.a0 + spin * p.w * 6, cl = Math.cos(p.lat);
            const suck = themeId === 'virus' ? 1 - .6 * ampP * ((t * .0005 + p.st / 900) % 1) : 1;   // 바이러스: 계속 핵으로 빨려 들어가요
            const R = Rbase * p.rr * implodeK * suck;
            const vx = Math.cos(ang) * cl * R, vy = Math.sin(p.lat) * R * .9, depth = Math.sin(ang) * cl;
            let x, y, col, al = A0 * pa * (p.born ? clamp((t - p.born) / 250) : 1);
            if (t < T.boom) {
              const k = easeInOut(prog(t, p.td, p.td + 900));
              const hx = cx + (p.offX ? p.offX * Math.min(W * .24, S * .85) : 0) + p.ox * S * (partner ? .8 : 1);
              const hy = cy + p.oy * S * (partner ? .8 : 1);
              let sx = cx + vx, sy = cy + vy;
              if (themeId === 'jogress') {                 // 조그레스: 두 가닥 이중 나선 → 증폭 중반부터 구체로 합쳐져요
                const m = easeInOut(prog(t, T.amp[1], T.amp[3])), u = p.lat / 1.4, an = u * 4.2 + spin * .003 + (p.offX < 0 ? 0 : Math.PI);
                sx = lerp(cx + Math.cos(an) * S * .4 + (p.rr - .9) * S * .16 * Math.cos(p.a0), sx, m); sy = lerp(cy + u * S * .85 + (p.rr - .9) * S * .1 * Math.sin(p.a0), sy, m);
              }
              x = lerp(hx, sx, k); y = lerp(hy, sy, k) - Math.sin(k * Math.PI) * S * .25;
              col = k < .5 ? p.col : vortexCol(p, depth);
              al *= .55 + .45 * (depth + 1) / 2;
            } else {
              const ex = Math.cos(p.a0) * cl; let ey = Math.sin(p.lat) * .9 + Math.sin(p.a0) * .2;
              if (themeId === 'holy') ey = -.35 - Math.abs(ey) * 1.2;   // 백신: 하늘로 흩어졌다가 위에서 내려와요
              const far = M * .7 * p.es * boomK;
              const bx = cx + ex * far, by = cy + ey * far;
              if (!rebuilding) { x = bx; y = by; col = themeId === 'free' ? p.hue : '#ffffff'; }
              else {
                const k = easeInOut(prog(t, T.rebuild + p.st, T.rebuild + p.st + 1000));
                x = lerp(bx, cx + p.hx * homeS, k); y = lerp(by, cy + p.hy * homeS, k);
                col = k > .55 ? p.hc : (k > .2 ? tint2 : (themeId === 'free' ? p.hue : tint));
              }
            }
            if (col !== curCol) { g.fillStyle = col; curCol = col; }
            g.globalAlpha = clamp(al);
            g.fillRect(x - sz / 2, y - sz / 2, sz, sz);
          }
          g.restore();
        }

        if (themeId === 'virus') darkCore(cx, cy, S * (.12 + .42 * ampP) * implodeK, A0 * prog(t, T.amp[0] - 700, T.amp[0]) * (1 - prog(t, T.boom - 60, T.boom)));
        if (themeId === 'capsule') {
          capsuleOrbit(cx, cy, Rbase * 1.3 * implodeK, A0 * prog(t, T.dis, T.amp[0]) * (1 - prog(t, T.implode, T.boom)), t * .0012, S);
          capsuleShell(cx, cy, S, M, A0);
        }
        // ×2 ×4 … 증폭 배율
        if (t >= T.amp[0] - 200 && t < T.boom) {
          const lastBeat = T.amp.filter(b => t >= b).pop();
          if (lastBeat) {
            const q = prog(t, lastBeat, lastBeat + 520);
            g.save(); g.globalAlpha = (1 - q) * A0; g.textAlign = 'center'; g.fillStyle = '#ffffff'; g.shadowColor = tint; g.shadowBlur = 30 * dpr;
            g.font = `${Math.round((60 + 90 * easeOut(q)) * dpr)}px Silkscreen, monospace`;
            g.fillText(`×${mult}`, cx, cy + 30 * dpr);
            g.font = `${12 * dpr}px Silkscreen, monospace`; g.globalAlpha = (1 - q) * A0 * .9;
            g.fillText(`${TH.mult} ${ADDR} → ${'0x' + (hsh * mult >>> 0).toString(16).toUpperCase().padStart(8, '0').slice(-8)}`, cx, cy + 62 * dpr);
            g.restore();
          }
        }
        // 왼쪽 위 판독기
        if (t >= T.scan && t < T.rebuilt) {
          const capNow = mbFrom * Math.pow(mbTo / mbFrom, easeIn(prog(t, T.amp[0] - 300, T.boom)));
          const hA = A0 * prog(t, T.scan, T.scan + 400) * (1 - prog(t, T.rebuilt - 400, T.rebuilt));
          g.save(); g.globalAlpha = hA; g.textAlign = 'left'; g.fillStyle = tint; g.shadowColor = tint; g.shadowBlur = 12 * dpr;
          const x0 = 22 * dpr; let y0 = 40 * dpr;
          g.font = `${11 * dpr}px Silkscreen, monospace`; g.fillText(`DIGITAL DATA AMPLIFIER · ${ADDR}`, x0, y0);
          g.fillStyle = '#ffffff'; g.font = `${26 * dpr}px Silkscreen, monospace`; y0 += 34 * dpr;
          const HW = TH.hud; g.fillText(t < T.dis ? HW[0] : t < T.amp[0] ? HW[1] : t < T.implode ? `${HW[2]} ×${mult}` : t < T.boom ? HW[3] : HW[4], x0, y0);
          g.font = `${13 * dpr}px Silkscreen, monospace`; y0 += 26 * dpr; g.fillStyle = '#cbd5e1';
          g.fillText(`CAPACITY  ${fmtMB(capNow)}`, x0, y0); y0 += 19 * dpr;
          g.fillText(`PACKETS   ${(baseCount * mult).toLocaleString()}`, x0, y0); y0 += 19 * dpr;
          g.fillText(`ROUTES    ${Math.round(nodes.length * (1 + ampP * 3))}`, x0, y0); y0 += 19 * dpr;
          const syncP = Math.round(100 * prog(t, T.scan, T.rebuilt));
          g.fillText(`SYNC      ${syncP}%`, x0, y0); y0 += 12 * dpr;
          g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(x0, y0, 200 * dpr, 5 * dpr);
          g.fillStyle = tint; g.fillRect(x0, y0, 200 * dpr * syncP / 100, 5 * dpr);
          if (themeId === 'virus' && (t / 260 | 0) % 2) { g.font = `${13 * dpr}px Silkscreen, monospace`; g.fillStyle = '#ff4d6d'; g.fillText(`WARNING  CORRUPTION ${Math.round(infectK * 100)}%`, x0, y0 + 26 * dpr); }
          g.restore();
        }

        // 응축된 빛 점, 폭발 파동과 파편
        if (t >= T.implode - 200 && t < T.boom + 200) {
          const k = prog(t, T.implode, T.boom), r = S * (.05 + .25 * Math.sin(k * Math.PI)) + 1;
          const og = g.createRadialGradient(cx, cy, 0, cx, cy, r * 2);
          og.addColorStop(0, '#ffffff'); og.addColorStop(.35, tint); og.addColorStop(1, tint + '00');
          g.globalAlpha = A0; g.fillStyle = og; g.beginPath(); g.arc(cx, cy, r * 2, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
        }
        if (t >= T.boom) {
          for (let i = 0, nr = POWER.rings[PW]; i < nr; i++) {
            const q = prog(t, T.boom + i * 120, T.boom + 1100 + i * 120), r = M * .9 * easeOut(q), a = (1 - q) * .9 * fadeOut, w = Math.max(1.5, 7 - i * .8);
            if (i % 2) hexRing(cx, cy, r, a, w, i * .2, '#ffffff'); else ring(cx, cy, r, a, w, PW >= 4 ? `hsl(${(i * 52 + t * .2) % 360},95%,70%)` : tint);
          }
          g.save(); g.globalCompositeOperation = 'lighter';
          for (const b of burst) {
            b.life -= dt * .0008 * sp; if (b.life <= 0) continue;
            const r = (1 - b.life) * M * .9 * b.v / dpr;
            g.globalAlpha = clamp(b.life) * A0; g.fillStyle = Math.random() < .4 ? '#ffffff' : tint;
            g.fillRect(cx + Math.cos(b.a) * r, cy + Math.sin(b.a) * r, b.s, b.s);
          }
          g.restore();
        }

        /* 7) 결과 화면: 디스크 플랫폼 + 빛기둥 위의 새 모습, 이름, 용량, 설명 */
        const lift = easeInOut(prog(t, T.slam, T.slam + 700));
        const sprS = S * 1.05 * settle * lerp(1, .9, lift);
        const by = cy - S * .12 * lift + Math.sin(t / 420) * 5 * dpr * prog(t, T.slam, T.slam + 900);
        const footY = by + sprS * .47;
        if (t >= T.rebuild) {
          const dk = A0 * result;
          if (PW >= 3) godRays(cx, by, M * .75, dk * (PW === 4 ? .26 : .17), t * (PW === 4 ? .00018 : .0001), PW === 4 ? 24 : 14);
          pillar(cx, footY, Math.min(W * .5, S * 1.1), dk * .8);
          disk(cx, footY, Math.min(W * .46, S * 1.5), dk, t * .0006);
          if (themeId === 'holy') sacredCircle(cx, by, sprS * .62, dk * .45, t * .00025);
          if (themeId === 'jogress') { hexRing(cx, by, sprS * .6, dk * .5, 1.5, t * .0005, '#f472b6'); hexRing(cx, by, sprS * .54, dk * .5, 1.5, -t * .0005, '#38bdf8'); }
        }
        if (t >= T.solid) {
          const sA = (themeId === 'capsule' ? prog(t, T.slam, T.slam + 140) : prog(t, T.solid, T.slam)) * fadeOut;
          const punch = t >= T.slam ? 1 + .1 * (1 - easeOut(prog(t, T.slam, T.slam + 380))) : 1;
          sprite(B, cx, by, sprS * punch, { a: sA, white: themeId === 'capsule' ? 1 - prog(t, T.slam, T.slam + 500) : 1 - prog(t, T.solid + 300, T.slam + 200), glow: 40 });
          if (themeId === 'holy') halo(cx, by - sprS * .5, sprS * .2, fadeOut * easeOut(prog(t, T.slam + 300, T.slam + 1000)));
          const rp = prog(t, T.slam, T.slam + 1000);
          hexRing(cx, by, S * (.35 + rp * 1.6), (1 - rp) * .9 * fadeOut, 3, rp * .6, '#ffffff');
          ring(cx, by, S * (.3 + rp * 1.1), (1 - rp) * .7 * fadeOut, 2);
        }

        // 임팩트 프레임 + 섬광
        if (t >= T.boom && t < T.boom + 70) { g.fillStyle = '#000'; g.fillRect(-60, -60, W + 120, H + 120); }
        else if (t >= T.boom + 70 && t < T.boom + 150) { g.fillStyle = themeId === 'virus' ? '#3b0014' : '#fff'; g.fillRect(-60, -60, W + 120, H + 120); sprite(B, cx, cy, S * 1.3, { black: true }); }
        const fl = t < T.boom + 150 ? 0 : 1 - prog(t, T.boom + 150, T.boom + 700);
        if (fl > 0) { g.fillStyle = `rgba(${FLASH},${fl})`; g.fillRect(-60, -60, W + 120, H + 120); }
        if (PW >= 4) { const f2 = t >= T.boom + 380 ? .8 * (1 - prog(t, T.boom + 380, T.boom + 820)) : 0; if (f2 > 0) { g.fillStyle = `rgba(${FLASH},${f2})`; g.fillRect(-60, -60, W + 120, H + 120); }
          for (let i = 0; i < 3; i++) { const q = prog(t, T.boom + 380 + i * 110, T.boom + 1500 + i * 110); if (q > 0 && q < 1) hexRing(cx, cy, M * easeOut(q), (1 - q) * .8 * fadeOut, 5 - i, -i * .3, `hsl(${(i * 90 + t * .3) % 360},95%,70%)`); } }
        const sfl = t >= T.slam ? .55 * (1 - prog(t, T.slam, T.slam + 260)) : 0;
        if (sfl > 0) { g.fillStyle = `rgba(${FLASH},${sfl})`; g.fillRect(-60, -60, W + 120, H + 120); }

        if (PW >= 4 && t >= T.slam) sparkles(cx, by, S, fadeOut * prog(t, T.slam, T.slam + 600), t);
        if (t >= T.slam) {
          const rA = fadeOut, vw = W / dpr;
          // 화면 테두리 HUD
          const fr = easeOut(prog(t, T.slam, T.slam + 500));
          brackets(16 * dpr, 16 * dpr, W - 32 * dpr, H - 32 * dpr, 46 * dpr * fr, rA * .9);
          // 위: LIMIT BREAK
          const topA = rA * prog(t, T.slam + 150, T.slam + 600);
          if (topA > 0) {
            g.save(); g.globalAlpha = topA; g.textAlign = 'center'; g.fillStyle = '#ffffff'; g.shadowColor = tint; g.shadowBlur = 16 * dpr;
            g.font = `${Math.min(22, vw / 22) * dpr}px Silkscreen, monospace`;
            const tl = TH.title, tlw = g.measureText(tl).width, ty = 48 * dpr;
            g.fillText(tl, cx, ty);
            const lw = Math.min(W * .3, 220 * dpr) * easeOut(prog(t, T.slam + 150, T.slam + 800));
            g.fillStyle = tint; g.fillRect(cx - tlw / 2 - 16 * dpr - lw, ty - 8 * dpr, lw, 2 * dpr); g.fillRect(cx + tlw / 2 + 16 * dpr, ty - 8 * dpr, lw, 2 * dpr);
            g.shadowBlur = 0; g.font = `${10 * dpr}px Silkscreen, monospace`; g.fillStyle = '#94a3b8';
            const subs = [`${kind} COMPLETE  ·  NODE ${ADDR}  ·  LINK ESTABLISHED`, `${kind} COMPLETE  ·  ${ADDR}`, `${kind} COMPLETE`];
            g.fillText(subs.find(x => g.measureText(x).width < W - 60 * dpr) || subs[2], cx, ty + 20 * dpr);
            g.font = `${14 * dpr}px sans-serif`; g.fillStyle = PW >= 4 ? `hsl(${t * .15 % 360},95%,72%)` : tint; g.shadowColor = tint; g.shadowBlur = 10 * dpr;
            g.fillText(POWER.stars[PW], cx, ty + 42 * dpr);
            g.restore();
          }
          // 이름
          const nameF = Math.min(96, vw / 7) * dpr;
          const nameY = footY + nameF * .9 + 22 * dpr;
          title(`${to}`, cx, nameY, nameF, prog(t, T.slam + 80, T.slam + 650), rA);
          // 정보 줄 + 용량 막대
          const infoA = rA * easeOut(prog(t, T.slam + 500, T.slam + 900));
          if (infoA > 0) {
            g.save(); g.globalAlpha = infoA; g.textAlign = 'center';
            const infoY = nameY + 30 * dpr;
            g.font = `${Math.min(17, vw / 26) * dpr}px "Do Hyeon", sans-serif`; g.fillStyle = '#e2e8f0';
            g.fillText(label || kind, cx, infoY);
            const barW = Math.min(W - 80 * dpr, 380 * dpr), bx0 = cx - barW / 2, barY = infoY + 16 * dpr;
            const cp = easeOut(prog(t, T.slam + 600, T.slam + 1800));
            g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(bx0, barY, barW, 4 * dpr);
            const bg = g.createLinearGradient(bx0, 0, bx0 + barW, 0); bg.addColorStop(0, tint + '66'); bg.addColorStop(1, '#ffffff');
            g.fillStyle = bg; g.shadowColor = tint; g.shadowBlur = 12 * dpr; g.fillRect(bx0, barY, barW * cp, 4 * dpr); g.shadowBlur = 0;
            for (let i = 1; i < 16; i++) { g.fillStyle = 'rgba(3,5,16,.9)'; g.fillRect(bx0 + barW * i / 16 - dpr, barY, 2 * dpr, 4 * dpr); }
            g.font = `${11 * dpr}px Silkscreen, monospace`;
            g.textAlign = 'left'; g.fillStyle = '#94a3b8'; g.fillText(fromCap ? fmtMB(mbFrom) : 'CAPACITY', bx0, barY + 18 * dpr);
            g.textAlign = 'right'; g.fillStyle = '#ffffff';
            g.fillText(cp >= 1 && cap ? cap : fmtMB(mbFrom * Math.pow(mbTo / mbFrom, cp)), bx0 + barW, barY + 18 * dpr);
            if (fromCap) { g.textAlign = 'center'; g.fillStyle = tint; g.fillText(`DATA ×${Math.max(2, Math.round(mbTo / mbFrom)).toLocaleString()}`, cx, barY + 18 * dpr); }
            g.restore();
          }
          // 설명: 모서리 괄호가 있는 유리 패널에 한 글자씩
          const dA = rA * easeOut(prog(t, T.slam + 900, T.slam + 1300));
          if (desc && dA > 0) {
            const fs = Math.max(14, Math.min(19, vw / 42)) * dpr, boxW = Math.min(W - 48 * dpr, 620 * dpr);
            g.font = `${fs}px "Gowun Dodum", sans-serif`;
            const lines = wrap(g, desc, boxW - 48 * dpr, 3), lh = fs * 1.55;
            const boxH = lines.length * lh + 26 * dpr, bx = cx - boxW / 2, byy = nameY + 84 * dpr + (1 - dA) * 10 * dpr;
            g.save(); g.globalAlpha = dA;
            const pg = g.createLinearGradient(0, byy, 0, byy + boxH); pg.addColorStop(0, 'rgba(14,20,44,.85)'); pg.addColorStop(1, 'rgba(6,8,22,.85)');
            g.fillStyle = pg; g.fillRect(bx, byy, boxW, boxH);
            g.fillStyle = tint; g.globalAlpha = dA * .6; g.fillRect(bx, byy, boxW, 1.5 * dpr); g.globalAlpha = dA;
            g.restore();
            brackets(bx, byy, boxW, boxH, 14 * dpr, dA);
            const total = lines.reduce((n, l) => n + Array.from(l).length, 0);
            let shown = Math.floor(total * prog(t, T.slam + 1000, T.slam + 1000 + total * 26));
            g.save(); g.globalAlpha = dA; g.fillStyle = '#e2e8f0'; g.font = `${fs}px "Gowun Dodum", sans-serif`; g.textAlign = 'center';
            lines.forEach((ln, i) => {
              const ch = Array.from(ln), part = ch.slice(0, Math.max(0, shown)).join(''); shown -= ch.length;
              if (!part) return;
              const full = g.measureText(ln).width, lx = cx - full / 2;
              g.textAlign = 'left'; g.fillText(part, lx, byy + 13 * dpr + fs + i * lh);
              if (part.length < ln.length) { const cw = g.measureText(part).width; g.fillStyle = tint; g.fillRect(lx + cw + 2 * dpr, byy + 13 * dpr + i * lh + fs * .15, fs * .5, fs * .95); g.fillStyle = '#e2e8f0'; }
            });
            g.restore();
          }
          const hA = prog(t, T.slam + 2200, T.slam + 2700) * fadeOut;
          if (hA > 0) { g.globalAlpha = hA * (.5 + .3 * Math.sin(t / 300)); g.fillStyle = '#94a3b8'; g.font = `${11 * dpr}px Silkscreen, monospace`; g.textAlign = 'right'; g.fillText('TAP TO CONTINUE ▸', W - 30 * dpr, H - 30 * dpr); g.globalAlpha = 1; }
        }
        if (themeId === 'virus') glitch(A0 * (ampP * .45 * (1 - prog(t, T.boom, T.rebuild)) + prog(t, T.boom, T.boom + 100) * (1 - prog(t, T.boom + 600, T.rebuilt)) * .9 + .1 * prog(t, T.slam, T.slam + 300)));
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
