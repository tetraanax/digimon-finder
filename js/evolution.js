/* 진화 연출 — 데이터 증폭 폭발 (약 24~31초, 빠르게 모드에서는 3배 빠르게)
   1) 시작: 화면이 한 번 흔들리고 데이터 줄기가 화면을 가로질러요 (새 모습의 속성 기운이 희미하게 비쳐요)
   2) 스캔: 스캔선이 몸을 훑고, 몸이 디지털 데이터로 읽혀요
   3) 분해: 그림의 실제 픽셀이 아래에서부터 떨어져 나와 데이터 입자가 돼요
   4) 증폭: 입자가 소용돌이 구체를 이루고, 박자마다 ×2 ×4 ×8 … 로 복제되며 폭발적으로 커져요
            진화할 단계마다 박자 수가 달라요: 유년기 ×2 · 성장기 ×4 · 성숙기 ×16 · 완전체 ×128 · 궁극체 ×1024
            특별 진화는 ×1024를 넘어서며 숫자가 넘쳐흘러요 (오버플로 오류: 숫자가 음수 · 0 · NaN으로 깨지고 오류 창이 쏟아져요)
   4.5) 속성 주입: 새 모습의 속성 기운이 구체에 스며들며 맥동해요 (ELEMENT INJECT)
   5) 임계: 모든 데이터가 한 점으로 빨려 들어갔다가 — 대폭발 (섬광 · 충격파 · 임팩트 프레임)
   6) 재구성: 사방으로 흩어진 입자가 새 모습의 픽셀 자리로 날아와 거대한 몸을 짜 맞추고, 실제 모습이 드러나요
   7) 결과: 회전하는 디스크 플랫폼과 빛기둥 위에 새 모습 · 이름 · 용량 막대 · 한 글자씩 써지는 설명
   새 모습의 속성(불 · 물 · 얼음 · 번개 · 식물 · 바람 · 대지 · 빛 · 어둠 · 기계)에 따라 특수 효과가 더해지고,
   진화할 단계가 높을수록 효과가 약한 기운에서 화면을 집어삼킬 만큼 거세져요.
   타락(fall): 친구를 잃은 슬픔으로 타락할 때는 친구가 사라지고 몸이 검게 물드는 장면이 먼저 나와요.
   사용: await window.evoCinematic.play({ from, to, partner, kind, label, cap, fromCap, desc, speed, alive, at, stage, fall })
   화면을 누르거나 건너뛰기 / Esc → 이름 장면으로, 한 번 더 누르면 닫혀요. */
