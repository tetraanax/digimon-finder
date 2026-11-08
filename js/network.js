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
  // named networks: [region, anchor x, y, z, scale]
  const SPECIAL = [];   // filled by the layout below
  const SPECIAL_SCALE = { 10: 1.15, 11: 1, 12: 1.15, 13: 1.05, 14: 1 }; // 커널 · 딥웹 · 다크 에리어 · 디지털 해저드 · 어나니머스
  // more named networks scattered around the rim: [이름, EN, 색]
  const EXTRA = [
    ['파일 섬', 'FILE ISLAND', 3],
    ['서버 대륙', 'SERVER CONTINENT', 6],
    ['방화벽 요새', 'FIREWALL FORTRESS', 7],
    ['버그 정크야드', 'BUG JUNKYARD', 4],
    ['캐시 사막', 'CACHE DESERT', 2],
    ['프록시 미궁', 'PROXY LABYRINTH', 5],
    ['아카이브 도서관', 'ARCHIVE LIBRARY', 8],
    ['바이러스 늪', 'VIRUS SWAMP', 12],
    ['백신 성역', 'VACCINE SANCTUARY', 10],
    ['쿼리 협곡', 'QUERY CANYON', 4],
    ['블록체인 산맥', 'BLOCKCHAIN RIDGE', 2],
    ['클라우드 하늘섬', 'CLOUD ISLES', 6],
    ['양자 네트워크', 'QUANTUM NETWORK', 9],
    ['위성 궤도망', 'SATELLITE ORBIT', 0],
    ['레거시 서버 묘지', 'LEGACY GRAVEYARD', 13],
    ['피싱 해역', 'PHISHING WATERS', 1],
    ['다크웹 마켓', 'DARK MARKET', 11],
    ['미러 서버', 'MIRROR SERVER', 10],
    ['노이즈 폭풍지대', 'NOISE STORM', 9],
    ['코드 정글', 'CODE JUNGLE', 3],
  ];
  // hidden networks the app unlocks (besides 태양계·이그드라실): [이름, EN, 색]
  const HIDDEN = [
    ['어비스', 'ABYSS', 12],
    ['사성수 결계', 'FOUR HOLY BEASTS', 4],
    ['올림포스 서버', 'OLYMPOS SERVER', 2],
    ['천사의 계단', 'ANGEL STAIRS', 10],
    ['X 프로그램 격리구역', 'X-PROGRAM QUARANTINE', 11],
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
    SPECIAL.push([10, 0, 0, 0, SPECIAL_SCALE[10]]);
    const outer = [];
    EXTRA.forEach(([ko, en, col]) => {
      const id = REGION_NAMES.length; REGION_NAMES.push(ko); REGION_EN.push(en); REGION_COLOR.push(col);
      outer.push([id, .95]);
    });
    // spread the four named specials evenly through ring 2
    [11, 12, 13, 14].forEach((id, k) => outer.splice(k * 3, 0, [id, SPECIAL_SCALE[id]]));
    const n2 = 12;
    outer.forEach(([id, scale], k) => {
      const onTwo = k < n2, cnt = onTwo ? n2 : outer.length - n2, kk = onTwo ? k : k - n2;
      const a = kk / cnt * TAU + (onTwo ? 0 : Math.PI / cnt) + (r() - .5) * .12, rad = (onTwo ? RING2 : RING3) + (r() - .5) * 700;
      SPECIAL.push([id, Math.cos(a) * rad, Math.sin(k * 2.1 + .7) * 3200 + (r() - .5) * 1800, Math.sin(a) * rad, scale]);
    });
    HIDDEN.forEach(([ko, en, col], k) => {
      const id = REGION_NAMES.length; REGION_NAMES.push(ko); REGION_EN.push(en); REGION_COLOR.push(col); SECRETS.add(id);
      const a = k / HIDDEN.length * TAU + .55;
      SPECIAL.push([id, Math.cos(a) * RING4, (k % 2 ? -1 : 1) * (3600 + r() * 1600), Math.sin(a) * RING4, 1.3]);
    });
  }
  // node kinds
  const DOT = 0, SQUARE = 1, DIAMOND = 2, RING = 3, CROSS = 4, HUB = 5, RELAY = 6, DUST = 7;

  /* ---------- 구역마다 하나뿐인 노드 구성 ----------
     구역 이름으로 모양을 정해요. 비슷한 모양이 겹치지 않도록 구역마다 따로 만들었어요.
     at(x, h, z, 종류): h는 위쪽이 + (화면 좌표는 y가 아래로 커져요). R은 구역 크기(약 600).
     pts(개수, t => [x, h, z], 종류, 닫기): t는 0~1, 차례로 이어요. */
  const SIG = {};
  const sq4 = (f, w, d) => { const s = f * 4 | 0, u = f * 4 - s; return [[-w + 2 * w * u, -d], [w, -d + 2 * d * u], [w - 2 * w * u, d], [-w, d - 2 * d * u]][Math.min(3, s)]; };

  SIG['태평양 네트워크'] = ({ at, R, r, J, link, pts }) => { // 말려 들어가는 거대한 파도, 물보라, 작은 섬들
    const U = 18, V = 13, g = [], lip = t => { const vm = Math.PI * (.6 + 1.2 * t), rr = R * .62 * (1 - vm / (Math.PI * 2) * .6); return [vm, rr]; };
    for (let i = 0; i < U; i++) { const t = i / (U - 1), x = (t - .5) * R * 2.6, [vm] = lip(t);
      g.push(pts(V, s => { const v = s * vm, rr = R * .62 * (1 - v / (Math.PI * 2) * .6); return [x, -R * .3 + Math.sin(v) * rr, -Math.cos(v) * rr]; }, j => j === V - 1 ? RING : DOT)); }
    for (let i = 1; i < U; i++) for (let j = 0; j < V; j++) link(g[i - 1][j], g[i][j]);
    for (let i = 0; i < 44; i++) { const t = .35 + r() * .65, [vm, rr] = lip(t);
      at((t - .5) * R * 2.6 + J() * 40, -R * .3 + Math.sin(vm) * rr + r() * R * .35, -Math.cos(vm) * rr + J() * R * .2, DOT); }
    for (let k = 0; k < 4; k++) { const cx = J() * R * 1.1, cz = R * (.9 + r() * .5), s = R * (.08 + r() * .1), n = 8 + (r() * 5 | 0);
      const ring = pts(n, t => { const a = t * 6.283, w = s * (.75 + .3 * Math.sin(a * 3 + k)); return [cx + Math.cos(a) * w, -R * .3, cz + Math.sin(a) * w]; }, SQUARE, true);
      link(at(cx, -R * .3 + s * .9, cz, DIAMOND), ring[0]); }
  };
  SIG['아메리카 네트워크'] = ({ at, R, r, J, link, pts }) => { // 현수교와 강 건너 마천루
    const L = R * 1.5, T = L * .6, H = R * 1.0, W = R * .16, N = 31, d0 = -R * .1;
    const cab = x => { const a = Math.abs(x); return a <= T ? R * .2 + (H - R * .2) * (a / T) ** 2 : H - (H - d0) * (a - T) / (L - T); };
    const deck = [-1, 1].map(s => pts(N, t => [(t - .5) * 2 * L, d0, s * W], SQUARE));
    for (let i = 0; i < N; i += 2) link(deck[0][i], deck[1][i]);
    [-1, 1].forEach((s, si) => { const c = pts(N, t => { const x = (t - .5) * 2 * L; return [x, cab(x), s * W]; }, i => i === 6 || i === 24 ? DIAMOND : DOT);
      for (let i = 1; i < N - 1; i++) if (i !== 6 && i !== 24) link(c[i], deck[si][i]); });
    for (const x of [-T, T]) { const legs = [-1, 1].map(s => pts(7, t => [x, -R * .55 + t * (H + R * .65), s * W], SQUARE));
      for (const q of [2, 4, 6]) link(legs[0][q], legs[1][q]); }
    for (let k = 0; k < 8; k++) { const x = L + R * (.12 + r() * .4), z = J() * R * .45, n = 3 + (r() * 5 | 0); pts(n, t => [x, d0 + t * R * .12 * n, z], q => q === n - 1 ? DIAMOND : SQUARE); }
  };
  SIG['대서양 네트워크'] = ({ at, R, r, J, link, pts }) => { // 바다 밑을 가로지르는 해저 케이블 다발과 중계기
    const cables = [];
    for (let c = 0; c < 7; c++) { const ph = r() * 6, z0 = (c - 3) * R * .17, amp = R * (.12 + r() * .15), fr = 1.2 + r() * 1.3;
      cables.push(pts(44, t => [(t - .5) * R * 3, Math.sin(t * fr * 6.283 + ph) * amp - R * .2, z0 + Math.sin(t * 4 + c * 1.7) * R * .25], i => i % 7 === 3 ? RING : DOT)); }
    for (let i = 3; i < 44; i += 7) for (let c = 1; c < 7; c++) if (r() < .5) link(cables[c - 1][i], cables[c][i]);
    for (let i = 0; i < 40; i++) at(J() * R * 1.5, -R * .7 - r() * R * .1, J() * R * .9, r() < .5 ? DOT : CROSS);
  };
  SIG['유럽 네트워크'] = ({ at, R, link, chain, pts }) => { // 톱니 성벽과 원통 탑, 가운데 성채
    const n = 8, RW = R * 1.05, base = -R * .35, top = R * .05, bottom = [], upper = [];
    for (let k = 0; k < n; k++) for (let s = 0; s < 6; s++) { const a = k / n * 6.283 + .39 + s / 6 * (6.283 / n), x = Math.cos(a) * RW, z = Math.sin(a) * RW;
      bottom.push(at(x, base, z, SQUARE)); upper.push(at(x, top + (s % 2 ? R * .07 : 0), z, s % 2 ? SQUARE : DOT)); }
    chain(bottom, true); chain(upper, true); bottom.forEach((b, i) => { if (i % 2 === 0) link(b, upper[i]); });
    const tower = (x, z, rad, h0, h1, rings) => { let prev = null;
      for (let q = 0; q < rings; q++) { const hh = h0 + (h1 - h0) * q / (rings - 1), ring = pts(6, t => [x + Math.cos(t * 6.283) * rad, hh, z + Math.sin(t * 6.283) * rad], q === rings - 1 ? DIAMOND : SQUARE, true);
        if (prev) ring.forEach((id, i) => link(id, prev[i])); prev = ring; }
      const apex = at(x, h1 + rad * 2.2, z, RING); prev.forEach(id => link(apex, id)); };
    for (let k = 0; k < n; k++) { const a = k / n * 6.283 + .39; tower(Math.cos(a) * RW, Math.sin(a) * RW, R * .1, base, top + R * .2, 4); }
    tower(0, 0, R * .26, base, R * .75, 6); tower(R * .2, R * .1, R * .08, R * .75, R * 1.0, 2);
  };
  SIG['아프리카 네트워크'] = ({ at, R, r, J, link, pts }) => { // 굽이치는 강, 강가에 흩어진 무리, 우산 모양 아카시아
    const river = s => [(s - .5) * R * 2.8, -R * .3, Math.sin(s * 7.5) * R * .35 + Math.sin(s * 3.1) * R * .2];
    const banks = [-1, 1].map(s => pts(40, t => { const p = river(t); return [p[0], p[1], p[2] + s * R * .07]; }, DOT));
    for (let h = 0; h < 15; h++) { const s = r(), p = river(s), side = r() < .5 ? 0 : 1, cx = p[0] + J() * R * .2, cz = p[2] + (side ? 1 : -1) * R * (.25 + r() * .6), c = at(cx, -R * .3, cz, RING);
      link(c, banks[side][Math.round(s * 39)]);
      const m = 5 + (r() * 8 | 0), sp = R * (.05 + r() * .09); for (let i = 0; i < m; i++) link(c, at(cx + J() * sp, -R * .3 + r() * sp * .4, cz + J() * sp, r() < .5 ? DOT : CROSS)); }
    for (let t = 0; t < 3; t++) { const x = J() * R, z = (r() < .5 ? -1 : 1) * R * (.75 + r() * .4), h0 = -R * .3, top = h0 + R * (.45 + r() * .2);
      const trunk = pts(4, s => [x + s * R * .04, h0 + (top - h0) * s, z], SQUARE);
      const crown = pts(10, s => [x + R * .04 + Math.cos(s * 6.283) * R * .3, top + Math.sin(s * 12.566) * R * .02, z + Math.sin(s * 6.283) * R * .13], DIAMOND, true);
      crown.forEach((c, i) => { if (i % 3 === 0) link(trunk[3], c); }); }
  };
  SIG['인도양 네트워크'] = ({ at, R, r, J, link, fib, near }) => { // 바닥에서 자라는 산호 부채와 뇌산호
    const floor = []; for (let i = 0; i < 26; i++) { const a = r() * 6.283, d = R * 1.3 * Math.sqrt(r()); floor.push(at(Math.cos(a) * d, -R * .45, Math.sin(a) * d, DOT)); } near(floor, 2);
    for (let f = 0; f < 7; f++) { const a = r() * 6.283, d = R * (.2 + r() * 1.0), bx = Math.cos(a) * d, bz = Math.sin(a) * d, pa = r() * 3.14, ux = Math.cos(pa), uz = Math.sin(pa), sc = R * (.18 + r() * .14);
      const grow = (from, x, h, ang, len, depth) => { const nx = x + Math.sin(ang) * len, nh = h + Math.cos(ang) * len, id = at(bx + ux * nx, nh, bz + uz * nx, depth ? DOT : DIAMOND); link(from, id);
        if (depth) for (const s of [-1, 1]) grow(id, nx, nh, ang + s * (.3 + r() * .4), len * .75, depth - 1); };
      grow(at(bx, -R * .45, bz, SQUARE), 0, -R * .45, J() * .2, sc, 4); }
    for (let b = 0; b < 5; b++) { const a = r() * 6.283, d = R * (.3 + r() * .9); near(fib(18, Math.cos(a) * d, -R * .42, Math.sin(a) * d, R * (.07 + r() * .07), RING, .6), 2); }
  };
  SIG['아시아 네트워크'] = ({ at, R, r, link, pts }) => { // 처마 끝이 들린 층탑과 둘레의 작은 탑들
    const sq = (x, h, z, w, k) => pts(4, t => { const a = t * 6.283 + .785; return [x + Math.cos(a) * w, h, z + Math.sin(a) * w]; }, k, true);
    const pagoda = (x, z, s, tiers) => { let h = -R * .4, low = sq(x, h, z, s * .75, SQUARE);
      for (let k = 0; k < tiers; k++) { const w = s * (1 - k * .13); h += s * .5;
        const up = sq(x, h, z, w * .75, SQUARE); up.forEach((id, i) => link(id, low[i]));
        const roof = pts(8, t => { const i = Math.round(t * 8), a = t * 6.283 + .785, c = i % 2 === 0; return [x + Math.cos(a) * w * (c ? 1.7 : 1.1), h + (c ? s * .16 : -s * .02), z + Math.sin(a) * w * (c ? 1.7 : 1.1)]; }, i => i % 2 ? DOT : DIAMOND, true);
        up.forEach((id, i) => link(id, roof[i * 2])); low = up; }
      const spire = pts(5, t => [x, h + t * s * .9, z], RING); low.forEach(id => link(id, spire[0])); };
    pagoda(0, 0, R * .32, 6);
    for (let k = 0; k < 4; k++) { const a = k / 4 * 6.283 + r(), d = R * (.85 + r() * .4); pagoda(Math.cos(a) * d, Math.sin(a) * d, R * (.1 + r() * .07), 2 + (r() * 2 | 0)); }
  };
  SIG['오세아니아 네트워크'] = ({ at, R, r, J, link, pts }) => { // 바다에 흩뿌려진 크고 작은 섬들과 뱃길
    const isl = [];
    for (let k = 0; k < 20; k++) { let x, z, tries = 0;
      do { const a = r() * 6.283, d = R * 1.4 * Math.sqrt(r()); x = Math.cos(a) * d; z = Math.sin(a) * d; } while (++tries < 30 && isl.some(q => Math.hypot(q.x - x, q.z - z) < R * .28));
      const s = R * (.04 + r() ** 2 * .16), n = 6 + (s / R * 40 | 0), ph = r() * 6;
      const ring = pts(n, t => { const a = t * 6.283, w = s * (1 + .35 * Math.sin(a * 3 + ph) + J() * .12); return [x + Math.cos(a) * w, -R * .2, z + Math.sin(a) * w]; }, SQUARE, true);
      const peak = at(x, -R * .2 + s * (.4 + r() * .8), z, DIAMOND); for (let i = 0; i < n; i += 3) link(peak, ring[i]); isl.push({ x, z, id: ring[0] }); }
    for (let k = 0; k < 9; k++) { const a = isl[r() * isl.length | 0], b = isl[r() * isl.length | 0]; if (a === b) continue;
      const route = pts(5, t => [a.x + (b.x - a.x) * t, -R * .2 + Math.sin(t * 3.14) * R * .05, a.z + (b.z - a.z) * t], DOT); link(a.id, route[0]); link(route[4], b.id); }
  };
  SIG['커널'] = ({ R, link, pts, fib, near, closest, hub }) => { // 겹겹이 싸인 기하 껍질 — 세계의 중심
    const a = fib(14, 0, 0, 0, R * .3, DIAMOND), b = fib(44, 0, 0, 0, R * .65, SQUARE), c = fib(110, 0, 0, 0, R * 1.0, DOT);
    near(a, 3); near(b, 3); near(c, 3); a.forEach(id => { link(hub, id); link(id, closest(id, b)); }); b.forEach((id, i) => { if (i % 2 === 0) link(id, closest(id, c)); });
    pts(48, t => [Math.cos(t * 6.283) * R * 1.35, 0, Math.sin(t * 6.283) * R * 1.35], i => i % 6 ? DOT : RING, true);
  };
  SIG['딥웹 네트워크'] = ({ at, R, link, chain, pts }) => { // 끝없이 내려가는 나선 계단과 가운데 기둥
    const N = 84, inner = [], outer = [];
    for (let i = 0; i < N; i++) { const t = i / (N - 1), a = t * 6.283 * 4.5, rad = R * (1.05 - t * .7), h = R * (.85 - t * 2.0);
      outer.push(at(Math.cos(a) * rad, h, Math.sin(a) * rad, i % 4 ? SQUARE : DIAMOND)); inner.push(at(Math.cos(a) * rad * .55, h, Math.sin(a) * rad * .55, DOT)); link(outer[i], inner[i]); }
    chain(outer); chain(inner); pts(14, t => [0, R * (.9 - t * 2.1), 0], RING);
  };
  SIG['다크 에리어'] = ({ at, R, r, J, link }) => { // 흩어진 점들과 제멋대로 뻗은 선 — 혼돈
    const blobs = [...Array(4)].map(() => [J() * R * .8, J() * R * .4, J() * R * .8, R * (.3 + r() * .4)]), ids = [];
    for (let i = 0; i < 190; i++) { const b = blobs[r() * 4 | 0], g = () => (r() + r() + r() - 1.5) * b[3];
      ids.push(at(b[0] + g(), b[1] + g() * .7, b[2] + g(), r() < .7 ? DOT : r() < .5 ? CROSS : DIAMOND)); }
    for (let i = 0; i < ids.length; i++) if (r() < .55) link(ids[i], ids[r() * ids.length | 0]);
  };
  SIG['디지털 해저드'] = ({ at, R, link, chain, pts }) => { // 세 날개 경고 표식과 이를 두른 경고 삼각형
    for (const z of [-R * .06, R * .06]) {
      pts(12, t => [Math.cos(t * 6.283) * R * .16, Math.sin(t * 6.283) * R * .16, z], RING, true);
      for (let b = 0; b < 3; b++) { const a0 = b / 3 * 6.283 + Math.PI / 2 - Math.PI / 6, arcs = [];
        for (const rad of [R * .3, R * .6, R * .9, R * 1.15]) arcs.push(pts(9, t => { const a = a0 + t * Math.PI / 3; return [Math.cos(a) * rad, Math.sin(a) * rad, z]; }, rad > R ? DIAMOND : SQUARE));
        for (let i = 1; i < arcs.length; i++) { link(arcs[i - 1][0], arcs[i][0]); link(arcs[i - 1][8], arcs[i][8]); } } }
    const C = [0, 1, 2].map(k => { const a = -Math.PI / 2 + k / 3 * 6.283; return [Math.cos(a) * R * 1.65, -Math.sin(a) * R * 1.65]; }), tri = [];
    for (let k = 0; k < 3; k++) { const p = C[k], q = C[(k + 1) % 3]; for (let i = 0; i < 14; i++) { const t = i / 14; tri.push(at(p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, 0, i ? DOT : DIAMOND)); } }
    chain(tri, true);
  };
  SIG['어나니머스 네트워크'] = ({ at, R, r, J, link, pts }) => { // 얼굴 없는 가면들이 가운데를 바라보며 흩어져 서 있어요
    for (let m = 0; m < 34; m++) { const a = r() * 6.283, d = R * (.35 + r() * 1.0), x = Math.cos(a) * d, z = Math.sin(a) * d, h = J() * R * .6, s = R * (.1 + r() * .05), fx = -Math.sin(a), fz = Math.cos(a);
      const face = pts(9, t => { const q = t * 6.283; return [x + fx * Math.cos(q) * s * .72, h + Math.sin(q) * s * (q > Math.PI ? 1.25 : 1), z + fz * Math.cos(q) * s * .72]; }, DOT, true);
      link(face[2], at(x + fx * s * .3, h + s * .15, z + fz * s * .3, CROSS)); link(face[1], at(x - fx * s * .3, h + s * .15, z - fz * s * .3, CROSS)); }
  };
  SIG['파일 섬'] = ({ at, R, r, J, link, pts }) => { // 분화구가 있는 화산섬과 바닷가의 야자수
    const RG = 7, SP = 18, g = [];
    for (let i = 0; i < RG; i++) { const rho = R * (.12 + i / (RG - 1) * 1.15), hh = -R * .4 + R * .95 * Math.exp(-((rho / (R * .5)) ** 2)) - (i === 0 ? R * .3 : 0);
      g.push(pts(SP, t => { const a = t * 6.283; return [Math.cos(a) * rho * (1 + J() * .05), hh + J() * R * .02, Math.sin(a) * rho]; }, i === RG - 1 ? SQUARE : DOT, true)); }
    for (let i = 1; i < RG; i++) for (let j = 0; j < SP; j += 2) link(g[i - 1][j], g[i][j]);
    for (let p = 0; p < 6; p++) { const a = r() * 6.283, rho = R * (1.05 + r() * .2), x = Math.cos(a) * rho, z = Math.sin(a) * rho, h0 = -R * .38;
      const tr = pts(5, t => [x + t * t * R * .1, h0 + t * R * .4, z], SQUARE);
      for (let f = 0; f < 5; f++) { const fa = f / 5 * 6.283; link(tr[4], pts(3, t => [x + R * .1 + Math.cos(fa) * (t + .3) * R * .14, h0 + R * .4 - t * t * R * .1, z + Math.sin(fa) * (t + .3) * R * .14], DIAMOND)[0]); } }
  };
  SIG['서버 대륙'] = ({ at, R, link, box }) => { // 통로를 사이에 두고 줄지어 선 서버 랙
    const rows = 4, per = 6, w = R * .11, d = R * .07, hh = R * .6, h0 = -R * .35, tops = [];
    for (let i = 0; i < rows; i++) for (let j = 0; j < per; j++) { const x = (j - (per - 1) / 2) * w * 2.3, z = (i - (rows - 1) / 2) * R * .5, c = box(x, h0, z, w, hh, d, SQUARE);
      for (const f of [.25, .5, .75]) { const a = at(x - w, h0 + hh * f, z - d, DOT), b = at(x + w, h0 + hh * f, z - d, f === .5 ? DIAMOND : DOT); link(a, b); link(a, c[0]); }
      tops.push(c[4]); }
    for (let i = 0; i < rows; i++) for (let j = 1; j < per; j++) link(tops[i * per + j - 1], tops[i * per + j]);
    for (let i = 1; i < rows; i++) link(tops[(i - 1) * per], tops[i * per]);
  };
  SIG['방화벽 요새'] = ({ at, R, r, J, link, pts }) => { // 휘어진 벽돌 방화벽과 그 위에서 일렁이는 불꽃
    const C = 7, N = 26, RW = R * 1.1, a0 = -1.9, a1 = 1.9, rows = [], hOf = c => -R * .45 + c * R * .14;
    for (let c = 0; c < C; c++) { const off = c % 2 ? .5 / (N - 1) : 0; rows.push(pts(N, t => { const a = a0 + (a1 - a0) * Math.min(1, t + off); return [Math.cos(a) * RW, hOf(c), Math.sin(a) * RW]; }, SQUARE)); }
    for (let c = 1; c < C; c++) for (let i = c % 2; i < N; i += 2) link(rows[c - 1][i], rows[c][i]);
    for (let f = 0; f < 16; f++) { const i = r() * N | 0, a = a0 + (a1 - a0) * i / (N - 1), h0 = hOf(C - 1), ht = R * (.2 + r() * .15);
      link(rows[C - 1][i], pts(4, t => [Math.cos(a) * RW + J() * R * .04, h0 + (t + .25) * ht, Math.sin(a) * RW + J() * R * .04], q => q === 3 ? DIAMOND : DOT)[0]); }
  };
  SIG['버그 정크야드'] = ({ at, R, r, J, link, box }) => { // 아무렇게나 쌓아 올린 뾰족한 고철 산과 반쯤 묻힌 상자들
    for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283 + r(), d = R * (k ? .55 + r() * .6 : 0), cx = Math.cos(a) * d, cz = Math.sin(a) * d, s = R * (k ? .22 + r() * .14 : .4), tall = 1.6 + r() * .9;
      const pick = () => { const q = r() * 6.283, w = s * Math.sqrt(r()); return [cx + Math.cos(q) * w, -R * .45 + (s - w) * tall, cz + Math.sin(q) * w]; };
      for (let i = 0; i < 24; i++) { const p = pick(), len = s * (.25 + r() * .45), ang = r() * 6.283, tilt = J() * 1.2;
        link(at(p[0], p[1], p[2], r() < .5 ? CROSS : SQUARE), at(p[0] + Math.cos(ang) * len, p[1] + tilt * len * .5, p[2] + Math.sin(ang) * len, r() < .5 ? DOT : DIAMOND)); } }
    for (let k = 0; k < 7; k++) { const a = r() * 6.283, d = R * (.4 + r() * .9), w = R * (.05 + r() * .06); box(Math.cos(a) * d, -R * .45 - w * .4, Math.sin(a) * d, w * 1.4, w * 1.2, w, SQUARE); }
  };
  SIG['캐시 사막'] = ({ at, R, r, J, link, pts }) => { // 바람에 깎인 초승달 모래언덕들
    for (let k = 0; k < 6; k++) { const a = r() * 6.283, d = R * 1.1 * Math.sqrt(r()), cx = Math.cos(a) * d, cz = Math.sin(a) * d, s = R * (.22 + r() * .25);
      const crest = pts(15, t => { const q = (t - .5) * 2.8; return [cx - Math.cos(q) * s, -R * .4 + s * .45 * Math.cos(q) ** 2, cz + Math.sin(q) * s * 1.2]; }, i => i === 7 ? DIAMOND : DOT);
      for (let i = 1; i < 14; i += 2) { const q = (i / 14 - .5) * 2.8; link(crest[i], at(cx - Math.cos(q) * s * 1.6, -R * .4, cz + Math.sin(q) * s * 1.5, DOT)); } }
    for (let i = 0; i < 25; i++) at(J() * R * 1.4, -R * .4, J() * R * 1.4, CROSS);
  };
  SIG['프록시 미궁'] = ({ at, R, r, link }) => { // 진짜로 길을 찾아야 하는 두 겹 벽의 미로
    const n = 9, sp = R * 2.5 / n, lo = [], hi = [], vis = new Set([0]), open = new Set(), st = [0];
    const key = (a, b) => a < b ? a + ':' + b : b + ':' + a;
    while (st.length) { const c = st[st.length - 1], cx = c % n, cy = c / n | 0, nb = [];
      if (cx > 0) nb.push(c - 1); if (cx < n - 1) nb.push(c + 1); if (cy > 0) nb.push(c - n); if (cy < n - 1) nb.push(c + n);
      const un = nb.filter(q => !vis.has(q)); if (!un.length) { st.pop(); continue; }
      const q = un[r() * un.length | 0]; open.add(key(c, q)); vis.add(q); st.push(q); }
    const M1 = n + 1, L = (i, j, top) => (top ? hi : lo)[i * M1 + j];
    for (let i = 0; i < M1; i++) for (let j = 0; j < M1; j++) { const x = (i - n / 2) * sp, z = (j - n / 2) * sp; lo.push(at(x, -R * .3, z, SQUARE)); hi.push(at(x, -R * .3 + sp * .45, z, DOT)); }
    const wall = (a, b, c, d) => { link(a, b); link(c, d); };
    for (let i = 0; i <= n; i++) for (let j = 0; j < n; j++) if ((i === 0 || i === n || !open.has(key(j * n + i - 1, j * n + i))) && !(i === 0 && j === 0) && !(i === n && j === n - 1)) wall(L(i, j), L(i, j + 1), L(i, j, 1), L(i, j + 1, 1));
    for (let j = 0; j <= n; j++) for (let i = 0; i < n; i++) if (j === 0 || j === n || !open.has(key((j - 1) * n + i, j * n + i))) wall(L(i, j), L(i + 1, j), L(i, j, 1), L(i + 1, j, 1));
    for (let k = 0; k < lo.length; k++) link(lo[k], hi[k]);
  };
  SIG['아카이브 도서관'] = ({ at, R, link, pts, near }) => { // 층층이 둥근 서가와 꼭대기의 돔
    const floors = 4, posts = 28, RR = R * .95, fh = R * .28; let prev = null;
    for (let f = 0; f <= floors; f++) { const h = -R * .55 + f * fh, ring = pts(posts, t => [Math.cos(t * 6.283) * RR, h, Math.sin(t * 6.283) * RR], f % floors === 0 ? DIAMOND : SQUARE, true);
      if (prev) ring.forEach((id, i) => { if (i % 2 === 0) link(id, prev[i]); });
      if (f && f < floors) pts(posts / 2, t => [Math.cos(t * 6.283) * RR * .6, h, Math.sin(t * 6.283) * RR * .6], DOT, true).forEach((id, i) => link(id, ring[i * 2]));
      prev = ring; }
    const top = -R * .55 + floors * fh, dome = [];
    for (let i = 0; i < 44; i++) { const y = i / 44, q = Math.sqrt(1 - y * y), th = i * 2.39996; dome.push(at(Math.cos(th) * q * RR, top + y * RR * .7, Math.sin(th) * q * RR, i % 6 ? DOT : RING)); }
    near(dome, 2);
  };
  SIG['바이러스 늪'] = ({ at, R, r, link, fib, near }) => { // 질척한 바닥에서 크고 작은 거품이 피어올라요
    const mud = []; for (let i = 0; i < 70; i++) { const a = r() * 6.283, d = R * 1.35 * Math.sqrt(r()); mud.push(at(Math.cos(a) * d, -R * .45 + Math.sin(d * .02 + a * 3) * R * .04, Math.sin(a) * d * .8, r() < .8 ? DOT : CROSS)); }
    near(mud, 2);
    for (let b = 0; b < 16; b++) { const a = r() * 6.283, d = R * 1.1 * Math.sqrt(r()), rise = r(), rad = R * (.2 - rise * .14) * (.6 + r() * .6);
      near(fib(8 + (rad / R * 80 | 0), Math.cos(a) * d, -R * .4 + rise * R * 1.3, Math.sin(a) * d * .8, rad, RING), 2); }
  };
  SIG['백신 성역'] = ({ at, R, link, pts }) => { // 겹겹의 별 문양, 가운데 빛기둥, 둘레의 십자 표식
    const star = (n, k, rad, h, kind) => { const ids = []; for (let i = 0; i < n; i++) { const a = i / n * 6.283; ids.push(at(Math.cos(a) * rad, h, Math.sin(a) * rad, kind)); } for (let i = 0; i < n; i++) link(ids[i], ids[(i + k) % n]); };
    star(16, 7, R * 1.3, -R * .3, DIAMOND); star(12, 5, R * .95, -R * .2, SQUARE); star(8, 3, R * .62, -R * .1, DIAMOND); star(6, 2, R * .32, 0, RING);
    pts(12, t => [0, -R * .3 + t * R * 1.5, 0], i => i % 3 ? DOT : RING);
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283 + .2, x = Math.cos(a) * R * 1.6, z = Math.sin(a) * R * 1.6, tx = -Math.sin(a) * R * .08, tz = Math.cos(a) * R * .08;
      const bar = pts(4, t => [x, -R * .3 + t * R * .32, z], CROSS); link(bar[2], at(x + tx, -R * .3 + R * .21, z + tz, DOT)); link(bar[2], at(x - tx, -R * .3 + R * .21, z - tz, DOT)); }
  };
  SIG['쿼리 협곡'] = ({ at, R, r, J, link, pts, closest }) => { // 층층이 깎인 두 절벽, 바닥의 강, 위를 잇는 줄다리
    const N = 16, layers = 6, side = [[], []], mid = t => Math.sin(t * 4) * R * .2;
    [-1, 1].forEach((s, si) => { for (let l = 0; l < layers; l++) { const h = -R * .6 + l * R * .22;
      side[si].push(pts(N, t => [(t - .5) * R * 2.8, h, mid(t) + s * (R * .18 + l * R * .1 + Math.sin(t * 9 + s) * R * .06 + J() * R * .02)], l === layers - 1 ? DIAMOND : SQUARE)); } });
    for (const sd of side) for (let l = 1; l < layers; l++) for (let i = 0; i < N; i += 3) link(sd[l - 1][i], sd[l][i]);
    pts(26, t => [(t - .5) * R * 2.8, -R * .66, mid(t)], i => i % 5 ? DOT : RING);
    for (let b = 0; b < 4; b++) { const t = .1 + r() * .8, x = (t - .5) * R * 2.8, w = R * .78, h = -R * .6 + (layers - 1) * R * .22;
      const br = pts(7, u => [x, h - Math.sin(u * Math.PI) * R * .1, mid(t) + (u - .5) * 2 * w], DOT); link(br[0], closest(br[0], side[0][layers - 1])); link(br[6], closest(br[6], side[1][layers - 1])); }
  };
  SIG['블록체인 산맥'] = ({ R, J, link, box }) => { // 서로 이어진 블록이 들쭉날쭉한 산등성이를 이뤄요
    const N = 17, s = R * .075; let prev = null;
    for (let i = 0; i < N; i++) { const t = i / (N - 1), x = (t - .5) * R * 2.8, peak = Math.abs(Math.sin(t * 7.3)) * R * .7 + Math.sin(t * 3.1) * R * .25 + R * .1, z = Math.sin(t * 5) * R * .3;
      const c = box(x, -R * .45 + peak, z, s, s * 2, s, i % 4 ? SQUARE : DIAMOND);
      if (prev) { link(prev[5], c[0]); link(prev[6], c[3]); } prev = c;
      for (let k = 1; k * s * 2.6 < peak; k += 2) box(x + J() * s, -R * .45 + peak - k * s * 2.6, z + J() * s, s * .8, s * 1.6, s * .8, DOT); }
  };
  SIG['클라우드 하늘섬'] = ({ at, R, r, J, link, pts, fib, near }) => { // 하늘에 뜬 거꾸로 된 원뿔 섬, 떨어지는 폭포, 구름
    for (let k = 0; k < 7; k++) { const a = r() * 6.283, d = R * (k ? .6 + r() * .75 : 0), x = Math.cos(a) * d, z = Math.sin(a) * d, h = k ? J() * R * .55 : R * .1, s = R * (k ? .12 + r() * .14 : .3);
      const rim = pts(12, t => [x + Math.cos(t * 6.283) * s, h, z + Math.sin(t * 6.283) * s * .9], SQUARE, true);
      const apex = at(x + J() * s * .2, h - s * 1.3, z, DIAMOND); rim.forEach((id, i) => { if (i % 2 === 0) link(id, apex); });
      link(rim[0], pts(6, t => [x + s, h - t * R * .5, z], DOT)[0]);
      if (r() < .7) near(fib(10, x + J() * s, h + s * .4, z + J() * s, s * .4, RING), 2); }
  };
  SIG['양자 네트워크'] = ({ at, R, r, J, link, pts, near }) => { // 세 축으로 뻗은 확률 구름 엽, 가운데 고리, 얽힌 입자쌍
    for (let ax = 0; ax < 3; ax++) for (const sg of [1, -1]) { const ids = [];
      while (ids.length < 32) { const d = [J(), J(), J()], m = Math.hypot(d[0], d[1], d[2]) || 1; for (let q = 0; q < 3; q++) d[q] /= m;
        const c = d[ax] * sg; if (c < .2) continue; const rr = R * 1.15 * c * c; ids.push(at(d[0] * rr, d[1] * rr, d[2] * rr, ids.length % 5 ? DOT : RING)); }
      near(ids, 2); }
    pts(30, t => [Math.cos(t * 6.283) * R * .42, 0, Math.sin(t * 6.283) * R * .42], DIAMOND, true);
    for (let k = 0; k < 7; k++) { const d = [J(), J(), J()], m = Math.hypot(d[0], d[1], d[2]) || 1, rr = R * (1.2 + r() * .3) / m; link(at(d[0] * rr, d[1] * rr, d[2] * rr, CROSS), at(-d[0] * rr, -d[1] * rr, -d[2] * rr, CROSS)); }
  };
  SIG['위성 궤도망'] = ({ at, R, r, J, link, fib, near }) => { // 행성 둘레를 도는 위성들과 점선 궤도
    const planet = fib(70, 0, 0, 0, R * .42, DOT); near(planet, 3);
    for (let o = 0; o < 7; o++) { const rad = R * (.75 + o * .11), inc = J() * 1.1, nd = r() * 6.283, n = 34;
      const P3 = t => { const a = t * 6.283, x0 = Math.cos(a) * rad, z0 = Math.sin(a) * rad, y = z0 * Math.sin(inc), z1 = z0 * Math.cos(inc); return [x0 * Math.cos(nd) - z1 * Math.sin(nd), y, x0 * Math.sin(nd) + z1 * Math.cos(nd)]; };
      const ids = []; for (let i = 0; i < n; i++) { const p = P3(i / n); ids.push(at(p[0], p[1], p[2], DOT)); } for (let i = 0; i < n; i += 2) link(ids[i], ids[(i + 1) % n]);
      for (let s = 0; s < 1 + (r() < .5 ? 1 : 0); s++) { const p = P3(r()), body = at(p[0], p[1], p[2], SQUARE);
        link(body, at(p[0] + R * .07, p[1], p[2], DIAMOND)); link(body, at(p[0] - R * .07, p[1], p[2], DIAMOND)); if (r() < .6) link(body, planet[r() * planet.length | 0]); } }
  };
  SIG['레거시 서버 묘지'] = ({ at, R, r, J, link, chain }) => { // 줄지어 선 비석, 울타리, 앙상한 나무
    const g0 = -R * .4;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 6; j++) { if (r() < .12) continue;
      const x = (j - 2.5) * R * .4 + J() * R * .05, z = (i - 1.5) * R * .45 + J() * R * .05, w = R * .08, hh = R * (.16 + r() * .08), tilt = J() * .25, broken = r() < .2;
      const P2 = (u, v) => [x + u + v * Math.sin(tilt), g0 + v * Math.cos(tilt), z], o = [P2(-w, 0), P2(-w, hh)];
      if (!broken) for (let k = 1; k < 6; k++) { const a = Math.PI - k / 6 * Math.PI; o.push(P2(Math.cos(a) * w, hh + Math.sin(a) * w)); }
      o.push(P2(w, broken ? hh * .6 : hh), P2(w, 0));
      chain(o.map((p, k) => at(p[0], p[1], p[2], k === 0 || k === o.length - 1 ? SQUARE : DOT)), true); }
    const F = R * 1.4, fence = []; for (let k = 0; k < 40; k++) { const [x, z] = sq4(k / 40, F, F * .75); fence.push(at(x, g0 + R * .12, z, CROSS)); } chain(fence, true);
    const grow = (from, x, h, z, dx, dh, dz, len, d) => { const nx = x + dx * len, nh = h + dh * len, nz = z + dz * len, id = at(nx, nh, nz, d ? DOT : CROSS); link(from, id); if (!d) return;
      for (let k = 0; k < 2; k++) { const ex = dx + J() * .9, eh = dh * .7 + .3, ez = dz + J() * .9, m = Math.hypot(ex, eh, ez); grow(id, nx, nh, nz, ex / m, eh / m, ez / m, len * .7, d - 1); } };
    grow(at(F * .75, g0, -F * .5, SQUARE), F * .75, g0, -F * .5, 0, 1, 0, R * .35, 4);
  };
  SIG['피싱 해역'] = ({ at, R, J, r, link, pts }) => { // 수면의 부표에 매달려 처진 그물과 늘어진 낚싯바늘
    const C = 13, RW = 9, g = [];
    for (let j = 0; j < RW; j++) { const row = []; for (let i = 0; i < C; i++) { const u = (i / (C - 1) - .5) * 2, sag = (1 - u * u) * j / (RW - 1);
        row.push(at(u * R * 1.3, R * .55 - j * R * .1 - sag * R * .45, J() * R * .03 + Math.sin(u * 3 + j) * R * .05 + j * R * .03, j ? DOT : RING)); } g.push(row); }
    for (let j = 0; j < RW; j++) for (let i = 0; i < C; i++) { if (i + 1 < C) link(g[j][i], g[j][i + 1]); if (j + 1 < RW) link(g[j][i], g[j + 1][i]); }
    pts(30, t => [(t - .5) * R * 3, R * .64 + Math.sin(t * 18) * R * .025, Math.cos(t * 7) * R * .3], DOT);
    for (let k = 0; k < 8; k++) { const x = J() * R * 1.2, z = R * (.45 + r() * .6) * (r() < .5 ? -1 : 1), top = R * .62, len = R * (.6 + r() * .6);
      const line = pts(6, t => [x, top - t * len, z], DOT); link(line[5], pts(4, t => { const a = t * Math.PI * 1.2; return [x + (1 - Math.cos(a)) * R * .05, top - len - Math.sin(a) * R * .06, z]; }, DIAMOND)[0]); }
  };
  SIG['다크웹 마켓'] = ({ at, R, r, link, pts }) => { // 어지럽게 늘어선 천막들과 그 사이에 걸린 등불 줄
    const tents = [], g0 = -R * .4;
    for (let k = 0; k < 16; k++) { let x, z, s, tries = 0;
      do { const a = r() * 6.283, d = R * 1.25 * Math.sqrt(r()); x = Math.cos(a) * d; z = Math.sin(a) * d; s = R * (.07 + r() * .12); } while (++tries < 30 && tents.some(t => Math.hypot(t.x - x, t.z - z) < t.s + s + R * .05));
      const n = 4 + (r() * 4 | 0), ph = r(), hh = s * (1.1 + r() * .8);
      const base = pts(n, t => { const a = (t + ph) * 6.283; return [x + Math.cos(a) * s, g0, z + Math.sin(a) * s]; }, SQUARE, true);
      const apex = at(x, g0 + hh, z, DIAMOND); base.forEach(id => link(id, apex)); tents.push({ x, z, s, apex, h: g0 + hh }); }
    for (let k = 0; k < 10; k++) { const a = tents[r() * tents.length | 0], b = tents[r() * tents.length | 0]; if (a === b) continue;
      const str = pts(6, t => [a.x + (b.x - a.x) * t, a.h + (b.h - a.h) * t - Math.sin(t * Math.PI) * R * .08, a.z + (b.z - a.z) * t], q => q % 2 ? RING : DOT); link(a.apex, str[0]); link(str[5], b.apex); }
  };
  SIG['미러 서버'] = ({ at, R, r, J, link, chain }) => { // 거울면을 사이에 두고 똑같이 뒤집힌 두 조각
    const walk = [], cl = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    for (let i = 0; i < 48; i++) { const parent = i ? (r() < .75 ? i - 1 : r() * i | 0) : -1, q = i ? walk[parent].p : [R * .3, 0, 0];
      walk.push({ parent, k: r() < .6 ? SQUARE : DIAMOND, p: [cl(q[0] + J() * R * .22, R * .1, R * 1.3), cl(q[1] + J() * R * .25, -R * .8, R * .8), cl(q[2] + J() * R * .25, -R * .8, R * .8)] }); }
    const A = [], B = [];
    walk.forEach((w, i) => { A.push(at(w.p[0], w.p[1], w.p[2], w.k)); B.push(at(-w.p[0], w.p[1], w.p[2], w.k)); if (w.parent >= 0) { link(A[i], A[w.parent]); link(B[i], B[w.parent]); } if (i % 6 === 0) link(A[i], B[i]); });
    const fr = []; for (let k = 0; k < 32; k++) { const [y, z] = sq4(k / 32, R * .95, R * .95); fr.push(at(0, y, z, k % 8 ? DOT : RING)); } chain(fr, true);
  };
  SIG['노이즈 폭풍지대'] = ({ at, R, r, J, link, pts }) => { // 비틀리며 솟구치는 회오리, 휘날리는 잔해, 번개
    const L = 15, n = 14, rings = [];
    for (let l = 0; l < L; l++) { const t = l / (L - 1), h = -R * .6 + t * R * 1.6, rad = R * (.06 + Math.pow(t, 1.7) * .95), cx = Math.sin(t * 5) * R * .15, cz = Math.cos(t * 4) * R * .1;
      rings.push(pts(n, s => { const a = s * 6.283 + t * 4; return [cx + Math.cos(a) * rad, h, cz + Math.sin(a) * rad]; }, l === L - 1 ? RING : DOT, true)); }
    for (let l = 1; l < L; l++) for (let i = 0; i < n; i += 2) link(rings[l - 1][i], rings[l][(i + 1) % n]);
    for (let i = 0; i < 60; i++) { const a = r() * 6.283, h = -R * .6 + r() * R * 1.5, d = R * (.4 + r() * 1.0) * (.5 + (h + R * .6) / (R * 1.6)); at(Math.cos(a) * d, h, Math.sin(a) * d, r() < .5 ? CROSS : SQUARE); }
    for (let b = 0; b < 3; b++) { const a = r() * 6.283, d = R * (.6 + r() * .4); pts(6, t => [Math.cos(a) * d + J() * R * .1, R * 1.0 - t * R * 1.3, Math.sin(a) * d + J() * R * .1], DIAMOND); }
  };
  SIG['코드 정글'] = ({ at, R, r, J, link, pts, near }) => { // 빽빽한 우듬지에서 늘어진 덩굴과 아래의 고사리
    const can = [], cc = [];
    for (let i = 0; i < 55; i++) { const a = r() * 6.283, d = R * 1.3 * Math.sqrt(r()), p = [Math.cos(a) * d, R * .65 + J() * R * .12, Math.sin(a) * d]; cc.push(p); can.push(at(p[0], p[1], p[2], r() < .7 ? DOT : DIAMOND)); }
    near(can, 2);
    for (let v = 0; v < 24; v++) { const k = r() * can.length | 0, [x, h, z] = cc[k], len = R * (.5 + r() * 1.0), sw = r() * 6;
      const vine = pts(8, t => [x + Math.sin(t * 4 + sw) * R * .06, h - t * len, z + Math.cos(t * 3 + sw) * R * .04], q => q === 7 ? RING : DOT); link(can[k], vine[0]);
      for (let q = 2; q < 7; q += 2) link(vine[q], at(x + J() * R * .08, h - q / 7 * len + R * .02, z + J() * R * .08, DIAMOND)); }
    for (let f = 0; f < 9; f++) { const x = J() * R * 1.1, z = J() * R * 1.1, g0 = -R * .6, c = at(x, g0, z, SQUARE);
      for (let q = 0; q < 6; q++) { const a = q / 6 * 6.283; link(c, at(x + Math.cos(a) * R * .12, g0 + R * .1, z + Math.sin(a) * R * .12, DOT)); } }
  };
  SIG['어비스'] = ({ R, link, pts }) => { // 한가운데로 끝없이 꺼져 드는 중력 우물
    const RG = 12, SP = 24, g = [], hOf = rho => R * .55 - R * .16 / (rho / R);
    for (let i = 0; i < RG; i++) { const rho = R * (.1 + Math.pow(i / (RG - 1), 1.3) * 1.35);
      g.push(pts(SP, t => { const a = t * 6.283 + i * .08; return [Math.cos(a) * rho, hOf(rho), Math.sin(a) * rho]; }, i ? DOT : RING, true)); }
    for (let i = 1; i < RG; i++) for (let j = 0; j < SP; j++) link(g[i - 1][j], g[i][j]);
    pts(40, t => { const rho = R * (1.4 - t * 1.25), a = t * 6.283 * 3; return [Math.cos(a) * rho, hOf(rho) + R * .08, Math.sin(a) * rho]; }, i => i % 5 ? DOT : DIAMOND);
  };
  SIG['사성수 결계'] = ({ at, R, link, chain, pts }) => { // 네 기둥이 감싼 사각 결계와 네 방위의 수호 문양
    const F = R * 1.1, g0 = -R * .5, top = R * .55, cs = [[-F, -F], [F, -F], [F, F], [-F, F]];
    const edge = (a, b, n, k) => pts(n, t => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t], k);
    for (let k = 0; k < 4; k++) { const [x, z] = cs[k], [x2, z2] = cs[(k + 1) % 4];
      edge([x, g0, z], [x, top, z], 8, SQUARE); edge([x, top, z], [x2, top, z2], 12, DOT); edge([x, g0, z], [x2, g0, z2], 12, DOT); }
    edge([-F, top, -F], [F, top, F], 15, DIAMOND); edge([F, top, -F], [-F, top, F], 15, DIAMOND);
    const o = F * 1.4, s = R * .22;
    pts(14, t => [Math.cos(t * 6.283) * s, Math.sin(t * 6.283) * s, -o], RING, true);                              // 북: 고리
    pts(3, t => { const a = Math.PI / 2 + t * 6.283; return [o, Math.sin(a) * s * 1.2, Math.cos(a) * s * 1.2]; }, DIAMOND, true); // 동: 삼각
    pts(4, t => { const a = t * 6.283; return [Math.cos(a) * s, Math.sin(a) * s * 1.3, o]; }, SQUARE, true);        // 남: 마름모
    pts(20, t => { const a = t * 6.283 * 2.2, w = s * (.2 + t * .9); return [-o, Math.sin(a) * w, Math.cos(a) * w]; }, DOT); // 서: 소용돌이
    const c = R * .2, oct = [[c, 0, 0], [-c, 0, 0], [0, c, 0], [0, -c, 0], [0, 0, c], [0, 0, -c]].map(p => at(p[0], p[1], p[2], DIAMOND));
    for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) if ((i >> 1) !== (j >> 1)) link(oct[i], oct[j]);
  };
  SIG['올림포스 서버'] = ({ at, R, link, chain, pts }) => { // 계단 기단 위의 열주와 삼각 박공 지붕
    const W = R * 1.0, D = R * .6, g0 = -R * .55, loop = (w, d, h, n, k) => pts(n, t => { const [x, z] = sq4(t, w, d); return [x, h, z]; }, k, true);
    for (let s = 0; s < 3; s++) loop(W + (3 - s) * R * .08, D + (3 - s) * R * .08, g0 + s * R * .06, 40, SQUARE);
    const b = g0 + R * .18, colH = R * .75, cols = [];
    for (let i = 0; i < 8; i++) { const x = -W + i * 2 * W / 7; cols.push([x, -D], [x, D]); }
    for (let i = 1; i < 4; i++) { const z = -D + i * 2 * D / 4; cols.push([-W, z], [W, z]); }
    cols.forEach(([x, z]) => pts(5, t => [x, b + t * colH, z], q => q === 4 ? DIAMOND : DOT));
    const top = b + colH; loop(W, D, top, 44, SQUARE); loop(W * 1.04, D * 1.04, top + R * .07, 44, DOT);
    // 박공: 앞뒤 삼각형과 용마루
    for (const z of [-D, D]) { pts(6, t => [-W * 1.04 * (1 - t), top + R * .07 + t * R * .33, z * 1.04], DOT); pts(6, t => [W * 1.04 * (1 - t), top + R * .07 + t * R * .33, z * 1.04], DOT); }
    chain(pts(10, t => [0, top + R * .4, (t - .5) * 2 * D], DOT));
    pts(4, t => { const [x, z] = sq4(t, W * .35, D * .45); return [x, b + R * .02, z]; }, SQUARE, true);
  };
  SIG['천사의 계단'] = ({ at, R, r, J, link, chain, pts }) => { // 하늘로 곧게 오르는 계단, 꼭대기의 날개와 광륜, 흩날리는 깃털
    const N = 22, sides = [[], []];
    for (let i = 0; i < N; i++) { const t = i / (N - 1), x = -R * 1.1 + t * R * 1.9, h = -R * .8 + t * R * 1.7, w = R * (.28 - t * .12);
      [-1, 1].forEach((s, si) => { const a = at(x, h, s * w, SQUARE), b2 = at(x + R * .086, h, s * w, DOT); link(a, b2); sides[si].push(a, b2); });
      link(sides[0][sides[0].length - 2], sides[1][sides[1].length - 2]); }
    chain(sides[0]); chain(sides[1]);
    const tx = R * .8, th = R * .9;
    for (const s of [-1, 1]) { const bones = [];
      for (let f = 0; f < 11; f++) { const bz = s * R * (.1 + f * .06), bh = th + R * .05 + f * R * .03, ang = .1 + f * .13, len = R * (1.0 - f * .05);
        const fe = pts(4, t => [tx - t * R * .12, bh + Math.sin(ang) * len * t, bz + s * Math.cos(ang) * len * t], q => q === 3 ? DIAMOND : DOT); bones.push(fe[0]); }
      chain(bones); }
    pts(16, t => [tx + Math.cos(t * 6.283) * R * .2, th + R * .55, Math.sin(t * 6.283) * R * .2], RING, true);
    for (let k = 0; k < 18; k++) { const x = J() * R * 1.3, h = J() * R * .9, z = J() * R * 1.1; link(at(x, h, z, DOT), at(x + R * .05, h - R * .03, z + J() * R * .03, DIAMOND)); }
  };
  SIG['X 프로그램 격리구역'] = ({ R, link, pts }) => { // 철창 격리 상자 안에 갇힌 거대한 X
    const F = R * .95, edge = (a, b, n, k) => pts(n, t => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t], k);
    const V = [[-F, -F, -F], [F, -F, -F], [F, -F, F], [-F, -F, F], [-F, F, -F], [F, F, -F], [F, F, F], [-F, F, F]];
    for (const [a, b] of [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]) edge(V[a], V[b], 7, SQUARE);
    for (let k = 1; k < 6; k++) { const u = -F + k * F / 3; for (const [x, z] of [[u, -F], [u, F], [-F, u], [F, u]]) edge([x, -F, z], [x, F, z], 6, DOT); }
    const w = R * .1;
    for (const sg of [1, -1]) { const px = -sg / Math.SQRT2, ph = 1 / Math.SQRT2, rails = [];
      for (const [dd, dz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) { const o = [px * dd * w, ph * dd * w, dz * w];
        rails.push(edge([-F * .8 + o[0], -F * .8 * sg + o[1], o[2]], [F * .8 + o[0], F * .8 * sg + o[1], o[2]], 13, DIAMOND)); }
      for (let i = 0; i < 13; i += 3) { link(rails[0][i], rails[1][i]); link(rails[1][i], rails[3][i]); link(rails[3][i], rails[2][i]); link(rails[2][i], rails[0][i]); } }
  };

  function mulberry(seed) {
    return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  const lerp = (a, b, t) => a + (b - a) * t;
  // 1인칭(시점 고정): 빛나는 점(파트너) 뒤로 얼마나 떨어질지, 얼마나 내려다볼지(라디안)
  const FPV_DIST = 520, FPV_TILT = .24;
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
      const shape = fixed.shape, R = 600 * fixed.scale, yaw = r() * 6.283, cw = Math.cos(yaw), sw = Math.sin(yaw);
      const M = [cw, 0, sw, 0, 1, 0, -sw, 0, cw]; // 위아래는 그대로 두고 돌려 놓기만 해요
      const hub = add(cx, cy, cz, col, HUB, 3.2, c);
      hubs.push(hub); clusters.push({ x: cx, y: cy, z: cz, hub, col, shape, region: curRegion });
      const ids = [];
      const put = (lx, ly, lz, k) => {
        const x = cx + M[0] * lx + M[1] * ly + M[2] * lz, y = cy + M[3] * lx + M[4] * ly + M[5] * lz, z = cz + M[6] * lx + M[7] * ly + M[8] * lz;
        const cc = r() < (fixed && !fixed.loose ? .05 : .14) ? Math.floor(r() * PALETTE.length) : col;
        const i = add(x, y, z, cc, k ?? kindPick(), .9 + r() * 1.3, c); ids.push(i); return i;
      };
      const at = (x, h, z, k) => put(x, -h, z, k);
      const chain = (a, closed) => { for (let i = 1; i < a.length; i++) link(a[i - 1], a[i]); if (closed && a.length > 2) link(a[a.length - 1], a[0]); return a; };
      const pts = (n, f, k, closed) => { const a = []; for (let i = 0; i < n; i++) { const p = f(n > 1 ? i / (closed ? n : n - 1) : 0, i); a.push(at(p[0], p[1], p[2], typeof k === 'function' ? k(i) : k)); } return chain(a, closed); };
      const fib = (n, x, h, z, rad, k, squash = 1) => { const a = []; for (let i = 0; i < n; i++) { const y = 1 - 2 * (i + .5) / n, q = Math.sqrt(1 - y * y), th = i * 2.39996; a.push(at(x + Math.cos(th) * q * rad, h + y * rad * squash, z + Math.sin(th) * q * rad, k)); } return a; };
      const closest = (id, arr) => { let best = arr[0], bd = Infinity; for (const j of arr) if (j !== id) { const dd = d2(id, j); if (dd < bd) { bd = dd; best = j; } } return best; };
      const near = (a, kk) => { for (const i of a) a.filter(j => j !== i).map(j => [j, d2(i, j)]).sort((p, q) => p[1] - q[1]).slice(0, kk).forEach(([j]) => link(i, j)); return a; };
      const box = (x, h, z, w, hh, d, k) => { const c = []; for (const dy of [0, hh]) for (const [dx, dz] of [[-w, -d], [w, -d], [w, d], [-w, d]]) c.push(at(x + dx, h + dy, z + dz, k));
        for (let i = 0; i < 4; i++) { link(c[i], c[(i + 1) % 4]); link(c[4 + i], c[4 + (i + 1) % 4]); link(c[i], c[4 + i]); } return c; };
      SIG[shape]({ at, put, link, chain, pts, fib, closest, near, box, hub, R, r, J: () => (r() - .5) * 2 });
      // make sure every node in the cluster reaches the hub (nearest-attachment)
      const attached = [hub];
      for (const id of ids) {
        if (find(id) === find(hub)) { attached.push(id); continue; }
        let best = hub, bd = Infinity;
        for (const j of attached) { const dd = d2(id, j); if (dd < bd) { bd = dd; best = j; } }
        link(id, best); attached.push(id);
      }
    };
    // 구역마다 고유한 모양 하나씩
    for (const [region, ax, ay, az, scale] of SPECIAL) makeCluster(ax, ay, az, region, { shape: REGION_NAMES[region], scale });
    CONTINENT_ANCHOR.forEach(([ax, ay, az], region) => makeCluster(ax, ay, az, region, { shape: REGION_NAMES[region], scale: 1.1 }));
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
            const dl = Math.hypot(dx, dy, dz) || 1, wantRot = Math.atan2(dx / dl, dz / dl), wantPitch = Math.max(-1.1, Math.min(1.3, Math.asin(dy / dl) + FPV_TILT));
            let dr = wantRot - this.rot; dr = Math.atan2(Math.sin(dr), Math.cos(dr));
            const k = 1 - Math.pow(1 - .14 * this.fpvK, dt / 16);
            this.rot += dr * k; this.pitch += (wantPitch - this.pitch) * k;
            this.camD = lerp(this.camD, FPV_DIST, easeOut(this.fpvK));
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
        this.camD = lerp(tr.fpvHome ? FPV_DIST : (tr.lockFrom ?? 720), tr.near, ease(Math.min(1, t / 900)));
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
      const F = Math.min(W, H) * lerp(1.05, .62, fpvNow), cxs = lerp(W / 2, (W - (this.viewInset || 0) * dpr) / 2, fpvNow), cys = H * lerp(.47, .64, fpvNow);
      const cr = Math.cos(this.rot), sr = Math.sin(this.rot), cp = Math.cos(this.pitch), sp = Math.sin(this.pitch), camD = this.camD;
      const ox = this.focus.x, oy = this.focus.y, oz = this.focus.z;
      if (!this.qx || this.qx.length !== G.n) { this.qx = new Float32Array(G.n); this.qy = new Float32Array(G.n); }
      const PX = this.px, PY = this.py, PZ = this.pz, QX = this.qx, QY = this.qy, n = G.n, DK = Math.max(1, camD / 4800);
      for (let i = 0; i < n; i++) {
        const x = G.X[i] - ox, y = G.Y[i] - oy, z = G.Z[i] - oz;
        const x1 = x * cr - z * sr, z1 = x * sr + z * cr;
        const y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp + camD;
        PZ[i] = z2; QX[i] = x1; QY[i] = y2; if (z2 > 30) { const s = F / z2; PX[i] = cxs + x1 * s; PY[i] = cys + y2 * s; }
      }
      // 한쪽 끝이 카메라 뒤에 있는 선은 버리지 않고 화면 바로 앞(near 면)에서 잘라 그려요 — 1인칭에서 지나온 점과 이어진 선이 사라지지 않게
      const NEAR = 31;
      const clipEnd = (a, b) => { const k = (NEAR - PZ[a]) / (PZ[b] - PZ[a]), s = F / NEAR;
        return [cxs + (QX[a] + (QX[b] - QX[a]) * k) * s, cys + (QY[a] + (QY[b] - QY[a]) * k) * s]; };
      const seg = (a, b) => {
        const fa = PZ[a] > 30, fb = PZ[b] > 30;
        if (fa && fb) return [PX[a], PY[a], PX[b], PY[b]];
        if (!fa && !fb) return null;
        if (fa) { const c = clipEnd(b, a); return [PX[a], PY[a], c[0], c[1]]; }
        const c = clipEnd(a, b); return [c[0], c[1], PX[b], PY[b]];
      };
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
        let x0, y0, x1, y1;
        if (PZ[a] > 30 && PZ[b] > 30) { x0 = PX[a]; y0 = PY[a]; x1 = PX[b]; y1 = PY[b]; }
        else { const q = seg(a, b); if (!q) continue; [x0, y0, x1, y1] = q; }
        if ((x0 < 0 && x1 < 0) || (x0 > W && x1 > W) || (y0 < 0 && y1 < 0) || (y0 > H && y1 > H)) continue;
        const zz = Math.max(30, (PZ[a] + PZ[b]) * .5), lv = zz < 1200 * DK ? 2 : zz < 2800 * DK ? 1 : 0, key = G.C[a] * 3 + lv;
        const p = buckets[key] || (buckets[key] = new Path2D()); p.moveTo(x0, y0); p.lineTo(x1, y1);
      }
      // crisper links: brighter, and thicker the closer they are
      for (let k = 0; k < buckets.length; k++) if (buckets[k]) { const lv = k % 3;
        g.strokeStyle = PALETTE[k / 3 | 0]; g.globalAlpha = [.2, .38, .66][lv]; g.lineWidth = [1, 1.3, 1.7][lv] * dpr; g.stroke(buckets[k]); }

      /* traced path */
      if (this.pathEdges.size) {
        const p = new Path2D();
        this.pathEdges.forEach(key => { const a = Math.floor(key / n), b = key % n; const q = seg(a, b); if (q) { p.moveTo(q[0], q[1]); p.lineTo(q[2], q[3]); } });
        g.globalAlpha = .35; g.strokeStyle = '#7dd3fc'; g.lineWidth = 7 * dpr; g.stroke(p);
        g.globalAlpha = 1; g.strokeStyle = '#ffffff'; g.lineWidth = 2 * dpr; g.stroke(p);
      }
      if (this.mode === 'trav') {
        const a = tr.path[Math.min(tr.reached, tr.hops)], hp = proj(fx, fy, fz);
        if (hp) {
          let sx = PX[a], sy = PY[a];
          if (PZ[a] <= 30) { const k = (NEAR - PZ[a]) / (hp[2] - PZ[a]), s = F / NEAR, hx = (hp[0] - cxs) * hp[2] / F, hy = (hp[1] - cys) * hp[2] / F;
            sx = cxs + (QX[a] + (hx - QX[a]) * k) * s; sy = cys + (QY[a] + (hy - QY[a]) * k) * s; }
          g.globalAlpha = 1; g.strokeStyle = '#ffffff'; g.lineWidth = 2.4 * dpr; g.beginPath(); g.moveTo(sx, sy); g.lineTo(hp[0], hp[1]); g.stroke();
        }
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

      /* packet + trail */
      this.trail.forEach((tp, k) => { const p = proj(tp[0], tp[1], tp[2]); if (!p) return; const sz = (4 + k * .9) * dpr;
        g.globalAlpha = (k + 1) / this.trail.length * .5; g.drawImage(this.glow[PALETTE.length], p[0] - sz, p[1] - sz, sz * 2, sz * 2); });
      if (this.mode !== 'idle') { const p = proj(fx, fy, fz); if (p) {
        const sz = 30 * dpr; g.globalAlpha = 1; g.drawImage(this.glow[0], p[0] - sz, p[1] - sz, sz * 2, sz * 2);
        g.drawImage(this.glow[PALETTE.length], p[0] - sz * .5, p[1] - sz * .5, sz, sz); } }

      g.globalCompositeOperation = 'source-over';
      if (fpvNow > 0 && this.mode === 'trav') {                 // 1인칭: 속도감 있는 가장자리 빛
        const vg = g.createRadialGradient(cxs, cys, Math.min(W, H) * .25, cxs, cys, Math.hypot(W, H) * .6);
        vg.addColorStop(0, 'rgba(34,211,238,0)'); vg.addColorStop(1, `rgba(14,165,233,${.28 * fpvNow})`);
        g.globalAlpha = 1; g.fillStyle = vg; g.fillRect(0, 0, W, H);
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
