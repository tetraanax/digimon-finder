(() => {
const DIGI = window.DIGI;
const ATTR = { vac:['백신','attr-vac'], dat:['데이터','attr-dat'], vir:['바이러스','attr-vir'], fre:['프리','attr-fre'] };
const ATTR_COLOR = { vac:'#4ade80', dat:'#60a5fa', vir:'#fb7185', fre:'#facc15' };
const VIBE = { brave:'용감함', calm:'침착함', clever:'영리함', gentle:'다정함', wild:'자유로움' };
const BLOOD = { A:{attr:'dat',vibe:'calm',t:'꼼꼼한 A형은 데이터 속성과 잘 통해요'}, B:{attr:'fre',vibe:'wild',t:'자유분방한 B형은 프리·바이러스 속성과 잘 맞아요',alt:'vir'},
  O:{attr:'vac',vibe:'brave',t:'리더형 O형은 백신 속성과 손발이 맞아요'}, AB:{attr:'vir',vibe:'clever',t:'개성파 AB형은 바이러스·데이터 속성에 끌려요',alt:'dat'} };

/* deterministic RNG from inputs + roll count */
function hash(s){ let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed){ return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function pick(inp, roll){
  const bmi = inp.w / Math.pow(inp.h / 100, 2);
  const size = bmi < 19.5 ? 1 : bmi < 25 ? 2 : 3;
  const ageVibe = inp.a < 15 ? 'wild' : inp.a < 25 ? 'brave' : inp.a < 40 ? 'clever' : 'calm';
  const b = BLOOD[inp.bt];
  const r = rng(hash([inp.sex, inp.h, inp.w, inp.a, inp.bt, roll].join('|')));
  const scored = DIGI.map(dg => {
    let s = 1;
    if (dg.attr === b.attr) s += 2.2; else if (b.alt && dg.attr === b.alt) s += 1.4;
    if (dg.size === size) s += 1.6; else if (Math.abs(dg.size - size) === 1) s += .5;
    if (dg.vibe.includes(ageVibe)) s += 1.3;
    if (dg.vibe.includes(b.vibe)) s += .9;
    s *= .55 + r() * .9;                 // 운명의 흔들림
    return { dg, s };
  }).sort((x, y) => y.s - x.s);
  const top = scored[0], dg = top.dg;
  const max = scored[0].s, second = scored[1].s;
  const bond = Math.min(99, Math.round(72 + (max - second) * 9 + r() * 12));
  const sync = [
    ['속성 궁합', dg.attr === b.attr ? 92 + Math.floor(r() * 8) : dg.attr === b.alt ? 78 + Math.floor(r() * 10) : 55 + Math.floor(r() * 20)],
    ['체형 궁합', dg.size === size ? 90 + Math.floor(r() * 10) : 62 + Math.floor(r() * 18)],
    ['성격 궁합', dg.vibe.includes(ageVibe) || dg.vibe.includes(b.vibe) ? 85 + Math.floor(r() * 14) : 58 + Math.floor(r() * 20)],
  ];
  const sizeTxt = ['', '날렵한 체형이라 작고 재빠른 파트너와 호흡이 좋아요', '균형 잡힌 체형이라 어떤 파트너와도 무난해요', '듬직한 체형이라 크고 힘 있는 파트너가 어울려요'][size];
  const ageTxt = { wild:'어린 나이의 자유로운 에너지', brave:'도전 정신이 강한 나이', clever:'경험과 판단력이 쌓이는 나이', calm:'여유와 깊이가 있는 나이' }[ageVibe];
  const why = [b.t + '.', sizeTxt + ` (BMI ${bmi.toFixed(1)})`, `${inp.a}세는 ${ageTxt}라서 '${VIBE[ageVibe]}' 성향의 파트너와 잘 맞아요.`];
  return { dg, bond, sync, why, runnerUp: scored[1].dg };
}

/* fallback art: a little pixel "digi-egg" with a pattern seeded by the name */
function eggArt(dg){
  const c = document.createElement('canvas'); c.width = 16; c.height = 16;
  const g = c.getContext('2d'), r = rng(hash(dg.en));
  const col = ATTR_COLOR[dg.attr];
  const ink = '#eef2ff';
  const shape = ["......####......","....##....##....","...#........#...","..#..........#..","..#..........#..",".#............#.",".#............#.",".#............#.",".#............#.",".#............#.",".#............#.","..#..........#..","..#..........#..","...#........#...","....##....##....","......####......"];
  const inside = (x, y) => { const row = shape[y]; const l = row.indexOf('#'), rr = row.lastIndexOf('#'); return x > l && x < rr; };
  for (let y = 1; y < 15; y++) for (let x = 1; x < 15; x++) if (inside(x, y)) {
    const band = (y + Math.floor(r() * 2)) % 5 === 0 || (x * 3 + y * (dg.size + 1)) % 11 === 0;
    if (band) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
  }
  g.fillStyle = ink; shape.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') g.fillRect(x, y, 1, 1); }));
  return c;
}

const $ = id => document.getElementById(id);
let roll = 0, last = null;

function read(){
  const inp = { sex: document.querySelector('input[name=sex]:checked').value, h: +$('h').value, w: +$('w').value, a: +$('a').value, bt: document.querySelector('input[name=bt]:checked').value };
  if (!(inp.h >= 80 && inp.h <= 230)) return '키는 80~230cm 사이로 입력해 주세요.';
  if (!(inp.w >= 15 && inp.w <= 250)) return '몸무게는 15~250kg 사이로 입력해 주세요.';
  if (!(inp.a >= 5 && inp.a <= 120)) return '나이는 5~120세 사이로 입력해 주세요.';
  return inp;
}

/* ---------- network scene ---------- */
const netEl = $('net'), card = $('result');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const NET = new window.DigiNetwork($('netc'), {
  seed: 1999,
  onStatus: (eyebrow, title) => { $('netStat').innerHTML = `${eyebrow}<b>${title}</b>`; },
});
let busy = false, lastInp = null;

function openNet(){
  if (!netEl.hidden) return;
  netEl.hidden = false; document.body.classList.add('locked');
  requestAnimationFrame(() => netEl.classList.add('on'));
  NET.open();
}
function closeNet(){
  netEl.classList.remove('on'); document.body.classList.remove('locked');
  setTimeout(() => { netEl.hidden = true; NET.close(); hideCard(); endJourney(); }, 350);
  document.querySelector('.go').focus({ preventScroll: true });
}
function hideCard(){ card.classList.remove('in'); card.hidden = true; }

async function run(inp){
  if (busy) return; busy = true;
  lastInp = inp;
  const res = pick(inp, roll);
  openNet(); hideCard();
  $('netSkip').hidden = false;
  if (reduced) { NET.trace({ partner: res.dg.ko, names: DIGI.map(d => d.ko) }); NET.skip(); }
  await NET.trace({ partner: res.dg.ko, names: DIGI.map(d => d.ko) });
  $('netSkip').hidden = true;
  renderCard(res);
  busy = false;
}

function renderCard(res){
  const dg = res.dg;
  card.innerHTML = '';
  const art = document.createElement('div'); art.className = 'art';
  const src = window.digiImage(dg.ko) || dg.img;
  if (src) { art.classList.add('has-img'); const im = new Image(); im.alt = dg.ko; im.src = src; im.onerror = () => { art.classList.remove('has-img'); art.innerHTML = ''; art.appendChild(eggArt(dg)); }; art.appendChild(im); }
  else art.appendChild(eggArt(dg));
  card.insertAdjacentHTML('beforeend', `<div class="tag">YOUR PARTNER${roll ? ' · REROLL ' + roll : ''}</div>`);
  const hero = document.createElement('div'); hero.className = 'hero'; hero.appendChild(art);
  hero.insertAdjacentHTML('beforeend', `<div class="name"><h2>${dg.ko}</h2><div class="en">${dg.en.toUpperCase()}</div>
    <div class="chips"><span class="chip attr ${ATTR[dg.attr][1]}">${ATTR[dg.attr][0]}</span><span class="chip">성장기</span><span class="chip cap">${capacity(dg.ko, 0)}</span><span class="chip">${dg.type}</span>${dg.vibe.map(v => `<span class="chip">${VIBE[v]}</span>`).join('')}</div></div>`);
  card.appendChild(hero);
  card.insertAdjacentHTML('beforeend', `
    <p class="desc">${dg.d}</p>
    <div class="bond">
      <span>파트너 싱크로율</span><div class="bar"><i style="width:0" data-w="${res.bond}"></i></div><b>${res.bond}%</b>
      ${res.sync.map(([k, v]) => `<span>${k}</span><div class="bar"><i style="width:0" data-w="${v}"></i></div><b>${v}%</b>`).join('')}
    </div>
    <div class="why"><h3>이 파트너가 나온 이유</h3><ul>${res.why.map(t => `<li>${t}</li>`).join('')}</ul></div>
    <div class="evo">아깝게 놓친 후보: <b>${res.runnerUp.ko}</b> · 진화 루트는 함께 여행하면서 밝혀져요.</div>
    <div class="actions">
      <button class="ghost primary" id="journeyGo" type="button">파트너와 여행 떠나기</button>
      <button class="ghost" id="reroll" type="button">운명 다시 굴리기</button>
      <button class="ghost" id="copy" type="button">결과 복사</button>
      <button class="ghost" id="back" type="button">처음으로</button>
    </div>`);
  card.hidden = false;
  card.scrollTop = 0;
  requestAnimationFrame(() => {
    card.classList.add('in');
    card.querySelectorAll('.bar i').forEach(i => i.style.width = i.dataset.w + '%');
  });
  lastRes = res;
  $('journeyGo').onclick = startJourney;
  $('reroll').onclick = () => { roll++; run(lastInp); };
  $('back').onclick = closeNet;
  $('copy').onclick = async e => {
    const txt = `나의 파트너 디지몬은 ${dg.ko}(${dg.en})! ${ATTR[dg.attr][0]} 속성 · 싱크로율 ${res.bond}%`;
    try { await navigator.clipboard.writeText(txt); e.target.textContent = '복사했어요'; }
    catch { e.target.textContent = txt; }
  };
  $('journeyGo').focus({ preventScroll: true });
}

/* ---------- journey: pick a region, roam inside it, a few choices, evolve on the way ----------
   한 판 흐름: 구역 선택 → 이동(먼 곳일수록 오래) → 그 구역 안을 6~8걸음 돌아다님
   → 그중 2~3번만 선택지, 나머지는 일어난 일을 기록 → 탐험이 끝나면 다음 구역 선택 (약 30분) */
const JD = window.JOURNEY;
// 직접 이어 붙인 진화(JD.extraEvo)를 도감의 "진화 후" 목록에 혼자 진화하는 줄로 더해요
for (const [a, b] of JD.extraEvo || []) { const row = (window.DIGI_DB || {})[a]; if (row && !(row[6] = row[6] || []).some(e => e[0] === b)) row[6].push([b, 0, '그림으로 이어 붙인 진화']); }
const bat = w => { w = String(w).replace(/(\s*\([^)]*\))+\s*$/, ''); const c = w.charCodeAt(w.length - 1); return (c >= 0xAC00 && c <= 0xD7A3) ? (c - 0xAC00) % 28 : -1; };
const ga = w => bat(w) > 0 ? '이' : '가', wa = w => bat(w) > 0 ? '과' : '와', eul = w => bat(w) > 0 ? '을' : '를';
const ro = w => { const k = bat(w); return (k <= 0 || k === 8) ? '로' : '으로'; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const TRAITS = Object.keys(JD.traits);
let lastRes = null, J = null;

/* 체급: 같은 이름 + 같은 단계면 언제나 같은 용량 */
function capacity(name, stage){
  const [lo, hi, unit] = stage < 0 ? JD.babyCapacity[Math.max(0, stage + 2)] : JD.capacity[Math.min(stage, JD.capacity.length - 1)];
  const v = lo + (hash(name + '#' + stage) % 1000) / 1000 * (hi - lo);
  return (v >= 10 ? Math.round(v) : v.toFixed(1)) + unit;
}
// 진화 후 용량: 이름으로 정한 값이 지금보다 작으면(같은 단계에서 한 번 더 진화할 때) 지금 용량의 1.3~2배로 키워요
const capMB = c => { const m = /([\d.]+)(MB|GB|TB)/.exec(c || ''); return m ? +m[1] * { MB: 1, GB: 1024, TB: 1048576 }[m[2]] : 0; };
function evoCapacity(evo){
  const base = capacity(evo.name, evo.stage), prev = J && J.route.length ? capMB(J.route[J.route.length - 1].cap) : 0;
  if (capMB(base) > prev) return base;
  const tb = prev * (1.3 + (hash(evo.name) % 70) / 100) / 1048576;
  return (tb >= 10 ? Math.round(tb) : tb.toFixed(1)) + 'TB';
}
const pickFrom = (arr, r = Math.random) => arr[Math.floor(r() * arr.length)];
const randInt = ([lo, hi]) => lo + Math.floor(Math.random() * (hi - lo + 1));
const byName = (map, name) => { for (const k in map) if (name.includes(k)) return map[k]; return null; };
const fill = (t, net, mon) => t.replace('{net}', net).replace('{mon}', mon).replace('{을}', eul(mon)).replace('{과}', wa(mon)).replace('{이}', ga(mon));
const wildOf = net => (byName(JD.wildBy, net) || JD.wild).filter(m => m !== J.form && m !== J.dg.ko);
// 디지몬의 단계: 도감 등급으로 (유아기 -2 · 유년기 -1 · 성장기 0 · 성숙기/아머체 1 · 완전체/하이브리드체 2 · 궁극체 3)
const LEVEL_STAGE = [[/유아기/, -2], [/유년기/, -1], [/성장기/, 0], [/성숙기|아머체/, 1], [/완전체|하이브리드체/, 2], [/궁극체/, 3]];
const stageOfMon = name => { const lv = ((window.digiData && window.digiData(name)) || {}).level || ''; const m = LEVEL_STAGE.find(([re]) => re.test(lv)); return m ? m[1] : null; };
let stageBuckets = null;   // 도감 전체를 단계별로 (그 구역에 알맞은 상대가 없을 때 빌려 와요)
const bucketOf = st => {
  if (!stageBuckets) { stageBuckets = {}; for (const [n, row] of Object.entries(window.DIGI_DB || {})) { const m = LEVEL_STAGE.find(([re]) => re.test(row[1])); if (m && row[0] && !/크로스워즈/.test(row[1]) && !/[:(+]/.test(n)) (stageBuckets[m[1]] = stageBuckets[m[1]] || []).push(n); } }
  return stageBuckets[st] || [];
};
// 사건에 나오는 상대: 'strong'이면 파트너와 같거나 높은 단계, 'weak'이면 낮은 단계에서 골라요
function monFor(ev, mons){
  const foe = ev && ev.foe, jg = jogPair();
  // 조그레스할 수 있는 모습이면, 마주치는 디지몬이 그 짝일 때가 많아요 (적으로 나오는 사건은 빼고)
  if (!foe && jg && Math.random() < JD.bond.partnerMeet) return jg.b;
  if (!foe) return pickFrom(mons);
  const p = Math.min(3, J.stage), st = m => stageOfMon(m);
  if (foe === 'strong') {
    const ok = mons.filter(m => st(m) !== null && st(m) >= p);
    return ok.length ? pickFrom(ok) : pickFrom(bucketOf(p).filter(n => n !== J.form)) || pickFrom(mons);
  }
  const low = mons.filter(m => st(m) !== null && st(m) < J.stage);
  return low.length ? pickFrom(low) : pickFrom(mons.filter(m => st(m) !== null && st(m) <= J.stage)) || pickFrom(mons);
}
const fxChips = fx => fx ? Object.entries(fx).map(([k, v]) => `<i class="t-${k}">${JD.traits[k]} +${v}</i>`).join('') : '';
const stageLabel = st => st < 0 ? JD.babyNames[Math.max(0, st + 2)] : JD.stageNames[Math.min(st, 3)];
const needOf = k => k < 0 ? JD.babyNeed[k + 2] : JD.evolveNeed[k];   // 다음 단계로 진화하는 조건 (유아기 · 유년기 포함)
const picOf = name => window.digiImage(name);
// 디지몬 설명: 진화형은 js/digi-info.js, 성장기 파트너는 data.js 의 d. 'X'·' 솔라 모드'는 기본 형태 설명에 한 줄 더해요
function infoOf(name){
  const I = window.DIGI_INFO || {}, rook = name => { const d = window.DIGI.find(x => x.ko === name); return d && d.d; };
  if (I[name] || rook(name)) return I[name] || rook(name);
  if (/ 솔라 모드$/.test(name)) { const b = infoOf(name.replace(/ 솔라 모드$/, '')); return (b ? b + ' ' : '') + '태양계의 빛을 받아들여 온몸이 태양처럼 빛나는 모습이에요.'; }
  if (/X$/.test(name)) { const b = infoOf(name.slice(0, -1)); return (b ? b + ' ' : '') + 'X항체를 얻어 본래의 힘이 한층 더 깨어난 모습이에요.'; }
  const d = window.digiData && window.digiData(name);
  if (d && d.type) return `${d.type} ${d.level.replace(/(.*)/, '')} 디지몬이에요.${d.attacks && d.attacks.length ? ` 필살기는 「${d.attacks[0]}」.` : ''}`;
  return '';
}
// 다음 진화 예상은 실루엣만: 흰 배경을 오려 낸 그림을 검게 칠해서 보여줘요 (이름은 숨겨요)
const silCache = new Map(), silNames = [];
const silTag = name => { const u = silCache.get(name); let i = silNames.indexOf(name); if (i < 0) i = silNames.push(name) - 1;
  return `<span class="jp-sil" data-sil="${i}" aria-hidden="true">${u ? `<img src="${u}" alt="">` : u === null ? '?' : ''}</span>`; };
function fillSil(root){
  root.querySelectorAll('.jp-sil[data-sil]').forEach(el => {
    const name = silNames[+el.dataset.sil]; if (silCache.has(name) || !window.evoCinematic) return;
    window.evoCinematic.preload(name).then(c => {
      let url = null; try { url = c ? c.black.toDataURL() : null; } catch (e) {}
      silCache.set(name, url);
      document.querySelectorAll(`.jp-sil[data-sil="${el.dataset.sil}"]`).forEach(x => { x.innerHTML = url ? `<img src="${url}" alt="">` : '?'; });
    });
  });
}
const picTag = (name, cls) => { const src = picOf(name); return src ? `<img class="${cls}" src="${esc(src)}" alt="${esc(name)}" loading="lazy">` : ''; };
// 성향 점수: 데이터의 기본값(1~3)에 배율을 곱하고 약간의 운을 더해요. 최대 statMax
const gain = (fx, scale) => fx ? Object.fromEntries(Object.entries(fx).map(([k, v]) => [k, v * scale + Math.floor(Math.random() * (scale / 2 + 1))])) : null;
/* ---------- 친밀도: 여행 중 만난 디지몬마다 0~100 ---------- */
const bondOf = n => (J && J.bonds[n]) || 0;
const bondTier = v => { let name = JD.bond.tiers[0][1]; for (const [min, nm] of JD.bond.tiers) if (v >= min) name = nm; return name; };
const bondChip = b => b && b.d ? `<i class="t-bond${b.d < 0 ? ' neg' : ''}">♥ ${esc(b.mon)} ${b.d > 0 ? '+' : ''}${b.d}</i>` : '';
// 지금 모습의 조그레스 짝: 진화 데이터에서 '짝과 함께' 진화하는 줄 (결과가 지금 단계 이상 · 한 단계 위까지, 짝과 결과 모두 그림이 있을 때).
// 여러 개면 jogress 표(대표 조합) → 대표 진화 → 운명적으로 하나. 같은 모습이면 언제나 같은 짝이에요
const jogCache = new Map();
function jogPair(){
  if (!J || J.special || J.stage < 0) return null;
  const key = J.dg.en + '|' + J.form;
  if (jogCache.has(key)) return jogCache.get(key);
  const fixed = JD.jogress.find(j => j.a === J.form);
  let pick = fixed ? { ...fixed, src: evoSrc(J.form, fixed.result) } : null;
  const d = window.digiData && window.digiData(J.form);
  if (!pick && d) {
    const here = Math.min(J.stage, 3), opts = [];
    for (const e of d.evolvesTo) {
      const [n, main, src, , w] = e, rs = stageOfMon(n);
      // 혼자서도 같은 모습으로 진화할 수 있는 줄은 빼요: 짝과 합체했는데 그냥 진화와 같으면 의미가 없으니까요
      if (soloEdge(e) || !w || !w.length || rs === null || rs < here || rs > J.stage + 1 || /(X항체)/.test(n) || !window.digiImage(n)) continue;
      const mates = w.filter(m => window.digiImage(m) && stageOfMon(m) !== null);
      if (mates.length) opts.push({ a: J.form, b: mates[hash(key + n) % mates.length], result: n, stage: rs, main, src });
    }
    opts.sort((x, y) => y.main - x.main);
    const top = opts.filter(o => o.main === opts[0]?.main);
    pick = top.length ? top[hash(key) % top.length] : null;
  }
  jogCache.set(key, pick); return pick;
}
// 선택지 행동에 따른 친밀도 변화: 만나기만 해도 조금, 도우면 크게, 몰아내거나 흡수하면 내려가요
function actBond(fx){ let d = JD.bond.meet; for (const [k, v] of Object.entries(fx || {})) d += (JD.bond.act[k] || 0) * v / 2; return Math.round(d); }
function addBond(mon, d){
  if (!mon || !d) return null;
  const before = bondOf(mon), after = Math.max(0, Math.min(JD.bond.max, before + d));
  J.bonds[mon] = after;
  if (after === before) return null;
  const tb = bondTier(before), ta = bondTier(after);
  return { mon, d: after - before, up: after > before && ta !== tb ? ta : null, v: after };
}
// 친밀도 단계가 오르면 기록에 남겨요. 조그레스 짝과 단짝이 되면 조그레스를 할 수 있다고 알려요
function bondUp(b){
  if (!b || !b.up) return;
  const jg = jogPair(), ready = jg && jg.b === b.mon && b.v >= JD.bond.jogress;
  log(`${b.mon}${wa(b.mon)} ${b.up}${ga(b.up)} 되었어요! (친밀도 ${b.v})${ready ? ' 이제 함께 조그레스 진화를 할 수 있어요.' : ''}`, 'bond', null, b.mon);
}
/* ---------- 사건 엔진: 걸음마다 하나의 사건 (대부분 저절로, 갈림길에서만 선택) ---------- */
// 여정 지도 칸의 종류와 색
const CAT = { choice: ['선택', '#f1f5f9'], daily: ['일상', '#334155'], local: ['구역 사건', '#7dd3fc'], danger: ['위기', '#f43f5e'], luck: ['행운', '#4ade80'],
  rare: ['희귀', '#facc15'], bond: ['인연', '#f472b6'], world: ['세계 사건', '#818cf8'], chain: ['되돌아온 일', '#fb923c'], rest: ['휴식', '#94a3b8'], evo: ['진화', '#c084fc'] };
function savedFocus(){ try { const f = localStorage.getItem('digi-focus'); return JD.focus[f] ? f : 'free'; } catch (e) { return 'free'; } }
function mark(cat){ if (!J.exp) return; const i = J.exp - 1; if (J.map[i] && J.map[i] !== 'daily') return; J.map[i] = cat; }
function addCond(d){ if (!d) return 0; const b = J.cond; J.cond = Math.max(0, Math.min(100, J.cond + d)); return J.cond - b; }
const condChip = c => c ? `<i class="t-cond${c < 0 ? ' neg' : ''}">컨디션 ${c > 0 ? '+' : ''}${c}</i>` : '';
// 컨디션이 낮으면 성장이 절반
const gainC = (fx, scale) => gain(fx, scale * (J.cond < JD.cond.low ? .5 : 1));
const isDarkNet = net => JD.darkNets.some(k => net.includes(k));
const curWorld = () => J.world ? JD.worlds[J.world.i] : null;
function rate(kind){
  const f = JD.focus[J.focus] || {}, w = curWorld();
  return (JD.rates[kind] ?? 1) * ((f.mod && f.mod[kind]) || 1) * ((w && w.mod && w.mod[kind]) || 1);
}
// 모험 방향: 걸음마다 조금씩 성장 + 컨디션 회복 (기록에는 남기지 않아요)
function applyFocus(){
  const f = JD.focus[J.focus] || JD.focus.free, w = curWorld();
  addCond(JD.cond.regen + (f.cond || 0) + ((w && w.regen) || 0));
  if (!f.gain) return;
  const t = f.trait || pickFrom(['courage', 'friend', 'wisdom', 'power']);
  const v = Math.round((f.gain + Math.floor(Math.random() * 3)) * (J.cond < JD.cond.low ? .5 : 1));
  J.traits[t] = Math.min(JD.statMax, J.traits[t] + v);
}
// 저절로 일어나는 사건 하나 (위기 · 행운 · 희귀 공통)
function simpleEvent(ev, cat, net, mon){
  const fx = gainC(ev.fx, JD.statGain.roam); addTraits(fx);
  const c = addCond(ev.cond || 0), bd = ev.bond ? addBond(mon, ev.bond) : null;
  mark(cat); log(fill(ev.t, net, mon), cat, fx, null, bd, c); bondUp(bd);
}
// 갈림길: 사건 문장을 남기고, 그 상황에 맞는 선택지를 내밀어요
async function forkEvent(ev, cat, region, mon){
  const f = JD.forks[ev.fork], net = region.name;
  mark(cat); log(fill(ev.t, net, mon), cat, null, null);
  const opts = f.opts.map(o => ({ text: o.t, fx: gain(o.fx, JD.statGain.choice), cond: o.cond, mon, bond: o.bond, fork: true }));
  await offerChoice(region, fill(ev.t, net, mon), opts, f.q);
}
// 행동이 씨앗이 되어 몇 걸음 뒤에 되돌아와요
function scheduleChain(opt){
  if (!opt.src || !opt.mon || J.pending.length >= 3) return;
  for (const r of JD.chainRules) {
    if (!new RegExp(r.match).test(opt.src.t)) continue;
    const p = r.p * (r.type === 'corrupt' ? rate('corrupt') / (JD.rates.corrupt ?? 1) : 1);
    if (Math.random() < p) J.pending.push({ type: r.type, mon: opt.mon, at: J.exp + randInt(JD.chainDelay) });
    return;
  }
}
async function stepEvent(region){
  const net = region.name, mons = wildOf(net), r = Math.random, jg = jogPair();
  // 1) 되돌아온 일
  const due = J.pending.findIndex(p => p.at <= J.exp);
  if (due >= 0) {
    const p = J.pending.splice(due, 1)[0], c = JD.chains[p.type];
    if (c.fork) return forkEvent({ t: c.t, fork: c.fork }, 'chain', region, p.mon);
    return simpleEvent(c, 'chain', net, p.mon);
  }
  // 조그레스 짝이 찾아와요 (조그레스할 수 있는 모습이면 다른 일보다 먼저, 자주)
  if (jg && bondOf(jg.b) < JD.bond.jogress && r() < rate('partner')) {
    const fx = gainC({ friend: 1 }, JD.statGain.roam); addTraits(fx);
    const bd = addBond(jg.b, randInt(JD.bond.partnerGain));
    mark('bond'); log(fill(pickFrom(JD.partnerVisits), net, jg.b), 'bond', fx, jg.b, bd); bondUp(bd); return;
  }
  // 2) 세계 사건: 끝나거나, 새로 시작
  if (J.world && J.exp >= J.world.until) { const w = curWorld(); J.world = null; mark('world'); log(`🌐 ${w.end}`, 'world'); return; }
  if (!J.world && J.exp > 8 && r() < rate('world')) {
    const i = Math.floor(r() * JD.worlds.length), w = JD.worlds[i];
    J.world = { i, until: J.exp + randInt(w.dur) };
    const fx = gainC(w.fx, JD.statGain.roam); addTraits(fx);
    mark('world'); log(`🌐 세계 사건 · ${w.name} — ${w.start}`, 'world', fx); return;
  }
  // 3) 희귀
  if (r() < rate('rare')) { const ev = pickFrom(JD.rares); return simpleEvent(ev, 'rare', net, monFor(ev, mons)); }
  // 5) 디지멘탈 캡슐 발견 (성장기 · 성숙기)
  // 지금 모습이 그 디지멘탈로 아머진화한다는 근거(Wikimon 진화 후 목록)가 있을 때만 나와요
  const armors = J.special || J.capsuled || J.stage > 1 || J.stage < 0 ? [] : armorEdges().filter(d => !d.rare || r() < .15);
  if (armors.length && r() < rate('capsule')) {
    const dm = pickFrom(armors);
    mark('luck'); log(`${net}에서 빛나는 「${dm.name}의 디지멘탈」 캡슐을 발견했어요.`, 'luck');
    return offerChoice(region, `「${dm.name}의 디지멘탈」이 은은하게 빛나고 있어요.`, [
      { text: '캡슐을 열어 캡슐진화한다', fx: gain({ [dm.trait]: 2 }, JD.statGain.choice), kind: 'capsule', dm },
      { text: '지금의 모습을 지키며 캡슐을 그대로 둔다', fx: gain({ wisdom: 1 }, JD.statGain.choice) },
    ], JD.forks.capsule.q);
  }
  // 6) 위기 (어두운 구역에서 더 자주)
  if (r() < rate('danger') * (isDarkNet(net) ? 1.5 : 1)) {
    // 친구를 잃는 슬픔: 타락할 모습이 있는 백신종이면, 친밀도 높은 친구가 이 위기에서 사라질 수 있어요
    const fallen = fallForm(), lost = fallen ? Object.entries(J.bonds).filter(([n, v]) => v >= JD.bondLoss.min && n !== J.form && !(jg && n === jg.b)) : [];
    if (lost.length && r() < JD.bondLoss.chance) return bondLoss(region, pickFrom(lost)[0], fallen);
    const d = pickFrom(JD.dangers), mon = monFor(d, mons);
    if (d.fork) return forkEvent(d, 'danger', region, mon);
    return simpleEvent(d, 'danger', net, mon);
  }
  // 7) 친구 (친밀도 20 이상): 함께 시간을 보내거나, 도움을 청해 와요
  const friends = Object.entries(J.bonds).filter(([n, v]) => v >= 20 && n !== J.form && !(jg && n === jg.b));
  if (friends.length && r() < rate('bond')) {
    const [n] = pickFrom(friends);
    if (r() < .3) return forkEvent({ t: JD.forks.trouble.ask, fork: 'trouble' }, 'bond', region, n);
    const fx = gainC({ friend: 1 }, JD.statGain.roam); addTraits(fx);
    const bd = addBond(n, randInt([5, 10]));
    mark('bond'); log(fill(pickFrom(JD.bondVisits), net, n), 'bond', fx, n, bd); bondUp(bd); return;
  }
  // 8) 행운
  if (r() < rate('luck')) { const ev = pickFrom(JD.lucks); return simpleEvent(ev, 'luck', net, monFor(ev, mons)); }
  // 9) 지쳤을 때는 쉬어 가요
  if (J.cond < JD.cond.low && r() < .45) { const c = addCond(12); mark('rest'); log(pickFrom(JD.rests), 'rest', null, null, null, c); return; }
  // 10) 구역 고유 사건 · 11) 평범한 하루 — 최근 기록과 같은 문장은 다시 쓰지 않아요
  const recentText = new Set(J.log.slice(-10).map(l => l.text)), recentSrc = new Set(J.log.slice(-10).map(l => l.src));
  const local = (byName(JD.events, net) || []).filter(x => !recentText.has(x) && !recentText.has(`${net}에 도착했어요. ${x}`));
  if (local.length && r() < rate('local') * 1.8) { mark('local'); log(pickFrom(local), 'local'); return; }
  const all = JD.roam.concat(JD.roamMore || []), fresh = all.filter(e => !recentSrc.has(e)), pool = fresh.length ? fresh : all;
  const ev = pickFrom(pool), mon = monFor(ev, mons);
  const fx = gainC(ev.fx, JD.statGain.roam); addTraits(fx);
  const bd = addBond(mon, ev.fx && ev.fx.dark ? JD.bond.roamDark : JD.bond.roam);
  mark('daily'); log(fill(ev.t, net, mon), '', fx, null, bd); J.log[J.log.length - 1].src = ev; bondUp(bd);
}
/* ---------- 친구를 잃는 슬픔 → 타락 진화 ----------
   백신종이고, 진화 데이터에 근거가 있는 어두운 모습(같은 단계)이나 어비스의 타락 표에 오른 모습이 있을 때만 일어나요 */
function fallForm(){
  if (!J || J.stage < 0 || attrOf(J.form) !== 'vac') return null;
  const abyss = JD.secrets.find(d => d.fall), fixed = abyss && abyss.fall[J.form];
  if (fixed && window.digiImage(fixed)) return { n: fixed, src: evoSrc(J.form, fixed) };
  const dark = lateralForms().filter(e => e.dark);
  return dark.find(e => e.main) || dark[0] || null;
}
async function bondLoss(region, friend, fallen){
  const L = JD.bondLoss, me = J, fx = { dark: 30 };
  delete J.bonds[friend]; J.lost = (J.lost || []).concat(friend);
  addTraits(fx); const c = addCond(-20);
  mark('danger'); log(fill(pickFrom(L.texts), region.name, friend), 'danger', fx, friend, null, c);
  if (!(await sleep(2800, me))) return;
  log(fill(L.after, region.name, friend), 'danger');
  if (!(await sleep(2000, me))) return;
  const evo = { name: fallen.n, stage: J.stage, label: `${J.special ? J.label : stageLabel(J.stage)} · 타락 진화`, path: `${friend}${eul(friend)} 잃은 슬픔으로 타락`, src: fallen.src, attr: attrOf(fallen.n), fall: { friend } };
  await playEvolution(evo, 'DARK EVOLUTION');
}
function addTraits(fx){ if (fx) for (const [k, v] of Object.entries(fx)) J.traits[k] = Math.min(JD.statMax, J.traits[k] + v); }

// 파트너의 어린 모습: 도감의 진화 데이터를 거꾸로 따라가 [유아기, 유년기]를 찾아요 (대표 진화 줄을 먼저, 여럿이면 파트너마다 운명적으로 하나)
function babyLine(dg){
  const DB = window.DIGI_DB || {}, me = (window.digiData && window.digiData(dg.ko)) || {}, name = me.name || dg.ko;
  const parentsOf = (child, re) => {
    const out = [];
    for (const [n, row] of Object.entries(DB)) {
      if (!re.test(row[1] || '') || /크로스워즈/.test(row[1]) || !row[0]) continue;
      const e = (row[6] || []).find(x => x[0] === child);
      // 점수: 대표 진화 줄 → 원조 육성기(Digital Monster) → 다른 육성기 → 게임 순
      if (e && soloEdge(e)) out.push({ n, sc: (e[1] ? 4 : 0) + (/^Digital Monster/.test(e[2] || '') ? 2 : /Pendulum|D-3|D-Ark|D-Power|Digivice|Accel|Vital/.test(e[2] || '') ? 1 : 0) });
    }
    out.sort((a, b) => b.sc - a.sc || hash(dg.en + a.n) - hash(dg.en + b.n));
    return out.map(o => o.n);
  };
  for (const kid of parentsOf(name, /유년기/)) { const egg = parentsOf(kid, /유아기/)[0]; if (egg) return [egg, kid]; }
  return null;
}
function startJourney(randomFocus){
  const dg = lastRes.dg, baby = babyLine(dg);
  const st0 = baby ? -2 : 0, f0 = baby ? baby[0] : dg.ko;
  J = { dg, stage: st0, form: f0, label: stageLabel(st0), moves: 0, exp: 0, ended: false, baby: baby || [],
        route: [{ form: f0, stage: st0, label: stageLabel(st0), cap: capacity(f0, st0), regions: [], path: '시작' }],
        visited: new Set([NET.currentRegion()]), recent: [], special: null, branch: null, capsuled: false, jogressed: false, bonds: {}, jogPartner: null,
        cond: JD.cond.start, focus: savedFocus(), map: [], count: {}, choices: 0, pending: [], world: null, lastJog: -99,
        busy: false, choosing: false, traits: Object.fromEntries(TRAITS.map(t => [t, 0])), log: [] };
  NET.speed = 1; $('jFast').classList.remove('on');
  hideCard(); hideChoice();
  netEl.classList.add('explore'); NET.setExplore(true); NET.setStay(false);
  $('journey').hidden = false;
  requestAnimationFrame(updateInset);
  if (randomFocus) beginJourney(randomFocus); else pickDirection();
}
// 무작위로 시작하기: 신호 추적으로 무작위 파트너를 찾은 뒤, 모험 방향도 무작위로 골라 바로 떠나요
async function randomStart(){
  if (busy || J) return; busy = true;
  const dg = pickFrom(DIGI), names = DIGI.map(d => d.ko), who = (babyLine(dg) || [dg.ko])[0];   // 추적 끝에 나타나는 이름은 시작할 모습(유아기)
  openNet(); hideCard();
  $('netSkip').hidden = false;
  if (reduced) { NET.trace({ partner: who, names }); NET.skip(); }
  await NET.trace({ partner: who, names });
  $('netSkip').hidden = true; busy = false;
  if (!netEl.classList.contains('on')) return;          // 추적 중에 닫았으면 그만
  lastRes = { dg };
  startJourney(pickFrom(Object.keys(JD.focus)));
}
// 떠나기 전에 모험 방향을 한 번 골라요 (지난번 고른 방향이 미리 표시돼요). 여행 중에도 패널에서 바꿀 수 있어요
function pickDirection(){
  const me = J;
  $('journey').hidden = true;
  $('netStat').innerHTML = `JOURNEY START · ${esc(J.form)}<b>모험 방향을 골라 주세요</b>`;
  card.innerHTML = `
    <div class="tag">JOURNEY START · DIRECTION</div>
    <p class="eyebrow">떠나기 전에</p>
    <h2 class="sum-title dir-title">모험 방향을 골라 주세요</h2>
    <p class="desc">${esc(J.form)}${wa(J.form)} 어떤 여행을 할까요?${J.stage < 0 ? ` (${esc(J.dg.ko)}의 ${stageLabel(J.stage)} 모습이에요)` : ''} 고른 방향의 성향이 걸음마다 저절로 자라고, 일어나는 사건도 조금 달라져요. 여행 중에도 패널에서 언제든 바꿀 수 있어요.</p>
    <div class="dir-list" role="radiogroup" aria-label="모험 방향">${Object.entries(JD.focus).map(([k, f]) => `<button type="button" class="dir-b${k === J.focus ? ' on' : ''}" data-f="${k}" role="radio" aria-checked="${k === J.focus}"><b><i aria-hidden="true">${f.icon}</i>${esc(f.name)}</b><small>${esc(f.desc)}</small></button>`).join('')}</div>`;
  card.hidden = false; card.scrollTop = 0;
  requestAnimationFrame(() => card.classList.add('in'));
  card.querySelector('.dir-b.on')?.focus({ preventScroll: true });
  card.querySelector('.dir-list').onclick = e => {
    const b = e.target.closest('[data-f]'); if (!b || J !== me) return;
    try { localStorage.setItem('digi-focus', b.dataset.f); } catch (er) {}
    beginJourney(b.dataset.f);
  };
}
// 고른 방향으로 여행을 떠나요 (무작위로 시작하면 방향 고르기 없이 바로 여기로)
function beginJourney(focus){
  J.focus = focus;
  hideCard(); $('journey').hidden = false; requestAnimationFrame(updateInset); renderJourney();
  const f = JD.focus[J.focus], ko = J.dg.ko, me = J.form;
  const young = J.stage < 0 ? ` 지금은 ${stageLabel(J.stage)} 모습이고, 유년기를 거쳐 ${ko}${ro(ko)} 자라요.` : '';
  log(`${me}${wa(me)} 「${f.name}」 방향으로 여행을 떠나요. ${f.desc}.${young} 가고 싶은 네트워크 구역을 눌러 보세요. 마우스 휠로 지도를 확대·축소할 수 있어요.`, 'sys');
  idleStatus();
}
function endJourney(){
  J = null; NET.setExplore(false); NET.setStay(false); NET.speed = 1;
  netEl.classList.remove('explore'); $('journey').hidden = true; closeInfo(); hideChoice(); hideToast();
}
function idleStatus(){
  $('netStat').innerHTML = `EXPLORE · ${J.moves} TRIPS · ${J.exp} STEPS · ${esc(NET.regionName(NET.currentRegion()) || 'DEEP WEB')}<b>가고 싶은 구역을 눌러 주세요</b>`;
}
function log(text, cls = '', fx = null, pic = null, bond = null, cond = 0){
  J.log.push({ text, cls, fx, bond, cond }); if (J.log.length > 60) J.log.shift();
  renderJourney(); toast(text, cls, fx, pic, bond, cond);
}
const chipsOf = (fx, bond, cond) => fx || (bond && bond.d) || cond ? `<em>${fxChips(fx)}${bondChip(bond)}${condChip(cond)}</em>` : '';
const toastEl = $('toast');
const TOAST_TAG = { danger: 'DANGER', luck: 'LUCKY', rare: 'RARE EVENT', world: 'WORLD EVENT', chain: 'CONSEQUENCE', rest: 'REST', local: 'LOCAL', bond: 'BOND', arrive: 'ARRIVED', pick: 'MY CHOICE', evo: 'EVOLUTION', 'evo sp': 'SPECIAL EVOLUTION', secret: 'NEW SIGNAL', sys: 'SYSTEM' };
let toastTimer = 0;
function toast(text, cls = '', fx = null, pic = null, bond = null, cond = 0){
  clearTimeout(toastTimer);
  toastEl.className = 'toast ' + cls;
  const img = pic ? picTag(pic, 't-pic') : '';
  toastEl.classList.toggle('with-pic', !!img);
  toastEl.innerHTML = `${img}<div class="t-body"><div class="tag">${TOAST_TAG[cls] || 'EVENT'} · ${J ? J.exp : 0} STEPS</div><p>${esc(text)}</p>${chipsOf(fx, bond, cond)}</div>`;
  toastEl.hidden = false; requestAnimationFrame(() => toastEl.classList.add('in'));
  toastTimer = setTimeout(hideToast, 7000 / (NET.speed || 1));
}
function hideToast(){ clearTimeout(toastTimer); toastEl.classList.remove('in'); toastTimer = setTimeout(() => { toastEl.hidden = true; }, 350); }
// waits that stop early if the journey was closed (and run faster on ▶▶)
const sleep = (ms, me) => new Promise(res => setTimeout(() => res(J === me), ms / (NET.speed || 1)));

/* ---------- evolution ---------- */
// 속성: 어둠이 가장 높거나 전체의 30% 이상이면 바이러스종. 아니면 용기+우정이 앞서면 백신종, 지혜+힘이 앞서면 데이터종을 먼저 골라요
// 속성: 직접 정한 표(js/digi-info.js) → 성장기 파트너 데이터 → 도감 정보(js/digimon-db.js) → 프리
const DB_ATTR = { '백신': 'vac', '데이터': 'dat', '바이러스': 'vir', '프리': 'fre', '배리어블': 'fre', '불명': 'fre', 'NO DATA': 'fre' };
const attrOf = name => (window.DIGI_ATTR || {})[name] || ((window.DIGI.find(d => d.ko === name) || {}).attr)
  || DB_ATTR[((window.digiData && window.digiData(name)) || {}).attribute] || 'fre';
function wantAttr(){
  const t = J.traits, sum = statSum(), top = [...TRAITS].sort((a, b) => t[b] - t[a])[0];
  if (t.dark > 0 && (top === 'dark' || t.dark >= sum * .3)) return 'vir';
  return t.courage + t.friend >= t.wisdom + t.power ? 'vac' : 'dat';
}
// 다음 단계 후보: 정통 루트 하나이거나, 성향 계열에서 속성이 맞는 여러 후보. 진화할 때 이 중 하나가 무작위로 나와요
// from 이 to 로 진화한다는 근거가 있는지
// 진화 후 목록의 한 줄: [이름, 대표 1/0, 근거, (있으면) 혼자 진화 1/0, 조그레스 짝 이름[], 디지멘탈]
const soloEdge = e => e.length < 4 || e[3] === 1;
const evoEdge = (from, to) => { const d = window.digiData && window.digiData(from), t = window.digiData && window.digiData(to); return d && t ? d.evolvesTo.find(e => e[0] === t.name) || null : null; };
const evolvesInto = (from, to) => !!evoEdge(from, to);
const evoSrc = (from, to) => (evoEdge(from, to) || [])[2] || '';
// 진화 후보: Wikimon 에 근거가 있는 "진화 후" 목록(digimon.json evolvesTo)에서 바로 다음 단계만 골라요.
// 아머체(캡슐진화)·하이브리드체·X항체 모습은 따로 다루니 빼요. 근거 없는 진화는 하지 않아요.
function nextForms(k){
  const d = window.digiData && window.digiData(J.form); if (!d) return [];
  // 대표 조그레스(jogress 표)의 결과는 짝과 함께할 때만: 그냥 진화 후보에서는 빼요
  const seen = new Set(JD.jogress.filter(j => j.a === J.form).map(j => j.result));
  return d.evolvesTo.filter(([n]) => { const lv = (window.digiData(n) || {}).level || '';
    if (seen.has(n) || n === d.name || !soloEdge(d.evolvesTo.find(e => e[0] === n)) || /아머체|하이브리드체/.test(lv) || /(X항체)/.test(n) || stageOfMon(n) !== k + 1 || !window.digiImage(n)) return false;
    seen.add(n); return true; }).map(([n, main, src]) => ({ n, main: !!main, src }));
}
// 후보가 어느 성향에 어울리는지: 아래 branches 표에 있으면 그 성향, 아니면 도감의 유형·속성으로
const EVO_TRAIT = [[/용|공룡|드래곤|파충류|기사|전사|무인/, 'courage'], [/천사|성령|식물|요정|새|조류|여신|천녀/, 'friend'], [/기계|사이보그|마법|마술|곤충|인형|퍼펫|안드로이드|머신/, 'wisdom'], [/짐승|수인|포유류|어인|수룡|해양|갑각|야수/, 'power']];
function traitOfEvo(name, k){
  const B = JD.branches[k] || {};
  for (const t of TRAITS) if (B[t] && B[t].includes(name)) return t;
  const d = window.digiData(name) || {};
  if (DB_ATTR[d.attribute] === 'vir' && /마|악|언데드|고스트|타천/.test(d.type || '')) return 'dark';
  const m = EVO_TRAIT.find(([re]) => re.test(d.type || ''));
  return m ? m[1] : TRAITS[hash(name) % 4];
}
function evoCandidates(k){
  // 유아기 · 유년기: 정해진 한 줄 (유아기 → 유년기 → 파트너 성장기)
  if (k < 0) { const n = k === -2 ? J.baby[1] : J.dg.ko; return n ? [{ name: n, stage: k + 1, path: '성장', attr: k === -1 ? attrOf(n) : 'fre', baby: true }] : []; }
  const t = J.traits, order = [...TRAITS].sort((a, b) => t[b] - t[a]), top = order[0], gap = t[top] - t[order[1]];
  const want = wantAttr(), natural = J.dg.vibe.map(v => JD.natural[v]);
  const balanced = gap < JD.balanceGap && top !== 'dark';
  const next = nextForms(k); if (!next.length) return [];
  const pack = (list, path, branch) => list.map(e => ({ name: e.n, stage: k + 1, path, branch, attr: attrOf(e.n), src: e.src }));
  const lineName = J.dg.line[k] && ((window.digiData(J.dg.line[k]) || {}).name || J.dg.line[k]);
  const std = next.filter(e => e.n === lineName);
  const stdList = std.length ? std : next.filter(e => e.main);
  if (!J.branch && stdList.length && top !== 'dark' && (natural.includes(top) || balanced)) {
    const ok = stdList.filter(e => { const a = attrOf(e.n); return want === 'vir' ? a === 'vir' : (a !== 'vir' || J.dg.attr === 'vir'); });
    if (ok.length) return pack(std.length ? ok : ok.slice(0, 3), '정통 진화');
  }
  const ofTop = list => { const m = list.filter(e => traitOfEvo(e.n, k) === top); return m.length ? m : list; };
  if (want === 'vir') {
    const v = next.filter(e => attrOf(e.n) === 'vir');
    if (v.length) return pack(ofTop(v), `${JD.traits[top]} 계열 · 바이러스종`, top);
  }
  const virusOk = t.dark >= statSum() * .15;       // 어둠이 거의 없으면 바이러스종은 빼요
  const okPool = next.filter(e => virusOk || attrOf(e.n) !== 'vir'), pool = ofTop(okPool.length ? okPool : next);
  const best = pool.filter(e => attrOf(e.n) === want || attrOf(e.n) === 'fre');
  return pack(best.length ? best : pool, `${JD.traits[top]} 계열 · ${ATTR[want][0]}종`, top);
}
function decideEvolution(k){
  const c = evoCandidates(k);
  return c.length ? c[Math.floor(Math.random() * c.length)] : null;
}
function applyEvolution(evo){
  J.lastEvoAt = J.exp;
  J.form = evo.name; J.stage = evo.stage; J.label = evo.label || evo.special || stageLabel(evo.stage);
  if (evo.branch) J.branch = evo.branch;
  if (evo.special) J.special = evo.special;
  J.route.push({ form: evo.name, stage: evo.stage, label: J.label, cap: evo.cap || evoCapacity(evo), regions: [], special: evo.special, path: evo.path, src: evo.src });
}
async function playEvolution(evo, kind = 'EVOLUTION'){
  const me = J, cap = evo.cap = evoCapacity(evo), from = J.form, baby = evo.stage < 0;
  const lbl = evo.label || evo.special || stageLabel(evo.stage);
  await window.evoCinematic.play({ from, to: evo.name, partner: evo.partner, desc: infoOf(evo.name), kind, attr: baby ? '' : attrOf(evo.name), fromCap: capacity(from, J.stage), label: baby ? lbl : [lbl, ATTR[attrOf(evo.name)][0]].join(' · '), cap, stage: evo.special ? 4 : evo.stage, fall: evo.fall || null, alive: () => J === me });
  if (J !== me) return;
  await NET.evolveFx({ label: evo.name, img: null, sub: `${kind} · ${evo.label || evo.special || stageLabel(evo.stage)} · ${cap}`, title: `${from}${ga(from)} ${evo.name}${ro(evo.name)} 진화!` });
  if (J !== me) return;
  applyEvolution(evo);
  const healed = addCond(JD.cond.evolveHeal); if (J.exp) J.map[J.exp - 1] = 'evo';
  log(`${from}${ga(from)} ${evo.name}${ro(evo.name)} 진화했어요! (${evo.path} · ${cap})`, 'evo', null, evo.name, null, healed);
}
// 진화 조건: 가장 높은 능력치·능력치 합계·최소 걸음 수
const statTop = () => Math.max(...TRAITS.map(t => J.traits[t]));
const statSum = () => TRAITS.reduce((m, t) => m + J.traits[t], 0);
const evoReady = need => J.exp >= need.steps && statTop() >= need.top && statSum() >= need.total;
async function maybeEvolve(){
  const k = J.stage, need = !J.special && needOf(k);
  if (need && evoReady(need) && J.cond >= JD.cond.evolveMin) { const evo = decideEvolution(k); if (evo) { await playEvolution(evo); return; } }
  // 같은 단계 안에서 이어지는 진화 (모드 체인지 · 암흑진화 · 그 밖의 근거 있는 진화)
  const lat = lateralEvolution();
  if (lat) await playEvolution(lat, lat.kind);
}
/* ---------- 캡슐: 지금 모습에서 아머체로 진화하는 근거가 있는 줄 (디지멘탈은 데이터에 적힌 것, 없으면 jogress 표의 이름으로) ---------- */
function armorEdges(){
  const d = window.digiData && window.digiData(J.form); if (!d) return [];
  const out = [], seen = new Set();
  for (const e of d.evolvesTo) {
    const [n, , src] = e, t = window.digiData(n);
    if (!t || !/아머체/.test(t.level) || seen.has(n) || !window.digiImage(n)) continue;
    const known = JD.digimentals.find(x => x.armor === n), name = e[5] || (known && known.name) || '고대';
    const def = JD.digimentals.find(x => x.name === name) || {};
    seen.add(n); out.push({ name, trait: def.trait || traitOfEvo(n, 1), armor: n, rare: !!def.rare, src });
  }
  return out;
}
/* ---------- 같은 단계 안의 진화 ----------
   진화 데이터에 같은 단계(성숙기 → 성숙기, 궁극체 → 궁극체 …)로 이어지는 근거가 있으면, 성향이 충분히 쌓였을 때 그 모습으로 진화해요.
   - 이름이 이어지면(듀크몬 → 듀크몬: 크림슨 모드) '모드 체인지', 어두운 모습이면 '암흑진화'(어둠 성향이 높아야 해요)
   - 이미 거쳐 온 모습으로는 돌아가지 않아요. 진화한 뒤 lateral.gap 걸음이 지나야 해요
   - 숨겨진 구역의 특별 진화를 한 뒤에도 일어나요 */
const DARK_FORM = /다크|블랙|흑\)|\(흑|폴다운|\(악\)|스컬|배드|매드|카오스|즈왈트|데스|타락|베노|디아블로|바이스|에빌|볼토|오그도/;
const dbAttr = n => DB_ATTR[((window.digiData && window.digiData(n)) || {}).attribute] || '';   // 도감 그대로의 속성 (바이러스종이 아니던 모습이 바이러스종이 되면 암흑진화)
const baseName = n => n.split(/[:(（]/)[0].trim();
function lateralForms(){
  const d = window.digiData && window.digiData(J.form); if (!d) return [];
  const k = stageOfMon(d.name); if (k === null) return [];
  const been = new Set(J.route.map(r => (window.digiData(r.form) || {}).name || r.form)), isX = /(X항체)/.test(d.name);
  return d.evolvesTo.filter(e => { const [n] = e, t = window.digiData(n);
    return t && soloEdge(e) && n !== d.name && !been.has(n) && stageOfMon(n) === k && !/아머체|하이브리드체/.test(t.level)
      && /(X항체)/.test(n) === isX && window.digiImage(n); })
    .map(([n, main, src]) => ({ n, main: !!main, src, dark: DARK_FORM.test(n) || (dbAttr(n) === 'vir' && dbAttr(d.name) !== 'vir') }));
}
function lateralEvolution(){
  const L = JD.lateral, k = Math.min(J.stage, 3), need = L.need[k];
  if (!need || J.exp - (J.lastEvoAt || 0) < L.gap || J.cond < JD.cond.evolveMin) return null;
  if (statTop() < need.top || statSum() < need.total || Math.random() > L.chance[k]) return null;
  const t = J.traits, top = [...TRAITS].sort((a, b) => t[b] - t[a])[0], darkOk = top === 'dark' || t.dark >= statSum() * L.darkShare;
  let list = lateralForms().filter(e => e.dark ? darkOk : top !== 'dark');
  if (!list.length) return null;
  const fit = list.filter(e => e.dark ? top === 'dark' : traitOfEvo(e.n, k) === top); if (fit.length) list = fit;
  const mains = list.filter(e => e.main); if (mains.length) list = mains;
  const e = list[Math.floor(Math.random() * list.length)];
  const mode = baseName(e.n) === baseName((window.digiData(J.form) || {}).name || J.form);
  const path = e.dark ? '암흑진화' : mode ? '모드 체인지' : '이어진 진화';
  return { name: e.n, stage: J.stage, label: J.special ? J.label : `${stageLabel(J.stage)} · ${path}`, path, src: e.src, attr: attrOf(e.n),
    kind: e.dark ? 'DARK EVOLUTION' : mode ? 'MODE CHANGE' : 'EVOLUTION', keepSpecial: true };
}

/* ---------- hidden zones: conditions are never shown on screen ---------- */
const secretDef = name => JD.secrets.find(d => d.region === name);
function ruleMet(rule){
  const names = [...J.visited].map(id => NET.regionName(id));
  if (rule.seq && !(J.recent.length >= rule.seq.length && rule.seq.every(n => J.recent.slice(-rule.seq.length).includes(n)))) return false;
  if (rule.visit && !rule.visit.every(n => names.includes(n))) return false;
  if (rule.trait && !Object.entries(rule.trait).every(([k, v]) => J.traits[k] >= v)) return false;
  if (rule.max && !Object.entries(rule.max).every(([k, v]) => J.traits[k] <= v)) return false;
  return true;
}
function checkUnlocks(){
  for (const d of JD.secrets) {
    const id = NET.regionId(d.region);
    if (id < 0 || NET.unlocked.has(id) || !ruleMet(d.rule)) continue;
    NET.unlock(id);
    log(`✦ 어딘가에서 낯선 신호가 잡혔어요. 숨겨진 구역 「${d.region}」${ga(d.region)} 지도에 나타났어요! 지도를 축소해서 찾아보세요.`, 'secret');
  }
  // 여정의 끝 구역 (사건의 지평선)
  const hz = NET.regionId(JD.horizon.region);
  if (hz >= 0 && !NET.unlocked.has(hz) && J.exp >= JD.horizon.at) { NET.unlock(hz); log(JD.horizon.found, 'secret'); }
}
function specialEvolution(d){
  if (!d) return null;
  // 타락 (어비스의 fall 표): 천사가 어둠에 물들어 다시 한 번 진화해요
  // 표에 없어도, 지금 모습에서 같은 단계의 어두운 모습으로 진화하는 근거가 있으면 그 모습으로 타락해요
  const darkLat = d.fall ? lateralForms().filter(e => e.dark) : [];
  const fallen = d.fall && (d.fall[J.form] || (darkLat.find(e => e.main) || darkLat[0] || {}).n);
  if (fallen) return { name: fallen, stage: 4, special: '타천사', path: '심연으로 타락', sub: 'FALL DOWN', src: evoSrc(J.form, fallen) };
  // X항체: 이미 특별 진화한 모습도 X항체를 받아들일 수 있어요 (도감에 그 X항체 모습이 있을 때만, 한 번만)
  if (J.special && d.suffix === 'X') {
    if (/X$/.test(J.form) || J.special === d.special) return null;
    const x = window.digiData && window.digiData(J.form + 'X');
    if (x && /\(X항체\)$/.test(x.name)) return { name: J.form + 'X', stage: 4, special: d.special, path: d.path, sub: d.sub, src: evoSrc(J.form, J.form + 'X') };
    // 이름이 다른 X항체로 진화하는 근거가 있으면 그쪽으로 (같은 단계 · 그림 있음)
    const cur = window.digiData && window.digiData(J.form), xs = cur ? cur.evolvesTo.filter(e => /\(X항체\)$/.test(e[0]) && soloEdge(e) && stageOfMon(e[0]) === stageOfMon(cur.name) && window.digiImage(e[0])) : [];
    const xe = xs.find(e => e[1]) || xs[0];
    return xe ? { name: xe[0], stage: 4, special: d.special, path: d.path, sub: d.sub, src: xe[2] } : null;
  }
  if (J.special) return null;
  const en = J.dg.en, ult = J.stage >= 3 ? J.form : ([...J.dg.line].reverse().find(n => n && n !== '?') || J.form);
  let name = d.forms && d.forms[en];
  if (!name && d.pool) name = d.pool.includes(J.form) ? J.form : d.pool.includes(ult) ? ult : null;
  // 지금 모습에서 그 무리로 진화한다는 근거가 있으면 그쪽을 먼저 골라요
  const sourced = !name && d.pool ? d.pool.filter(n => evolvesInto(J.form, n)) : [];
  if (!name && sourced.length) name = sourced[hash(en + d.region) % sourced.length];
  if (!name && d.suffix) name = ult + d.suffix;
  if (!name) name = d.pool[hash(en + d.region) % d.pool.length];
  return { name, stage: 4, special: d.special, path: d.path, sub: d.sub, src: evoSrc(J.form, name) };
}

/* ---------- travel to a region, then roam inside it ---------- */
async function travel(region){
  if (!J || J.busy || busy || !card.hidden) return;
  if (region === -2) { log('아직 신호가 닿지 않는 구역이에요.', 'sys'); return; }
  if (region < 0 || !NET.isOpen(region)) return;
  const me = J, secret = NET.isSecretRegion(region), finale = NET.regionName(region) === JD.horizon.region;
  const evo = secret && !finale && J.stage >= 0 ? specialEvolution(secretDef(NET.regionName(region))) : null;
  const opts = {};
  if (evo) window.evoCinematic.preload(evo.name);
  J.busy = true; NET.hover = -1; $('journey').classList.add('busy');
  const res = await NET.travelTo(region, opts);
  if (J !== me) return;
  if (!res) { J.busy = false; $('journey').classList.remove('busy'); return; }
  const name = res.region.name;
  J.moves++; J.visited.add(region);
  if (!secret) { J.recent.push(name); J.recent = J.recent.slice(-5); }
  J.route[J.route.length - 1].regions.push(name.replace(' 네트워크', ''));
  const evs = finale ? JD.horizon.arrive : byName(JD.events, name) || ['새로운 노드에 도착했어요.'];
  log(`${name}에 도착했어요. ${pickFrom(evs)}`, 'arrive');
  if (finale) {
    // 사건의 지평선: 더 돌아다니지 않고, 그 자리에서 여정을 마무리해요
    NET.setStay(true, region);
    if (!(await sleep(JD.roamPause, me))) return;
    log(`${J.form}${wa(J.form)} ${JD.horizon.finale}`, 'rare');
    J.horizon = true; J.ended = true; renderJourney();
    if (!(await sleep(JD.roamPause * .8, me))) return;
    J.busy = false; $('journey').classList.remove('busy'); NET.setStay(false); idleStatus();
    showLog(true); return;
  }
  if (evo) {
    const from = J.form, fromCap = J.route[J.route.length - 1].cap; evo.cap = evoCapacity(evo);
    await window.evoCinematic.play({ from, to: evo.name, desc: infoOf(evo.name), kind: 'SPECIAL EVOLUTION', attr: attrOf(evo.name), label: evo.special, cap: evo.cap, fromCap, stage: 4, alive: () => J === me });
    if (J !== me) return;
    applyEvolution(evo); if (J.exp) J.map[J.exp - 1] = 'evo';
    log(`${from}${ga(from)} ${evo.name}${ro(evo.name)} 진화했어요! (${evo.special} · ${evo.cap})`, 'evo sp', null, evo.name);
  }
  checkUnlocks();
  await roam(res.region, me);
  if (J !== me) return;
  J.busy = false; $('journey').classList.remove('busy');
  idleStatus(); renderJourney();
  if (!J.ended && J.exp >= JD.journeyEnd) { J.ended = true; setTimeout(() => showLog(true), 600); }
}
async function roam(region, me){
  NET.setStay(true, region.id);
  const steps = randInt(JD.roamSteps);
  if (!(await sleep(JD.roamPause * .6, me))) return;
  for (let i = 0; i < steps; i++) {
    if (i > 0) { await NET.wander(region.id, `${region.name} 탐험 중 · ${i + 1} / ${steps}`); if (J !== me) return; }
    J.exp++; applyFocus();
    const jg = jogPair();
    if (jg && bondOf(jg.b) >= JD.bond.jogress && J.exp - J.lastJog >= 4) {
      // 갈림길: 짝과 마음이 하나가 되면 조그레스를 할지 물어요 (고르지 않으면 몇 걸음 뒤에 다시)
      J.lastJog = J.exp; mark('bond');
      await offerChoice(region, `${jg.b}${ga(jg.b)} 곁에서 함께 빛나고 있어요.`, [
        { text: `${jg.b}${wa(jg.b)} 힘을 합쳐 조그레스 진화한다`, fx: gain({ friend: 2 }, JD.statGain.choice), kind: 'jogress', jg },
        { text: '아직은 지금의 모습으로 함께 여행한다', fx: gain({ friend: 1 }, JD.statGain.choice), mon: jg.b, bond: 2 },
      ], JD.forks.jogress.q);
    } else if (Math.random() < (i === 0 ? JD.pace.choiceArrive : JD.pace.choiceRoam)) {
      const arrived = i === 0 ? [...J.log].reverse().find(l => l.cls === 'arrive') : null;
      await offerChoice(region, arrived ? arrived.text : '');
    } else await stepEvent(region);
    if (J !== me) return;
    mark('daily');
    await maybeEvolve(); if (J !== me) return;
    checkUnlocks();
    if (!(await sleep(JD.roamPause, me))) return;
  }
  log(`${region.name} 탐험을 마쳤어요. 다음으로 갈 구역을 골라 주세요.`, 'sys');
  NET.setStay(false);
}

/* ---------- 선택지: 행동 선택(가끔) · 갈림길(조그레스 · 캡슐 · 위기 · 친구 · 되돌아온 일) ---------- */
const choiceEl = $('choice');
let choiceDone = null;
function hideChoice(){
  choiceEl.classList.remove('in'); choiceEl.hidden = true; netEl.classList.remove('choosing');
  if (J) J.choosing = false;
}
function buildOptions(region){
  const net = region.name, r = Math.random;
  const dark = JD.darkNets.some(k => net.includes(k)), light = JD.lightNets.some(k => net.includes(k));
  const mons = wildOf(net);
  // weight actions by the network's tone, then take 3 that lean different ways
  const weighted = JD.actions.map(a => {
    let w = 1 + r();
    if (dark) w += (a.fx.dark || 0) * .8;
    if (light) w += ((a.fx.friend || 0) + (a.fx.wisdom || 0)) * .5 - (a.fx.dark || 0) * .4;
    return { a, w };
  }).sort((x, y) => y.w - x.w);
  const picks = [], used = new Set();
  for (const { a } of weighted) { const main = Object.keys(a.fx).sort((p, q) => a.fx[q] - a.fx[p])[0]; if (used.has(main)) continue; used.add(main); picks.push(a); if (picks.length === 3) break; }
  return picks.map(a => { const m = monFor(a, mons); return { text: fill(a.t, net, m), fx: gainC(a.fx, JD.statGain.choice), mon: m, bond: actBond(a.fx), src: a }; });
}
let autoTimer = 0;
// 자동 선택: 모험 방향과 가장 잘 맞는 선택지를 미리 골라 두고, 시간이 지나면 그걸로 정해요
function autoPick(opts){
  const f = JD.focus[J.focus] || {}, t = f.trait;
  let best = 0, bs = -1e9;
  opts.forEach((o, i) => {
    let sc = Math.random() * 3 + (o.kind ? 60 : 0) + (t && o.fx ? (o.fx[t] || 0) : 0) + (J.focus === 'rest' || J.cond < 45 ? (o.cond || 0) * 1.5 : 0) + (o.bond || 0) * .3;
    if (sc > bs) { bs = sc; best = i; }
  });
  return best;
}
function offerChoice(region, context = '', custom = null, question = ''){
  clearTimeout(toastTimer); toastEl.classList.remove('in'); toastEl.hidden = true;
  const opts = custom || buildOptions(region);
  if (!custom) mark('choice');
  J.choices++;
  J.choosing = true; netEl.classList.add('choosing');
  const auto = autoOn(), pre = autoPick(opts), wait = JD.pace.autoPickMs / (NET.speed || 1);
  choiceEl.innerHTML = `
    <div class="tag">${custom ? 'TURNING POINT' : 'CHOICE'} · ${esc(region.en)}</div>
    ${context ? `<p class="c-ctx">${esc(context)}</p>` : ''}
    <h3>${esc(question || `${region.name}에서 ${J.form}${wa(J.form)} 무엇을 할까요?`)}</h3>
    ${auto ? `<div class="c-auto" aria-hidden="true"><i style="animation-duration:${wait}ms"></i><span>자동 선택</span></div>` : ''}
    <div class="c-opts">${opts.map((o, i) => `<button class="c-opt${o.kind === 'bond' ? ' bondopt' : o.kind ? ' special' : ''}${auto && i === pre ? ' pre' : ''}" type="button" data-i="${i}"><span>${esc(o.text)}</span>
      <em>${o.kind ? `<i class="${o.kind === 'bond' ? 't-bondk' : 't-special'}">${{ jogress: '조그레스 진화', capsule: '캡슐진화', bond: '조그레스 짝' }[o.kind]}</i>` : ''}${fxChips(o.fx)}${bondChip(o.mon && o.bond ? { mon: o.mon, d: Math.max(-bondOf(o.mon), Math.min(JD.bond.max - bondOf(o.mon), o.bond)) } : null)}${condChip(o.cond)}</em></button>`).join('')}</div>`;
  choiceEl.hidden = false; requestAnimationFrame(() => choiceEl.classList.add('in'));
  return new Promise(res => {
    choiceDone = res;
    const pick = async i => { clearTimeout(autoTimer); if (choiceDone !== res) return; choiceDone = null; await choose(opts[i]); res(); };
    choiceEl.querySelectorAll('.c-opt').forEach(b => b.onclick = () => pick(+b.dataset.i));
    choiceEl.querySelector('.c-opt').focus({ preventScroll: true });
    clearTimeout(autoTimer);
    if (auto) autoTimer = setTimeout(() => pick(pre), wait);
  });
}
async function choose(opt){
  hideChoice();
  addTraits(opt.fx);
  const c = addCond(opt.cond || 0), bd = addBond(opt.mon, opt.bond);
  log(opt.fork ? `→ ${opt.text}` : opt.text, 'pick', opt.fx, null, bd, c);
  bondUp(bd);
  scheduleChain(opt);
  if (opt.kind === 'jogress') {
    J.jogressed = true; J.jogPartner = opt.jg.b;
    const st = Math.max(J.stage, opt.jg.stage);
    await playEvolution({ name: opt.jg.result, stage: st, label: `${stageLabel(st)} · 조그레스`, path: `조그레스 진화 (${J.form} + ${opt.jg.b})`, partner: opt.jg.b, src: opt.jg.src || evoSrc(J.form, opt.jg.result) }, 'JOGRESS EVOLUTION');
  } else if (opt.kind === 'capsule') {
    J.capsuled = true;
    await playEvolution({ name: opt.dm.armor, stage: 1, label: '아머체', path: `캡슐진화 · ${opt.dm.name}의 디지멘탈`, src: opt.dm.src }, 'CAPSULE EVOLUTION');
  }
}

/* ---------- 시점 고정(1인칭) 토글 — 켜 두면 구역 사이를 이동할 때 1인칭으로 봐요. 이 브라우저에 기억해요 ---------- */
const fpvBtn = $('fpv');
function updateInset(){ const j = $('journey'); NET.viewInset = (!j.hidden && innerWidth > 640) ? Math.max(0, innerWidth - j.getBoundingClientRect().left) : 0; }
addEventListener('resize', updateInset);
function setFpv(on){
  NET.setFpv(on); fpvBtn.setAttribute('aria-pressed', on ? 'true' : 'false'); fpvBtn.classList.toggle('on', on);
  try { localStorage.setItem('digi-fpv', on ? '1' : '0'); } catch (e) {}
}
fpvBtn.addEventListener('click', () => {
  const on = fpvBtn.getAttribute('aria-pressed') !== 'true'; setFpv(on);
  if (J) toast(on ? '시점 고정을 켰어요. 구역 사이를 이동할 때 1인칭으로 보여요.' : '시점 고정을 껐어요.', 'sys');
});
try { setFpv(localStorage.getItem('digi-fpv') === '1'); } catch (e) { setFpv(false); }

/* ---------- 디지몬 정보 팝오버 (패널 위쪽 이름 / 루트 카드를 누르면) ---------- */
const infoEl = $('jInfo');
function openInfo(i){
  if (!J) return;
  const r = J.route[i] || J.route[J.route.length - 1], name = r.form, rook = window.DIGI.find(x => x.ko === name);
  const pic = picOf(name), now = i === J.route.length - 1, dd = window.digiData && window.digiData(name);
  const chips = [
    `<span class="chip ${r.special ? 'sp' : ''}">${esc(r.label)}</span>`,
    `<span class="chip cap">${esc(r.cap)}</span>`,
    `<span class="chip attr ${ATTR[attrOf(name)][1]}">${ATTR[attrOf(name)][0]}</span>`,
    (dd && dd.type && dd.type !== '-') || rook ? `<span class="chip">${esc(dd && dd.type && dd.type !== '-' ? dd.type : rook.type)}</span>` : '',
  ].join('');
  const rows = dd ? [
    dd.level && dd.level !== r.label ? ['도감 등급', dd.level] : null,
    dd.attacks && dd.attacks.length ? ['필살기', dd.attacks.join(' · ')] : null,
    dd.related && dd.related.length ? ['관련된 디지몬', dd.related.slice(0, 8).join(' · ')] : null,
  ].filter(Boolean).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('') : '';
  infoEl.innerHTML = `
    <button class="ji-x" type="button" aria-label="닫기">×</button>
    ${pic ? `<div class="ji-pic"><img src="${esc(pic)}" alt="${esc(name)}"></div>` : ''}
    <div class="ji-body">
      <div class="ji-tag">${now ? 'NOW · 지금 모습' : `ROUTE ${i + 1} · 지나온 모습`}</div>
      <h3>${esc(name)}</h3>
      <div class="chips">${chips}</div>
      <p>${esc(infoOf(name) || '아직 알려진 기록이 없는 디지몬이에요.')}</p>
      <dl>
        <dt>진화 경로</dt><dd>${esc(r.path || '—')}</dd>${r.src ? `<dt>진화 근거</dt><dd>${esc(r.src)} <small>(Wikimon)</small></dd>` : ''}
        <dt>다녀간 구역</dt><dd>${r.regions.length ? esc(r.regions.join(' · ')) : (now ? '아직 없어요' : '—')}</dd>
        ${rows}
      </dl>
    </div>`;
  infoEl.hidden = false; infoEl.dataset.i = i;
  $('jWho').setAttribute('aria-expanded', 'true');
  infoEl.querySelector('.ji-x').addEventListener('click', closeInfo);
}
function closeInfo(){ infoEl.hidden = true; $('jWho').setAttribute('aria-expanded', 'false'); }
$('jWho').addEventListener('click', e => { e.stopPropagation(); if (!infoEl.hidden && +infoEl.dataset.i === J.route.length - 1) closeInfo(); else openInfo(J.route.length - 1); });
$('jRoute').addEventListener('click', e => { const li = e.target.closest('li[data-i]'); if (!li) return; e.stopPropagation(); const i = +li.dataset.i; if (!infoEl.hidden && +infoEl.dataset.i === i) closeInfo(); else openInfo(i); });
$('jRoute').addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('li[data-i]')) { e.preventDefault(); e.target.click(); } });
document.addEventListener('click', e => { if (!infoEl.hidden && !infoEl.contains(e.target)) closeInfo(); });

/* ---------- panel ---------- */
function renderJourney(){
  if (!J) return;
  $('jStage').textContent = J.label;
  $('jStage').classList.toggle('sp', !!J.special);
  $('jName').textContent = J.form;
  $('jPic').innerHTML = picTag(J.form, 'j-pic-img'); $('jPic').hidden = !picOf(J.form);
  $('jCap').textContent = capacity(J.form, J.stage);
  $('jMoves').textContent = `이동 ${J.moves} · ${J.exp}걸음`;
  $('jRoute').innerHTML = J.route.map((r, i) => `<li class="${r.special ? 'sp' : ''}" data-i="${i}" tabindex="0" role="button" aria-label="${esc(r.form)} 자세히 보기">${picTag(r.form, 'r-pic')}<b>${esc(r.form)}</b><small>${r.regions.length ? esc(r.regions.join('·')) : (i === J.route.length - 1 ? '지금 여기' : '—')}</small></li>`).join('');
  $('jRoute').scrollLeft = $('jRoute').scrollWidth;
  $('jTraits').innerHTML = TRAITS.map(t => `<div class="tr t-${t}"><span>${JD.traits[t]}</span><div class="bar"><i style="width:${J.traits[t] / JD.statMax * 100}%"></i></div><b>${J.traits[t]}</b></div>`).join('');
  $('jBonds').innerHTML = bondsHTML(); fillSil($('jBonds'));
  const w = curWorld(), cl = J.cond < JD.cond.low ? 'low' : J.cond < 60 ? 'mid' : '';
  $('jStatus').innerHTML = `<div class="cond ${cl}" title="컨디션: 다치면 내려가고 걸음마다 회복해요. ${JD.cond.low} 아래면 성장이 절반, ${JD.cond.evolveMin} 아래면 진화가 미뤄져요"><span>컨디션</span><div class="bar"><i style="width:${J.cond}%"></i></div><b>${J.cond}</b></div>` +
    (w ? `<span class="world" title="${esc(w.start)}">🌐 ${esc(w.name)} · ${Math.max(0, J.world.until - J.exp)}걸음</span>` : '');
  const fc = JD.focus[J.focus] || JD.focus.free;
  $('jFocus').innerHTML = `<span class="f-h">모험 방향</span><div class="f-list">${Object.entries(JD.focus).map(([k, f]) => `<button type="button" class="f-b${k === J.focus ? ' on' : ''}" data-f="${k}" role="radio" aria-checked="${k === J.focus}" title="${esc(f.desc)}"><i aria-hidden="true">${f.icon}</i>${esc(f.name)}</button>`).join('')}</div><p class="f-desc">${esc(fc.desc)}</p>`;
  $('jLog').innerHTML = J.log.slice(-6).map(l => `<li class="${l.cls}">${esc(l.text)}${chipsOf(l.fx, l.bond, l.cond) ? ' ' + chipsOf(l.fx, l.bond, l.cond) : ''}</li>`).join('');
  $('jLog').scrollTop = $('jLog').scrollHeight;
  $('jProg').style.width = Math.min(100, J.exp / JD.journeyEnd * 100) + '%';
  const nx = J.special ? null : needOf(J.stage);
  const found = JD.secrets.filter(d => NET.unlocked.has(NET.regionId(d.region)));
  const cands = nx ? evoCandidates(J.stage) : [];
  const pred = cands.length ? `<div class="j-pred"><span class="jp-h">다음 진화 예상${cands.length > 1 ? ` · ${cands.length}개 중 하나` : ''}<em>${esc(cands[0].path)}</em></span><div class="jp-list">${cands.slice(0, 6).map(c => `<span class="jp" title="아직 알 수 없는 디지몬">${silTag(c.name)}<b>???</b><i class="${ATTR[c.attr][1]}">${ATTR[c.attr][0]}</i></span>`).join('')}</div></div>` : '';
  $('jSecret').innerHTML = pred + (nx ? `<p class="j-next">다음 진화 조건 · <span class="${statTop() >= nx.top ? 'ok' : ''}">가장 높은 능력치 ${statTop()}/${nx.top}</span> · <span class="${statSum() >= nx.total ? 'ok' : ''}">합계 ${statSum()}/${nx.total}</span>${J.exp < nx.steps ? ` · <span>${nx.steps - J.exp}걸음 더</span>` : ''} · <span class="${J.cond >= JD.cond.evolveMin ? 'ok' : ''}">컨디션 ${J.cond}/${JD.cond.evolveMin}</span>${cands.length ? '' : ' · <span>알려진 다음 진화가 없어요</span>'}</p>` : '') +
    (found.length ? `<p class="hint open" title="지도를 축소해서 찾아보세요">✦ 열린 숨겨진 구역 ${found.map(d => `<span class="zone">${esc(d.region)}</span>`).join('')}</p>` : '');
  fillSil($('jSecret'));
  $('jEnd').disabled = J.busy;
  if (!infoEl.hidden) openInfo(Math.min(+infoEl.dataset.i, J.route.length - 1));   // 열려 있으면 새 정보로
}
// 친밀도 목록: 지금 모습의 조그레스 짝(못 만났으면 실루엣)을 맨 위에, 그다음 친한 순서로 최대 3명
function bondsHTML(){
  const jg = jogPair(), rows = [];
  if (jg) rows.push([jg.b, bondOf(jg.b), 'pair']);
  if (J.jogPartner) rows.push([J.jogPartner, bondOf(J.jogPartner), 'done']);
  Object.entries(J.bonds).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
    .forEach(([n, v]) => { if (rows.length < 3 && !rows.some(r => r[0] === n)) rows.push([n, v, '']); });
  if (!rows.length) return '<p class="b-empty">♥ 여행하며 만난 디지몬과 친해지면 여기에 친밀도가 쌓여요.</p>';
  return `<ul class="b-list" aria-label="친밀도">${rows.map(([n, v, role]) => {
    const met = v > 0, ready = role === 'pair' && v >= JD.bond.jogress;
    const tag = role === 'pair' ? `<i class="b-tag${ready ? ' ready' : ''}">${ready ? '조그레스 가능!' : `조그레스 짝 · ${JD.bond.jogress} 필요`}</i>` : role === 'done' ? '<i class="b-tag done">조그레스 완료</i>' : '';
    return `<li class="${role}${ready ? ' ready' : ''}">${met ? (picTag(n, 'b-pic') || '<span class="b-pic"></span>') : silTag(n)}
      <div class="b-main"><div class="b-top"><b>${met ? esc(n) : '???'}</b><small>${met ? bondTier(v) : '아직 만나지 못했어요'}</small>${tag}</div>
      <div class="b-bar"${role === 'pair' ? ` style="--need:${JD.bond.jogress}%"` : ''}><i style="width:${v}%"></i></div></div><em>${v}</em></li>`;
  }).join('')}</ul>`;
}
// 여정 지도: 한 칸이 한 걸음. 무슨 일이 있었는지 색으로 보여요
function journeyMap(){
  const n = Math.max(JD.journeyEnd, J.exp), cells = [];
  for (let i = 0; i < n; i++) { const c = J.map[i]; cells.push(`<i${c ? ` style="background:${CAT[c][1]}"` : ''}${c ? ` title="${i + 1}걸음 · ${CAT[c][0]}"` : ''}></i>`); }
  const cnt = {}; J.map.forEach(c => { if (c) cnt[c] = (cnt[c] || 0) + 1; });
  const legend = Object.keys(CAT).filter(k => cnt[k]).map(k => `<span><i style="background:${CAT[k][1]}"></i>${CAT[k][0]} ${cnt[k]}</span>`).join('');
  return `<div class="jmap"><div class="jmap-h">여정 지도 <small>한 칸 = 한 걸음 · 갈림길에서 고른 횟수 ${J.choices}번</small></div><div class="jmap-grid">${cells.join('')}</div><div class="jmap-legend">${legend}</div></div>`;
}
function showLog(final = false){
  if (!J || J.busy) return;
  $('journey').hidden = true; hideChoice();
  const sp = J.special;
  const topT = [...TRAITS].sort((a, b) => J.traits[b] - J.traits[a])[0];
  const best = Object.entries(J.bonds).sort((a, b) => b[1] - a[1])[0];
  card.innerHTML = `
    <div class="tag">${final ? 'JOURNEY COMPLETE' : 'JOURNEY LOG'}${J.horizon ? ' · EVENT HORIZON' : ''} · ${J.moves} TRIPS · ${J.exp} STEPS · ${J.visited.size} REGIONS</div>
    ${final ? `<p class="eyebrow">${J.horizon ? '사건의 지평선 너머로' : '여행의 끝'}</p>` : ''}
    ${picOf(J.form) ? `<div class="sum-pic">${picTag(J.form, '')}</div>` : ''}
    <h2 class="sum-title">${esc(J.form)}</h2>
    <p class="cap-line">${esc(J.label)} · ${capacity(J.form, J.stage)}</p>
    <p class="desc">${esc(J.dg.ko)}${wa(J.dg.ko)} 함께 ${J.moves}번 이동하고 ${J.exp}걸음을 걸으며 ${J.visited.size}개 구역을 여행했어요. 가장 강한 성향은 <b class="spt">${JD.traits[topT]}</b>${bat(JD.traits[topT]) > 0 ? '이에요' : '예요'}.${best && best[1] > 0 ? ` 가장 친한 친구는 <b class="spt">${esc(best[0])}</b>(${bondTier(best[1])} · 친밀도 ${best[1]})${bat(best[0]) > 0 ? '이에요' : '예요'}.` : ''}${sp ? ` 숨겨진 구역을 찾아 <b class="spt">${sp}</b>${ro(sp)} 특별 진화했어요!` : ''}${J.horizon ? ' 그리고 마침내 네트워크의 가장 먼 끝, <b class="spt">사건의 지평선</b>에 닿아 여정을 마쳤어요.' : ''}</p>
    ${journeyMap()}
    <ol class="timeline">${J.route.map(r => `<li class="${r.special ? 'sp' : ''}"><span class="st">${esc(r.label)}<br>${esc(r.cap)}</span><b>${picTag(r.form, 'tl-pic')}${esc(r.form)}</b><small>${esc(r.path)}${r.regions.length ? ' · ' + esc(r.regions.join(' → ')) : ''}</small></li>`).join('')}</ol>
    <div class="actions">
      <button class="ghost primary" id="jCont" type="button">${J.horizon ? '지평선을 벗어나 계속 여행하기' : '계속 여행하기'}</button>
      <button class="ghost" id="jCopy" type="button">기록 복사</button>
      <button class="ghost" id="jHome2" type="button">처음으로</button>
    </div>`;
  card.hidden = false; card.scrollTop = 0;
  requestAnimationFrame(() => card.classList.add('in'));
  $('jCont').onclick = () => { hideCard(); $('journey').hidden = false; renderJourney(); idleStatus(); };
  $('jHome2').onclick = closeNet;
  $('jCopy').onclick = async e => {
    const txt = `나의 파트너 ${J.dg.ko}의 진화 루트: ${J.route.map(r => `${r.form}(${r.cap})`).join(' → ')} · ${J.exp}걸음`;
    try { await navigator.clipboard.writeText(txt); e.target.textContent = '복사했어요'; } catch { e.target.textContent = txt; }
  };
  $('jCont').focus({ preventScroll: true });
}

const netc = $('netc');
netc.addEventListener('pointermove', e => { if (J && !J.busy && card.hidden && !NET.pinching) NET.hover = NET.regionAt(e.clientX, e.clientY); });
netc.addEventListener('pointerleave', () => { NET.hover = -1; });
netc.addEventListener('click', e => { if (J && !J.busy && !NET.pinching) travel(NET.regionAt(e.clientX, e.clientY)); });
// 개발용: 주소 끝에 #debug를 붙이면 콘솔에서 __digi.travel(구역번호)로 이동을, __digi.evolve({name, stage, label, partner}, 'JOGRESS EVOLUTION')로 진화 연출을 시험할 수 있어요
if (location.hash === '#debug') window.__digi = { map: journeyMap, bond: (n, v) => { J.bonds[n] = v; renderJourney(); }, travel, evolve: playEvolution, candidates: k => evoCandidates(k ?? J.stage), lateral: () => lateralForms(), latEvo: () => lateralEvolution(), jog: () => jogPair(), armors: () => armorEdges(), special: name => specialEvolution(secretDef(name)), fallForm: () => fallForm(), loss: friend => bondLoss({ name: NET.regionName(NET.currentRegion()) || 'DEEP WEB' }, friend, fallForm()), baby: dg => babyLine(dg || J.dg), render: () => renderJourney(), net: NET, get journey(){ return J; } };
$('jEnd').addEventListener('click', () => showLog());
$('jFocus').addEventListener('click', e => {
  const b = e.target.closest('[data-f]'); if (!b || !J || b.dataset.f === J.focus) return;
  J.focus = b.dataset.f; try { localStorage.setItem('digi-focus', J.focus); } catch (er) {}
  log(`모험 방향을 「${JD.focus[J.focus].name}」${ro(JD.focus[J.focus].name)} 바꿨어요. ${JD.focus[J.focus].desc}`, 'sys');
});
function autoOn(){ return $('jAuto').getAttribute('aria-pressed') === 'true'; }
function setAuto(on){ $('jAuto').setAttribute('aria-pressed', on ? 'true' : 'false'); $('jAuto').classList.toggle('on', on); try { localStorage.setItem('digi-auto', on ? '1' : '0'); } catch (er) {} }
$('jAuto').addEventListener('click', () => setAuto(!autoOn()));
try { setAuto(localStorage.getItem('digi-auto') === '1'); } catch (er) { setAuto(false); }
$('jHome').addEventListener('click', closeNet);
document.querySelectorAll('#rot [data-rot]').forEach(b => {
  const [dr, dp] = b.dataset.rot.split(',').map(Number); let t = 0;
  const stop = () => { clearInterval(t); t = 0; };
  b.addEventListener('pointerdown', e => { e.preventDefault(); stop(); NET.rotateBy(dr * .06, dp * .05); t = setInterval(() => NET.rotateBy(dr * .03, dp * .025), 16); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, stop));
  b.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); NET.rotateBy(dr * .15, dp * .12); } });
});
document.querySelector('#rot [data-reset]').addEventListener('click', () => NET.resetView());
$('jFast').addEventListener('click', e => {
  NET.speed = NET.speed > 1 ? 1 : 3;
  e.currentTarget.classList.toggle('on', NET.speed > 1);
  e.currentTarget.textContent = NET.speed > 1 ? '보통 속도 ▶' : '빠르게 ▶▶';
});

$('netSkip').addEventListener('click', () => { if (window.evoCinematic.active) window.evoCinematic.skip(); else NET.skip(); });
addEventListener('keydown', e => {
  if (e.key !== 'Escape' || netEl.hidden) return;
  if (!infoEl.hidden) { closeInfo(); return; }
  if (window.evoCinematic.active) window.evoCinematic.skip(); else if (busy || (J && J.busy)) NET.skip(); else closeNet();
});

$('randomGo').addEventListener('click', randomStart);
$('f').addEventListener('submit', e => {
  e.preventDefault();
  const inp = read();
  if (typeof inp === 'string') { $('err').textContent = inp; return; }
  $('err').textContent = ''; roll = 0;
  run(inp);
});
})();
