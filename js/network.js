/* 디지털 네트워크 장면 — 재사용 가능한 노드 트리
   사용법:
     const net = new DigiNetwork(canvas, { seed: 1999, onStatus: (eyebrow, title) => {} });
     net.open();                                   // 렌더링 시작 (배경으로 계속 돌아감)
     await net.trace({ partner: '아구몬', names }); // 신호 추적 → 도착하면 resolve
     net.skip();                                   // 추적을 건너뛰고 바로 도착
     net.close();                                  // 렌더링 중지
   같은 seed면 언제나 같은 네트워크가 만들어져요. */
(function () {
  'use strict';

  const PALETTE = ['#22d3ee', '#f472b6', '#facc15', '#a3e635', '#fb923c', '#a78bfa', '#38bdf8', '#f43f5e', '#2dd4bf', '#e879f9',
    '#e2e8f0', '#6366f1', '#dc2626', '#94a3b8'];
  const SHAPES = ['sphere', 'ring', 'spiral', 'grid', 'helix', 'burst', 'torus', 'cube',
    'dna', 'galaxy', 'tree', 'crystal', 'knot', 'web', 'city', 'shell', 'flower', 'chain', 'nebula', 'pyramid', 'wave', 'atom', 'mobius', 'gear'];
  // continents: cluster structures in order (cycled)
  const CONTINENT_SHAPES = [
    ['wave', 'shell', 'atom', 'knot'],      // 태평양: big waves and deep-sea shells
    ['city', 'tree', 'gear', 'grid'],       // 아메리카: towers and machinery
    ['chain', 'wave', 'knot', 'shell'],     // 대서양: undersea cables
    ['crystal', 'web', 'pyramid', 'chain'], // 유럽: old castles and fine webs
    ['tree', 'galaxy', 'burst', 'nebula'],  // 아프리카: great trees under a starry sky
    ['flower', 'shell', 'atom', 'wave'],    // 인도양: coral and shells
    ['pyramid', 'dna', 'flower', 'city'],   // 아시아: temples and dense cities
    ['nebula', 'flower', 'ring', 'sphere'], // 오세아니아: reefs and islands
  ];
  // world regions
  //  0–7  continents & oceans, laid out by direction around the center
  //  8–9  secret zones the app unlocks (태양계 above the world, 이그드라실 below)
  //  10–14 special networks with fixed anchors
  const REGION_NAMES = ['태평양 네트워크', '아메리카 네트워크', '대서양 네트워크', '유럽 네트워크', '아프리카 네트워크', '인도양 네트워크', '아시아 네트워크', '오세아니아 네트워크',
    '태양계 네트워크', '이그드라실 코어', '커널', '딥웹 네트워크', '다크 에리어', '디지털 해저드', '어나니머스 네트워크'];
  const REGION_EN = ['PACIFIC', 'AMERICA', 'ATLANTIC', 'EUROPE', 'AFRICA', 'INDIAN OCEAN', 'ASIA', 'OCEANIA',
    'SOLAR SYSTEM', 'YGGDRASIL CORE', 'KERNEL', 'DEEP WEB', 'DARK AREA', 'DIGITAL HAZARD', 'ANONYMOUS'];
  const REGION_COLOR = [0, 7, 6, 5, 4, 8, 1, 3, 2, 3, 10, 11, 12, 4, 13]; // indexes into PALETTE
  const OPEN_REGIONS = 8, SOLAR = 8, YGGDRASIL = 9;
  const SECRETS = new Set([SOLAR, YGGDRASIL]);
  const isSecret = k => SECRETS.has(k);
  // special networks: [region, anchor x, y, z, shapes, scale]
  const SPECIAL = [];   // filled by the layout below: [region, x, y, z, shapes, scale]
  const SPECIAL_SHAPES = {
    10: [['atom', 'gear', 'shell'], 1.15],    // 커널: the core at the center
    11: [['dna', 'helix', 'nebula'], 1],      // 딥웹
    12: [['nebula', 'knot', 'burst'], 1.2],   // 다크 에리어
    13: [['mobius', 'burst', 'web'], 1],      // 디지털 해저드
    14: [['mobius', 'shell', 'chain'], .95],  // 어나니머스
  };
  // more named networks scattered around the rim: [이름, EN, 색, 모양들]
  const EXTRA = [
    ['파일 섬', 'FILE ISLAND', 3, ['flower', 'tree']],
    ['서버 대륙', 'SERVER CONTINENT', 6, ['city', 'crystal']],
    ['방화벽 요새', 'FIREWALL FORTRESS', 7, ['gear', 'pyramid']],
    ['버그 정크야드', 'BUG JUNKYARD', 4, ['nebula', 'burst']],
    ['캐시 사막', 'CACHE DESERT', 2, ['wave', 'pyramid']],
    ['프록시 미궁', 'PROXY LABYRINTH', 5, ['crystal', 'knot']],
    ['아카이브 도서관', 'ARCHIVE LIBRARY', 8, ['city', 'shell']],
    ['바이러스 늪', 'VIRUS SWAMP', 12, ['nebula', 'torus']],
    ['백신 성역', 'VACCINE SANCTUARY', 10, ['flower', 'atom']],
    ['쿼리 협곡', 'QUERY CANYON', 4, ['wave', 'web']],
    ['블록체인 산맥', 'BLOCKCHAIN RIDGE', 2, ['chain', 'crystal']],
    ['클라우드 하늘섬', 'CLOUD ISLES', 6, ['nebula', 'sphere']],
    ['양자 네트워크', 'QUANTUM NETWORK', 9, ['atom', 'knot']],
    ['위성 궤도망', 'SATELLITE ORBIT', 0, ['atom', 'ring']],
    ['레거시 서버 묘지', 'LEGACY GRAVEYARD', 13, ['city', 'cube']],
    ['피싱 해역', 'PHISHING WATERS', 1, ['web', 'wave']],
    ['다크웹 마켓', 'DARK MARKET', 11, ['crystal', 'burst']],
    ['미러 서버', 'MIRROR SERVER', 10, ['mobius', 'shell']],
    ['노이즈 폭풍지대', 'NOISE STORM', 9, ['galaxy', 'burst']],
    ['코드 정글', 'CODE JUNGLE', 3, ['tree', 'dna']],
  ];
  // hidden networks the app unlocks (besides 태양계·이그드라실): [이름, EN, 색, 모양들]
  const HIDDEN = [
    ['어비스', 'ABYSS', 12, ['galaxy', 'nebula', 'knot']],
    ['사성수 결계', 'FOUR HOLY BEASTS', 4, ['gear', 'flower', 'atom']],
    ['올림포스 서버', 'OLYMPOS SERVER', 2, ['pyramid', 'city', 'ring']],
    ['천사의 계단', 'ANGEL STAIRS', 10, ['dna', 'flower', 'shell']],
    ['X 프로그램 격리구역', 'X-PROGRAM QUARANTINE', 11, ['mobius', 'crystal', 'burst']],
  ];
  // layout: every region gets its own anchor, far enough apart to click easily
  //   kernel in the middle · continents on ring 1 · special + extra networks on rings 2 and 3
  //   hidden networks beyond the outer ring · 태양계 high above, 이그드라실 deep below
  const TAU = Math.PI * 2, RING1 = 5200, RING2 = 9600, RING3 = 13800, RING4 = 17600;
  const SOLAR_Y = -5200, YGG_Y = 5000;
  const CONTINENT_ANCHOR = [];
  {
    const r = mulberry(4242);
    for (let k = 0; k < OPEN_REGIONS; k++) { const a = k / OPEN_REGIONS * TAU + .2; CONTINENT_ANCHOR.push([Math.cos(a) * RING1, (k % 2 ? -1 : 1) * 1300 + (r() - .5) * 1800, Math.sin(a) * RING1]); }
    SPECIAL.push([10, 0, 0, 0, ...SPECIAL_SHAPES[10]]);
    const outer = [];
    EXTRA.forEach(([ko, en, col, shapes]) => {
      const id = REGION_NAMES.length; REGION_NAMES.push(ko); REGION_EN.push(en); REGION_COLOR.push(col);
      outer.push([id, shapes, .9]);
    });
    // spread the four named specials evenly through ring 2
    [11, 12, 13, 14].forEach((id, k) => outer.splice(k * 3, 0, [id, ...SPECIAL_SHAPES[id]]));
    const n2 = 12;
    outer.forEach(([id, shapes, scale], k) => {
      const onTwo = k < n2, cnt = onTwo ? n2 : outer.length - n2, kk = onTwo ? k : k - n2;
      const a = kk / cnt * TAU + (onTwo ? 0 : Math.PI / cnt) + (r() - .5) * .12, rad = (onTwo ? RING2 : RING3) + (r() - .5) * 700;
      SPECIAL.push([id, Math.cos(a) * rad, Math.sin(k * 2.1 + .7) * 3200 + (r() - .5) * 1800, Math.sin(a) * rad, shapes, scale]);
    });
    HIDDEN.forEach(([ko, en, col, shapes], k) => {
      const id = REGION_NAMES.length; REGION_NAMES.push(ko); REGION_EN.push(en); REGION_COLOR.push(col); SECRETS.add(id);
      const a = k / HIDDEN.length * TAU + .55;
      SPECIAL.push([id, Math.cos(a) * RING4, (k % 2 ? -1 : 1) * (3600 + r() * 1600), Math.sin(a) * RING4, shapes, 1.35]);
    });
  }
  // node kinds
  const DOT = 0, SQUARE = 1, DIAMOND = 2, RING = 3, CROSS = 4, HUB = 5, RELAY = 6, DUST = 7;

  function mulberry(seed) {
    return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  const lerp = (a, b, t) => a + (b - a) * t;
  const imgCache = new Map();
  const loadImg = src => { if (!src) return null; if (!imgCache.has(src)) { const im = new Image(); im.src = src; imgCache.set(src, im); } return imgCache.get(src); };
  const roJosa = w => { const c = w.charCodeAt(w.length - 1), k = (c >= 0xAC00 && c <= 0xD7A3) ? (c - 0xAC00) % 28 : 0; return (k === 0 || k === 8) ? '로' : '으로'; };
  const msText = ms => `${Math.max(0, Math.round(ms))}ms`;
  const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const easeOut = t => 1 - Math.pow(1 - t, 3);

  /* ---------- graph ---------- */
  function buildGraph(seed, clusterCount) {
    const r = mulberry(seed);
    const X = [], Y = [], Z = [], C = [], K = [], S = [], CL = [], E = [], parent = [], RG = [];
    const find = i => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
    let curRegion = -1;
    const add = (x, y, z, c, k, s, cl) => { const i = X.length; X.push(x); Y.push(y); Z.push(z); C.push(c); K.push(k); S.push(s); CL.push(cl); RG.push(curRegion); parent.push(i); return i; };
    const link = (a, b) => { if (a === b) return; E.push(a, b); parent[find(a)] = find(b); };
    const d2 = (a, b) => (X[a] - X[b]) ** 2 + (Y[a] - Y[b]) ** 2 + (Z[a] - Z[b]) ** 2;
    const kindPick = () => { const v = r(); return v < .5 ? DOT : v < .72 ? SQUARE : v < .85 ? DIAMOND : v < .95 ? RING : CROSS; };
    const rotM = () => {
      const a = r() * 6.283, b = r() * 6.283, c = r() * 6.283;
      const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b), cc = Math.cos(c), sc = Math.sin(c);
      return [cb * cc, -cb * sc, sb, sa * sb * cc + ca * sc, -sa * sb * sc + ca * cc, -sa * cb, -ca * sb * cc + sa * sc, ca * sb * sc + sa * cc, ca * cb];
    };
    const randDir = () => { const th = r() * 6.283, ph = Math.acos(2 * r() - 1); return [Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)]; };

    const hubs = [], clusters = [];
    const makeCluster = (cx, cy, cz, region, fixed) => {
      const c = clusters.length;
      curRegion = region;
      const col = fixed && !fixed.loose ? REGION_COLOR[region] : (r() < .6 ? REGION_COLOR[region] : Math.floor(r() * PALETTE.length));
      const shape = fixed && fixed.shape ? fixed.shape : SHAPES[Math.floor(r() * SHAPES.length)];
      const R = (210 + r() * 170) * (fixed ? fixed.scale : 1), M = rotM();
      const hub = add(cx, cy, cz, col, HUB, 3.2, c);
      hubs.push(hub); clusters.push({ x: cx, y: cy, z: cz, hub, col, shape, region: curRegion });
      const ids = [];
      const put = (lx, ly, lz, k) => {
        const x = cx + M[0] * lx + M[1] * ly + M[2] * lz, y = cy + M[3] * lx + M[4] * ly + M[5] * lz, z = cz + M[6] * lx + M[7] * ly + M[8] * lz;
        const cc = r() < (fixed && !fixed.loose ? .05 : .14) ? Math.floor(r() * PALETTE.length) : col;
        const i = add(x, y, z, cc, k ?? kindPick(), .9 + r() * 1.3, c); ids.push(i); return i;
      };
      switch (shape) {
        case 'sphere': { const n = 40 + (r() * 40 | 0); for (let i = 0; i < n; i++) { const d = randDir(), rr = R * Math.cbrt(r()); put(d[0] * rr, d[1] * rr, d[2] * rr); } break; }
        case 'torus': { const n = 50 + (r() * 30 | 0), a = R * .85, b = R * .3;
          for (let i = 0; i < n; i++) { const u = r() * 6.283, v = r() * 6.283; put((a + b * Math.cos(v)) * Math.cos(u), b * Math.sin(v), (a + b * Math.cos(v)) * Math.sin(u)); } break; }
        case 'ring': { const rings = 2 + (r() * 2 | 0);
          for (let gI = 0; gI < rings; gI++) { const n = 22 + (r() * 18 | 0), rr = R * (.45 + gI * .3), tilt = (r() - .5) * 1.2; let prev = -1, first = -1;
            for (let i = 0; i < n; i++) { const a = i / n * 6.283; const id = put(Math.cos(a) * rr, Math.sin(a) * rr * tilt, Math.sin(a) * rr); if (prev >= 0) link(prev, id); else first = id; prev = id; }
            link(prev, first); link(first, hub); } break; }
        case 'spiral': { const arms = 2 + (r() * 3 | 0), n = 14 + (r() * 10 | 0);
          for (let a = 0; a < arms; a++) { let prev = hub;
            for (let i = 0; i < n; i++) { const t = (i + 1) / n, ang = t * 5 + a / arms * 6.283; const id = put(Math.cos(ang) * t * R * 1.4, (r() - .5) * 26, Math.sin(ang) * t * R * 1.4); link(prev, id); prev = id; } } break; }
        case 'grid': { const n = 6 + (r() * 3 | 0), sp = R * 2 / n, gr = [];
          for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) gr[i * n + j] = put((i - (n - 1) / 2) * sp, 0, (j - (n - 1) / 2) * sp, r() < .7 ? SQUARE : kindPick());
          for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { if (i + 1 < n && r() < .85) link(gr[i * n + j], gr[(i + 1) * n + j]); if (j + 1 < n && r() < .85) link(gr[i * n + j], gr[i * n + j + 1]); }
          link(hub, gr[(n >> 1) * n + (n >> 1)]); break; }
        case 'cube': { const n = 4, sp = R * 2 / n, gr = [];
          for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let k = 0; k < n; k++) gr.push(put((i - 1.5) * sp, (j - 1.5) * sp, (k - 1.5) * sp, r() < .6 ? DIAMOND : kindPick()));
          const at = (i, j, k) => gr[(i * n + j) * n + k];
          for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let k = 0; k < n; k++) {
            if (i + 1 < n && r() < .6) link(at(i, j, k), at(i + 1, j, k)); if (j + 1 < n && r() < .6) link(at(i, j, k), at(i, j + 1, k)); if (k + 1 < n && r() < .6) link(at(i, j, k), at(i, j, k + 1)); }
          link(hub, at(1, 1, 1)); break; }
        case 'helix': { const n = 26 + (r() * 16 | 0), h = R * 2.4; let pa = -1, pb = -1;
          for (let i = 0; i < n; i++) { const t = i / (n - 1), ang = t * 12;
            const a = put(Math.cos(ang) * R * .45, (t - .5) * h, Math.sin(ang) * R * .45), b = put(-Math.cos(ang) * R * .45, (t - .5) * h, -Math.sin(ang) * R * .45);
            if (pa >= 0) { link(pa, a); link(pb, b); } if (i % 3 === 0) link(a, b); pa = a; pb = b; }
          link(hub, ids[(n >> 1) * 2]); break; }
        case 'burst': { const rays = 8 + (r() * 8 | 0), n = 4 + (r() * 4 | 0);
          for (let k = 0; k < rays; k++) { const d = randDir(); let prev = hub;
            for (let i = 0; i < n; i++) { const t = (i + 1) / n * R * 1.3; const id = put(d[0] * t, d[1] * t, d[2] * t); link(prev, id); prev = id; } } break; }
        case 'dna': { const n = 30 + (r() * 10 | 0), h = R * 2.7, rad = R * .42; let pa = -1, pb = -1, mid = -1;
          for (let i = 0; i < n; i++) { const t = i / (n - 1), ang = t * 15, y = (t - .5) * h;
            const a = put(Math.cos(ang) * rad, y, Math.sin(ang) * rad, DIAMOND), b = put(-Math.cos(ang) * rad, y, -Math.sin(ang) * rad, DIAMOND);
            if (pa >= 0) { link(pa, a); link(pb, b); }
            if (i % 2 === 0) { const m = put(0, y, 0, DOT); link(a, m); link(m, b); if (i === (n >> 2) * 2) mid = m; }
            pa = a; pb = b; }
          if (mid >= 0) link(hub, mid); break; }
        case 'galaxy': { for (let i = 0; i < 18; i++) { const d = randDir(), rr = R * .24 * Math.cbrt(r()); link(hub, put(d[0] * rr, d[1] * rr * .6, d[2] * rr, DOT)); }
          const arms = 2 + (r() * 3 | 0), n = 22, a0 = r() * 6.283;
          for (let a = 0; a < arms; a++) { let prev = hub;
            for (let i = 0; i < n; i++) { const t = (i + 1) / n, ang = a0 + a / arms * 6.283 + t * 6.5, rr = R * 1.6 * t;
              const id = put(Math.cos(ang) * rr, (r() - .5) * R * .08, Math.sin(ang) * rr); link(prev, id); prev = id;
              if (r() < .55) link(id, put(Math.cos(ang) * rr + (r() - .5) * R * .3, (r() - .5) * R * .14, Math.sin(ang) * rr + (r() - .5) * R * .3, DOT)); } } break; }
        case 'tree': { const grow = (from, x, y, z, dx, dy, dz, len, depth) => {
            const nx = x + dx * len, ny = y + dy * len, nz = z + dz * len, id = put(nx, ny, nz, depth > 1 ? SQUARE : DIAMOND); link(from, id);
            if (depth <= 0) return;
            const kids = depth > 2 ? 2 : 2 + (r() < .5 ? 1 : 0);
            for (let k = 0; k < kids; k++) { const ex = dx + (r() - .5) * 1.5, ey = dy - .15 - r() * .2, ez = dz + (r() - .5) * 1.5, m = Math.hypot(ex, ey, ez);
              grow(id, nx, ny, nz, ex / m, ey / m, ez / m, len * .74, depth - 1); } };
          let prev = hub; for (let i = 1; i <= 3; i++) { const id = put((r() - .5) * 8, R * .9 - i * R * .3, (r() - .5) * 8, SQUARE); link(prev, id); prev = id; }
          grow(prev, 0, 0, 0, 0, -1, 0, R * .5, 4); break; }
        case 'crystal': { const L = 3, rad = 3, sp = R * .34, at = new Map();
          for (let l = 0; l < L; l++) for (let q = -rad; q <= rad; q++) for (let w = -rad; w <= rad; w++) { if (Math.abs(q + w) > rad) continue;
            at.set(l + ',' + q + ',' + w, put(sp * (q + w / 2), (l - (L - 1) / 2) * sp * 1.1, sp * w * .866, r() < .6 ? DIAMOND : kindPick())); }
          for (const [key, id] of at) { const [l, q, w] = key.split(',').map(Number);
            for (const [dq, dw] of [[1, 0], [0, 1], [-1, 1]]) { const o = at.get(l + ',' + (q + dq) + ',' + (w + dw)); if (o !== undefined && r() < .88) link(id, o); }
            const up = at.get((l + 1) + ',' + q + ',' + w); if (up !== undefined && r() < .45) link(id, up); }
          link(hub, at.get('1,0,0')); break; }
        case 'knot': { const P = r() < .5 ? 2 : 3, Q = P === 2 ? 3 : 4, n = 96; let prev = -1, first = -1;
          for (let i = 0; i < n; i++) { const t = i / n * 6.283, rr = R * (.72 + .3 * Math.cos(Q * t));
            const id = put(rr * Math.cos(P * t), R * .38 * Math.sin(Q * t), rr * Math.sin(P * t), i % 8 ? DOT : RING);
            if (prev >= 0) link(prev, id); else first = id; prev = id; }
          link(prev, first); link(hub, first); break; }
        case 'web': { const spokes = 10 + (r() * 5 | 0), rings = 6, at = [];
          for (let k = 0; k < spokes; k++) { const a = k / spokes * 6.283; at.push([]);
            for (let ri = 0; ri < rings; ri++) { const rr = R * 1.4 * (ri + 1) / rings * (.92 + r() * .16);
              const id = put(Math.cos(a) * rr, (r() - .5) * R * .05, Math.sin(a) * rr, ri === rings - 1 ? DIAMOND : DOT); at[k].push(id);
              if (ri) link(at[k][ri - 1], id); else link(hub, id); } }
          for (let k = 0; k < spokes; k++) for (let ri = 0; ri < rings; ri++) if (r() < .9) link(at[k][ri], at[(k + 1) % spokes][ri]); break; }
        case 'city': { const n = 5, sp = R * .4, base = [];
          for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
            const x = (i - (n - 1) / 2) * sp, z = (j - (n - 1) / 2) * sp, h = 1 + (r() * (Math.abs(i - 2) + Math.abs(j - 2) < 2 ? 7 : 4) | 0);
            let prev = put(x, R * .6, z, SQUARE); base.push(prev);
            for (let k = 1; k <= h; k++) { const id = put(x, R * .6 - k * R * .2, z, k === h ? DIAMOND : SQUARE); link(prev, id); prev = id; } }
          for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { if (i + 1 < n && r() < .75) link(base[i * n + j], base[(i + 1) * n + j]); if (j + 1 < n && r() < .75) link(base[i * n + j], base[i * n + j + 1]); }
          link(hub, base[12]); break; }
        case 'shell': { const n = 96, at = [];
          for (let i = 0; i < n; i++) { const y = 1 - 2 * (i + .5) / n, rad = Math.sqrt(1 - y * y), th = i * 2.39996;
            at.push(put(Math.cos(th) * rad * R, y * R, Math.sin(th) * rad * R, i % 5 ? DOT : RING)); }
          for (let i = 0; i < n; i++) { if (i + 8 < n) link(at[i], at[i + 8]); if (i + 13 < n) link(at[i], at[i + 13]); if (i + 21 < n && r() < .4) link(at[i], at[i + 21]); }
          link(hub, at[n >> 1]); break; }
        case 'flower': { const k = [3, 5, 7][r() * 3 | 0], n = 110; let prev = -1, first = -1;
          for (let i = 0; i < n; i++) { const th = i / n * Math.PI, rr = R * 1.35 * Math.abs(Math.cos(k * th));
            const id = put(Math.cos(th) * rr, -rr * rr / R * .18, Math.sin(th) * rr, DOT); if (prev >= 0) link(prev, id); else first = id; prev = id; }
          link(prev, first);
          for (let i = 0; i < 12; i++) { const d = randDir(), rr = R * .16; link(hub, put(d[0] * rr, d[1] * rr, d[2] * rr, RING)); }
          let st = hub; for (let i = 1; i <= 7; i++) { const id = put(Math.sin(i * .5) * R * .08, i * R * .16, 0, SQUARE); link(st, id); st = id; }
          link(hub, first); break; }
        case 'chain': { const m = 5 + (r() * 3 | 0), rr = R * .34, n = 14; let prevRing = null;
          for (let k = 0; k < m; k++) { const cxk = (k - (m - 1) / 2) * rr * 1.45, ring = []; let prev = -1;
            for (let i = 0; i < n; i++) { const a = i / n * 6.283, u = Math.cos(a) * rr * 1.25, v = Math.sin(a) * rr * .8;
              const id = k % 2 ? put(cxk + u, 0, v) : put(cxk + u, v, 0); ring.push(id); if (prev >= 0) link(prev, id); prev = id; }
            link(prev, ring[0]);
            if (prevRing) link(prevRing[0], ring[n >> 1]); else link(hub, ring[n >> 1]);
            prevRing = ring; } break; }
        case 'nebula': { const blobs = 4 + (r() * 3 | 0); let prevC = hub;
          for (let b = 0; b < blobs; b++) { const d = randDir(), dd = R * (.4 + r() * .9), cxb = d[0] * dd, cyb = d[1] * dd * .7, czb = d[2] * dd;
            const cid = put(cxb, cyb, czb, RING); link(prevC, cid); if (r() < .5) link(hub, cid); prevC = cid;
            const cnt = 12 + (r() * 14 | 0), br = R * (.14 + r() * .24);
            for (let i = 0; i < cnt; i++) { const e = randDir(), q = br * Math.cbrt(r()); link(cid, put(cxb + e[0] * q, cyb + e[1] * q, czb + e[2] * q, DOT)); } } break; }
        case 'pyramid': { const layers = 5; let prevCorners = null;
          for (let l = 0; l < layers; l++) { const half = R * 1.1 * (1 - l / layers), y = R * .7 - l * R * .32, per = 4 * Math.max(1, layers - l), pts = [];
            for (let i = 0; i < per; i++) { const t = i / per * 4, side = Math.floor(t), f = t - side;
              const [x, z] = [[-half + 2 * half * f, -half], [half, -half + 2 * half * f], [half - 2 * half * f, half], [-half, half - 2 * half * f]][side];
              pts.push(put(x, y, z, f === 0 ? DIAMOND : SQUARE)); }
            pts.forEach((id, i) => link(id, pts[(i + 1) % pts.length]));
            const corners = [0, 1, 2, 3].map(q => pts[q * pts.length / 4 | 0]);
            if (prevCorners) corners.forEach((id, q) => link(id, prevCorners[q])); prevCorners = corners; }
          const apex = put(0, R * .7 - layers * R * .32, 0, RING); prevCorners.forEach(id => link(apex, id)); link(hub, apex); break; }
        case 'wave': { const n = 11, sp = R * 2.6 / n, gr = [], ph = r() * 6;
          for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const x = (i - (n - 1) / 2) * sp, z = (j - (n - 1) / 2) * sp;
            gr.push(put(x, Math.sin(i * .75 + ph) * R * .22 + Math.cos(j * .6) * R * .16, z, DOT)); }
          for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { if (i + 1 < n) link(gr[i * n + j], gr[(i + 1) * n + j]); if (j + 1 < n && (i + j) % 2 === 0) link(gr[i * n + j], gr[i * n + j + 1]); }
          link(hub, gr[(n >> 1) * n + (n >> 1)]); break; }
        case 'atom': { for (let i = 0; i < 14; i++) { const d = randDir(), rr = R * .15 * Math.cbrt(r()); link(hub, put(d[0] * rr, d[1] * rr, d[2] * rr, RING)); }
          const orbits = 3 + (r() * 2 | 0);
          for (let o = 0; o < orbits; o++) { const Mo = rotM(), n = 36; let prev = -1, first = -1;
            for (let i = 0; i < n; i++) { const a = i / n * 6.283, ex = Math.cos(a) * R * 1.35, ez = Math.sin(a) * R * .5;
              const id = put(Mo[0] * ex + Mo[2] * ez, Mo[3] * ex + Mo[5] * ez, Mo[6] * ex + Mo[8] * ez, i === 0 ? RING : DOT);
              if (prev >= 0) link(prev, id); else first = id; prev = id; }
            link(prev, first); link(hub, first); } break; }
        case 'mobius': { const n = 36, vs = [-1, 0, 1], at = [];
          for (let i = 0; i < n; i++) { const u = i / n * 6.283; at.push(vs.map(v => { const w = v * .45, k = 1 + w * Math.cos(u / 2);
            return put(k * Math.cos(u) * R, w * Math.sin(u / 2) * R, k * Math.sin(u) * R, v ? DOT : DIAMOND); })); }
          for (let i = 0; i < n; i++) { for (let v = 0; v < 3; v++) { link(at[i][v], i + 1 < n ? at[i + 1][v] : at[0][2 - v]); if (v < 2) link(at[i][v], at[i][v + 1]); } }
          link(hub, at[0][1]); break; }
        case 'gear': { const teeth = 12 + (r() * 5 | 0), ro = R * 1.25, ri = R * 1.02, pts = [];
          for (let k = 0; k < teeth; k++) { const a = k / teeth * 6.283, w = 6.283 / teeth;
            for (const [da, rr] of [[0, ri], [w * .2, ro], [w * .5, ro], [w * .7, ri]]) pts.push(put(Math.cos(a + da) * rr, 0, Math.sin(a + da) * rr, rr === ro ? SQUARE : DOT)); }
          pts.forEach((id, i) => link(id, pts[(i + 1) % pts.length]));
          const inner = []; for (let k = 0; k < 10; k++) { const a = k / 10 * 6.283; inner.push(put(Math.cos(a) * R * .35, 0, Math.sin(a) * R * .35, DIAMOND)); }
          inner.forEach((id, k) => { link(id, inner[(k + 1) % 10]); link(id, hub); if (k % 2 === 0) link(id, pts[Math.round(k / 10 * pts.length) % pts.length]); });
          break; }
      }
      // make sure every node in the cluster reaches the hub (nearest-attachment)
      const attached = [hub];
      for (const id of ids) {
        if (find(id) === find(hub)) { attached.push(id); continue; }
        let best = hub, bd = Infinity;
        for (const j of attached) { const dd = d2(id, j); if (dd < bd) { bd = dd; best = j; } }
        link(id, best); attached.push(id);
      }
      if (shape === 'sphere' || shape === 'torus') for (const id of ids) if (r() < .25) {
        let best = -1, bd = Infinity; for (const j of ids) if (j !== id) { const dd = d2(id, j); if (dd < bd) { bd = dd; best = j; } }
        if (best >= 0) link(id, best);
      }
    };
    // special networks first, so the open world spreads around them
    for (const [region, ax, ay, az, shapes, scale] of SPECIAL) {
      shapes.forEach((shape, k) => {
        const a = k / shapes.length * 6.283 + r(), off = k ? 640 : 0;
        const el = (r() - .5) * 1.4;
        makeCluster(ax + Math.cos(a) * Math.cos(el) * off, ay + Math.sin(el) * off + (r() - .5) * 200, az + Math.sin(a) * Math.cos(el) * off, region, { shape, scale });
      });
    }
    const perContinent = Math.max(2, Math.round(clusterCount / OPEN_REGIONS));
    CONTINENT_ANCHOR.forEach(([ax, ay, az], region) => {
      for (let c = 0; c < perContinent; c++) {
        let cx = ax, cy = ay, cz = az, tries = 0;
        if (c) do {
          const d = randDir(), rad = 600 + r() * 600;
          cx = ax + d[0] * rad; cy = ay + d[1] * rad * 1.1; cz = az + d[2] * rad; tries++;
        } while (tries < 60 && clusters.some(q => (q.x - cx) ** 2 + (q.y - cy) ** 2 + (q.z - cz) ** 2 < 620 * 620));
        const sig = CONTINENT_SHAPES[region];
        makeCluster(cx, cy, cz, region, { shape: sig[c % sig.length], scale: 1.05, loose: true });
      }
    });
    // backbone: hubs to their nearest hubs through bent relay chains
    const done = new Set();
    hubs.forEach((h, ci) => {
      hubs.map((o, j) => [j, d2(h, o)]).filter(([j]) => j !== ci).sort((a, b) => a[1] - b[1]).slice(0, 3).forEach(([j]) => {
        const key = ci < j ? ci + '-' + j : j + '-' + ci; if (done.has(key)) return; done.add(key);
        const o = hubs[j], len = Math.sqrt(d2(h, o)), steps = Math.min(16, 3 + Math.round(len / 700) + (r() * 3 | 0)), bk = 1 + len / 5000,
          bend = [(r() - .5) * 500 * bk, (r() - .5) * 300 * bk, (r() - .5) * 500 * bk];
        let prev = h;
        for (let s = 1; s < steps; s++) {
          const t = s / steps, bow = Math.sin(t * Math.PI);
          curRegion = t < .5 ? clusters[ci].region : clusters[j].region;
          const id = add(lerp(X[h], X[o], t) + bend[0] * bow, lerp(Y[h], Y[o], t) + bend[1] * bow, lerp(Z[h], Z[o], t) + bend[2] * bow,
            r() < .5 ? clusters[ci].col : clusters[j].col, RELAY, 1.2, -1);
          link(prev, id); prev = id;
        }
        link(prev, o);
      });
    });
    for (let i = 1; i < hubs.length; i++) if (find(hubs[i]) !== find(hubs[0])) {
      let best = hubs[0], bd = Infinity;
      for (let j = 0; j < hubs.length; j++) if (find(hubs[j]) === find(hubs[0])) { const dd = d2(hubs[i], hubs[j]); if (dd < bd) { bd = dd; best = hubs[j]; } }
      link(hubs[i], best);
    }
    // secret zones: built far above / below the world, joined by one long relay chain
    const secret = (region, cx, cy, cz, build) => {
      curRegion = region;
      const c = clusters.length, col = REGION_COLOR[region];
      const hub = add(cx, cy, cz, col, HUB, 5, c);
      build(hub, c, col);
      let best = hubs[0], bd = Infinity;
      for (const h of hubs) { const dd = d2(hub, h); if (dd < bd) { bd = dd; best = h; } }
      let prev = hub; const steps = Math.min(22, 6 + Math.round(Math.sqrt(bd) / 700));
      for (let s = 1; s < steps; s++) { const t = s / steps, bow = Math.sin(t * Math.PI) * 400;
        const id = add(lerp(X[hub], X[best], t) + bow, lerp(Y[hub], Y[best], t), lerp(Z[hub], Z[best], t), col, RELAY, 1.6, -1); link(prev, id); prev = id; }
      link(prev, best);
      hubs.push(hub); clusters.push({ x: cx, y: cy, z: cz, hub, col, shape: 'secret', region });
    };
    secret(SOLAR, 0, SOLAR_Y, 0, (sun, c) => {
      let prevPlanet = sun;
      for (let p = 0; p < 8; p++) {
        const rad = 160 + p * 85, n = 28 + p * 5, tilt = (r() - .5) * .25, a0 = r() * 6.283;
        let prev = -1, first = -1, planet = -1;
        for (let i = 0; i < n; i++) { const a = a0 + i / n * 6.283;
          const id = add(Math.cos(a) * rad, SOLAR_Y + Math.sin(a) * rad * tilt, Math.sin(a) * rad, p % 2 ? 2 : 4, DOT, .8, c);
          if (prev >= 0) link(prev, id); else first = id; prev = id; if (i === 0) planet = id; }
        link(prev, first);
        const pl = add(X[planet], Y[planet], Z[planet], [4, 0, 6, 7, 2, 4, 8, 5][p], RING, 2.6 + (p === 4 ? 1.4 : 0), c);
        link(pl, planet); link(prevPlanet, pl); prevPlanet = pl;
      }
    });
    secret(YGGDRASIL, 0, YGG_Y, 0, (root, c) => {
      const grow = (from, x, y, z, dx, dy, dz, len, depth) => {
        const nx = x + dx * len, ny = y + dy * len, nz = z + dz * len;
        const id = add(nx, ny, nz, depth > 1 ? 3 : (r() < .5 ? 1 : 8), depth > 1 ? SQUARE : DIAMOND, depth > 1 ? 1.4 : 1.8, c);
        link(from, id);
        if (depth <= 0) return;
        const kids = depth > 3 ? 2 : 2 + (r() < .5 ? 1 : 0);
        for (let k = 0; k < kids; k++) {
          let ex = dx + (r() - .5) * 1.4, ey = dy - .25 - r() * .3, ez = dz + (r() - .5) * 1.4; const m = Math.hypot(ex, ey, ez);
          grow(id, nx, ny, nz, ex / m, ey / m, ez / m, len * .78, depth - 1);
        }
      };
      let prev = root, y = YGG_Y;
      for (let i = 0; i < 5; i++) { y -= 70; const id = add((r() - .5) * 10, y, (r() - .5) * 10, 3, SQUARE, 2, c); link(prev, id); prev = id; }
      for (let b = 0; b < 3; b++) { const a = b / 3 * 6.283; grow(prev, 0, y, 0, Math.cos(a) * .6, -.8, Math.sin(a) * .6, 170, 5); }
    });

    // floating data dust
    curRegion = -1;
    for (let i = 0; i < 900; i++) { const d = randDir(), rad = 600 + r() * 17000; add(d[0] * rad, d[1] * rad * .6, d[2] * rad, Math.floor(r() * PALETTE.length), DUST, .5 + r() * .7, -1); }

    const n = X.length, adj = Array.from({ length: n }, () => []);
    for (let i = 0; i < E.length; i += 2) { adj[E[i]].push(E[i + 1]); adj[E[i + 1]].push(E[i]); }
    // regions: centroid of their clusters + the nodes you can land on
    const regions = REGION_NAMES.map((name, k) => ({ id: k, name, en: REGION_EN[k], col: REGION_COLOR[k], secret: isSecret(k), x: 0, y: 0, z: 0, clusters: [], nodes: [] }));
    clusters.forEach(cl => { const g = regions[cl.region]; g.clusters.push(cl); g.x += cl.x; g.y += cl.y; g.z += cl.z; });
    for (let i = 0; i < n; i++) if (RG[i] >= 0 && K[i] !== RELAY && K[i] !== DUST) regions[RG[i]].nodes.push(i);
    regions.forEach(g => { const m = g.clusters.length || 1; g.x /= m; g.y /= m; g.z /= m;
      let rad = 0; for (const i of g.nodes) rad = Math.max(rad, Math.hypot(X[i] - g.x, Y[i] - g.y, Z[i] - g.z)); g.rad = rad || 600; });
    return { n, X: Float32Array.from(X), Y: Float32Array.from(Y), Z: Float32Array.from(Z), C: Uint8Array.from(C), K: Uint8Array.from(K),
      S: Float32Array.from(S), CL: Int16Array.from(CL), RG: Int8Array.from(RG), E: Uint32Array.from(E), adj, hubs, clusters,
      regions: regions.filter(g => g.clusters.length) };
  }

  /* ---------- scene ---------- */
  class DigiNetwork {
    constructor(canvas, opts = {}) {
      this.c = canvas; this.g = canvas.getContext('2d');
      this.G = buildGraph(opts.seed ?? 1999, opts.clusters ?? 36);
      this.onStatus = opts.onStatus || (() => {});
      const n = this.G.n;
      this.px = new Float32Array(n); this.py = new Float32Array(n); this.pz = new Float32Array(n);
      this.current = this.G.hubs[0];
      this.focus = { x: this.G.X[this.current], y: this.G.Y[this.current], z: this.G.Z[this.current] };
      this.camD = 1100; this.rot = .6; this.pitch = .32;
      this.unlocked = new Set();
      this.mode = 'idle'; this.visited = new Map(); this.pathEdges = new Set(); this.labels = []; this.trail = [];
      this.edgeCount = this.G.E.length / 2;
      this.nodeCount = n;
      this.makeSprites(); this.makePulses(320);
      this.frame = this.frame.bind(this); this.resize = this.resize.bind(this);
    }
    makeSprites() {
      this.glow = [...PALETTE, '#ffffff'].map(col => {
        const s = document.createElement('canvas'); s.width = s.height = 64; const g = s.getContext('2d');
        const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        gr.addColorStop(0, col); gr.addColorStop(.25, col + 'aa'); gr.addColorStop(1, col + '00');
        g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return s;
      });
    }
    makePulses(count) {
      const E = this.G.E, m = E.length / 2;
      this.pulses = Array.from({ length: count }, () => { const e = Math.random() * m | 0; return { a: E[e * 2], b: E[e * 2 + 1], t: Math.random(), sp: .25 + Math.random() * .7 }; });
    }
    resize() {
      this.dpr = Math.min(2, window.devicePixelRatio || 1);
      this.c.width = Math.max(1, this.c.clientWidth * this.dpr); this.c.height = Math.max(1, this.c.clientHeight * this.dpr);
      // star field the size of the screen; tiled horizontally for parallax
      const W = this.c.width, H = this.c.height, s = document.createElement('canvas'); s.width = W; s.height = H;
      const g = s.getContext('2d'), r = mulberry(7);
      for (let i = 0; i < (W * H) / 2600; i++) {
        const x = r() * W, y = r() * H, big = r() < .06, a = .25 + r() * .75;
        g.globalAlpha = a; g.fillStyle = r() < .2 ? PALETTE[(r() * PALETTE.length) | 0] : '#ffffff';
        if (big) { g.beginPath(); g.arc(x, y, 1.3 * this.dpr, 0, 6.283); g.fill(); g.globalAlpha = a * .25; g.beginPath(); g.arc(x, y, 4 * this.dpr, 0, 6.283); g.fill(); }
        else g.fillRect(x, y, this.dpr * .8, this.dpr * .8);
      }
      this.stars = s;
    }
    /* aurora is painted at low resolution and stretched: the upscale is the blur */
    drawAurora(now) {
      if (!this.bgc) { this.bgc = document.createElement('canvas'); this.bgc.width = 192; this.bgc.height = 108; this.bgg = this.bgc.getContext('2d'); }
      const g = this.bgg, w = 192, h = 108, t = now * .00006;
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      const base = g.createLinearGradient(0, 0, 0, h); base.addColorStop(0, '#060418'); base.addColorStop(.5, '#03061a'); base.addColorStop(1, '#020310');
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'lighter';
      const blobs = [
        ['#14b8a6', .30, .30, .55, .9], ['#8b5cf6', .70, .25, .6, 1.3], ['#ec4899', .85, .70, .45, .7],
        ['#22d3ee', .20, .78, .5, 1.1], ['#4ade80', .50, .55, .4, .8], ['#f59e0b', .62, .92, .35, 1.6],
      ];
      blobs.forEach(([col, bx, by, rr, sp], i) => {
        const x = (bx + Math.sin(t * sp * 6 + i * 1.7) * .12) * w, y = (by + Math.cos(t * sp * 5 + i) * .1) * h, R = rr * w * (.85 + .15 * Math.sin(t * 9 + i));
        const gr = g.createRadialGradient(x, y, 0, x, y, R); gr.addColorStop(0, col + '38'); gr.addColorStop(.5, col + '12'); gr.addColorStop(1, col + '00');
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
      });
      g.globalCompositeOperation = 'source-over';
    }
    open() {
      if (this.active) return; this.active = true; this.resize();
      addEventListener('resize', this.resize); this.last = performance.now(); this.raf = requestAnimationFrame(this.frame);
      if (!this.zoomBound) this.bindZoom();
    }
    close() { this.active = false; cancelAnimationFrame(this.raf); removeEventListener('resize', this.resize); }
    /* mouse wheel + two-finger pinch change the zoom factor */
    zoomBy(f) { this.zoom = Math.max(.2, Math.min(2.6, (this.zoom || 1) * f)); }
    rotateBy(dRot, dPitch = 0) { this.rot += dRot; this.pitch = Math.max(-1.25, Math.min(1.35, this.pitch + dPitch)); this.userRotT = performance.now(); }
    resetView() { this.rot = .6; this.pitch = .32; this.zoom = 1; this.userRotT = 0; }
    bindZoom() {
      this.zoomBound = true; this.zoom = 1;
      // one-finger / mouse drag rotates; a press without movement stays a click
      let drag = null;
      this.c.addEventListener('pointerdown', e => { if (e.button === 0 || e.pointerType !== 'mouse') drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false }; });
      addEventListener('pointermove', e => {
        if (!drag || e.pointerId !== drag.id || pts.size > 1) return;
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (!drag.moved && Math.hypot(dx, dy) < 6) return;
        drag.moved = true; this.pinching = true; this.c.classList.add('dragging');
        this.rotateBy(dx * .006, dy * .004); drag.x = e.clientX; drag.y = e.clientY;
      });
      addEventListener('pointerup', e => { if (drag && e.pointerId === drag.id) { if (drag.moved) setTimeout(() => { this.pinching = false; }, 50); drag = null; this.c.classList.remove('dragging'); } });
      this.c.addEventListener('wheel', e => { e.preventDefault(); this.zoomBy(Math.exp(e.deltaY * .0012)); }, { passive: false });
      const pts = new Map(); let lastDist = 0;
      const dist = () => { const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
      this.c.addEventListener('pointerdown', e => { pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pts.size === 2) lastDist = dist(); });
      this.c.addEventListener('pointermove', e => {
        if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pts.size === 2) { const d = dist(); if (lastDist) this.zoomBy(lastDist / d); lastDist = d; this.pinching = true; }
      });
      const up = e => { pts.delete(e.pointerId); if (pts.size < 2) { lastDist = 0; setTimeout(() => { this.pinching = false; }, 50); } };
      this.c.addEventListener('pointerup', up); this.c.addEventListener('pointercancel', up);
    }
    /* evolution in place: flash + name over the current node */
    evolveFx({ label, sub, title, img }) {
      if (this.mode !== 'idle') return Promise.resolve();
      const t = this.current;
      this.tr = { path: [t], hops: 0, target: t, label, sub, flash: true, pool: [], travText: '', lockText: [sub, title], near: 520, reached: 0, HOP: 1, lockFrom: this.camD, img: loadImg(img) };
      this.visited.clear(); this.pathEdges.clear(); this.labels = []; this.trail = [];
      this.mode = 'lock'; this.t0 = performance.now(); this.lastStatus = '';
      return new Promise(res => { this.resolve = res; });
    }
    status(a, b) { const k = a + '|' + b; if (k !== this.lastStatus) { this.lastStatus = k; this.onStatus(a, b); } }

    bfs(start) {
      const G = this.G, dist = new Int32Array(G.n).fill(-1), prev = new Int32Array(G.n).fill(-1), q = [start]; dist[start] = 0;
      for (let h = 0; h < q.length; h++) { const u = q[h]; for (const v of G.adj[u]) if (dist[v] < 0) { dist[v] = dist[u] + 1; prev[v] = u; q.push(v); } }
      return { dist, prev };
    }
    /* first search: long dive from far away, ends on the partner's node */
    trace({ partner, names = [] }) {
      const G = this.G, start = this.current, { dist, prev } = this.bfs(start);
      const cands = []; let far = start;
      for (let i = 0; i < G.n; i++) { if (dist[i] > dist[far]) far = i; if (dist[i] >= 12 && dist[i] <= 20 && G.K[i] !== RELAY && G.RG[i] >= 0 && !isSecret(G.RG[i]) && G.CL[i] !== G.CL[start]) cands.push(i); }
      const target = cands.length ? cands[Math.random() * cands.length | 0] : far;
      return this.go(target, prev, { intro: true, label: partner, sub: 'PARTNER FOUND', pool: names.filter(nm => nm !== partner),
        trav: '파트너 신호를 추적하는 중', lock: ['SIGNAL LOCKED', `${partner} 발견!`], totalMs: 4600, near: 520 });
    }
    /* journey: jump to a random node inside a region */
    travelTo(regionId, { label = '', sub = '', flash = false, title = '', img = null } = {}) {
      const G = this.G, reg = G.regions.find(g => g.id === regionId);
      if (!reg || this.mode !== 'idle') return Promise.resolve(null);
      const { dist, prev } = this.bfs(this.current);
      const opts = reg.nodes.filter(i => i !== this.current && dist[i] > 0).sort((a, b) => dist[a] - dist[b]);
      if (!opts.length) return Promise.resolve(null);
      // random landing spot, but among the nearer part of the region so trips stay short
      const pool = opts.slice(0, Math.max(12, Math.ceil(opts.length * .35)));
      const target = pool[Math.random() * pool.length | 0];
      return this.go(target, prev, { intro: false, img, label: label || reg.name, sub: sub || `ARRIVED · ${reg.en}`, flash, pool: [],
        trav: `${reg.name}${roJosa(reg.name)} 이동하는 중 · 도착까지 {t}`, lock: [`ARRIVED · ${reg.en}`, title || `${reg.name} 도착`], totalMs: 3000, near: 600 })
        .then(() => ({ node: target, region: reg }));
    }
    go(target, prev, o) {
      const path = []; for (let v = target; v !== -1; v = prev[v]) path.unshift(v);
      const hops = path.length - 1, G = this.G, cum = [0];
      for (let k = 1; k < path.length; k++) { const a = path[k - 1], b = path[k];
        cum.push(cum[k - 1] + Math.hypot(G.X[a] - G.X[b], G.Y[a] - G.Y[b], G.Z[a] - G.Z[b])); }
      const len = cum[hops] || 1;
      // the farther the target, the longer the trip (about 1.6 units per ms, 1.4s to 16s)
      const dur = (o.intro ? o.totalMs : (o.quiet ? Math.max(1800, Math.min(5000, len / .7)) : Math.max(1400, Math.min(16000, len / 1.6)))) / (o.intro ? 1 : (this.speed || 1));
      this.visited.clear(); this.pathEdges.clear(); this.labels = []; this.trail = [];
      this.tr = { path, hops, target, label: o.label, sub: o.sub, flash: o.flash, pool: o.pool, travText: o.trav, lockText: o.lock, near: o.near,
        reached: 0, cum, len, dur, tcum: null, seg: 0, img: loadImg(o.img), camFrom: o.intro ? 950 : this.camD, quiet: !!o.quiet };
      if (o.quiet) { this.tr.lockFrom = this.camD; this.tr.near = this.camD; }
      { const beat = (o.intro ? 150 : o.quiet ? 260 : 120) / (o.intro ? 1 : (this.speed || 1)), tc = [0];
        const relay = path.map(v => G.K[v] === RELAY);
        // ease kind per hop: 0 full stop-and-go, 1 speed up into a relay, 2 slow down out of one, 3 glide
        const kind = []; for (let k = 1; k <= hops; k++) kind.push((relay[k] ? 1 : 0) + (relay[k - 1] ? 2 : 0));
        for (let k = 1; k <= hops; k++) { const share = (cum[k] - cum[k - 1]) / len * dur;
          tc.push(tc[k - 1] + (kind[k - 1] === 3 ? share : Math.max(beat, share))); }
        this.tr.tcum = tc; this.tr.kind = kind; this.tr.dur = tc[hops] || dur; }
      this.tr.travTpl = o.trav || '';
      this.tr.travText = this.tr.travTpl.replace('{t}', msText(this.tr.dur));
      this.lastTrip = { len, dur };
      this.mode = o.intro ? 'intro' : 'trav'; this.t0 = performance.now(); this.lastStatus = '';
      if (!o.intro) this.reach(0, this.t0, false);
      return new Promise(res => { this.resolve = res; });
    }
    /* roam inside the current region: hop to another node of it (short, quiet trip) */
    wander(regionId, text = '') {
      const G = this.G, reg = G.regions.find(g => g.id === regionId);
      if (!reg || this.mode !== 'idle') return Promise.resolve(null);
      const { dist, prev } = this.bfs(this.current);
      this.roamed = this.roamed || [];
      const opts = reg.nodes.filter(i => i !== this.current && dist[i] > 1 && !this.roamed.includes(i)).sort((a, b) => dist[a] - dist[b]);
      if (!opts.length) return Promise.resolve(null);
      const pool = opts.slice(0, Math.max(6, Math.ceil(opts.length * .5)));
      const target = pool[Math.random() * pool.length | 0];
      this.roamed.push(target); if (this.roamed.length > 12) this.roamed.shift();
      return this.go(target, prev, { intro: false, quiet: true, label: '', sub: '', flash: false, pool: [], trav: text || `${reg.name} 탐험 중`,
        lock: [`EXPLORING · ${reg.en}`, text || `${reg.name} 탐험 중`], totalMs: 0, near: 0 }).then(() => ({ node: target, region: reg }));
    }
    setStay(on, regionId) { this.staying = on; this.stayRegion = on ? this.G.regions.find(g => g.id === (regionId ?? this.currentRegion())) : null; if (!on) this.roamed = []; }
    /* explore mode: region labels + hover + pick by screen position */
    setExplore(on) { this.exploring = on; this.hover = -1; }
    // 시점 고정(1인칭): 여행 중 구역과 구역 사이를 이동할 때 카메라가 이동 방향을 바라보며 따라가요
    setFpv(on) { this.fpv = !!on; }
    unlock(id) { this.unlocked.add(id); }
    isOpen(id) { const g = this.G.regions.find(r => r.id === id); return !!g && (!g.secret || this.unlocked.has(id)); }
    regionAt(clientX, clientY) {
      if (!this.regionScreen) return -1;
      const rect = this.c.getBoundingClientRect(), x = (clientX - rect.left) * this.dpr, y = (clientY - rect.top) * this.dpr;
      // a region name under the pointer wins (topmost label first)
      for (let k = this.regionScreen.length - 1; k >= 0; k--) { const bx = this.regionScreen[k].box;
        if (bx && x >= bx[0] && x <= bx[2] && y >= bx[1] && y <= bx[3]) return this.regionScreen[k].id; }
      // nodes under the pointer decide first: majority region among the nearest few within reach
      const G = this.G, reach = (70 * this.dpr) ** 2, near = [];
      for (let i = 0; i < G.n; i++) {
        const rg = G.RG[i]; if (rg < 0 || G.K[i] === DUST || this.pz[i] <= 30) continue;
        const d = (this.px[i] - x) ** 2 + (this.py[i] - y) ** 2; if (d < reach) near.push([d, rg]);
      }
      if (near.length) {
        near.sort((a, b) => a[0] - b[0]); const votes = {};
        near.slice(0, 12).forEach(([, rg]) => { votes[rg] = (votes[rg] || 0) + 1; });
        const win = +Object.keys(votes).sort((a, b) => votes[b] - votes[a])[0];
        return this.isOpen(win) ? win : -2;   // -2: a secret zone that is still locked
      }
      let best = -1, bd = Infinity;
      for (const rs of this.regionScreen) { const d = (rs.x - x) ** 2 + (rs.y - y) ** 2; if (d < bd) { bd = d; best = rs.id; } }
      return best;
    }
    isSecretRegion(id) { const g = this.G.regions.find(r => r.id === id); return !!g && g.secret; }
    regionId(name) { const g = this.G.regions.find(r => r.name === name); return g ? g.id : -1; }
    regionName(id) { const g = this.G.regions.find(r => r.id === id); return g ? g.name : ''; }
    currentRegion() { return this.G.RG[this.current]; }
    skip() {
      if (!this.tr || this.mode === 'idle' || this.mode === 'lock') return;
      this.reach(this.tr.hops, performance.now(), false); this.mode = 'lock'; this.t0 = performance.now();
    }
    reach(upto, now, withLabels) {
      const tr = this.tr, G = this.G;
      while (tr.reached < upto) {
        tr.reached++;
        const id = tr.path[tr.reached], p = tr.path[tr.reached - 1];
        this.visited.set(id, now); this.pathEdges.add(p < id ? p * G.n + id : id * G.n + p);
        if (withLabels && tr.reached < tr.hops && G.K[id] !== RELAY && tr.pool.length)
          this.labels.push({ i: id, t: now, name: tr.pool[Math.random() * tr.pool.length | 0] });
      }
      if (!this.visited.has(tr.path[0])) this.visited.set(tr.path[0], now);
    }

    frame(now) {
      if (!this.active) return;
      const G = this.G, g = this.g, W = this.c.width, H = this.c.height, dpr = this.dpr;
      const dt = Math.min(50, now - this.last); this.last = now;
      const tr = this.tr;
      let fx = G.X[this.current], fy = G.Y[this.current], fz = G.Z[this.current];

      if (this.mode === 'intro') {
        const t = Math.min(1, (now - this.t0) / 1700), s = tr.path[0];
        fx = G.X[s]; fy = G.Y[s]; fz = G.Z[s];
        this.camD = lerp(7600, 950, easeOut(t));
        this.status(`CONNECTING · ${G.n.toLocaleString()} NODES · ${this.edgeCount.toLocaleString()} LINKS`, '디지털 네트워크에 접속하는 중');
        if (t >= 1) { this.mode = 'trav'; this.t0 = now; this.reach(0, now, true); }
      }
      if (this.mode === 'trav') {
        const el = now - this.t0, tt = Math.min(1, el / tr.dur);
        while (tr.seg < tr.hops - 1 && tr.tcum[tr.seg + 1] <= el) tr.seg++;
        const seg = tt >= 1 ? tr.hops : tr.seg;
        if (seg >= tr.hops) { this.reach(tr.hops, now, true); this.mode = 'lock'; this.t0 = now; }
        else {
          this.reach(seg, now, true);
          const a = tr.path[seg], b = tr.path[seg + 1], u = Math.min(1, (el - tr.tcum[seg]) / Math.max(1, tr.tcum[seg + 1] - tr.tcum[seg])), kd = tr.kind ? tr.kind[seg] : 0,
            f = kd === 3 ? u : kd === 1 ? u * u : kd === 2 ? 1 - (1 - u) * (1 - u) : ease(u);
          fx = lerp(G.X[a], G.X[b], f); fy = lerp(G.Y[a], G.Y[b], f); fz = lerp(G.Z[a], G.Z[b], f);
          const kk = tt, lift = Math.sin(Math.PI * tt) * Math.min(6000, tr.len * .3);   // long trips pull the camera back mid-flight
          this.camD = tr.quiet ? tr.camFrom
            : (tr.camFrom > 1500 ? lerp(tr.camFrom, 760, easeOut(Math.min(1, kk * 2.2))) : lerp(tr.camFrom, 720, kk)) + lift;
          if (this.fpv && this.exploring && !tr.quiet) {          // 1인칭: 몇 칸 앞을 바라보며 바짝 붙어서 따라가요
            if (tr.fpvHome == null) { tr.fpvHome = { pitch: this.pitch, camD: tr.camFrom }; this.fpvK = 0; }
            this.fpvK = Math.min(1, (this.fpvK || 0) + dt / 700);
            const la = tr.path[Math.min(tr.hops, seg + 4)];
            let dx = G.X[la] - fx, dy = G.Y[la] - fy, dz = G.Z[la] - fz;
            if (dx * dx + dy * dy + dz * dz < 400) { dx = G.X[b] - G.X[a]; dy = G.Y[b] - G.Y[a]; dz = G.Z[b] - G.Z[a]; }
            const dl = Math.hypot(dx, dy, dz) || 1, wantRot = Math.atan2(dx / dl, dz / dl), wantPitch = Math.max(-1.25, Math.min(1.25, Math.asin(dy / dl)));
            let dr = wantRot - this.rot; dr = Math.atan2(Math.sin(dr), Math.cos(dr));
            const k = 1 - Math.pow(1 - .14 * this.fpvK, dt / 16);
            this.rot += dr * k; this.pitch += (wantPitch - this.pitch) * k;
            this.camD = lerp(this.camD, 150, easeOut(this.fpvK));
            this.userRotT = now;
          }
          const rg = G.RG[b] >= 0 ? REGION_EN[G.RG[b]] : 'DEEP WEB';
          const cl = G.CL[b] >= 0 ? `CLUSTER ${String(G.CL[b] + 1).padStart(2, '0')}` : 'RELAY';
          this.status(`TRACE · HOP ${seg + 1} / ${tr.hops} · ${(tr.len * (1 - tt) / 100).toFixed(0)} GB LEFT · ${rg} · ${cl}`, tr.travTpl && tr.travTpl.includes('{t}') ? tr.travTpl.replace('{t}', msText(tr.dur - el)) : tr.travText);
        }
      }
      if (this.mode === 'lock') {
        const t = now - this.t0;
        this.current = tr.target; fx = G.X[tr.target]; fy = G.Y[tr.target]; fz = G.Z[tr.target];
        this.camD = lerp(tr.fpvHome ? 150 : (tr.lockFrom ?? 720), tr.near, ease(Math.min(1, t / 900)));
        if (tr.fpvHome) { this.pitch += (tr.fpvHome.pitch - this.pitch) * Math.min(1, dt / 220); this.fpvK = Math.max(0, (this.fpvK || 0) - dt / 900); }
        this.status(tr.lockText[0], tr.lockText[1]);
        if (t >= (tr.quiet ? 350 : tr.flash ? 2000 : 1400) / (tr.quiet ? (this.speed || 1) : 1)) { this.mode = 'idle'; this.idleT = now; const r = this.resolve; this.resolve = null; r && r(); }
      }
      const stayReg = this.staying ? this.stayRegion : null;
      if (this.mode === 'idle') this.camD = lerp(this.camD, stayReg ? stayReg.rad * 2.1 * Math.min(1, this.zoom || 1)
        : (this.exploring ? 9000 : 560) * (this.zoom || 1), this.exploring ? .06 : .04);
      if (this.mode === 'trav' || this.mode === 'lock') { this.trail.push([fx, fy, fz]); if (this.trail.length > 22) this.trail.shift(); }
      else if (this.trail.length) this.trail.shift();

      // smooth focus in idle so the camera glides; locked to the packet while tracing
      if (stayReg && (this.mode === 'idle' || tr.quiet)) { const k = .7;
        const tx = lerp(fx, stayReg.x, k), ty = lerp(fy, stayReg.y, k), tz = lerp(fz, stayReg.z, k);
        this.focus.x = lerp(this.focus.x, tx, .06); this.focus.y = lerp(this.focus.y, ty, .06); this.focus.z = lerp(this.focus.z, tz, .06); }
      else if (this.mode === 'idle') { this.focus.x = lerp(this.focus.x, fx, .08); this.focus.y = lerp(this.focus.y, fy, .08); this.focus.z = lerp(this.focus.z, fz, .08); }
      else { this.focus.x = fx; this.focus.y = fy; this.focus.z = fz; }
      if (now - (this.userRotT || 0) > 4000) this.rot += dt * (this.mode === 'idle' ? .00005 : .00011);

      /* projection */
      const fpvNow = this.fpv && this.exploring && tr && tr.fpvHome && (this.mode === 'trav' || this.mode === 'lock') ? (this.fpvK || 0) : 0;
      // 1인칭일 때는 오른쪽 패널에 가리지 않도록 빈 공간의 가운데를 바라봐요 (viewInset: 패널이 차지한 오른쪽 폭, CSS px)
      const F = Math.min(W, H) * lerp(1.05, .62, fpvNow), cxs = lerp(W / 2, (W - (this.viewInset || 0) * dpr) / 2, fpvNow), cys = H * lerp(.47, .5, fpvNow);
      const cr = Math.cos(this.rot), sr = Math.sin(this.rot), cp = Math.cos(this.pitch), sp = Math.sin(this.pitch), camD = this.camD;
      const ox = this.focus.x, oy = this.focus.y, oz = this.focus.z;
      const PX = this.px, PY = this.py, PZ = this.pz, n = G.n, DK = Math.max(1, camD / 4800);
      for (let i = 0; i < n; i++) {
        const x = G.X[i] - ox, y = G.Y[i] - oy, z = G.Z[i] - oz;
        const x1 = x * cr - z * sr, z1 = x * sr + z * cr;
        const y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp + camD;
        PZ[i] = z2; if (z2 > 30) { const s = F / z2; PX[i] = cxs + x1 * s; PY[i] = cys + y2 * s; }
      }
      const proj = (x, y, z) => { x -= ox; y -= oy; z -= oz; const x1 = x * cr - z * sr, z1 = x * sr + z * cr; const y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp + camD;
        if (z2 <= 30) return null; const s = F / z2; return [cxs + x1 * s, cys + y2 * s, z2]; };
      const onScreen = i => PZ[i] > 30 && PX[i] > -60 && PX[i] < W + 60 && PY[i] > -60 && PY[i] < H + 60;

      /* background: deep space + drifting aurora + parallax stars */
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      this.drawAurora(now);
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      g.drawImage(this.bgc, 0, 0, W, H);
      if (this.stars) {
        const sx = ((this.rot * 600 * dpr) % W + W) % W;
        g.globalAlpha = .9; g.drawImage(this.stars, -sx, 0); g.drawImage(this.stars, W - sx, 0);
        g.globalAlpha = 1;
      }

      g.globalCompositeOperation = 'lighter';
      /* edges, bucketed by color × depth */
      const E = G.E, buckets = new Array(PALETTE.length * 3);
      for (let e = 0; e < E.length; e += 2) {
        const a = E[e], b = E[e + 1];
        if (PZ[a] <= 30 || PZ[b] <= 30) continue;
        if ((PX[a] < 0 && PX[b] < 0) || (PX[a] > W && PX[b] > W) || (PY[a] < 0 && PY[b] < 0) || (PY[a] > H && PY[b] > H)) continue;
        const zz = (PZ[a] + PZ[b]) * .5, lv = zz < 1200 * DK ? 2 : zz < 2800 * DK ? 1 : 0, key = G.C[a] * 3 + lv;
        const p = buckets[key] || (buckets[key] = new Path2D()); p.moveTo(PX[a], PY[a]); p.lineTo(PX[b], PY[b]);
      }
      // crisper links: brighter, and thicker the closer they are
      for (let k = 0; k < buckets.length; k++) if (buckets[k]) { const lv = k % 3;
        g.strokeStyle = PALETTE[k / 3 | 0]; g.globalAlpha = [.2, .38, .66][lv]; g.lineWidth = [1, 1.3, 1.7][lv] * dpr; g.stroke(buckets[k]); }

      /* traced path */
      if (this.pathEdges.size) {
        const p = new Path2D();
        this.pathEdges.forEach(key => { const a = Math.floor(key / n), b = key % n; if (PZ[a] > 30 && PZ[b] > 30) { p.moveTo(PX[a], PY[a]); p.lineTo(PX[b], PY[b]); } });
        g.globalAlpha = .35; g.strokeStyle = '#7dd3fc'; g.lineWidth = 7 * dpr; g.stroke(p);
        g.globalAlpha = 1; g.strokeStyle = '#ffffff'; g.lineWidth = 2 * dpr; g.stroke(p);
      }
      if (this.mode === 'trav') {
        const a = tr.path[Math.min(tr.reached, tr.hops)], hp = proj(fx, fy, fz);
        if (hp && PZ[a] > 30) { g.globalAlpha = 1; g.strokeStyle = '#ffffff'; g.lineWidth = 2.4 * dpr; g.beginPath(); g.moveTo(PX[a], PY[a]); g.lineTo(hp[0], hp[1]); g.stroke(); }
      }

      /* data pulses flowing through links */
      for (const pu of this.pulses) {
        pu.t += dt * .001 * pu.sp;
        if (pu.t >= 1) { const nb = G.adj[pu.b]; const nx = nb[Math.random() * nb.length | 0]; pu.a = pu.b; pu.b = nx ?? pu.a; pu.t = 0; }
        const a = pu.a, b = pu.b; if (PZ[a] <= 30 || PZ[b] <= 30) continue;
        const x = lerp(PX[a], PX[b], pu.t), y = lerp(PY[a], PY[b], pu.t); if (x < -20 || x > W + 20 || y < -20 || y > H + 20) continue;
        const sz = Math.max(4, F / ((PZ[a] + PZ[b]) * .5) * 14) * dpr * .5;
        g.globalAlpha = Math.min(1, 1600 * DK / PZ[a]); g.drawImage(this.glow[G.C[a]], x - sz, y - sz, sz * 2, sz * 2);
      }

      /* nodes */
      for (let i = 0; i < n; i++) {
        if (!onScreen(i)) continue;
        const kind = G.K[i], s = F / PZ[i], x = PX[i], y = PY[i], col = PALETTE[G.C[i]];
        const depthA = Math.max(.5, Math.min(1, 1800 * DK / PZ[i]));
        const vis = this.visited.has(i);
        if (kind === DUST) { g.globalAlpha = .55 * depthA; g.fillStyle = col; const d = Math.max(1, G.S[i] * s * 1.6); g.fillRect(x, y, d, d); continue; }
        const sz = Math.max(1.8 * dpr, G.S[i] * s * 2.6);
        if (kind === HUB) {
          const gs = sz * 6; g.globalAlpha = .8 * depthA; g.drawImage(this.glow[G.C[i]], x - gs, y - gs, gs * 2, gs * 2);
          g.globalAlpha = depthA; g.strokeStyle = col; g.lineWidth = Math.max(1, sz * .25);
          g.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283 + this.rot * 3; g[k ? 'lineTo' : 'moveTo'](x + Math.cos(a) * sz * 2, y + Math.sin(a) * sz * 2); } g.closePath(); g.stroke();
          g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x, y, sz * .7, 0, 6.283); g.fill();
          continue;
        }
        g.globalAlpha = vis ? 1 : depthA; g.fillStyle = vis ? '#ffffff' : col; g.strokeStyle = vis ? '#ffffff' : col;
        switch (kind) {
          case DOT: g.beginPath(); g.arc(x, y, sz * .6, 0, 6.283); g.fill(); break;
          case SQUARE: g.fillRect(x - sz * .5, y - sz * .5, sz, sz); break;
          case DIAMOND: g.beginPath(); g.moveTo(x, y - sz * .8); g.lineTo(x + sz * .8, y); g.lineTo(x, y + sz * .8); g.lineTo(x - sz * .8, y); g.closePath(); g.fill(); break;
          case RING: g.lineWidth = Math.max(1, sz * .25); g.beginPath(); g.arc(x, y, sz * .8, 0, 6.283); g.stroke(); break;
          case CROSS: g.fillRect(x - sz, y - sz * .18, sz * 2, sz * .36); g.fillRect(x - sz * .18, y - sz, sz * .36, sz * 2); break;
          case RELAY: g.globalAlpha *= .8; g.fillRect(x - sz * .35, y - sz * .35, sz * .7, sz * .7); break;
        }
        if (vis) { const age = now - this.visited.get(i); if (age < 800) { const k = age / 800, rr = sz + k * 40 * dpr;
          g.globalAlpha = 1 - k; g.strokeStyle = col; g.lineWidth = 2 * dpr; g.beginPath(); g.arc(x, y, rr, 0, 6.283); g.stroke(); } }
      }

      /* packet + trail (1인칭에서는 우리가 그 자리에 있으니 숨겨요) */
      if (fpvNow < .5) this.trail.forEach((tp, k) => { const p = proj(tp[0], tp[1], tp[2]); if (!p) return; const sz = (4 + k * .9) * dpr;
        g.globalAlpha = (k + 1) / this.trail.length * .5; g.drawImage(this.glow[PALETTE.length], p[0] - sz, p[1] - sz, sz * 2, sz * 2); });
      if (this.mode !== 'idle' && fpvNow < .5) { const p = proj(fx, fy, fz); if (p) {
        const sz = 30 * dpr; g.globalAlpha = 1; g.drawImage(this.glow[0], p[0] - sz, p[1] - sz, sz * 2, sz * 2);
        g.drawImage(this.glow[PALETTE.length], p[0] - sz * .5, p[1] - sz * .5, sz, sz); } }

      g.globalCompositeOperation = 'source-over';
      if (fpvNow > 0 && this.mode === 'trav') {                 // 1인칭: 속도감 있는 가장자리 빛 + 조준점
        const vg = g.createRadialGradient(cxs, cys, Math.min(W, H) * .25, cxs, cys, Math.hypot(W, H) * .6);
        vg.addColorStop(0, 'rgba(34,211,238,0)'); vg.addColorStop(1, `rgba(14,165,233,${.28 * fpvNow})`);
        g.globalAlpha = 1; g.fillStyle = vg; g.fillRect(0, 0, W, H);
        g.strokeStyle = `rgba(165,243,252,${.7 * fpvNow})`; g.lineWidth = 1.5 * dpr; const cr2 = 14 * dpr;
        g.beginPath(); g.arc(cxs, cys, cr2, 0, Math.PI * 2);
        g.moveTo(cxs - cr2 * 2.2, cys); g.lineTo(cxs - cr2 * 1.3, cys); g.moveTo(cxs + cr2 * 1.3, cys); g.lineTo(cxs + cr2 * 2.2, cys);
        g.moveTo(cxs, cys - cr2 * 2.2); g.lineTo(cxs, cys - cr2 * 1.3); g.moveTo(cxs, cys + cr2 * 1.3); g.lineTo(cxs, cys + cr2 * 2.2); g.stroke();
      }
      /* candidate labels */
      g.textAlign = 'left';
      this.labels = this.labels.filter(l => now - l.t < 1000);
      for (const l of this.labels) { if (!onScreen(l.i)) continue; const k = (now - l.t) / 1000, x = PX[l.i] + 14 * dpr, y = PY[l.i];
        g.globalAlpha = 1 - k;
        g.fillStyle = '#f472b6'; g.font = `${10 * dpr}px Silkscreen, monospace`; g.fillText('NO MATCH', x, y - 6 * dpr);
        g.fillStyle = '#ffffff'; g.font = `${16 * dpr}px "Do Hyeon", sans-serif`; g.fillText(l.name, x, y + 12 * dpr); }

      /* lock brackets */
      if ((this.mode === 'lock' || this.mode === 'idle') && tr && PZ[tr.target] > 30) {
        const t = this.mode === 'lock' ? now - this.t0 : 1400, x = PX[tr.target], y = PY[tr.target];
        const k = Math.min(1, t / 500), R = lerp(160, 40, ease(k)) * dpr, L = R * .45;
        g.globalAlpha = this.mode === 'idle' ? .5 + .3 * Math.sin(now / 400) : 1;
        g.strokeStyle = '#facc15'; g.lineWidth = 2.5 * dpr; g.beginPath();
        [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b]) => { const bx = x + a * R, by = y + b * R; g.moveTo(bx, by - b * L); g.lineTo(bx, by); g.lineTo(bx - a * L, by); });
        g.stroke();
        if (this.mode === 'lock' && !tr.quiet && (t > 600 || Math.floor(t / 110) % 2)) {
          g.globalAlpha = k; g.textAlign = 'center';
          g.fillStyle = '#ffffff'; g.font = `${Math.round(40 * dpr)}px "Do Hyeon", sans-serif`; g.fillText(tr.label, x, y - R - 18 * dpr);
          g.fillStyle = '#facc15'; g.font = `${12 * dpr}px Silkscreen, monospace`; g.fillText(tr.sub, x, y + R + 26 * dpr);
          const im = tr.img;
          if (im && im.complete && im.naturalWidth) {   // picture card of the new form, above the name
            const S = 150 * dpr, ix = x - S / 2, iy = y - R - 70 * dpr - S, pad = 7 * dpr;
            g.save(); g.shadowColor = 'rgba(250,204,21,.55)'; g.shadowBlur = 30 * dpr; g.fillStyle = '#ffffff';
            g.beginPath(); g.roundRect ? g.roundRect(ix, iy, S, S, 18 * dpr) : g.rect(ix, iy, S, S); g.fill(); g.restore();
            g.drawImage(im, ix + pad, iy + pad, S - pad * 2, S - pad * 2);
          }
        }
      }
      /* evolution flash */
      if (this.mode === 'lock' && tr.flash) { const t = now - this.t0; if (t < 900) {
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = (t < 120 ? t / 120 : 1 - (t - 120) / 780) * .85;
        const gr = g.createRadialGradient(cxs, cys, 0, cxs, cys, Math.max(W, H) * .7);
        gr.addColorStop(0, '#ffffff'); gr.addColorStop(.3, '#facc15'); gr.addColorStop(1, 'rgba(244,114,182,0)');
        g.fillStyle = gr; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over'; } }

      /* explore: region territories + names */
      this.regionScreen = null;
      if (this.exploring && !this.staying && this.mode === 'idle') {
        const fade = Math.min(1, (now - (this.idleT || now)) / 600);
        const list = [];
        for (const reg of G.regions) { if (reg.secret && !this.unlocked.has(reg.id)) continue;
          const p = proj(reg.x, reg.y, reg.z); if (p && p[0] > -W * .2 && p[0] < W * 1.2 && p[1] > -H * .2 && p[1] < H * 1.2) list.push({ id: reg.id, x: p[0], y: p[1], z: p[2], reg }); }
        this.regionScreen = list;
        const here = G.RG[this.current];
        g.globalCompositeOperation = 'lighter';
        for (const rs of list) { const on = rs.id === this.hover, sz = Math.min(W, H) * (on ? .3 : .16) * Math.min(1.4, 5000 * DK / rs.z);
          g.globalAlpha = (on ? .5 : .14) * fade; g.drawImage(this.glow[rs.reg.col], rs.x - sz, rs.y - sz, sz * 2, sz * 2);
          if (on) for (const cl of rs.reg.clusters) { const h = cl.hub; if (PZ[h] > 30) { const s2 = 40 * dpr; g.globalAlpha = .7 * fade; g.drawImage(this.glow[rs.reg.col], PX[h] - s2, PY[h] - s2, s2 * 2, s2 * 2); } } }
        g.globalCompositeOperation = 'source-over'; g.textAlign = 'center';
        list.sort((a, b) => b.z - a.z);   // far labels first, near ones on top
        for (const rs of list) { const on = rs.id === this.hover, col = PALETTE[rs.reg.col], here2 = rs.id === here;
          const base = rs.reg.secret ? 22 : rs.id < OPEN_REGIONS ? 20 : 15, depth = Math.max(.75, Math.min(1.25, 5200 * DK / rs.z));
          g.globalAlpha = (on || here2 ? 1 : Math.min(.9, .35 + 3200 * DK / rs.z)) * fade;
          g.font = `${Math.round((on ? base + 6 : base) * depth * dpr)}px "Do Hyeon", sans-serif`;
          const label = (rs.reg.secret ? '✦ ' : '') + rs.reg.name;
          g.lineWidth = 5 * dpr; g.strokeStyle = 'rgba(3,4,15,.85)'; g.strokeText(label, rs.x, rs.y);
          g.fillStyle = on ? '#ffffff' : col;
          if (rs.reg.secret) { const sh = .6 + .4 * Math.sin(now / 250); g.shadowColor = col; g.shadowBlur = 24 * dpr * sh; }
          g.fillText(label, rs.x, rs.y); g.shadowBlur = 0;
          { const w = g.measureText(label).width / 2 + 8 * dpr, fs = (on ? base + 6 : base) * depth * dpr; rs.box = [rs.x - w, rs.y - fs, rs.x + w, rs.y + 8 * dpr]; }
          if (on || here2) { g.font = `${10 * dpr}px Silkscreen, monospace`; g.fillStyle = col;
            g.fillText(here2 ? `${rs.reg.en} · YOU ARE HERE` : `${rs.reg.en} · ${rs.reg.nodes.length} NODES`, rs.x, rs.y + 18 * dpr); } }
      }
      g.globalAlpha = 1;
      this.raf = requestAnimationFrame(this.frame);
    }
  }

  window.DigiNetwork = DigiNetwork;
})();