(function () {
  'use strict';
  // 타임라인 (ms): 증폭 박자 수에 따라 증폭 구간 길이가 바뀌고, 그 뒤의 시점이 모두 함께 밀려요
  const BASE = { in: 400, call: 500, callOut: 1800, scan: 1900, scanEnd: 3600, dis: 3400, disEnd: 5600, amp0: 6000 };
  // 증폭이 끝난 때부터: 속성 주입(inject) → 응축 → 대폭발 → 재구성 → 결과
  const AFTER = { inject: 300, implode: 2600, boom: 3300, rebuild: 3700, solid: 6600, rebuilt: 7000, slam: 7800, hold: 13500, end: 14300 };
  const BEATS = { '-1': 1, 0: 2, 1: 4, 2: 7, 3: 10, 4: 10 };   // 진화할 단계별 박자 수 (×2 ~ ×1024)
  const SPAN = { 1: 1600, 2: 2400, 4: 3800, 7: 5600, 10: 7200 };
  const OVF = 6, OVF_SPAN = 3200;                              // 특별 진화: ×1024를 넘어서 넘쳐흐르는 박자
  const OVF_TXT = ['×2048', '×65536', '×16777216', '×2147483647', '×-2147483648', '×0'];
  const OVF_GARBAGE = ['×NaN', '×∞', 'ERR', '×0x7FFFFFFF', '×-0', '×??????', '×undefined', '×1.#INF'];
  function beatTimes(n, a, b, decay = .86) {                   // 점점 빨라지는 박자
    const w = Array.from({ length: n }, (_, i) => Math.pow(decay, i)), tot = w.reduce((m, x) => m + x, 0);
    let acc = 0; return w.map(x => { const v = a + (b - a) * acc / tot; acc += x; return Math.round(v); });
  }
  function makeT(stage, pre) {
    const n = BEATS[stage] ?? 4, amp = beatTimes(n, BASE.amp0, BASE.amp0 + SPAN[n]);
    let endAmp = BASE.amp0 + SPAN[n], ovf = [];
    if (stage >= 4) { ovf = beatTimes(OVF, endAmp, endAmp + OVF_SPAN, .74); endAmp += OVF_SPAN; }
    const o = { ...BASE, amp: amp.concat(ovf), nNormal: n, ovf0: ovf.length ? ovf[0] : Infinity };
    for (const k in AFTER) o[k] = endAmp + AFTER[k];
    if (pre) { for (const k in o) if (typeof o[k] === 'number' && k !== 'nNormal') o[k] += pre; o.amp = o.amp.map(b => b + pre); }
    return o;
  }
  let T = makeT(1, 0);
  let MAX_PARTS = 5200;
  let QUAL = 1;                    // 렌더 해상도 배율: 프레임이 계속 늦으면 스스로 낮춰요 (다음 진화에도 이어져요)
  // 단계별 세기 (index = LV: 1 유년기 · 2 성장기 · 3 성숙기 · 4 완전체 · 5 궁극체 · 6 특별)
  const LVL = {
    parts: [0, 700, 1000, 1500, 2800, 4400, 6400],
    shake: [0, .25, .35, .45, .7, 1, 1.45], burst: [0, 40, 60, 90, 180, 300, 560], rings: [0, 1, 1, 2, 3, 4, 7], glow: [0, .4, .48, .55, .8, 1, 1.3],
    elem: [0, .12, .22, .38, .6, .88, 1.25],
  };
  const starsOf = lv => lv >= 6 ? '★★★★★∞' : '★'.repeat(lv) + '☆'.repeat(5 - lv);

  /* 속성 효과: 새 모습의 이름 · 유형 · 필살기 · 설명에서 낱말을 찾아 가장 많이 맞는 속성을 골라요 */
  const ELEMENTS = {
    fire:    { name: 'FIRE',    col: '#ff7a1a', col2: '#ffd166', re: /불꽃|불덩이|불길|불길|화염|불의|불을|불로|플레임|파이어|버닝|용암|마그마|화산|작열|업화|화룡|피닉스|블레이즈|인페르노|태양|열선|뜨거운|타오르|불사조/g },
    water:   { name: 'WATER',   col: '#38bdf8', col2: '#bae6fd', re: /물결|물줄기|물기둥|물방울|물속|바닷|바다|해양|파도|해일|아쿠아|워터|수룡|어인|인어|머메이드|마린|오션|돌고래|고래|상어|조개|해저|심해|거품|버블|웨이브|타이달|넵튠|수류|갑각|해룡|호수|강물/g },
    ice:     { name: 'ICE',     col: '#7dd3fc', col2: '#f0f9ff', re: /얼음|얼어|얼려|냉기|빙하|빙결|빙산|아이스|프로스트|블리자드|동결|서리|눈보라|설인|설원|프리즈|콜드|극지|펭귄|차가운/g },
    thunder: { name: 'THUNDER', col: '#facc15', col2: '#fef9c3', re: /번개|전기|전격|천둥|뇌전|뇌격|뇌신|뇌운|썬더|선더|볼트|라이트닝|스파크|일렉|플라즈마|전류|방전|벼락/g },
    plant:   { name: 'PLANT',   col: '#4ade80', col2: '#f9a8d4', re: /식물|꽃|나무|잎|숲|덩굴|넝쿨|씨앗|포자|플라워|로즈|장미|우드|가시|뿌리|플랜트|버섯|선인장|열매|과일|요정/g },
    wind:    { name: 'WIND',    col: '#a5f3fc', col2: '#ffffff', re: /바람|폭풍|회오리|토네이도|윈드|돌풍|태풍|사이클론|허리케인|질풍|선풍|스톰|조류|하늘을|날개/g },
    earth:   { name: 'EARTH',   col: '#d6a35c', col2: '#f59e0b', re: /대지|바위|암석|돌덩이|돌멩이|땅|모래|지진|흙|광물|어스|그라운드|산맥|사막|암반|골렘|거암|가이아|광석/g },
    light:   { name: 'LIGHT',   col: '#fde68a', col2: '#ffffff', re: /빛|성스|신성|천사|홀리|세인트|광휘|광채|천상|성검|성창|여신|축복|정화|후광|광선|성기사|로열나이츠/g },
    dark:    { name: 'DARK',    col: '#a855f7', col2: '#f43f5e', re: /어둠|암흑|악마|그림자|다크|사령|언데드|저주|마왕|타천사|나이트메어|데스|해골|유령|고스트|흡혈|뱀파이어|지옥|명계|공포|타락|마계|블랙|마족/g },
    metal:   { name: 'METAL',   col: '#cbd5e1', col2: '#facc15', re: /기계|사이보그|메탈|미사일|강철|머신|로봇|레이저|캐논|안드로이드|기갑|장갑|포탑|기관포|전투기|엔진|합금|크롬|사이버|드릴|기체/g },
  };
  function elementOf(name, desc) {
    const d = (window.digiData && window.digiData(name)) || {};
    const parts = [[name, 3], [d.type || '', 3], [(d.attacks || []).join(' '), 2], [desc || '', 1]];
    let best = null, top = 0;
    for (const [id, e] of Object.entries(ELEMENTS)) {
      let s = 0; for (const [txt, w] of parts) s += ((String(txt).match(e.re) || []).length) * w;
      if (s > top) { top = s; best = id; }
    }
    return best;
  }
  const TINT = { 'EVOLUTION': '#38bdf8', 'JOGRESS EVOLUTION': '#f472b6', 'CAPSULE EVOLUTION': '#facc15', 'SPECIAL EVOLUTION': '#a78bfa' };
  /* 진화 형태별 테마
     data    — 데이터 증폭 (기본): 네트워크 · 육각 프레임 · 디스크
     holy    — 백신종 / 로열나이츠 · 사성수 · 올림포스: 위에서 내려오는 빛기둥, 빛의 깃털, 성스러운 문양 원, 머리 위 광륜, 입자가 하늘에서 내려와요
     virus   — 바이러스종 / 칠대마왕: 가장자리에서 자라는 검은 촉수, 몸을 갉아먹는 오염 블록, 가운데의 검은 핵이 데이터를 흡수, 화면 찢김
     vaccine — 백신종: 위협 조준경이 몸을 붙잡아 격리하고, 정화 파동이 화면을 훑고, 육각 방화벽 돔이 칸칸이 켜지며 구체를 감싸요.
               하늘에서 빛기둥과 빛의 깃털이 내려오고, 사방에서 금빛 십자 항체가 날아와 꽂혀요. 결과 화면에는 후광과 빛의 날개를 두른
               금빛 방패 문장과 성스러운 문양 원, 머리 위 광륜이 떠요 (SANCTIFIED)
     free    — 프리종: 무지갯빛 입자
     capsule — 캡슐(아머) 진화: 궤도를 도는 캡슐 판, 조각들이 날아와 캡슐 껍질로 맞물렸다가 깨지며 등장
     spirit  — 스피릿 진화: 사람이 전설의 투사의 스피릿을 받아 디지몬이 돼요 (주황빛 · 기본 연출 위에 스피릿 색)
     jogress — 조그레스: 두 디지몬의 데이터가 분홍 · 하늘색 이중 나선으로 꼬이다 하나로 합쳐져요 */
  const THEMES = {
    data:    { title: 'LIMIT BREAK',      hud: ['SCANNING', 'DECOMPILE', 'AMPLIFY', 'LIMIT BREAK', 'RECOMPILE'], mult: 'EXPAND', rain: '125,211,252' },
    holy:    { tint: '#fcd34d', tint2: '#fff7d6', title: 'HOLY ASCENSION', hud: ['SCANNING', 'PURIFY', 'BLESS', 'ASCEND', 'DESCEND'], mult: 'BLESS', rain: '253,230,138', flash: '255,251,234' },
    virus:   { tint: '#f43f5e', tint2: '#a855f7', title: 'SYSTEM CORRUPTED', hud: ['SCANNING', 'INFECT', 'ABSORB', 'OVERFLOW', 'MUTATE'], mult: 'ABSORB', rain: '244,63,94', flash: '255,40,90', bg: '10,2,12' },
    vaccine: { tint: '#f8fafc', tint2: '#fbbf24', title: 'SANCTIFIED', hud: ['THREAT SCAN', 'SANCTIFY', 'PURIFY', 'HOLY AEGIS', 'DESCEND'], mult: 'PURIFY', rain: '248,250,252', flash: '255,252,240', bg: '7,8,16' },
    free:    { tint: '#34d399', title: 'FREE FORM',        hud: ['SCANNING', 'DECOMPILE', 'AMPLIFY', 'LIMIT BREAK', 'RECOMPILE'], mult: 'EXPAND', rain: '167,243,208' },
    capsule: { tint: '#facc15', tint2: '#fde68a', title: 'CAPSULE UNLOCKED', hud: ['SCANNING', 'DECOMPILE', 'AMPLIFY', 'LIMIT BREAK', 'ARMOR LOCK'], mult: 'EXPAND', rain: '253,224,71', flash: '255,247,214' },
    spirit:  { tint: '#fb923c', tint2: '#fde68a', title: 'SPIRIT EVOLUTION', hud: ['SCANNING', 'SPIRIT LINK', 'RESONATE', 'H-SPIRIT', 'DESCEND'], mult: 'RESONATE', rain: '253,186,116', flash: '255,240,220' },
    jogress: { tint: '#f472b6', tint2: '#38bdf8', title: 'DNA SYNCHRONIZED', hud: ['SCANNING', 'DNA SPLIT', 'SYNC', 'FUSION', 'RECOMPILE'], mult: 'SYNC', rain: '249,168,212' },
  };
  function pickTheme(kind, attr, label) {
    if (kind === 'CAPSULE EVOLUTION') return 'capsule';
    if (kind === 'SPIRIT EVOLUTION') return 'spirit';
    if (kind === 'JOGRESS EVOLUTION') return 'jogress';
    if (/마왕|타천사|암흑진화|타락/.test(label)) return 'virus';
    if (/로열나이츠|사성수|올림포스|삼대천사/.test(label)) return 'holy';
    return { vac: 'vaccine', vir: 'virus', fre: 'free' }[attr] || 'data';
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
  // 안쪽 흰 배경 자리 (320×320 그림 기준 좌표): 파일 이름 → 지울 곳들
  const HOLES = {
    dukemon: [[196, 108], [178, 154], [158, 4]],       // 망토-방패 사이, 팔-다리 사이, 투구 깃털-망토 사이
    paildramon: [[128, 133], [80, 198], [62, 211]],    // 손톱 사이
    holydramon: [[102, 183]],                          // 꼬리 사이
    dorumon: [[155, 131]],                             // 꼬리-뿔 사이
    angewomon: [[116, 146], [171, 30], [128, 60], [123, 119], [120, 134]],   // 왼쪽 다리-장식 리본 사이, 머리-두른 리본 사이, 머리 왼쪽, 왼팔-몸통 사이
    bancholeomon: [[158, 212], [148, 216], [103, 225], [220, 229]],   // 망토·다리·꼬리 사이
    meramon: 'all',                                    // 불꽃 몸 사이사이
    tailmon: [[206, 147]],                             // 머리-꼬리 사이
    silphymon: [[168, 110], [115, 103]],               // 몸-오른팔 사이, 몸-왼쪽 날개 사이
  };
  // 빛이 번지는 효과가 그려진 그림 (파일 이름)
  const GLOW = new Set(['chaosmonvaldurarm']);
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
          // 그림 안쪽에 갇힌 흰 배경(날개·꼬리·팔 사이): 순백 몸통과 색으로는 구별되지 않아서, 그림마다 직접 찍어 둔 자리만 지워요
          const file = (src.split('/').pop() || '').replace(/\.\w+$/, '');
          // 'all': 흰 부분이 원래 없는 그림(불꽃 몸 등)이라 갇힌 흰 칸을 모두 지워요
          const spots = HOLES[file] === 'all' ? [] : HOLES[file] || [];
          if (HOLES[file] === 'all') for (let i = 0; i < W * H; i++) if (!gone[i] && light(i)) spots.push([(i % W) * 320 / W, ((i / W) | 0) * 320 / H]);
          for (const [hx, hy] of spots) {
            const x = Math.round(hx * W / 320), y = Math.round(hy * H / 320); if (x < 0 || y < 0 || x >= W || y >= H) continue;
            stack.push(y * W + x);
            while (stack.length) {
              const i = stack.pop();
              if (gone[i] || !light(i)) continue;
              gone[i] = 1; px[i * 4 + 3] = 0;
              const xx = i % W, yy = (i / W) | 0;
              if (xx > 0) stack.push(i - 1); if (xx < W - 1) stack.push(i + 1);
              if (yy > 0) stack.push(i - W); if (yy < H - 1) stack.push(i + W);
            }
          }
          // 빛이 번지는 그림: 배경에서 이어지는 밝은 빛 부분을 '밝기 → 투명도'로 바꿔서, 어두운 화면에서도 빛이 부드럽게 번져 보이게 해요
          if (GLOW.has(file)) {
            // 번지는 빛 = 아주 밝거나(거의 흰색) 노르스름한 밝은 색. 푸르스름한 몸통은 건드리지 않아요
            const soft = i => { const r = px[i * 4], gg = px[i * 4 + 1], b = px[i * 4 + 2], mn = Math.min(r, gg, b);
              return mn > 222 || (mn > 105 && (r + gg) / 2 - b > 18 && r > 200); };
            const seen = new Uint8Array(W * H);
            for (let i = 0; i < W * H; i++) if (gone[i]) stack.push(i);
            while (stack.length) {
              const i = stack.pop();
              if (seen[i]) continue; seen[i] = 1;
              if (!gone[i]) {
                if (!soft(i)) continue;
                // 흰색에서 멀수록 진하게: 색은 밝은 그대로 두고 투명도만 줘서, 어두운 화면 위에서 빛처럼 보여요
                const a = Math.max(255 - px[i * 4], 255 - px[i * 4 + 1], 255 - px[i * 4 + 2]) / 255;
                px[i * 4 + 3] = Math.round(Math.min(1, a * 1.7) * 255); gone[i] = 3;
              }
              const x = i % W, y = (i / W) | 0;
              if (x > 0) stack.push(i - 1); if (x < W - 1) stack.push(i + 1);
              if (y > 0) stack.push(i - W); if (y < H - 1) stack.push(i + W);
            }
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

  api.play = async function ({ from, to, partner = null, kind = 'EVOLUTION', label = '', attr = '', cap = '', fromCap = '', desc = '', speed = () => 1, alive = () => true, at = 0, power = 2, stage = null, fall = null } = {}) {
    const ST = stage == null ? Math.max(1, Math.min(4, power | 0)) : Math.max(-1, Math.min(4, stage | 0));
    const LV = ST + 2, SHK = LVL.shake[LV], GLW = LVL.glow[LV], OVER = ST >= 4;
    const PRE = fall ? 8000 : 0;                                  // 타락: 친구가 사라지는 장면이 먼저 나와요
    MAX_PARTS = LVL.parts[LV]; T = makeT(ST, PRE);
    const EL = elementOf(to, desc), ELD = EL ? ELEMENTS[EL] : null, EI = LVL.elem[LV];
    const img = n => (n && window.digiImage) ? window.digiImage(n) : null;
    const [A, B, P, F] = await Promise.all([cutout(img(from)), cutout(img(to)), cutout(img(partner)), cutout(img(fall && fall.friend))]);
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
          td: T.dis + (0.5 - q.y) * 1500 + Math.random() * 300,      // 아래에서부터 떨어져 나와요
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

    let t = at, last = performance.now(), W = 0, H = 0, dpr = 1, cols = [], burst = [], mult = 1, beatsDone = 0, ovfTxt = '';
    const shakes = [], fired = new Set();
    const shake = (amp, dur) => shakes.push({ t0: t, amp: amp * SHK, dur });
    const once = (key, fn) => { if (!fired.has(key)) { fired.add(key); fn(); } };
    // 시작 시점을 건너뛴 경우(at, 건너뛰기) 지나간 박자의 복제를 미리 해 둬요
    const beat = (b, i) => { clone(b); if (i < T.nNormal) mult *= 2; else ovfTxt = OVF_TXT[i - T.nNormal] || ovfTxt; beatsDone = i + 1; };
    const catchUp = () => { T.amp.forEach((b, i) => { if (t >= b && beatsDone <= i) { beat(b, i); fired.add('amp' + i); } }); };
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
      dpr = Math.min(devicePixelRatio || 1, 1.5) * QUAL;
      const w = Math.round(innerWidth * dpr), h = Math.round(innerHeight * dpr);
      if (w === W && h === H) return;
      W = cv.width = w; H = cv.height = h;
      const step = 24 * dpr; cols = [];
      for (let x = step / 2; x < W; x += step)
        cols.push({ x, y: Math.random() * H, v: (0.25 + Math.random() * 0.6) * dpr, n: 5 + (Math.random() * 12 | 0) });
      buildNet(W / 2, H * .42, Math.min(W * .58, H * .44));
      if (themeId === 'virus' || fall) buildTendrils();
    }
    const HEX = '0123456789ABCDEF';
    const byte = (k, c) => HEX[(k * 7 + c + (t / 90 | 0)) % 16] + HEX[(k * 13 + c * 3 + (t / 140 | 0)) % 16];
    let hsh = 0; for (const ch of String(to)) hsh = (hsh * 31 + ch.charCodeAt(0)) >>> 0;
    let rainAtlas = null;
    function buildRain(prev) {
      const px = 11 * dpr, font = `${px}px Silkscreen, monospace`;
      const c = prev && prev.dpr === dpr ? prev.c : document.createElement('canvas'), q = c.getContext('2d');
      q.font = font;
      const cw = Math.ceil(q.measureText('WW').width) + 4, ch = Math.ceil(px * 1.4), base = Math.ceil(px * 1.1);
      c.width = cw * 16; c.height = ch * 32;
      q.font = font; q.textAlign = 'center'; q.textBaseline = 'alphabetic';
      for (let v = 0; v < 2; v++) {
        q.fillStyle = v ? `rgb(${TH.rain})` : '#ffffff';
        for (let hi = 0; hi < 16; hi++) for (let lo = 0; lo < 16; lo++) q.fillText(HEX[hi] + HEX[lo], lo * cw + cw / 2, (v * 16 + hi) * ch + base);
      }
      return { c, cw, ch, base, dpr, ok: !document.fonts || document.fonts.check(font), tick: t / 500 | 0 };
    }
    const RING_TXT =Array.from({ length: 40 }, (_, i) => HEX[(i * 7 + hsh) % 16]).join('');
    const ADDR = '0x' + hsh.toString(16).toUpperCase().padStart(8, '0').slice(-8);

    function sprite(sp, x, y, s, o) {
      const { a = 1, white = 0, black = false, glow = 0, clipTop = null } = o;
      if (a <= 0 || s <= 0) return;
      g.save(); g.translate(x, y);
      if (!sp) { g.globalAlpha = a; g.fillStyle = black ? '#05060f' : white > .5 ? '#fff' : tint; g.beginPath(); g.ellipse(0, s * .06, s * .3, s * .4, 0, 0, Math.PI * 2); g.fill(); g.restore(); return; }
      const r = s / Math.max(sp.W, sp.H), w = sp.W * r, h = sp.H * r;
      if (clipTop != null) { g.beginPath(); g.rect(-w, -h / 2 - 2, w * 2, h * clipTop + 2); g.clip(); }
      if (black) { g.globalAlpha = a; g.drawImage(sp.black, -w / 2, -h / 2, w, h); g.restore(); return; }
      const gl = glow ? glowOf(sp, glow * dpr / r) : null;   // 번지는 빛은 미리 구워 둔 그림으로 (매 프레임 흐림 처리를 하지 않아요)
      const drawGlow = () => g.drawImage(gl.c, -w / 2 - gl.pad * r, -h / 2 - gl.pad * r, w + gl.pad * 2 * r, h + gl.pad * 2 * r);
      if (gl && white < 1) { g.globalAlpha = a * .5; drawGlow(); }
      if (white < 1) { g.globalAlpha = a * (1 - white * .6); g.drawImage(sp.color, -w / 2, -h / 2, w, h); }
      if (white > 0) { g.globalAlpha = a * white; if (gl) drawGlow(); else g.drawImage(sp.white, -w / 2, -h / 2, w, h); }
      g.restore();
    }
    // 흰 실루엣 + 속성색 번짐을 한 번만 그려 두고 다시 써요 (흐림 크기는 2px 단위로 묶어요)
    function glowOf(sp, blur) {
      const b = Math.max(2, Math.round(blur / 2) * 2), key = tint + b;
      sp.glows = sp.glows || {};
      if (sp.glows[key]) return sp.glows[key];
      const pad = b * 2, c = document.createElement('canvas'); c.width = sp.W + pad * 2; c.height = sp.H + pad * 2;
      const q = c.getContext('2d'); q.shadowColor = tint; q.shadowBlur = b; q.drawImage(sp.white, pad, pad);
      return (sp.glows[key] = { c, pad });
    }
    // 글자 그림판: 자주 쓰는 글자를 한 번만 그려 두고 잘라 붙여요 (fillText보다 훨씬 가벼워요)
    const glyphCache = {};
    function glyphs(chars, px, color, blur = 0) {
      const key = chars + '|' + px + '|' + color + '|' + blur;
      if (glyphCache[key] && glyphCache[key].ok) return glyphCache[key];
      const font = `${px}px Silkscreen, monospace`, c = document.createElement('canvas'), q = c.getContext('2d');
      q.font = font;
      const pad = Math.ceil(blur * 1.5) + 2, cw = Math.ceil(Math.max(...Array.from(chars, ch => q.measureText(ch).width))) + pad * 2, ch = Math.ceil(px * 1.3) + pad * 2;
      c.width = cw * chars.length; c.height = ch;
      q.font = font; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillStyle = color;
      if (blur) { q.shadowColor = color; q.shadowBlur = blur; }
      Array.from(chars).forEach((s, i) => q.fillText(s, i * cw + cw / 2, ch / 2));
      const ok = !document.fonts || document.fonts.check(font);
      return (glyphCache[key] = { c, cw, ch, idx: Object.fromEntries(Array.from(chars, (s, i) => [s, i])), ok });
    }
    // 원을 따라 글자를 세워 그려요 (현재 변환 위에 겹쳐서)
    function glyphRing(G, text, n, x, y, r, rot, step, scale) {
      const base = g.getTransform(), w = G.cw * scale, h = G.ch * scale;
      for (let i = 0; i < n; i++) {
        const j = G.idx[text[i % text.length]]; if (j == null) continue;
        const a = rot + i * step, ca = Math.cos(a + Math.PI / 2), sa = Math.sin(a + Math.PI / 2);
        g.setTransform(base.multiply(new DOMMatrix([ca, sa, -sa, ca, x + Math.cos(a) * r, y + Math.sin(a) * r])));
        g.drawImage(G.c, j * G.cw, 0, G.cw, G.ch, -w / 2, -h / 2, w, h);
      }
      g.setTransform(base);
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
    // 결과 화면 뒤의 빛: 은은한 원형 빛 + 천천히 도는 점선 동심원 + 위로 떠오르는 빛줄기 (방사형 부채꼴 줄기는 쓰지 않아요)
    function godRays(x, y, len, k, rot, n) {
      if (k <= 0) return;
      g.save(); g.globalCompositeOperation = 'lighter';
      const gr = g.createRadialGradient(x, y, 0, x, y, len * .8); gr.addColorStop(0, tint2); gr.addColorStop(.3, tint + '55'); gr.addColorStop(1, tint + '00');
      g.globalAlpha = k * .9; g.fillStyle = gr; g.beginPath(); g.arc(x, y, len * .8, 0, Math.PI * 2); g.fill();
      g.strokeStyle = tint; g.lineCap = 'round';
      const rings = Math.max(3, Math.round(n / 5));
      for (let i = 0; i < rings; i++) {
        const r = len * (.22 + i * .14), segs = 10 + i * 4, dir = i % 2 ? -1 : 1;
        g.globalAlpha = k * (1 - i / rings) * 1.4; g.lineWidth = (2.2 - i * .3) * dpr;
        for (let s = 0; s < segs; s++) { const a = rot * dir * (6 - i) + s / segs * Math.PI * 2; g.beginPath(); g.arc(x, y, r, a, a + Math.PI / segs * .9); g.stroke(); }
      }
      for (let i = 0; i < n; i++) {
        const q = (t * (.00012 + rndS(i, 151) * .00012) + rndS(i, 152)) % 1, px = x + (rndS(i, 153) - .5) * len * 1.1, py = y + len * .35 - q * len * .9, L = len * (.08 + .1 * rndS(i, 154));
        const lg = g.createLinearGradient(px, py, px, py + L); lg.addColorStop(0, tint2); lg.addColorStop(1, tint + '00');
        g.globalAlpha = k * Math.sin(q * Math.PI) * 1.6; g.fillStyle = lg; g.fillRect(px - 1.5 * dpr, py, 3 * dpr, L);
      }
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
      const off = (1 - easeOut(prog(p, .3, 1))) * 10 * dpr;
      g.globalAlpha = a * .7; g.globalCompositeOperation = 'lighter';
      g.fillStyle = '#ff2d6f'; g.fillText(text, x - off, y);
      g.fillStyle = '#22d3ee'; g.fillText(text, x + off, y);
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = a;
      const gr = g.createLinearGradient(0, y - fs * .85, 0, y + fs * .1);
      if (themeId === 'vaccine') {
        // 백신: 뒤가 하얗게 밝아서 흰 글자가 묻혀요 → 진한 호박색 테두리를 두르고, 흰색에서 금색으로 물들여요
        g.lineJoin = 'round'; g.lineWidth = Math.max(4 * dpr, fs * .1); g.strokeStyle = 'rgba(69,26,3,.92)';
        g.shadowColor = 'rgba(30,10,0,.7)'; g.shadowBlur = 14 * dpr; g.strokeText(text, x, y);
        gr.addColorStop(0, '#ffffff'); gr.addColorStop(.45, '#fff7d6'); gr.addColorStop(1, tint2);
        g.shadowColor = tint2; g.shadowBlur = 18 * dpr; g.fillStyle = gr; g.fillText(text, x, y);
        g.shadowBlur = 0; g.lineWidth = 1.2 * dpr; g.strokeStyle = 'rgba(180,83,9,.9)'; g.strokeText(text, x, y);
      } else {
        gr.addColorStop(0, '#ffffff'); gr.addColorStop(.55, '#ffffff'); gr.addColorStop(1, tint);
        g.shadowColor = tint; g.shadowBlur = 34 * dpr; g.fillStyle = gr; g.fillText(text, x, y);
        g.shadowBlur = 0; g.lineWidth = 1.2 * dpr; g.strokeStyle = 'rgba(255,255,255,.6)'; g.strokeText(text, x, y);
      }
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
    let featherImg = null;
    const feathers = Array.from({ length: 46 }, (_, i) => ({ x: rndS(i, 3), y: rndS(i, 4), s: .6 + rndS(i, 5) * .9, v: .00004 + rndS(i, 6) * .00006, ph: rndS(i, 7) * 6.28 }));
    function featherFall(k) {
      if (k <= 0) return;
      if (!featherImg) {                          // 깃털 한 장을 미리 그려 두고 돌려 붙여요
        const L0 = 40, c = document.createElement('canvas'); c.width = L0 * 2; c.height = Math.ceil(L0 * .6) + 2;
        const q = c.getContext('2d'), my = c.height / 2;
        const fg = q.createLinearGradient(0, 0, L0 * 2, 0); fg.addColorStop(0, tint + '00'); fg.addColorStop(.5, '#ffffff'); fg.addColorStop(1, tint + '00');
        q.fillStyle = fg; q.beginPath(); q.ellipse(L0, my, L0, L0 * .3, 0, 0, Math.PI * 2); q.fill();
        q.fillStyle = '#ffffff'; q.fillRect(L0 * .1, my - 1.2, L0 * 1.8, 2.4);
        featherImg = c;
      }
      const base = g.getTransform(), fw = featherImg.width, fh = featherImg.height;
      g.save(); g.globalCompositeOperation = 'lighter';
      for (const f of feathers) {
        const y = (((f.y + t * f.v) % 1.1) - .05) * H, x = f.x * W + Math.sin(t / 900 + f.ph) * 30 * dpr, L = 12 * f.s * dpr;
        const a = Math.sin(t / 700 + f.ph) * .8, s = L / (fw / 2);
        g.setTransform(base.a * Math.cos(a) * s, Math.sin(a) * s, -Math.sin(a) * s, base.d * Math.cos(a) * s, base.e + x, base.f + y);
        g.globalAlpha = k * (.35 + .4 * f.s);
        g.drawImage(featherImg, -fw / 2, -fh / 2);
      }
      g.restore();
    }
    // 백신: 성스러운 문양 원 (겹 원 · 12각 · 16진수 글자 고리 · 빛 구슬)
    function sacredCircle(x, y, r, k, rot) {
      if (k <= 0 || r <= 0) return;
      g.save(); g.globalAlpha = clamp(k); g.strokeStyle = tint; g.fillStyle = '#ffffff'; g.shadowColor = tint; g.shadowBlur = 14 * dpr;
      g.lineWidth = 1.8 * dpr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke();
      // 가는 선은 한 경로로 모아 한 번에 그려요 (흐림 처리가 한 번만 일어나요)
      g.lineWidth = 1 * dpr; g.beginPath();
      g.moveTo(x + r * 1.12, y); g.arc(x, y, r * 1.12, 0, Math.PI * 2);
      g.moveTo(x + r * .74, y); g.arc(x, y, r * .74, 0, Math.PI * 2);
      for (let i = 0; i <= 12; i++) { const a = -rot + i * Math.PI / 6; g[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r * .74, y + Math.sin(a) * r * .74); }
      for (let i = 0; i < 12; i++) { const a = -rot + i * Math.PI / 6; g.moveTo(x + Math.cos(a) * r * .74, y + Math.sin(a) * r * .74); g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
      g.stroke();
      g.shadowBlur = 0;
      glyphRing(glyphs(HEX, 32, '#ffffff', 10), RING_TXT, 40, x, y, r * 1.06, rot, Math.PI / 20, Math.max(8, r / 16) / 32);
      g.shadowBlur = 14 * dpr;
      g.beginPath();
      for (let i = 0; i < 12; i++) { const a = -rot * .5 + i * Math.PI / 6, px = x + Math.cos(a) * r * 1.2, py = y + Math.sin(a) * r * 1.2, pr = Math.max(2, r / 70); g.moveTo(px + pr, py); g.arc(px, py, pr, 0, Math.PI * 2); }
      g.fill();
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

    // 백신: 엔젤링 — 비스듬히 누운 빛의 고리. 뒤쪽 반은 흐리게, 앞쪽 반은 흰빛으로 또렷하게, 금빛 테두리와 고리를 도는 반짝임
    function angelRing(x, y, w, k, ph = 0) {
      if (k <= 0 || w <= 1) return;
      const h = w * .26, lw = Math.max(2, w * .09);
      g.save(); g.globalCompositeOperation = 'lighter';
      const glow = g.createRadialGradient(x, y, 0, x, y, w * 1.5); glow.addColorStop(0, `rgba(${FLASH},.28)`); glow.addColorStop(.6, tint2 + '18'); glow.addColorStop(1, tint2 + '00');
      g.globalAlpha = clamp(k); g.fillStyle = glow; g.beginPath(); g.ellipse(x, y, w * 1.5, h * 2.6, 0, 0, Math.PI * 2); g.fill();
      // 고리 자체는 덧칠하지 않고 그려요: 밝은 빛 속에서도 금빛 테가 묻히지 않게
      g.globalCompositeOperation = 'source-over';
      g.shadowColor = tint2; g.shadowBlur = Math.min(w * .35, 18 * dpr);
      g.globalAlpha = clamp(k) * .45; g.strokeStyle = tint2; g.lineWidth = lw * 1.6; g.beginPath(); g.ellipse(x, y, w, h, 0, Math.PI, Math.PI * 2); g.stroke();   // 뒤쪽 반
      g.globalAlpha = clamp(k) * .9; g.shadowBlur = 0; g.lineWidth = lw * 2.3; g.strokeStyle = '#b45309'; g.beginPath(); g.ellipse(x, y, w, h, 0, 0, Math.PI * 2); g.stroke();   // 진한 호박색 바깥 테: 밝은 빛 속에서도 고리 모양이 보여요
      g.shadowBlur = Math.min(w * .35, 18 * dpr);
      g.globalAlpha = clamp(k); g.lineWidth = lw * 1.7; g.strokeStyle = tint2; g.beginPath(); g.ellipse(x, y, w, h, 0, 0, Math.PI * 2); g.stroke();                  // 금빛 테
      g.shadowColor = '#ffffff'; g.lineWidth = lw; g.strokeStyle = '#ffffff'; g.beginPath(); g.ellipse(x, y, w, h, 0, 0, Math.PI); g.stroke();                 // 앞쪽 흰 고리
      g.globalAlpha = clamp(k) * .8; g.lineWidth = lw * .55; g.beginPath(); g.ellipse(x, y, w, h, 0, Math.PI, Math.PI * 2); g.stroke();
      g.shadowBlur = 0;
      for (let i = 0; i < 4; i++) {                                            // 고리를 따라 도는 반짝임
        const a = t * .0016 + ph + i * Math.PI / 2, sx = x + Math.cos(a) * w, sy = y + Math.sin(a) * h, front = Math.sin(a) > 0 ? 1 : .35, s = lw * (1.6 + .8 * Math.sin(t * .01 + i));
        g.globalAlpha = clamp(k) * front; g.fillStyle = '#ffffff';
        g.beginPath(); g.moveTo(sx, sy - s * 2); g.lineTo(sx + s * .35, sy); g.lineTo(sx, sy + s * 2); g.lineTo(sx - s * .35, sy); g.closePath(); g.fill();
        g.beginPath(); g.moveTo(sx - s * 2, sy); g.lineTo(sx, sy + s * .35); g.lineTo(sx + s * 2, sy); g.lineTo(sx, sy - s * .35); g.closePath(); g.fill();
      }
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
      const glowK = prog(t, T.solid - 600, T.slam), burst = easeOut(prog(t, T.slam, T.slam + 850));
      if (burst >= 1) return;
      for (const sh of shards) {
        const ti = T.rebuild + 300 + sh.d * 2000, fin = easeOut(prog(t, ti - 800, ti));
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

    /* ---------- 백신: 조준 · 격리 · 정화 파동 · 육각 방화벽 · 십자 항체 · 방패 문장 ---------- */
    // 위협 조준경: 도는 점선 원 두 겹, 화면 끝까지 뻗는 십자선, 안으로 조여 드는 격리 괄호
    function lockOn(x, y, S, k, close) {
      if (k <= 0) return;
      g.save(); g.globalAlpha = k; g.strokeStyle = tint; g.fillStyle = tint; g.shadowColor = tint; g.shadowBlur = 12 * dpr; g.lineWidth = 1.5 * dpr;
      for (let j = 0; j < 2; j++) {
        const r = S * (.62 + j * .1), rot = t * (j ? -.0009 : .0006);
        for (let i = 0; i < 12; i++) { const a = rot + i * Math.PI / 6; g.beginPath(); g.arc(x, y, r, a, a + Math.PI / 12); g.stroke(); }
      }
      g.globalAlpha = k * .45; g.beginPath(); g.moveTo(0, y); g.lineTo(x - S * .78, y); g.moveTo(x + S * .78, y); g.lineTo(W, y);
      g.moveTo(x, 0); g.lineTo(x, y - S * .78); g.moveTo(x, y + S * .78); g.lineTo(x, H); g.stroke();
      g.globalAlpha = k;
      const b = S * lerp(1.15, .62, easeInOut(close)); brackets(x - b, y - b, b * 2, b * 2, 24 * dpr, k, close >= 1 ? '#ffffff' : tint, 2.5);
      g.setTransform(1, 0, 0, 1, 0, 0); g.font = `${11 * dpr}px Silkscreen, monospace`; g.textAlign = 'left'; g.shadowBlur = 0;
      g.fillText(close >= 1 ? 'QUARANTINED' : `TARGET LOCK ${Math.round(close * 100)}%`, x + b + 8 * dpr, y - b + 10 * dpr);
      g.fillText(`THREAT 0x${byte(1, 7)}${byte(2, 3)}`, x + b + 8 * dpr, y - b + 26 * dpr);
      g.restore();
    }
    // 정화 파동: 화면 위에서 아래로 쓸고 지나가는 밝은 띠
    function purgeSweep(k, period) {
      if (k <= 0) return;
      const q = (t % period) / period, y = q * (H + 120 * dpr) - 60 * dpr;
      g.save(); g.globalCompositeOperation = 'lighter';
      const gr = g.createLinearGradient(0, y - 90 * dpr, 0, y);
      gr.addColorStop(0, tint + '00'); gr.addColorStop(1, tint + '66');
      g.globalAlpha = k; g.fillStyle = gr; g.fillRect(0, y - 90 * dpr, W, 90 * dpr);
      g.fillStyle = '#ffffff'; g.shadowColor = tint; g.shadowBlur = 20 * dpr; g.fillRect(0, y - 1.5 * dpr, W, 3 * dpr);
      g.shadowBlur = 0; g.font = `${10 * dpr}px Silkscreen, monospace`; g.textAlign = 'right'; g.fillText(`PURGE ${Math.round(q * 100)}%`, W - 20 * dpr, y - 6 * dpr);
      g.restore();
    }
    // 육각 방화벽 돔: 칸이 하나씩 켜지며 구체를 감싸요 (가장자리일수록 밝게)
    function firewall(x, y, R, k, lock) {
      if (k <= 0 || R <= 4) return;
      const c = R / 6.5, hw = c * Math.sqrt(3);
      g.save(); g.globalCompositeOperation = 'lighter'; g.lineWidth = 1.3 * dpr; g.strokeStyle = tint;
      for (let row = -8; row <= 8; row++) for (let col = -8; col <= 8; col++) {
        const px = x + (col + (row & 1) * .5) * hw, py = y + row * c * 1.5, d = Math.hypot(px - x, py - y) / R;
        if (d > .98) continue;
        const h = rndS(row * 31 + col, 21); if (h > lock) continue;
        const fresh = clamp(1 - (lock - h) * 6), edge = .25 + .75 * d * d;
        g.globalAlpha = k * (edge * .55 + fresh * .6); hexPath(px, py, c * .92, Math.PI / 6); g.stroke();
        if (fresh > 0) { g.globalAlpha = k * fresh * .35; g.fillStyle = '#ffffff'; g.fill(); }
      }
      g.globalAlpha = k * .8; g.shadowColor = tint; g.shadowBlur = 24 * dpr; g.lineWidth = 2.5 * dpr; g.beginPath(); g.arc(x, y, R, 0, Math.PI * 2); g.stroke();
      g.restore();
    }
    // 십자 항체: 화면 가장자리에서 구체로 날아와 꽂혀요
    function antibodies(x, y, R, k, n) {
      if (k <= 0) return;
      const far = Math.max(W, H) * .75;
      g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
      for (let i = 0; i < n; i++) {
        const q = (t * (.00035 + rndS(i, 22) * .0003) + rndS(i, 23)) % 1, a = rndS(i, 24) * Math.PI * 2 + Math.floor(t * .00035 + rndS(i, 23)) * 1.7;
        const d = lerp(far, R, easeIn(q)), px = x + Math.cos(a) * d, py = y + Math.sin(a) * d, s = (5 + rndS(i, 25) * 6) * dpr;
        const td2 = lerp(far, R, easeIn(Math.max(0, q - .08)));
        g.globalAlpha = k * .35; g.strokeStyle = tint; g.lineWidth = 1.5 * dpr;
        g.beginPath(); g.moveTo(x + Math.cos(a) * td2, y + Math.sin(a) * td2); g.lineTo(px, py); g.stroke();
        g.globalAlpha = k; g.strokeStyle = i % 3 ? '#ffffff' : tint2; g.lineWidth = 2.6 * dpr;
        g.beginPath(); g.moveTo(px - s, py); g.lineTo(px + s, py); g.moveTo(px, py - s); g.lineTo(px, py + s); g.stroke();
        if (q > .94) ring(px, py, s * (1 + (q - .94) * 40), k * (1 - q) * 12, 1.5, '#ffffff');
      }
      g.restore();
    }
    // 방패 문장: 결과 화면 뒤에 떠오르는 커다란 방패와 십자
    function shieldEmblem(x, y, r, k, rot) {
      if (k <= 0) return;
      g.save(); g.globalAlpha = clamp(k); g.strokeStyle = tint; g.shadowColor = tint; g.shadowBlur = 26 * dpr;
      const path = s => { g.beginPath(); g.moveTo(x, y - r * s); g.quadraticCurveTo(x + r * .55 * s, y - r * .82 * s, x + r * .78 * s, y - r * .78 * s);
        g.quadraticCurveTo(x + r * .8 * s, y + r * .25 * s, x, y + r * s); g.quadraticCurveTo(x - r * .8 * s, y + r * .25 * s, x - r * .78 * s, y - r * .78 * s);
        g.quadraticCurveTo(x - r * .55 * s, y - r * .82 * s, x, y - r * s); g.closePath(); };
      // 뒤에서 비치는 후광, 방패 양옆으로 펼쳐지는 빛의 날개
      const aura = g.createRadialGradient(x, y, r * .2, x, y, r * 1.9); aura.addColorStop(0, `rgba(${FLASH},.32)`); aura.addColorStop(.5, tint2 + '22'); aura.addColorStop(1, tint2 + '00');
      g.save(); g.globalCompositeOperation = 'lighter'; g.shadowBlur = 0; g.fillStyle = aura; g.beginPath(); g.arc(x, y, r * 1.9, 0, Math.PI * 2); g.fill();   // 후광 · 날개는 이미 부드러운 그라데이션이라 흐림 처리 없이
      for (const sd of [-1, 1]) for (let i = 0; i < 6; i++) {
        const a = (-.35 - i * .2) * Math.PI, L = r * (1.35 - i * .1), fx = x + sd * r * .55, fy = y - r * .35;
        const ex = fx + sd * Math.cos(a + Math.PI) * -L * .9, ey = fy + Math.sin(a) * L * .55 + i * r * .12;
        const fg = g.createLinearGradient(fx, fy, ex, ey); fg.addColorStop(0, '#ffffff'); fg.addColorStop(1, tint2 + '00');
        g.strokeStyle = fg; g.lineWidth = r * (.13 - i * .012); g.lineCap = 'round'; g.globalAlpha = clamp(k) * (.55 - i * .05);
        g.beginPath(); g.moveTo(fx, fy); g.quadraticCurveTo((fx + ex) / 2, fy - r * .25, ex, ey); g.stroke();
      }
      g.restore();
      const sg = g.createLinearGradient(0, y - r, 0, y + r); sg.addColorStop(0, tint2 + '3a'); sg.addColorStop(1, tint + '08');
      g.strokeStyle = tint2; g.shadowColor = tint2;
      path(1); g.fillStyle = sg; g.fill(); g.lineWidth = 3 * dpr; g.stroke();
      g.strokeStyle = '#ffffff'; path(.9); g.lineWidth = 1.2 * dpr; g.stroke();
      g.strokeStyle = tint2; g.lineWidth = r * .07; g.globalAlpha = clamp(k) * .55; g.beginPath(); g.moveTo(x, y - r * .7); g.lineTo(x, y + r * .7); g.moveTo(x - r * .5, y - r * .2); g.lineTo(x + r * .5, y - r * .2); g.stroke();
      g.restore();
      sacredCircle(x, y, r * 1.25, k * .5, rot);
      g.save(); g.globalAlpha = k * .8;
      const tx = 'VACCINE · SANCTUM AEGIS · ';
      glyphRing(glyphs('VACINESTUMGO·', Math.round(10 * dpr), tint2), tx, 48, x, y, r * 1.35, -rot, Math.PI / 24, 1);
      g.restore();
    }

    /* ---------- 속성 효과 (I: 세기 0.1 ~ 1.5 — 단계가 오를수록 수 · 크기 · 범위가 함께 커져요) ---------- */
    const glowCache = {};
    function glowDot(col) {
      if (glowCache[col]) return glowCache[col];
      const c = document.createElement('canvas'); c.width = c.height = 64; const q = c.getContext('2d');
      const gr = q.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, '#ffffff'); gr.addColorStop(.28, col); gr.addColorStop(1, col + '00');
      q.fillStyle = gr; q.fillRect(0, 0, 64, 64); return (glowCache[col] = c);
    }
    function zig(x1, y1, x2, y2, jit, segs) {
      g.moveTo(x1, y1);
      for (let i = 1; i < segs; i++) { const q = i / segs; g.lineTo(lerp(x1, x2, q) + (Math.random() - .5) * jit, lerp(y1, y2, q) + (Math.random() - .5) * jit); }
      g.lineTo(x2, y2);
    }
    function elemFx(x, y, S, by, k, I) {
      if (!ELD || k <= 0 || I <= 0) return;
      const c1 = ELD.col, c2 = ELD.col2, N = Math.round(8 + 150 * I * I), spread = Math.min(W * 1.1, S * (.5 + 1.7 * I));
      g.save(); g.globalCompositeOperation = 'lighter';
      if (EL === 'fire') {
        const hgt = S * (.45 + 1.7 * I);
        for (let i = 0; i < N; i++) {
          const q = (t * (.0004 + rndS(i, 31) * .0005) + rndS(i, 32)) % 1;
          let bx = x + (rndS(i, 33) - .5) * spread * (1 - q * .45), byy = by;
          if (I > .45 && i % 3 === 0) { const a = rndS(i, 34) * Math.PI * 2; bx = x + Math.cos(a) * S * .75; byy = by + Math.sin(a) * S * .14; }
          const px = bx + Math.sin(t / 260 + i) * S * .03 * (1 + q), py = byy - q * hgt * (.5 + rndS(i, 35) * .6), s = S * (.06 + .13 * I) * (1 - q * .8) * (.6 + rndS(i, 36) * .8);
          g.globalAlpha = k * (1 - q) * .85; g.drawImage(glowDot(q < .3 ? c2 : q < .65 ? c1 : '#ef4444'), px - s, py - s, s * 2, s * 2);
        }
        g.fillStyle = c2;
        for (let i = 0; i < 6 + 70 * I; i++) { const q = (t * .00025 + rndS(i, 37)) % 1, px = x + (rndS(i, 38) - .5) * spread * 1.2 + Math.sin(t / 400 + i) * 20 * dpr, py = by - q * hgt * 1.5; g.globalAlpha = k * (1 - q); g.fillRect(px, py, 2.5 * dpr, 2.5 * dpr); }
        if (I > .3) { const hg = g.createLinearGradient(0, H, 0, H * (1 - .35 * I)); hg.addColorStop(0, c1 + '88'); hg.addColorStop(1, c1 + '00'); g.globalAlpha = k * Math.min(1, I) * .7; g.fillStyle = hg; g.fillRect(0, H * (1 - .35 * I), W, H * .35 * I + 2); }
      } else if (EL === 'water') {
        const nr = 2 + Math.round(6 * I);
        g.strokeStyle = c1; g.shadowColor = c1; g.shadowBlur = 12 * dpr;
        for (let j = 0; j < nr; j++) { const q = (t * .00035 + j / nr) % 1, rx = S * (.25 + q * (.7 + 1.8 * I)); g.globalAlpha = k * (1 - q) * .8; g.lineWidth = (1 + 2.5 * I) * dpr * (1 - q * .6); g.beginPath(); g.ellipse(x, by, rx, rx * .2, 0, 0, Math.PI * 2); g.stroke(); }
        g.shadowBlur = 0; g.lineWidth = 1.2 * dpr;
        for (let i = 0; i < N; i++) {
          const q = (t * (.00018 + rndS(i, 41) * .0002) + rndS(i, 42)) % 1, px = x + (rndS(i, 43) - .5) * spread * 1.3 + Math.sin(t / 500 + i) * 10 * dpr, py = lerp(by + S * .2, by - S * (.6 + 1.6 * I), q), r = (2 + rndS(i, 44) * 5) * dpr * (.7 + I);
          g.globalAlpha = k * (1 - q) * .8; g.strokeStyle = c2; g.beginPath(); g.arc(px, py, r, 0, Math.PI * 2); g.stroke();
          g.fillStyle = '#ffffff'; g.fillRect(px - r * .4, py - r * .5, 1.5 * dpr, 1.5 * dpr);
        }
        if (I > .3) for (let w = 0; w < 2; w++) {
          const amp = S * .05 * I * (1 + w), top = H - H * (.06 + .2 * I) * (1 - w * .3);
          g.globalAlpha = k * (.22 + .12 * w); g.fillStyle = w ? c2 + '55' : c1 + '66'; g.beginPath(); g.moveTo(0, H);
          for (let px = 0; px <= W; px += 12 * dpr) g.lineTo(px, top + Math.sin(px / (60 * dpr) + t / (500 - w * 150) + w * 2) * amp);
          g.lineTo(W, H); g.closePath(); g.fill();
        }
      } else if (EL === 'ice') {
        g.strokeStyle = c2; g.lineWidth = 1.3 * dpr;
        for (let i = 0; i < N; i++) {
          const q = (t * (.00008 + rndS(i, 51) * .0001) + rndS(i, 52)) % 1, px = x + (rndS(i, 53) - .5) * Math.min(W, spread * 1.6) + Math.sin(t / 900 + i) * 16 * dpr, py = q * H, r = (3 + rndS(i, 54) * 6) * dpr * (.7 + I * .6), rot = t * .001 + i;
          g.globalAlpha = k * .85; g.beginPath(); for (let a = 0; a < 3; a++) { const an = rot + a * Math.PI / 3; g.moveTo(px - Math.cos(an) * r, py - Math.sin(an) * r); g.lineTo(px + Math.cos(an) * r, py + Math.sin(an) * r); } g.stroke();
        }
        const ns = 3 + Math.round(18 * I);
        for (let i = 0; i < ns; i++) {
          const a = Math.PI + (i + .5) / ns * Math.PI, bx = x + Math.cos(a) * S * (.45 + .3 * rndS(i, 55)), byy = by + Math.abs(Math.sin(a)) * S * .05, L = S * (.12 + .55 * I) * (.5 + rndS(i, 56)), ang = -Math.PI / 2 + Math.cos(a) * .7, wd = L * .16;
          const sg = g.createLinearGradient(bx, byy, bx + Math.cos(ang) * L, byy + Math.sin(ang) * L); sg.addColorStop(0, c1 + 'aa'); sg.addColorStop(1, '#ffffff');
          g.globalAlpha = k * .75; g.fillStyle = sg; g.beginPath(); g.moveTo(bx - Math.sin(ang) * wd, byy + Math.cos(ang) * wd); g.lineTo(bx + Math.cos(ang) * L, byy + Math.sin(ang) * L); g.lineTo(bx + Math.sin(ang) * wd, byy - Math.cos(ang) * wd); g.closePath(); g.fill();
        }
        g.globalCompositeOperation = 'source-over';
        const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .3, W / 2, H / 2, Math.max(W, H) * .75); vg.addColorStop(0, c2 + '00'); vg.addColorStop(1, c2 + '99');
        g.globalAlpha = k * Math.min(1, I) * .6; g.fillStyle = vg; g.fillRect(0, 0, W, H);
      } else if (EL === 'thunder') {
        g.strokeStyle = '#ffffff'; g.shadowColor = c1; g.shadowBlur = 18 * dpr; g.lineJoin = 'round';
        const na = 2 + Math.round(10 * I);
        for (let i = 0; i < na; i++) { if (Math.random() > .5) continue; const a = Math.random() * Math.PI * 2, b2 = a + (Math.random() - .5) * 1.6, r = S * .5;
          g.globalAlpha = k * (.5 + Math.random() * .5); g.lineWidth = (1 + 1.5 * I) * dpr; g.beginPath(); zig(x + Math.cos(a) * r, y + Math.sin(a) * r, x + Math.cos(b2) * r * 1.15, y + Math.sin(b2) * r * 1.15, S * .12, 6); g.stroke(); }
        if (I > .2 && Math.random() < .03 + .3 * I) {
          const tx = x + (Math.random() - .5) * spread, ty = y + (Math.random() - .3) * S * .4;
          g.globalAlpha = k; g.lineWidth = (2 + 4 * I) * dpr; g.beginPath(); zig(tx + (Math.random() - .5) * W * .3, -10, tx, ty, S * .25, 12); g.stroke();
          g.globalAlpha = k * .5; g.lineWidth = 1.5 * dpr; g.beginPath(); zig(tx, ty * .5, tx + (Math.random() - .5) * S, ty * .8, S * .15, 6); g.stroke();
          g.globalCompositeOperation = 'source-over'; g.shadowBlur = 0; g.globalAlpha = k * .12 * I; g.fillStyle = c2; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'lighter';
        }
        g.shadowBlur = 0; g.fillStyle = c2;
        for (let i = 0; i < N * .5; i++) { const q = (t * .002 + rndS(i, 61)) % 1, a = rndS(i, 62) * Math.PI * 2, d = S * (.35 + q * (.4 + I)); g.globalAlpha = k * (1 - q); g.fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d, 2 * dpr, 2 * dpr); }
      } else if (EL === 'plant') {
        for (let i = 0; i < N; i++) {
          const r = S * (.45 + rndS(i, 71) * (.4 + 1.1 * I)), a = rndS(i, 72) * Math.PI * 2 + t * (.0004 + rndS(i, 73) * .0006) * (i % 2 ? 1 : -1);
          const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r * .5 + Math.sin(t / 700 + i) * 8 * dpr, L = (5 + rndS(i, 74) * 7) * dpr * (.8 + I * .7);
          g.save(); g.translate(px, py); g.rotate(a + t * .002); g.globalAlpha = k * .9; g.fillStyle = i % 4 === 0 ? c2 : i % 3 ? c1 : '#22c55e';
          g.beginPath(); g.ellipse(0, 0, L, L * .42, 0, 0, Math.PI * 2); g.fill(); g.restore();
        }
        if (I > .25) {
          const nv = 2 + Math.round(6 * I);
          g.strokeStyle = '#22c55e'; g.lineWidth = (2 + 3 * I) * dpr; g.lineCap = 'round';
          for (let v = 0; v < nv; v++) {
            const sx = (v % 2 ? W : 0) + (v % 2 ? -1 : 1) * rndS(v, 75) * W * .1, sy = H, ex = lerp(sx, x, .55 + .2 * rndS(v, 76)), ey = lerp(H, by - S * .2, .4 + .4 * rndS(v, 77)), grow = Math.min(1, k * 1.2);
            g.globalAlpha = k * .8; g.beginPath(); g.moveTo(sx, sy);
            for (let s = 1; s <= 20 * grow; s++) { const q = s / 20; g.lineTo(lerp(sx, ex, q) + Math.sin(q * 9 + v) * 30 * dpr, lerp(sy, ey, q)); }
            g.stroke();
          }
        }
      } else if (EL === 'wind') {
        g.lineCap = 'round';
        for (let i = 0; i < N * .6; i++) {
          const r = S * (.35 + rndS(i, 81) * (.5 + 1.5 * I)), a = rndS(i, 82) * Math.PI * 2 + t * (.002 + rndS(i, 83) * .002), len = .4 + rndS(i, 84) * .8, sq = .35 + rndS(i, 85) * .3, oy = (rndS(i, 86) - .5) * S * .8;
          g.globalAlpha = k * (.35 + .5 * rndS(i, 87)); g.strokeStyle = i % 3 ? c1 : '#ffffff'; g.lineWidth = (1 + 2.5 * rndS(i, 88)) * dpr * (.8 + I * .5);
          g.beginPath(); g.ellipse(x, y + oy, r, r * sq, 0, a, a + len); g.stroke();
        }
        if (I > .3) for (let i = 0; i < 10 + 30 * I; i++) { const q = (t * (.001 + rndS(i, 89) * .0015) + rndS(i, 90)) % 1, py = rndS(i, 91) * H, L = W * (.05 + .2 * rndS(i, 92)); g.globalAlpha = k * .4 * Math.sin(q * Math.PI); g.fillStyle = c2; g.fillRect(W - q * (W + L), py, L, 1.5 * dpr); }
      } else if (EL === 'earth') {
        g.globalCompositeOperation = 'source-over';
        for (let i = 0; i < 5 + 70 * I * I; i++) {
          const q = (t * (.00012 + rndS(i, 101) * .00015) + rndS(i, 102)) % 1, px = x + (rndS(i, 103) - .5) * spread * 1.3, py = by - q * S * (.6 + 1.6 * I), s = S * (.02 + .05 * rndS(i, 104)) * (.6 + I);
          g.save(); g.translate(px, py); g.rotate(t * .001 * (rndS(i, 105) - .5) * 3 + i); g.globalAlpha = k * Math.sin(q * Math.PI) * .95; g.fillStyle = i % 3 ? '#8b5e34' : '#b07d4a'; g.strokeStyle = c1; g.lineWidth = 1 * dpr;
          g.beginPath(); for (let v = 0; v < 6; v++) { const a = v / 6 * Math.PI * 2, rr = s * (.7 + .3 * rndS(i * 7 + v, 106)); g[v ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); g.fill(); g.stroke(); g.restore();
        }
        g.globalCompositeOperation = 'lighter'; g.strokeStyle = c2; g.shadowColor = c2; g.shadowBlur = 14 * dpr; g.lineWidth = (1.5 + 2 * I) * dpr;
        const nc = 3 + Math.round(12 * I);
        for (let i = 0; i < nc; i++) {
          const a = (i / nc) * Math.PI * 2, L = S * (.3 + 1.3 * I) * (.6 + .4 * rndS(i, 107)); let px = x, py = by;
          g.globalAlpha = k * (.6 + .4 * Math.sin(t / 200 + i)); g.beginPath(); g.moveTo(px, py);
          for (let s = 1; s <= 6; s++) { const d = L * s / 6, j = (rndS(i * 9 + s, 108) - .5) * L * .25; px = x + Math.cos(a) * d - Math.sin(a) * j; py = by + (Math.sin(a) * d + Math.cos(a) * j) * .25; g.lineTo(px, py); }
          g.stroke();
        }
      } else if (EL === 'light') {
        // 빛: 부드러운 빛무리와 위에서 내려오는 빛기둥 (방사형 줄기는 쓰지 않아요)
        const len = S * (.8 + 2.2 * I), np = 2 + Math.round(6 * I);
        const rg2 = g.createRadialGradient(x, y, 0, x, y, len * .7); rg2.addColorStop(0, '#ffffff'); rg2.addColorStop(.3, c1 + '66'); rg2.addColorStop(1, c1 + '00');
        g.globalAlpha = k * .5; g.fillStyle = rg2; g.beginPath(); g.arc(x, y, len * .7, 0, Math.PI * 2); g.fill();
        for (let i = 0; i < np; i++) {
          const px = x + (rndS(i, 115) - .5) * spread * 1.2 + Math.sin(t / 1400 + i) * 12 * dpr, w2 = S * (.04 + .08 * rndS(i, 116)) * (.7 + I);
          const pg = g.createLinearGradient(0, 0, 0, by); pg.addColorStop(0, '#ffffff00'); pg.addColorStop(.4, c1 + '55'); pg.addColorStop(1, c1 + '00');
          g.globalAlpha = k * (.4 + .3 * Math.sin(t / 600 + i * 2)); g.fillStyle = pg; g.fillRect(px - w2 / 2, 0, w2, by);
        }
        for (let i = 0; i < N; i++) { const q = (t * (.00015 + rndS(i, 111) * .0002) + rndS(i, 112)) % 1, px = x + (rndS(i, 113) - .5) * spread * 1.3, py = lerp(by, by - S * (.8 + 1.4 * I), q), s = (6 + rndS(i, 114) * 10) * dpr * (.7 + I * .6);
          g.globalAlpha = k * Math.sin(q * Math.PI); g.drawImage(glowDot(i % 2 ? c1 : '#fff7d6'), px - s, py - s, s * 2, s * 2); }
        for (let j = 0; j < 1 + Math.round(2 * I); j++) { const q = (t * .0003 + j / 3) % 1; ring(x, y, S * (.4 + q * (1 + I)), k * (1 - q) * .6, 2, c1); }
      } else if (EL === 'dark') {
        g.globalCompositeOperation = 'source-over';
        const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .25, W / 2, H / 2, Math.max(W, H) * .75); vg.addColorStop(0, '#00000000'); vg.addColorStop(1, '#0a0012');
        g.globalAlpha = k * Math.min(1, I) * .75; g.fillStyle = vg; g.fillRect(0, 0, W, H);
        for (let i = 0; i < N; i++) {
          const q = (t * (.00015 + rndS(i, 121) * .0002) + rndS(i, 122)) % 1, a = rndS(i, 123) * Math.PI * 2, d = S * (.3 + q * (.5 + 1.4 * I)), px = x + Math.cos(a) * d, py = y + Math.sin(a) * d * .7 - q * S * .5, s = S * (.06 + .12 * I) * (.5 + q);
          g.globalAlpha = k * (1 - q) * .55; g.drawImage(glowDot('#1a0526'), px - s, py - s, s * 2, s * 2);
        }
        g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < N * .4; i++) { const q = (t * .0003 + rndS(i, 124)) % 1, px = x + (rndS(i, 125) - .5) * spread, py = by - q * S * (.5 + 1.2 * I), s = (4 + rndS(i, 126) * 6) * dpr; g.globalAlpha = k * (1 - q) * .8; g.drawImage(glowDot(i % 4 ? c1 : c2), px - s, py - s, s * 2, s * 2); }
      } else if (EL === 'metal') {
        const ng = 1 + Math.round(4 * I);
        g.strokeStyle = c1; g.shadowColor = c1; g.shadowBlur = 10 * dpr; g.lineWidth = 2 * dpr;
        for (let i = 0; i < ng; i++) {
          const a = i / ng * Math.PI * 2 + .6, d = S * (.55 + .25 * I), gx = x + Math.cos(a) * d, gy = y + Math.sin(a) * d * .8, gr2 = S * (.1 + .12 * I) * (.7 + .5 * rndS(i, 131)), rot = t * .0008 * (i % 2 ? 1 : -1), teeth = 10;
          g.globalAlpha = k * .55; g.beginPath();
          for (let s = 0; s <= teeth * 2; s++) { const an = rot + s / (teeth * 2) * Math.PI * 2, rr = s % 2 ? gr2 : gr2 * 1.18; g.lineTo(gx + Math.cos(an) * rr, gy + Math.sin(an) * rr); }
          g.closePath(); g.stroke(); g.beginPath(); g.arc(gx, gy, gr2 * .35, 0, Math.PI * 2); g.stroke();
        }
        g.shadowBlur = 0; const nt = 6 + Math.round(40 * I);
        for (let i = 0; i < nt; i++) {
          let px = x, py = y, dir = (rndS(i, 132) * 4) | 0; const segs = 5, segL = S * (.12 + .25 * I), pts2 = [[px, py]];
          for (let s = 0; s < segs; s++) { if (s) dir = (dir + (rndS(i * 11 + s, 133) < .5 ? 1 : 3)) % 4; px += [1, 0, -1, 0][dir] * segL * (.5 + rndS(i * 5 + s, 134)); py += [0, 1, 0, -1][dir] * segL * (.5 + rndS(i * 5 + s, 135)); pts2.push([px, py]); }
          g.globalAlpha = k * .3; g.strokeStyle = c1; g.lineWidth = 1 * dpr; g.beginPath(); pts2.forEach(([a2, b2], j) => g[j ? 'lineTo' : 'moveTo'](a2, b2)); g.stroke();
          const q = (t * .0006 + rndS(i, 136)) % 1, f = q * segs, j2 = Math.min(segs - 1, f | 0), u = f - j2;
          const hx = lerp(pts2[j2][0], pts2[j2 + 1][0], u), hy = lerp(pts2[j2][1], pts2[j2 + 1][1], u);
          g.globalAlpha = k; g.drawImage(glowDot(c2), hx - 5 * dpr, hy - 5 * dpr, 10 * dpr, 10 * dpr);
        }
      }
      g.restore();
    }

    /* ---------- 오버플로 (특별 진화): 오류 창이 쏟아지고, 화면 색이 뒤집혀요 ---------- */
    function overflowFx(k) {
      if (k <= 0) return;
      const n = Math.min(16, Math.floor(k * 18));
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
      for (let i = 0; i < n; i++) {
        const bw = Math.min(W * .42, 260 * dpr), bh = 74 * dpr, px = rndS(i, 141) * (W - bw), py = rndS(i, 142) * (H - bh);
        g.globalAlpha = .92; g.fillStyle = '#0b0f1a'; g.fillRect(px, py, bw, bh);
        g.fillStyle = i % 2 ? '#e11d48' : '#1d4ed8'; g.fillRect(px, py, bw, 16 * dpr);
        g.strokeStyle = '#94a3b8'; g.lineWidth = 1 * dpr; g.strokeRect(px, py, bw, bh);
        g.fillStyle = '#ffffff'; g.font = `${9 * dpr}px Silkscreen, monospace`; g.textAlign = 'left';
        g.fillText(['SYSTEM ERROR', 'FATAL EXCEPTION', 'STACK OVERFLOW', 'MEMORY FAULT'][i % 4], px + 6 * dpr, py + 11 * dpr); g.fillText('×', px + bw - 12 * dpr, py + 11 * dpr);
        g.fillStyle = '#fca5a5'; g.fillText('INTEGER OVERFLOW', px + 8 * dpr, py + 34 * dpr);
        g.fillStyle = '#cbd5e1'; g.fillText(`×1024 LIMIT EXCEEDED @${ADDR}`, px + 8 * dpr, py + 50 * dpr);
        g.fillText(`CODE 0x${byte(i, 1)}${byte(i, 2)}${byte(i, 3)}${byte(i, 4)}`, px + 8 * dpr, py + 64 * dpr);
      }
      g.restore();
      if (Math.random() < .08 * k) { g.save(); g.globalCompositeOperation = 'difference'; g.fillStyle = '#ffffff'; g.fillRect(-60, -60, W + 120, H + 120); g.restore(); }
      g.save(); g.globalAlpha = k * .25; g.fillStyle = '#ff1744';
      for (let y = (t / 6) % (6 * dpr); y < H; y += 6 * dpr) g.fillRect(0, y, W, 1 * dpr);
      g.restore();
    }

    /* ---------- 타락 (fall): 친구가 데이터 조각으로 흩어지고, 슬픔이 몸을 검게 물들여요 ---------- */
    function fallPrologue(cx, cy, S) {
      if (!fall || t >= PRE + 600) return;
      const out = 1 - prog(t, PRE - 500, PRE + 500), friendName = fall.friend || '';
      const fx = cx + S * .62, ax = lerp(cx - S * .45, cx, easeInOut(prog(t, 3800, 6600))), fy = cy;
      // 친구: 처음엔 곁에 있다가 아래에서부터 데이터 조각으로 흩어져 사라져요
      const del = prog(t, 1400, 4200);
      sprite(F, fx, fy + Math.sin(t / 420) * 4 * dpr, S * .7, { a: out * (1 - prog(t, 4000, 4600)), white: .25 * del, glow: 18, clipTop: 1 - del });
      if (F && del > 0) {
        g.save(); g.globalCompositeOperation = 'lighter';
        const st = Math.max(1, Math.floor(F.pts.length / 400)), s7 = S * .7;
        for (let i = 0; i < F.pts.length; i += st) {
          const q = F.pts[i], lineY = .5 - del * 1.05; if (q.y < lineY) continue;
          const age = clamp((q.y - lineY) * 2.2), px = fx + q.x * s7 + Math.sin(i + t / 300) * age * 30 * dpr, py = fy + q.y * s7 - age * S * .9;
          g.globalAlpha = out * (1 - age) * .9; g.fillStyle = age < .3 ? q.c : '#94a3b8'; g.fillRect(px, py, 2.6 * dpr, 2.6 * dpr);
        }
        g.restore();
      }
      // 파트너: 점점 검게 물들고, 검은 촉수가 다가와요
      const dk = prog(t, 3800, PRE);
      drawTendrils(dk * .5, out);
      sprite(A, ax, cy + Math.sin(t / 380) * 5 * dpr, S, { a: out, glow: 20 });
      corrupt(A, ax, cy, S, .7 * dk, 1);
      if (dk > 0) { g.save(); g.globalAlpha = out * dk * .55; sprite(A, ax, cy, S, { black: true, a: out * dk * .55 }); g.restore(); }
      // 심장 박동처럼 붉게 맥동하는 테두리
      const beatK = Math.pow(Math.max(0, Math.sin(t / 260)), 8) * dk;
      if (beatK > 0) { const vg = g.createRadialGradient(cx, cy, Math.min(W, H) * .25, cx, cy, Math.max(W, H) * .7); vg.addColorStop(0, '#00000000'); vg.addColorStop(1, '#ff0033'); g.save(); g.globalAlpha = out * beatK * .6; g.fillStyle = vg; g.fillRect(-60, -60, W + 120, H + 120); g.restore(); }
      // 글자
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.textAlign = 'center';
      const lost = prog(t, 2000, 2600) * (1 - prog(t, 5400, 6000));
      if (lost > 0) { g.globalAlpha = out * lost; g.font = `${14 * dpr}px Silkscreen, monospace`; g.fillStyle = '#f87171'; g.shadowColor = '#f43f5e'; g.shadowBlur = 14 * dpr;
        g.fillText(`SIGNAL LOST · ${byte(3, 9)}${byte(5, 2)}`, fx, fy - S * .5); g.font = `${Math.min(26, W / dpr / 18) * dpr}px "Do Hyeon", sans-serif`; g.fillStyle = '#ffffff';
        g.fillText(`${friendName}의 신호가 끊어졌어요`, cx, cy + S * .78); }
      const sad = prog(t, 5600, 6200) * (1 - prog(t, PRE - 300, PRE + 200));
      if (sad > 0) { g.globalAlpha = out * sad; g.font = `${Math.min(26, W / dpr / 18) * dpr}px "Do Hyeon", sans-serif`; g.fillStyle = '#fda4af'; g.shadowColor = '#a855f7'; g.shadowBlur = 20 * dpr;
        g.fillText('슬픔이 마음을 검게 물들여요…', cx, cy + S * .78);
        g.font = `${12 * dpr}px Silkscreen, monospace`; g.fillStyle = '#f43f5e'; g.fillText(`CORRUPTION ${Math.round(dk * 100)}%`, cx, cy + S * .78 + 26 * dpr); }
      g.restore();
      glitch(out * dk * .7);
    }

    let frameEMA = 0, nFrames = 0, qualAt = 0;
    await new Promise(done => {
      function frame(now) {
        const raw = now - last, dt = Math.min(64, raw); last = now;
        // 화면이 계속 버벅이면(평균 24ms 넘게) 렌더 해상도를 한 단계씩 낮춰요. 창이 가려져 멈췄던 프레임은 세지 않아요
        if (raw > 0 && raw < 150) { frameEMA = frameEMA ? frameEMA * .92 + raw * .08 : raw; nFrames++; }
        if (nFrames > 40 && frameEMA > 24 && QUAL > .7 && now - qualAt > 1500) { QUAL = Math.max(.7, QUAL - .15); qualAt = now; nFrames = 20; }
        const sp = (speed() || 1) * (reduce ? 3 : 1);
        t += dt * sp;
        if (!alive() || t >= T.end) return done();
        size();
        const cx = W / 2, cy = H * .42, S = Math.min(W * .58, H * .44), M = Math.max(W, H);
        const fadeIn = prog(t, 0, BASE.in), enter = fall ? prog(t, PRE - 400, PRE + 400) : 1, fadeOut = 1 - prog(t, T.hold, T.end), A0 = fadeIn * fadeOut;

        // 박자: 흔들림 + 복제
        once('call', () => t >= T.call && shake(16, 320));
        T.amp.forEach((b, i) => { if (t >= b && beatsDone <= i) { beat(b, i); shake(i < T.nNormal ? 6 + i * 2.4 : 30 + (i - T.nNormal) * 4, i < T.nNormal ? 220 : 380); } });
        once('boom', () => { if (t >= T.boom) { shake(34, 900); burst = []; for (let i = 0; i < LVL.burst[LV]; i++) { const a = Math.random() * Math.PI * 2; burst.push({ a, v: (.5 + Math.random() * (1.4 + Math.max(0, LV - 2) * .4)) * dpr, s: (1.5 + Math.random() * 3) * dpr, life: 1 }); } } });
        once('slamFx', () => { if (t >= T.slam) shake(22, 600); });
        if (LV >= 6) once('boom2', () => { if (t >= T.boom + 380) { shake(30, 700); for (let i = 0; i < 260; i++) { const a = Math.random() * Math.PI * 2; burst.push({ a, v: (.8 + Math.random() * 2.6) * dpr, s: (2 + Math.random() * 3.5) * dpr, life: 1 }); } } });
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
        // 256가지 바이트를 미리 그린 그림판에서 잘라 붙여요 (글자를 매번 그리면 프레임마다 수백 번이라 무거워요)
        if (!rainAtlas || rainAtlas.dpr !== dpr || (!rainAtlas.ok && (t / 500 | 0) !== rainAtlas.tick)) rainAtlas = buildRain(rainAtlas);
        const RA = rainAtlas, tA = t / 90 | 0, tB = t / 140 | 0;
        for (const c of cols) {
          c.y += c.v * dt * rainFast * sp; if (c.y - c.n * 14 * dpr > H) c.y = -Math.random() * H * .3;
          const xi = c.x | 0, dx = c.x - RA.cw / 2;
          for (let k = 0; k < c.n; k++) {
            const yy = c.y - k * 14 * dpr; if (yy < -20 || yy > H + 20) continue;
            const al = (k === 0 ? .45 : .24 - k * .016) * A0 * rainA; if (al <= 0) continue;
            const hi = (k * 7 + xi + tA) % 16, lo = (k * 13 + xi * 3 + tB) % 16;
            g.globalAlpha = al;
            g.drawImage(RA.c, lo * RA.cw, ((k === 0 ? 0 : 16) + hi) * RA.ch, RA.cw, RA.ch, dx, yy - RA.base, RA.cw, RA.ch);
          }
        }
        g.globalAlpha = 1;

        // 테마 배경: 백신은 빛기둥과 깃털, 바이러스는 가장자리에서 자라는 촉수
        if (themeId === 'holy') {
          const hk = A0 * (prog(t, T.scan, T.scan + 800) * (1 - .6 * prog(t, T.implode, T.boom)) + .7 * prog(t, T.rebuild, T.rebuilt));
          lightShafts(hk); featherFall(hk * (.35 + .65 * Math.max(ampP, result)));
        }
        if (themeId === 'virus') drawTendrils(fall ? lerp(.5, 1, prog(t, T.scan, T.implode)) * enter : prog(t, T.scan, T.implode), A0 * (1 - .45 * prog(t, T.slam, T.slam + 1000)));
        infectK = themeId === 'virus' ? prog(t, T.scan, T.implode) : 0;
        // 백신: 하늘에서 내려오는 빛기둥과 빛의 깃털 (성스러운 기운) — 성스러운 무리보다 조금 은은하게
        if (themeId === 'vaccine') {
          const vh = A0 * (prog(t, T.scan, T.scan + 900) * .75 * (1 - .5 * prog(t, T.implode, T.boom)) + .65 * prog(t, T.rebuild, T.rebuilt));
          lightShafts(vh); featherFall(vh * (.3 + .6 * Math.max(ampP, result)));
        }
        if (themeId === 'vaccine') purgeSweep(A0 * prog(t, T.scan, T.scan + 400) * (1 - prog(t, T.disEnd, T.amp0)) * .8, 1300);
        fallPrologue(cx, cy, S);
        // 새 모습의 속성 기운이 시작부터 희미하게 비쳐요
        elemFx(cx, cy, S, cy + S * .5, A0 * enter * prog(t, T.call, T.scan) * (1 - prog(t, T.disEnd, T.amp0 + 1500)) * .5, EI * .3);
        // 네트워크 성좌 — 처음부터 끝까지 깔리고, 증폭 때는 모든 노드가 가운데로 데이터를 보내요
        network(A0 * (.3 + .7 * enter) * (.45 + .35 * ampP) * (1 - .6 * prog(t, T.implode, T.boom) * (1 - prog(t, T.boom, T.rebuilt))),
                ampP * (1 - prog(t, T.implode, T.boom)) + .5 * prog(t, T.rebuild, T.rebuilt) * (1 - prog(t, T.slam, T.slam + 900)), cx, cy, dt, sp);

        // 원근 격자 바닥 (스캔 ~ 증폭)
        const gridK = A0 * prog(t, T.scan, T.scan + 500) * (1 - prog(t, T.implode, T.boom));
        if (gridK > 0) {
          const y0 = cy + S * .55, scroll = (t / 1000) * (1 + ampP * 6);
          // 흐림 그림자 대신 굵고 옅은 선 + 가는 선을 겹쳐 빛나 보이게 해요 (세로선은 한 번에)
          g.save(); g.strokeStyle = tint;
          for (const [lw, la] of [[5, .22], [1, 1]]) {
            g.lineWidth = lw * dpr;
            for (let i = 0; i < 14; i++) { const f = ((i + scroll) % 14) / 14, y = y0 + (H - y0) * f * f; g.globalAlpha = gridK * .55 * f * la; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
            g.globalAlpha = gridK * .35 * la; g.beginPath();
            for (let i = -12; i <= 12; i++) { g.moveTo(cx + i * W * .012, y0); g.lineTo(cx + i * W * .2, H + 10); }
            g.stroke();
          }
          g.restore();
        }
        streaks((prog(t, T.call, T.call + 120) * (1 - prog(t, T.callOut - 300, T.callOut)) * .8
               + ampP * (1 - prog(t, T.implode, T.boom)) * .5
               + prog(t, T.boom, T.boom + 60) * (1 - prog(t, T.boom + 300, T.rebuild + 400)) * .9
               + prog(t, T.slam, T.slam + 60) * (1 - prog(t, T.slam + 200, T.slam + 700)) * .7) * A0);

        /* 1~3) 지금 모습 → 스캔 → 아래에서부터 입자로 분해 */
        if (t < T.disEnd + 200 && enter > 0) {
          const disLine = 1 - prog(t, T.dis + 100, T.disEnd);
          const bob = Math.sin(t / 380) * 6 * dpr;
          const white = (themeId === 'virus' ? .12 : .55) * prog(t, T.scan, T.scanEnd);
          if (partner) {
            const off = Math.min(W * .24, S * .85), s2 = S * .8;
            sprite(A, cx - off, cy + bob, s2, { a: fadeIn, white, glow: 24, clipTop: disLine });
            sprite(P, cx + off, cy - bob, s2, { a: fadeIn, white, glow: 24, clipTop: disLine });
          } else sprite(A, cx, cy + bob, S, { a: fadeIn * enter, white, glow: 24, clipTop: disLine });
          if (themeId === 'virus') corrupt(A, cx, cy + bob, S, Math.max(fall ? .7 : 0, .75 * easeIn(prog(t, T.scan, T.disEnd)) + .08 * prog(t, T.scan, T.scan + 300)), disLine);
          if (themeId === 'vaccine') {
            lockOn(cx, cy, partner ? S * 1.5 : S, A0 * prog(t, T.call, T.call + 600) * (1 - prog(t, T.disEnd - 600, T.disEnd + 200)), prog(t, T.call + 300, T.scanEnd));
            firewall(cx, cy, S * .68, A0 * prog(t, T.scanEnd - 400, T.scanEnd + 400) * (1 - prog(t, T.disEnd - 300, T.disEnd + 200)) * .7, prog(t, T.scanEnd - 400, T.dis + 1200));
            // 엔젤링이 위에서 내려와 머리 위에 자리 잡아요 (분해가 시작되면 위로 떠올라 사라져요)
            const ak = A0 * prog(t, T.call, T.call + 700) * (1 - prog(t, T.dis + 400, T.disEnd));
            const drop = (1 - easeOut(prog(t, T.call, T.call + 1100))) * -S * .5 - prog(t, T.dis, T.disEnd) * S * .4;
            if (partner) { const off = Math.min(W * .24, S * .85); angelRing(cx - off, cy + bob - S * .44 + drop, S * .15, ak); angelRing(cx + off, cy - bob - S * .44 + drop, S * .15, ak, 1); }
            else angelRing(cx, cy + bob - S * .55 + drop, S * .19, ak);
          }
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
        // 심장박동: 배수가 오를 때마다 쿵-쿵! 두 번 뛰고, 두 번째 박동이 숫자가 바뀌는 순간과 겹쳐요 (박자가 빨라질수록 촘촘해져요)
        let heart = 0;
        if (t < T.implode) for (let i = 0; i < T.amp.length; i++) {
          const b = T.amp[i], gap = Math.min(1100, i ? b - T.amp[i - 1] : 1100);
          // 쿵(약하게, 직전) — 쿵!(세게, 숫자가 바뀌는 바로 그 순간)
          [[.24, .65], [0, 1]].forEach(([off, amp], j) => {
            const p = b - gap * off, d = (t - p) / 65;
            if (d > -3 && d < 4) heart = Math.max(heart, amp * Math.exp(-d * d * (d < 0 ? 2.5 : 1)));
            if (!j && t >= p && t < b) once('hb' + i, () => shake(2 + i * .4, 140));
          });
        }
        heart *= A0;
        const Rbase = S * (.42 + 1.25 * easeIn(ampP)) * (1 + .09 * heart) * (1 + T.amp.reduce((m, b) => m + (t >= b ? .08 * Math.exp(-(t - b) / 140) : 0), 0));
        const implodeK = 1 - easeIn(prog(t, T.implode, T.boom));
        themeFrame(cx, cy, Math.max(S * .7, Rbase * 1.12) * implodeK, A0 * prog(t, T.dis, T.amp[0]) * (1 - prog(t, T.implode - 100, T.boom)), t * (.0003 + ampP * .0012));
        T.amp.forEach((b, i) => { const q = prog(t, b, b + 700); if (q > 0 && q < 1) { if (themeId === 'holy') ring(cx, cy, Rbase * (1 + q * 1.6), (1 - q) * A0, 4 - q * 3, i % 2 ? '#ffffff' : tint); else hexRing(cx, cy, Rbase * (1 + q * 1.6), (1 - q) * A0, 4 - q * 3, i * .3, i % 2 ? tint2 : tint); } });

        // 3단계부터: 구체에서 화면 끝으로 번개가 튀어요 (4단계는 더 자주, 더 굵게)
        if (LV >= 5) { const lk = A0 * ampP * (1 - prog(t, T.implode, T.boom)); if (lk > 0) lightning(cx, cy, Rbase, M, lk, LV >= 6 ? 4 : 2); }
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
              const k = easeInOut(prog(t, p.td, p.td + 1100));
              const hx = cx + (p.offX ? p.offX * Math.min(W * .24, S * .85) : 0) + p.ox * S * (partner ? .8 : 1);
              const hy = cy + p.oy * S * (partner ? .8 : 1);
              let sx = cx + vx, sy = cy + vy;
              if (themeId === 'jogress') {                 // 조그레스: 두 가닥 이중 나선 → 증폭 중반부터 구체로 합쳐져요
                const m = easeInOut(prog(t, T.amp0 + 600, lerp(T.amp0, T.implode, .55))), u = p.lat / 1.4, an = u * 4.2 + spin * .003 + (p.offX < 0 ? 0 : Math.PI);
                sx = lerp(cx + Math.cos(an) * S * .4 + (p.rr - .9) * S * .16 * Math.cos(p.a0), sx, m); sy = lerp(cy + u * S * .85 + (p.rr - .9) * S * .1 * Math.sin(p.a0), sy, m);
              }
              x = lerp(hx, sx, k); y = lerp(hy, sy, k) - Math.sin(k * Math.PI) * S * .25;
              col = k < .5 ? p.col : vortexCol(p, depth);
              al *= .55 + .45 * (depth + 1) / 2;
            } else {
              const ex = Math.cos(p.a0) * cl; let ey = Math.sin(p.lat) * .9 + Math.sin(p.a0) * .2;
              if (themeId === 'holy' || themeId === 'vaccine') ey = -.35 - Math.abs(ey) * 1.2;   // 성스러운 진화: 하늘로 흩어졌다가 위에서 내려와요
              const far = M * .7 * p.es * boomK;
              const bx = cx + ex * far, by = cy + ey * far;
              if (!rebuilding) { x = bx; y = by; col = themeId === 'free' ? p.hue : '#ffffff'; }
              else {
                const k = easeInOut(prog(t, T.rebuild + p.st * 1.4, T.rebuild + p.st * 1.4 + 1500));
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
        if (themeId === 'vaccine') {
          const vk = A0 * prog(t, T.amp0 - 600, T.amp0) * (1 - prog(t, T.implode, T.boom));
          firewall(cx, cy, Rbase * 1.15 * implodeK, vk, prog(t, T.amp0 - 600, T.implode - 600));
          antibodies(cx, cy, Rbase * implodeK, vk, Math.round(6 + 34 * ampP));
          // 구체 위의 커다란 엔젤링: 증폭될수록 커지고 박동마다 빛나며, 응축될 때 구체로 빨려 들어가요
          const rk = A0 * prog(t, T.amp0 - 800, T.amp0) * (1 - prog(t, T.implode + 300, T.boom));
          const rw = Rbase * implodeK * (.85 + .25 * ampP) * (1 + .1 * heart), ry = cy - Rbase * implodeK * (1.05 + .1 * ampP) * (1 - prog(t, T.implode, T.boom));
          angelRing(cx, ry, rw, rk * (.75 + .25 * heart));
          if (t >= T.implode && t < T.boom) { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = A0 * prog(t, T.implode, T.implode + 200); g.textAlign = 'center'; g.fillStyle = '#ffffff'; g.shadowColor = tint; g.shadowBlur = 20 * dpr; g.font = `${14 * dpr}px Silkscreen, monospace`; g.fillText('FIREWALL LOCKED · INTEGRITY 100%', cx, cy - S * .7); g.restore(); }
        }
        // 속성 효과: 증폭되는 구체 둘레에서 박자마다 거세져요
        const injK = prog(t, T.inject, T.inject + 500) * (1 - prog(t, T.implode, T.implode + 300));
        elemFx(cx, cy, Math.max(S * .7, Rbase), cy + Math.max(S * .7, Rbase) * .55, A0 * prog(t, T.amp0 - 400, T.amp0 + 600) * (1 - prog(t, T.implode, T.boom)) * (.75 + .25 * injK), EI * (.35 + .55 * ampP + .7 * injK));
        // 속성 주입: 증폭이 끝나면 새 모습의 속성이 구체에 스며들며 맥동해요 (속성이 없으면 안정화)
        if (injK > 0) {
          const ic = ELD ? ELD.col : tint, ip = ((t - T.inject) % 520) / 520;
          for (let j = 0; j < 2; j++) { const q = (ip + j * .5) % 1; ring(cx, cy, Rbase * implodeK * (1 + q * .9), A0 * injK * (1 - q) * .9, 3 + 5 * EI * (1 - q), ic); }
          g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = A0 * injK; g.textAlign = 'center'; g.fillStyle = '#ffffff'; g.shadowColor = ic; g.shadowBlur = 18 * dpr; g.font = `${14 * dpr}px Silkscreen, monospace`;
          const pct = Math.round(100 * prog(t, T.inject, T.implode - 200));
          g.fillText(ELD ? `ELEMENT INJECT · ${ELD.name} ${pct}%` : `STABILIZING ${pct}%`, cx, cy + Math.min(H * .4, Rbase * implodeK + 40 * dpr)); g.restore();
        }
        if (themeId === 'capsule') {
          capsuleOrbit(cx, cy, Rbase * 1.3 * implodeK, A0 * prog(t, T.dis, T.amp[0]) * (1 - prog(t, T.implode, T.boom)), t * .0012, S);
          capsuleShell(cx, cy, S, M, A0);
        }
        // ×2 ×4 … 증폭 배율
        const inOvf = OVER && t >= T.ovf0, ovfK = inOvf ? prog(t, T.ovf0, T.implode) * (1 - prog(t, T.boom, T.boom + 400)) : 0;
        const garbage = () => OVF_GARBAGE[(t / 70 | 0) % OVF_GARBAGE.length];
        const multTxt = !inOvf ? `×${mult}` : beatsDone >= T.amp.length && t > T.amp[T.amp.length - 1] + 500 ? garbage() : ovfTxt;
        if (t >= T.amp[0] - 200 && t < T.boom) {
          const bi = T.amp.filter(b => t >= b).length - 1, lastBeat = T.amp[bi];
          if (bi >= 0) {
            const q = prog(t, lastBeat, lastBeat + 520), after = inOvf && t > T.amp[T.amp.length - 1] + 500;
            g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = (after ? .9 : Math.max(1 - q, .3 + .6 * heart)) * A0; g.textAlign = 'center'; g.fillStyle = '#ffffff'; g.shadowColor = inOvf ? '#ff1744' : tint; g.shadowBlur = 30 * dpr;
            const fs = Math.round((inOvf ? 70 + 50 * easeOut(q) : 60 + 90 * easeOut(q)) * (1 + .16 * heart) * dpr);
            g.font = `${fs}px Silkscreen, monospace`;
            if (inOvf) {                                         // 넘쳐흐른 숫자: 색이 갈라지고 흔들려요
              const jx = 0, jy = 0;
              g.globalCompositeOperation = 'lighter'; g.shadowBlur = 0;
              g.fillStyle = '#ff1744'; g.fillText(multTxt, cx + jx - 6 * dpr, cy + 30 * dpr + jy);
              g.fillStyle = '#00e5ff'; g.fillText(multTxt, cx + jx + 6 * dpr, cy + 30 * dpr - jy);
              g.globalCompositeOperation = 'source-over'; g.fillStyle = '#ffffff'; g.fillText(multTxt, cx + jx, cy + 30 * dpr);
              if ((t / 180 | 0) % 2) { g.font = `${Math.min(46, W / dpr / 9) * dpr}px Silkscreen, monospace`; g.fillStyle = '#ff1744'; g.shadowColor = '#ff1744'; g.shadowBlur = 24 * dpr; g.fillText('OVERFLOW', cx, cy - S * .55); }
              g.font = `${12 * dpr}px Silkscreen, monospace`; g.fillStyle = '#fca5a5'; g.shadowBlur = 0;
              g.fillText(`${TH.mult} ${ADDR} → 0x${byte(1, t | 0)}${byte(2, t | 0)}${byte(3, t | 0)}${byte(4, t | 0)}  INT32 LIMIT EXCEEDED`, cx, cy + 62 * dpr + fs * .2);
            } else {
              g.fillText(multTxt, cx, cy + 30 * dpr);
              g.font = `${12 * dpr}px Silkscreen, monospace`; g.globalAlpha = (1 - q) * A0 * .9;
              g.fillText(`${TH.mult} ${ADDR} → ${'0x' + (hsh * mult >>> 0).toString(16).toUpperCase().padStart(8, '0').slice(-8)}`, cx, cy + 62 * dpr);
            }
            g.restore();
          }
        }
        // 심장박동에 맞춰 화면 가장자리가 맥동해요
        if (heart > .02) {
          const vg = g.createRadialGradient(cx, cy, Math.min(W, H) * (.3 - .05 * heart), cx, cy, Math.max(W, H) * .72);
          vg.addColorStop(0, tint + '00'); vg.addColorStop(1, inOvf ? '#ff1744' : tint);
          g.save(); g.globalAlpha = heart * .38; g.fillStyle = vg; g.fillRect(-60, -60, W + 120, H + 120); g.restore();
        }
        // 왼쪽 위 판독기
        if (t >= T.scan && t < T.rebuilt) {
          const capNow = mbFrom * Math.pow(mbTo / mbFrom, easeIn(prog(t, T.amp[0] - 300, T.boom)));
          const hA = A0 * prog(t, T.scan, T.scan + 400) * (1 - prog(t, T.rebuilt - 400, T.rebuilt));
          g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = hA; g.textAlign = 'left'; g.fillStyle = tint; g.shadowColor = tint; g.shadowBlur = 12 * dpr;
          const x0 = 22 * dpr; let y0 = 40 * dpr;
          g.font = `${11 * dpr}px Silkscreen, monospace`; g.fillText(`DIGITAL DATA AMPLIFIER · ${ADDR}`, x0, y0);
          g.fillStyle = '#ffffff'; g.font = `${26 * dpr}px Silkscreen, monospace`; y0 += 34 * dpr;
          const HW = TH.hud; g.fillText(t < T.dis ? HW[0] : t < T.amp[0] ? HW[1] : inOvf && t < T.boom ? 'OVERFLOW' : t < T.implode ? `${HW[2]} ${multTxt}` : t < T.boom ? HW[3] : HW[4], x0, y0);
          g.font = `${13 * dpr}px Silkscreen, monospace`; y0 += 26 * dpr; g.fillStyle = '#cbd5e1'; g.shadowBlur = 0;   // 작은 수치 줄은 번짐 없이 (글자마다 흐림 처리가 무거워요)
          g.fillText(`CAPACITY  ${inOvf && t < T.boom ? garbage().replace('×', '') + ' TB' : fmtMB(capNow)}`, x0, y0); y0 += 19 * dpr;
          g.fillText(`PACKETS   ${inOvf && t < T.boom ? (Math.random() < .5 ? '-2,147,483,648' : 'NaN') : (baseCount * mult).toLocaleString()}`, x0, y0); y0 += 19 * dpr;
          if (ELD) { g.fillStyle = ELD.col; g.fillText(`ELEMENT   ${ELD.name}`, x0, y0); y0 += 19 * dpr; g.fillStyle = '#cbd5e1'; }
          g.fillText(`ROUTES    ${Math.round(nodes.length * (1 + ampP * 3))}`, x0, y0); y0 += 19 * dpr;
          if (t >= T.amp0 - 1200 && t < T.boom) { g.fillStyle = heart > .3 ? '#ffffff' : '#fda4af'; g.fillText(`PULSE     ${heart > .3 ? '♥' : '♡'} ${Math.round(72 + 110 * ampP)} BPM`, x0, y0); y0 += 19 * dpr; g.fillStyle = '#cbd5e1'; }
          const syncP = Math.round(100 * prog(t, T.scan, T.rebuilt));
          g.fillText(`SYNC      ${syncP}%`, x0, y0); y0 += 12 * dpr;
          g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(x0, y0, 200 * dpr, 5 * dpr);
          g.fillStyle = tint; g.fillRect(x0, y0, 200 * dpr * syncP / 100, 5 * dpr);
          if (themeId === 'virus' && (t / 260 | 0) % 2) { g.font = `${13 * dpr}px Silkscreen, monospace`; g.fillStyle = '#ff4d6d'; g.fillText(`WARNING  CORRUPTION ${Math.round(infectK * 100)}%`, x0, y0 + 26 * dpr); }
          if (themeId === 'vaccine') { g.font = `${13 * dpr}px Silkscreen, monospace`; g.fillStyle = tint2; g.fillText(`SECURE   THREAT 0 · INTEGRITY ${Math.round(60 + 40 * prog(t, T.scan, T.implode))}%`, x0, y0 + 26 * dpr); }
          if (inOvf && (t / 140 | 0) % 2) { g.font = `${13 * dpr}px Silkscreen, monospace`; g.fillStyle = '#ff1744'; g.fillText('FATAL  INTEGER OVERFLOW · 0x80000000', x0, y0 + 46 * dpr); }
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
          for (let i = 0, nr = LVL.rings[LV]; i < nr; i++) {
            const q = prog(t, T.boom + i * 120, T.boom + 1100 + i * 120), r = M * .9 * easeOut(q), a = (1 - q) * .9 * fadeOut, w = Math.max(1.5, 7 - i * .8);
            if (i % 2) hexRing(cx, cy, r, a, w, i * .2, '#ffffff'); else ring(cx, cy, r, a, w, LV >= 6 ? `hsl(${(i * 52 + t * .2) % 360},95%,70%)` : tint);
          }
          // 백신: 터지는 순간 엔젤링이 겹겹이 퍼져 나가요
          if (themeId === 'vaccine') for (let i = 0; i < 3; i++) { const q = prog(t, T.boom + i * 180, T.boom + 1400 + i * 180); if (q > 0 && q < 1) angelRing(cx, cy - M * .05 * i, M * (.15 + .75 * easeOut(q)), (1 - q) * fadeOut, i); }
          if (ELD) for (let i = 0; i < 1 + Math.round(EI * 3); i++) { const q = prog(t, T.boom + 60 + i * 160, T.boom + 1600 + i * 160); if (q > 0 && q < 1) ring(cx, cy, M * (.2 + .9 * EI) * easeOut(q), (1 - q) * fadeOut, (3 + 8 * EI) * (1 - q), ELD.col); }
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
        const textY = cy - S * .12 * lift + sprS * .47;   // 이름 · 설명은 그림의 둥실거림을 따라가지 않아요
        if (t >= T.rebuild) {
          const dk = A0 * result;
          if (LV >= 5) godRays(cx, by, M * .75, dk * (LV >= 6 ? .26 : .17), t * (LV >= 6 ? .00018 : .0001), LV >= 6 ? 24 : 14);
          pillar(cx, footY, Math.min(W * .5, S * 1.1), dk * .8);
          disk(cx, footY, Math.min(W * .46, S * 1.5), dk, t * .0006);
          if (themeId === 'holy') sacredCircle(cx, by, sprS * .62, dk * .45, t * .00025);
          if (themeId === 'vaccine') shieldEmblem(cx, by, sprS * .62 * (1 + .25 * (1 - easeOut(prog(t, T.slam, T.slam + 900)))), dk * (.35 + .4 * prog(t, T.slam, T.slam + 600)), t * .0002);
          // 속성 효과: 새 모습이 드러나는 순간 가장 거세게 터졌다가 조금 가라앉아요
          const surge = t >= T.slam ? 1 + .7 * (1 - easeOut(prog(t, T.slam, T.slam + 2600))) : .6 + .4 * prog(t, T.rebuilt - 1500, T.slam);
          elemFx(cx, by, sprS, footY, A0 * prog(t, T.rebuild + 1500, T.rebuilt), EI * surge);
          if (themeId === 'jogress') { hexRing(cx, by, sprS * .6, dk * .5, 1.5, t * .0005, '#f472b6'); hexRing(cx, by, sprS * .54, dk * .5, 1.5, -t * .0005, '#38bdf8'); }
        }
        if (t >= T.solid) {
          const sA = (themeId === 'capsule' ? prog(t, T.slam, T.slam + 140) : prog(t, T.solid, T.slam)) * fadeOut;
          const punch = t >= T.slam ? 1 + .1 * (1 - easeOut(prog(t, T.slam, T.slam + 380))) : 1;
          sprite(B, cx, by, sprS * punch, { a: sA, white: themeId === 'capsule' ? 1 - prog(t, T.slam, T.slam + 500) : 1 - prog(t, T.solid + 300, T.slam + 200), glow: 40 });
          if (themeId === 'holy') halo(cx, by - sprS * .5, sprS * .2, fadeOut * easeOut(prog(t, T.slam + 300, T.slam + 1000)));
          // 백신: 새 모습 머리 위로 엔젤링이 내려와 자리 잡고, 은은하게 맥동해요
          if (themeId === 'vaccine') { const q = easeOut(prog(t, T.slam + 200, T.slam + 1300));
            angelRing(cx, by - sprS * (.5 + .35 * (1 - q)), sprS * .28 * (1 + .04 * Math.sin(t / 500)), fadeOut * q); }
          const rp = prog(t, T.slam, T.slam + 1000);
          hexRing(cx, by, S * (.35 + rp * 1.6), (1 - rp) * .9 * fadeOut, 3, rp * .6, '#ffffff');
          ring(cx, by, S * (.3 + rp * 1.1), (1 - rp) * .7 * fadeOut, 2);
        }

        // 임팩트 프레임 + 섬광
        if (t >= T.boom && t < T.boom + 70) { g.fillStyle = '#000'; g.fillRect(-60, -60, W + 120, H + 120); }
        else if (t >= T.boom + 70 && t < T.boom + 150) { g.fillStyle = themeId === 'virus' ? '#3b0014' : '#fff'; g.fillRect(-60, -60, W + 120, H + 120); sprite(B, cx, cy, S * 1.3, { black: true }); }
        const fl = t < T.boom + 150 ? 0 : 1 - prog(t, T.boom + 150, T.boom + 700);
        if (fl > 0) { g.fillStyle = `rgba(${FLASH},${fl})`; g.fillRect(-60, -60, W + 120, H + 120); }
        if (LV >= 6) { const f2 = t >= T.boom + 380 ? .8 * (1 - prog(t, T.boom + 380, T.boom + 820)) : 0; if (f2 > 0) { g.fillStyle = `rgba(${FLASH},${f2})`; g.fillRect(-60, -60, W + 120, H + 120); }
          for (let i = 0; i < 3; i++) { const q = prog(t, T.boom + 380 + i * 110, T.boom + 1500 + i * 110); if (q > 0 && q < 1) hexRing(cx, cy, M * easeOut(q), (1 - q) * .8 * fadeOut, 5 - i, -i * .3, `hsl(${(i * 90 + t * .3) % 360},95%,70%)`); } }
        const sfl = t >= T.slam ? .55 * (1 - prog(t, T.slam, T.slam + 260)) : 0;
        if (sfl > 0) { g.fillStyle = `rgba(${FLASH},${sfl})`; g.fillRect(-60, -60, W + 120, H + 120); }

        if (LV >= 6 && t >= T.slam) sparkles(cx, by, S, fadeOut * prog(t, T.slam, T.slam + 600), t);
        if (t >= T.slam) {
          g.setTransform(1, 0, 0, 1, 0, 0);   // 결과 화면의 글자 · 테두리는 흔들리지 않아요
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
            g.font = `${14 * dpr}px sans-serif`; g.fillStyle = LV >= 6 ? `hsl(${t * .15 % 360},95%,72%)` : tint; g.shadowColor = tint; g.shadowBlur = 10 * dpr;
            g.fillText(starsOf(LV), cx, ty + 42 * dpr);
            if (ELD) { g.font = `${10 * dpr}px Silkscreen, monospace`; g.fillStyle = ELD.col; g.shadowColor = ELD.col; g.fillText(`ELEMENT · ${ELD.name}`, cx, ty + 60 * dpr); }
            g.restore();
          }
          // 이름
          const nameF = Math.min(96, vw / 7) * dpr;
          const nameY = textY + nameF * .9 + 22 * dpr;
          title(`${to}`, cx, nameY, nameF, prog(t, T.slam + 80, T.slam + 650), rA);
          // 정보 줄 + 용량 막대
          const infoA = rA * easeOut(prog(t, T.slam + 500, T.slam + 900));
          if (infoA > 0) {
            g.save(); g.globalAlpha = infoA; g.textAlign = 'center';
            if (themeId === 'vaccine') { g.shadowColor = 'rgba(20,8,0,.85)'; g.shadowBlur = 6 * dpr; }   // 밝은 배경에서도 읽히게
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
        if (inOvf) { overflowFx(ovfK * A0); glitch(Math.min(1, .3 + ovfK) * A0); }
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
