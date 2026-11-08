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
const bat = w => { w = String(w).replace(/(\s*\([^)]*\))+\s*$/, ''); const c = w.charCodeAt(w.length - 1); return (c >= 0xAC00 && c <= 0xD7A3) ? (c - 0xAC00) % 28 : -1; };
const ga = w => bat(w) > 0 ? '이' : '가', wa = w => bat(w) > 0 ? '과' : '와', eul = w => bat(w) > 0 ? '을' : '를';
const ro = w => { const k = bat(w); return (k <= 0 || k === 8) ? '로' : '으로'; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const TRAITS = Object.keys(JD.traits);
let lastRes = null, J = null;

/* 체급: 같은 이름 + 같은 단계면 언제나 같은 용량 */
function capacity(name, stage){
  const [lo, hi, unit] = JD.capacity[Math.min(stage, JD.capacity.length - 1)];
  const v = lo + (hash(name + '#' + stage) % 1000) / 1000 * (hi - lo);
  return (v >= 10 ? Math.round(v) : v.toFixed(1)) + unit;
}
const pickFrom = (arr, r = Math.random) => arr[Math.floor(r() * arr.length)];
const randInt = ([lo, hi]) => lo + Math.floor(Math.random() * (hi - lo + 1));
const byName = (map, name) => { for (const k in map) if (name.includes(k)) return map[k]; return null; };
const fill = (t, net, mon) => t.replace('{net}', net).replace('{mon}', mon).replace('{을}', eul(mon)).replace('{과}', wa(mon)).replace('{이}', ga(mon));
const wildOf = net => (byName(JD.wildBy, net) || JD.wild).filter(m => m !== J.form && m !== J.dg.ko);
const fxChips = fx => fx ? Object.entries(fx).map(([k, v]) => `<i class="t-${k}">${JD.traits[k]} +${v}</i>`).join('') : '';
const stageLabel = st => JD.stageNames[Math.min(st, 3)];
const picOf = name => window.digiImage(name);
// 디지몬 설명: 진화형은 js/digi-info.js, 성장기 파트너는 data.js 의 d. 'X'·' 솔라 모드'는 기본 형태 설명에 한 줄 더해요
function infoOf(name){
  const I = window.DIGI_INFO || {}, rook = name => { const d = window.DIGI.find(x => x.ko === name); return d && d.d; };
  if (I[name] || rook(name)) return I[name] || rook(name);
  if (/ 솔라 모드$/.test(name)) { const b = infoOf(name.replace(/ 솔라 모드$/, '')); return (b ? b + ' ' : '') + '태양계의 빛을 받아들여 온몸이 태양처럼 빛나는 모습이에요.'; }
  if (/X$/.test(name)) { const b = infoOf(name.slice(0, -1)); return (b ? b + ' ' : '') + 'X항체를 얻어 본래의 힘이 한층 더 깨어난 모습이에요.'; }
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
const jogPair = () => (J && !J.special && !J.jogressed) ? JD.jogress.find(j => j.a === J.form) : null;
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
// 훈련 방침: 걸음마다 조금씩 성장 + 컨디션 회복 (기록에는 남기지 않아요)
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
  // 2) 세계 사건: 끝나거나, 새로 시작
  if (J.world && J.exp >= J.world.until) { const w = curWorld(); J.world = null; mark('world'); log(`🌐 ${w.end}`, 'world'); return; }
  if (!J.world && J.exp > 8 && r() < rate('world')) {
    const i = Math.floor(r() * JD.worlds.length), w = JD.worlds[i];
    J.world = { i, until: J.exp + randInt(w.dur) };
    const fx = gainC(w.fx, JD.statGain.roam); addTraits(fx);
    mark('world'); log(`🌐 세계 사건 · ${w.name} — ${w.start}`, 'world', fx); return;
  }
  // 3) 희귀
  if (r() < rate('rare')) return simpleEvent(pickFrom(JD.rares), 'rare', net, pickFrom(mons));
  // 4) 조그레스 짝이 찾아와요
  if (jg && bondOf(jg.b) < JD.bond.jogress && r() < rate('partner')) {
    const fx = gainC({ friend: 1 }, JD.statGain.roam); addTraits(fx);
    const bd = addBond(jg.b, randInt(JD.bond.partnerGain));
    mark('bond'); log(fill(pickFrom(JD.partnerVisits), net, jg.b), 'bond', fx, jg.b, bd); bondUp(bd); return;
  }
  // 5) 디지멘탈 캡슐 발견 (성장기 · 성숙기)
  if (!J.special && !J.capsuled && J.stage <= 1 && r() < rate('capsule')) {
    const dm = pickFrom(JD.digimentals.filter(d => d.armor !== J.form && (!d.rare || r() < .15)));
    mark('luck'); log(`${net}에서 빛나는 「${dm.name}의 디지멘탈」 캡슐을 발견했어요.`, 'luck');
    return offerChoice(region, `「${dm.name}의 디지멘탈」이 은은하게 빛나고 있어요.`, [
      { text: '캡슐을 열어 캡슐진화한다', fx: gain({ [dm.trait]: 2 }, JD.statGain.choice), kind: 'capsule', dm },
      { text: '지금의 모습을 지키며 캡슐을 그대로 둔다', fx: gain({ wisdom: 1 }, JD.statGain.choice) },
    ], JD.forks.capsule.q);
  }
  // 6) 위기 (어두운 구역에서 더 자주)
  if (r() < rate('danger') * (isDarkNet(net) ? 1.5 : 1)) {
    const d = pickFrom(JD.dangers), mon = pickFrom(mons);
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
  if (r() < rate('luck')) return simpleEvent(pickFrom(JD.lucks), 'luck', net, pickFrom(mons));
  // 9) 지쳤을 때는 쉬어 가요
  if (J.cond < JD.cond.low && r() < .45) { const c = addCond(12); mark('rest'); log(pickFrom(JD.rests), 'rest', null, null, null, c); return; }
  // 10) 구역 고유 사건 · 11) 평범한 하루 — 최근 기록과 같은 문장은 다시 쓰지 않아요
  const recentText = new Set(J.log.slice(-10).map(l => l.text)), recentSrc = new Set(J.log.slice(-10).map(l => l.src));
  const local = (byName(JD.events, net) || []).filter(x => !recentText.has(x) && !recentText.has(`${net}에 도착했어요. ${x}`));
  if (local.length && r() < rate('local') * 1.8) { mark('local'); log(pickFrom(local), 'local'); return; }
  const all = JD.roam.concat(JD.roamMore || []), fresh = all.filter(e => !recentSrc.has(e)), pool = fresh.length ? fresh : all;
  const ev = pickFrom(pool), mon = pickFrom(mons);
  const fx = gainC(ev.fx, JD.statGain.roam); addTraits(fx);
  const bd = addBond(mon, ev.fx && ev.fx.dark ? JD.bond.roamDark : JD.bond.roam);
  mark('daily'); log(fill(ev.t, net, mon), '', fx, null, bd); J.log[J.log.length - 1].src = ev; bondUp(bd);
}
function addTraits(fx){ if (fx) for (const [k, v] of Object.entries(fx)) J.traits[k] = Math.min(JD.statMax, J.traits[k] + v); }

function startJourney(){
  const dg = lastRes.dg;
  J = { dg, stage: 0, form: dg.ko, label: stageLabel(0), moves: 0, exp: 0, ended: false,
        route: [{ form: dg.ko, stage: 0, label: stageLabel(0), cap: capacity(dg.ko, 0), regions: [], path: '시작' }],
        visited: new Set([NET.currentRegion()]), recent: [], special: null, branch: null, capsuled: false, jogressed: false, bonds: {}, jogPartner: null,
        cond: JD.cond.start, focus: savedFocus(), map: [], count: {}, choices: 0, pending: [], world: null, lastJog: -99,
        busy: false, choosing: false, traits: Object.fromEntries(TRAITS.map(t => [t, 0])), log: [] };
  NET.speed = 1; $('jFast').classList.remove('on');
  hideCard(); hideChoice();
  netEl.classList.add('explore'); NET.setExplore(true); NET.setStay(false);
  $('journey').hidden = false;
  requestAnimationFrame(updateInset);
  log(`${dg.ko}${wa(dg.ko)} 함께 여행을 떠나요. 가고 싶은 네트워크 구역을 눌러 보세요. 마우스 휠로 지도를 확대·축소할 수 있어요.`, 'sys');
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
const attrOf = name => (window.DIGI_ATTR || {})[name] || ((window.DIGI.find(d => d.ko === name) || {}).attr) || 'fre';
function wantAttr(){
  const t = J.traits, sum = statSum(), top = [...TRAITS].sort((a, b) => t[b] - t[a])[0];
  if (t.dark > 0 && (top === 'dark' || t.dark >= sum * .3)) return 'vir';
  return t.courage + t.friend >= t.wisdom + t.power ? 'vac' : 'dat';
}
// 다음 단계 후보: 정통 루트 하나이거나, 성향 계열에서 속성이 맞는 여러 후보. 진화할 때 이 중 하나가 무작위로 나와요
function evoCandidates(k){
  const t = J.traits, order = [...TRAITS].sort((a, b) => t[b] - t[a]), top = order[0], gap = t[top] - t[order[1]];
  const want = wantAttr(), natural = J.dg.vibe.map(v => JD.natural[v]), std = J.dg.line[k];
  const balanced = gap < JD.balanceGap && top !== 'dark';
  const pack = (names, path, branch) => names.map(n => ({ name: n, stage: k + 1, path, branch, attr: attrOf(n) }));
  if (!J.branch && std && std !== '?' && top !== 'dark' && (natural.includes(top) || balanced)) {
    const a = attrOf(std);   // 본래 바이러스종 파트너(길몬 등)는 정통 루트가 바이러스여도 그대로
    if (want === 'vir' ? a === 'vir' : (a !== 'vir' || J.dg.attr === 'vir')) return pack([std], '정통 진화');
  }
  const pool = JD.branches[k][top].filter(n => n !== J.form);
  if (want === 'vir') {
    const v = pool.filter(n => attrOf(n) === 'vir');
    if (v.length) return pack(v, `${JD.traits[top]} 계열 · 바이러스종`, top);
    return pack(JD.branches[k].dark.filter(n => n !== J.form), '어둠에 물든 바이러스종', 'dark');
  }
  const virusOk = t.dark >= statSum() * .15;       // 어둠이 거의 없으면 바이러스종은 빼요
  const okPool = pool.filter(n => virusOk || attrOf(n) !== 'vir');
  const best = okPool.filter(n => attrOf(n) === want || attrOf(n) === 'fre');
  const list = best.length ? best : okPool.length ? okPool : pool;
  return pack(list, `${JD.traits[top]} 계열 · ${ATTR[want][0]}종`, top);
}
function decideEvolution(k){
  const c = evoCandidates(k);
  return c[Math.floor(Math.random() * c.length)];
}
function applyEvolution(evo){
  J.form = evo.name; J.stage = evo.stage; J.label = evo.label || evo.special || stageLabel(evo.stage);
  if (evo.branch) J.branch = evo.branch;
  if (evo.special) J.special = evo.special;
  J.route.push({ form: evo.name, stage: evo.stage, label: J.label, cap: capacity(evo.name, evo.stage), regions: [], special: evo.special, path: evo.path });
}
async function playEvolution(evo, kind = 'EVOLUTION'){
  const me = J, cap = capacity(evo.name, evo.stage), from = J.form;
  await window.evoCinematic.play({ from, to: evo.name, partner: evo.partner, desc: infoOf(evo.name), kind, attr: attrOf(evo.name), fromCap: capacity(from, J.stage), label: [evo.label || evo.special || stageLabel(evo.stage), ATTR[attrOf(evo.name)][0]].join(' · '), cap, speed: () => NET.speed || 1, alive: () => J === me });
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
  if (J.special) return;
  const k = J.stage, need = JD.evolveNeed[k];
  if (need && evoReady(need) && J.cond >= JD.cond.evolveMin) await playEvolution(decideEvolution(k));
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
}
function specialEvolution(d){
  if (J.special || !d) return null;
  const en = J.dg.en, ult = J.stage >= 3 ? J.form : ([...J.dg.line].reverse().find(n => n && n !== '?') || J.form);
  let name = d.forms && d.forms[en];
  if (!name && d.pool) name = d.pool.includes(J.form) ? J.form : d.pool.includes(ult) ? ult : null;
  if (!name && d.suffix) name = ult + d.suffix;
  if (!name) name = d.pool[hash(en + d.region) % d.pool.length];
  return { name, stage: 4, special: d.special, path: d.path, sub: d.sub };
}

/* ---------- travel to a region, then roam inside it ---------- */
async function travel(region){
  if (!J || J.busy || busy || !card.hidden) return;
  if (region === -2) { log('아직 신호가 닿지 않는 구역이에요.', 'sys'); return; }
  if (region < 0 || !NET.isOpen(region)) return;
  const me = J, secret = NET.isSecretRegion(region);
  const evo = secret ? specialEvolution(secretDef(NET.regionName(region))) : null;
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
  const evs = byName(JD.events, name) || ['새로운 노드에 도착했어요.'];
  log(`${name}에 도착했어요. ${pickFrom(evs)}`, 'arrive');
  if (evo) {
    const from = J.form;
    await window.evoCinematic.play({ from, to: evo.name, desc: infoOf(evo.name), kind: 'SPECIAL EVOLUTION', attr: attrOf(evo.name), label: evo.special, cap: capacity(evo.name, 4), speed: () => NET.speed || 1, alive: () => J === me });
    if (J !== me) return;
    applyEvolution(evo); if (J.exp) J.map[J.exp - 1] = 'evo';
    log(`${from}${ga(from)} ${evo.name}${ro(evo.name)} 진화했어요! (${evo.special} · ${capacity(evo.name, 4)})`, 'evo sp', null, evo.name);
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
  return picks.map(a => { const m = pickFrom(mons); return { text: fill(a.t, net, m), fx: gainC(a.fx, JD.statGain.choice), mon: m, bond: actBond(a.fx), src: a }; });
}
let autoTimer = 0;
// 자동 선택: 훈련 방침과 가장 잘 맞는 선택지를 미리 골라 두고, 시간이 지나면 그걸로 정해요
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
    await playEvolution({ name: opt.jg.result, stage: st, label: `${stageLabel(st)} · 조그레스`, path: `조그레스 진화 (${J.form} + ${opt.jg.b})`, partner: opt.jg.b }, 'JOGRESS EVOLUTION');
  } else if (opt.kind === 'capsule') {
    J.capsuled = true;
    await playEvolution({ name: opt.dm.armor, stage: 1, label: '아머체', path: `캡슐진화 · ${opt.dm.name}의 디지멘탈` }, 'CAPSULE EVOLUTION');
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
  const pic = picOf(name), now = i === J.route.length - 1;
  const chips = [
    `<span class="chip ${r.special ? 'sp' : ''}">${esc(r.label)}</span>`,
    `<span class="chip cap">${esc(r.cap)}</span>`,
    `<span class="chip attr ${ATTR[attrOf(name)][1]}">${ATTR[attrOf(name)][0]}</span>`,
    rook ? `<span class="chip">${esc(rook.type)}</span>` : '',
  ].join('');
  infoEl.innerHTML = `
    <button class="ji-x" type="button" aria-label="닫기">×</button>
    ${pic ? `<div class="ji-pic"><img src="${esc(pic)}" alt="${esc(name)}"></div>` : ''}
    <div class="ji-body">
      <div class="ji-tag">${now ? 'NOW · 지금 모습' : `ROUTE ${i + 1} · 지나온 모습`}</div>
      <h3>${esc(name)}</h3>
      <div class="chips">${chips}</div>
      <p>${esc(infoOf(name) || '아직 알려진 기록이 없는 디지몬이에요.')}</p>
      <dl>
        <dt>진화 경로</dt><dd>${esc(r.path || '—')}</dd>
        <dt>다녀간 구역</dt><dd>${r.regions.length ? esc(r.regions.join(' · ')) : (now ? '아직 없어요' : '—')}</dd>
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
  $('jFocus').innerHTML = `<span class="f-h">훈련 방침</span><div class="f-list">${Object.entries(JD.focus).map(([k, f]) => `<button type="button" class="f-b${k === J.focus ? ' on' : ''}" data-f="${k}" role="radio" aria-checked="${k === J.focus}" title="${esc(f.desc)}"><i aria-hidden="true">${f.icon}</i>${esc(f.name)}</button>`).join('')}</div><p class="f-desc">${esc(fc.desc)}</p>`;
  $('jLog').innerHTML = J.log.slice(-6).map(l => `<li class="${l.cls}">${esc(l.text)}${chipsOf(l.fx, l.bond, l.cond) ? ' ' + chipsOf(l.fx, l.bond, l.cond) : ''}</li>`).join('');
  $('jLog').scrollTop = $('jLog').scrollHeight;
  $('jProg').style.width = Math.min(100, J.exp / JD.journeyEnd * 100) + '%';
  const nx = J.special ? null : JD.evolveNeed[J.stage];
  const found = JD.secrets.filter(d => NET.unlocked.has(NET.regionId(d.region)));
  const cands = nx ? evoCandidates(J.stage) : [];
  const pred = cands.length ? `<div class="j-pred"><span class="jp-h">다음 진화 예상${cands.length > 1 ? ` · ${cands.length}개 중 하나` : ''}<em>${esc(cands[0].path)}</em></span><div class="jp-list">${cands.map(c => `<span class="jp" title="아직 알 수 없는 디지몬">${silTag(c.name)}<b>???</b><i class="${ATTR[c.attr][1]}">${ATTR[c.attr][0]}</i></span>`).join('')}</div></div>` : '';
  $('jSecret').innerHTML = pred + (nx ? `<p class="j-next">다음 진화 조건 · <span class="${statTop() >= nx.top ? 'ok' : ''}">가장 높은 능력치 ${statTop()}/${nx.top}</span> · <span class="${statSum() >= nx.total ? 'ok' : ''}">합계 ${statSum()}/${nx.total}</span>${J.exp < nx.steps ? ` · <span>${nx.steps - J.exp}걸음 더</span>` : ''} · <span class="${J.cond >= JD.cond.evolveMin ? 'ok' : ''}">컨디션 ${J.cond}/${JD.cond.evolveMin}</span></p>` : '') +
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
    <div class="tag">${final ? 'JOURNEY COMPLETE' : 'JOURNEY LOG'} · ${J.moves} TRIPS · ${J.exp} STEPS · ${J.visited.size} REGIONS</div>
    ${final ? '<p class="eyebrow">여행의 끝</p>' : ''}
    ${picOf(J.form) ? `<div class="sum-pic">${picTag(J.form, '')}</div>` : ''}
    <h2 class="sum-title">${esc(J.form)}</h2>
    <p class="cap-line">${esc(J.label)} · ${capacity(J.form, J.stage)}</p>
    <p class="desc">${esc(J.dg.ko)}${wa(J.dg.ko)} 함께 ${J.moves}번 이동하고 ${J.exp}걸음을 걸으며 ${J.visited.size}개 구역을 여행했어요. 가장 강한 성향은 <b class="spt">${JD.traits[topT]}</b>${bat(JD.traits[topT]) > 0 ? '이에요' : '예요'}.${best && best[1] > 0 ? ` 가장 친한 친구는 <b class="spt">${esc(best[0])}</b>(${bondTier(best[1])} · 친밀도 ${best[1]})${bat(best[0]) > 0 ? '이에요' : '예요'}.` : ''}${sp ? ` 숨겨진 구역을 찾아 <b class="spt">${sp}</b>${ro(sp)} 특별 진화했어요!` : ''}</p>
    ${journeyMap()}
    <ol class="timeline">${J.route.map(r => `<li class="${r.special ? 'sp' : ''}"><span class="st">${esc(r.label)}<br>${esc(r.cap)}</span><b>${picTag(r.form, 'tl-pic')}${esc(r.form)}</b><small>${esc(r.path)}${r.regions.length ? ' · ' + esc(r.regions.join(' → ')) : ''}</small></li>`).join('')}</ol>
    <div class="actions">
      <button class="ghost primary" id="jCont" type="button">계속 여행하기</button>
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
if (location.hash === '#debug') window.__digi = { map: journeyMap, bond: (n, v) => { J.bonds[n] = v; renderJourney(); }, travel, evolve: playEvolution, candidates: k => evoCandidates(k ?? J.stage), render: () => renderJourney(), net: NET, get journey(){ return J; } };
$('jEnd').addEventListener('click', () => showLog());
$('jFocus').addEventListener('click', e => {
  const b = e.target.closest('[data-f]'); if (!b || !J || b.dataset.f === J.focus) return;
  J.focus = b.dataset.f; try { localStorage.setItem('digi-focus', J.focus); } catch (er) {}
  log(`훈련 방침을 「${JD.focus[J.focus].name}」${ro(JD.focus[J.focus].name)} 바꿨어요. ${JD.focus[J.focus].desc}`, 'sys');
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

$('f').addEventListener('submit', e => {
  e.preventDefault();
  const inp = read();
  if (typeof inp === 'string') { $('err').textContent = inp; return; }
  $('err').textContent = ''; roll = 0;
  run(inp);
});
})();
