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
const picTag = (name, cls) => { const src = picOf(name); return src ? `<img class="${cls}" src="${esc(src)}" alt="${esc(name)}" loading="lazy">` : ''; };
// 성향 점수: 데이터의 기본값(1~3)에 배율을 곱하고 약간의 운을 더해요. 최대 statMax
const gain = (fx, scale) => fx ? Object.fromEntries(Object.entries(fx).map(([k, v]) => [k, v * scale + Math.floor(Math.random() * (scale / 2 + 1))])) : null;
function addTraits(fx){ if (fx) for (const [k, v] of Object.entries(fx)) J.traits[k] = Math.min(JD.statMax, J.traits[k] + v); }

function startJourney(){
  const dg = lastRes.dg;
  J = { dg, stage: 0, form: dg.ko, label: stageLabel(0), moves: 0, exp: 0, ended: false,
        route: [{ form: dg.ko, stage: 0, label: stageLabel(0), cap: capacity(dg.ko, 0), regions: [], path: '시작' }],
        visited: new Set([NET.currentRegion()]), recent: [], special: null, branch: null, capsuled: false, jogressed: false,
        busy: false, choosing: false, traits: Object.fromEntries(TRAITS.map(t => [t, 0])), log: [] };
  NET.speed = 1; $('jFast').classList.remove('on');
  hideCard(); hideChoice();
  netEl.classList.add('explore'); NET.setExplore(true); NET.setStay(false);
  $('journey').hidden = false;
  log(`${dg.ko}${wa(dg.ko)} 함께 여행을 떠나요. 가고 싶은 네트워크 구역을 눌러 보세요. 마우스 휠로 지도를 확대·축소할 수 있어요.`, 'sys');
  idleStatus();
}
function endJourney(){
  J = null; NET.setExplore(false); NET.setStay(false); NET.speed = 1;
  netEl.classList.remove('explore'); $('journey').hidden = true; hideChoice(); hideToast();
}
function idleStatus(){
  $('netStat').innerHTML = `EXPLORE · ${J.moves} TRIPS · ${J.exp} STEPS · ${esc(NET.regionName(NET.currentRegion()) || 'DEEP WEB')}<b>가고 싶은 구역을 눌러 주세요</b>`;
}
function log(text, cls = '', fx = null, pic = null){
  J.log.push({ text, cls, fx }); if (J.log.length > 60) J.log.shift();
  renderJourney(); toast(text, cls, fx, pic);
}
const toastEl = $('toast');
const TOAST_TAG = { arrive: 'ARRIVED', pick: 'MY CHOICE', evo: 'EVOLUTION', 'evo sp': 'SPECIAL EVOLUTION', secret: 'NEW SIGNAL', sys: 'SYSTEM' };
let toastTimer = 0;
function toast(text, cls = '', fx = null, pic = null){
  clearTimeout(toastTimer);
  toastEl.className = 'toast ' + cls;
  const img = pic ? picTag(pic, 't-pic') : '';
  toastEl.classList.toggle('with-pic', !!img);
  toastEl.innerHTML = `${img}<div class="t-body"><div class="tag">${TOAST_TAG[cls] || 'EVENT'} · ${J ? J.exp : 0} STEPS</div><p>${esc(text)}</p>${fx ? `<em>${fxChips(fx)}</em>` : ''}</div>`;
  toastEl.hidden = false; requestAnimationFrame(() => toastEl.classList.add('in'));
  toastTimer = setTimeout(hideToast, 7000 / (NET.speed || 1));
}
function hideToast(){ clearTimeout(toastTimer); toastEl.classList.remove('in'); toastTimer = setTimeout(() => { toastEl.hidden = true; }, 350); }
// waits that stop early if the journey was closed (and run faster on ▶▶)
const sleep = (ms, me) => new Promise(res => setTimeout(() => res(J === me), ms / (NET.speed || 1)));

/* ---------- evolution ---------- */
// 가장 높은 성향이 본래 성격과 맞으면 정통 루트, 아니면 그 성향 계열
function decideEvolution(k){
  const t = J.traits, order = [...TRAITS].sort((a, b) => t[b] - t[a]), top = order[0], gap = t[top] - t[order[1]];
  const natural = J.dg.vibe.map(v => JD.natural[v]);
  const std = J.dg.line[k];
  const balanced = gap < JD.balanceGap && top !== 'dark';
  if (!J.branch && std && std !== '?' && top !== 'dark' && (natural.includes(top) || balanced))
    return { name: std, stage: k + 1, path: '정통 진화' };
  const pool = JD.branches[k][top].filter(n => n !== J.form);
  return { name: pool[hash(J.dg.en + k + top) % pool.length], stage: k + 1, path: `${JD.traits[top]} 계열`, branch: top };
}
function applyEvolution(evo){
  J.form = evo.name; J.stage = evo.stage; J.label = evo.label || evo.special || stageLabel(evo.stage);
  if (evo.branch) J.branch = evo.branch;
  if (evo.special) J.special = evo.special;
  J.route.push({ form: evo.name, stage: evo.stage, label: J.label, cap: capacity(evo.name, evo.stage), regions: [], special: evo.special, path: evo.path });
}
async function playEvolution(evo, kind = 'EVOLUTION'){
  const me = J, cap = capacity(evo.name, evo.stage), from = J.form;
  await NET.evolveFx({ label: evo.name, img: picOf(evo.name), sub: `${kind} · ${evo.label || evo.special || stageLabel(evo.stage)} · ${cap}`, title: `${from}${ga(from)} ${evo.name}${ro(evo.name)} 진화!` });
  if (J !== me) return;
  applyEvolution(evo);
  log(`${from}${ga(from)} ${evo.name}${ro(evo.name)} 진화했어요! (${evo.path} · ${cap})`, 'evo', null, evo.name);
}
async function maybeEvolve(){
  if (J.special) return;
  const k = JD.evolveAt.findIndex((m, i) => J.exp >= m && i + 1 > J.stage);
  if (k >= 0) await playEvolution(decideEvolution(k));
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
  if (evo) {
    const cap = capacity(evo.name, evo.stage);
    Object.assign(opts, { label: evo.name, img: picOf(evo.name), flash: true, sub: `${evo.sub} · ${cap}`, title: `${J.form}${ga(J.form)} ${evo.name}${ro(evo.name)} 진화!` });
  }
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
    const from = J.form; applyEvolution(evo);
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
  const steps = randInt(JD.roamSteps), nChoice = Math.min(steps, randInt(JD.roamChoices));
  const slots = new Set();
  while (slots.size < nChoice - 1) slots.add(2 + Math.floor(Math.random() * (steps - 2)));
  if (!(await sleep(JD.roamPause * .6, me))) return;
  // first thing on arrival: decide what to do here
  J.exp++;
  const arrived = [...J.log].reverse().find(l => l.cls === 'arrive');
  await offerChoice(region, arrived ? arrived.text : ''); if (J !== me) return;
  await maybeEvolve(); if (J !== me) return;
  checkUnlocks();
  if (!(await sleep(JD.roamPause, me))) return;
  for (let i = 1; i < steps; i++) {
    await NET.wander(region.id, `${region.name} 탐험 중 · ${i + 1} / ${steps}`);
    if (J !== me) return;
    J.exp++;
    if (slots.has(i)) { await offerChoice(region); if (J !== me) return; }
    else {
      const local = byName(JD.events, region.name);
      if (local && Math.random() < .25) log(pickFrom(local));
      else {
        const last = J.log.length ? J.log[J.log.length - 1].src : null, pool = JD.roam.filter(e => e !== last);
        const ev = pickFrom(pool), mon = pickFrom(wildOf(region.name));
        const fx = gain(ev.fx, JD.statGain.roam); addTraits(fx);
        log(fill(ev.t, region.name, mon), '', fx); J.log[J.log.length - 1].src = ev;
      }
    }
    await maybeEvolve(); if (J !== me) return;
    checkUnlocks();
    if (!(await sleep(JD.roamPause, me))) return;
  }
  log(`${region.name} 탐험을 마쳤어요. 다음으로 갈 구역을 골라 주세요.`, 'sys');
  NET.setStay(false);
}

/* ---------- action choices (2–3 per region) ---------- */
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
  const opts = picks.map(a => ({ text: fill(a.t, net, pickFrom(mons)), fx: gain(a.fx, JD.statGain.choice) }));
  // 조그레스: 지금 모습에 맞는 실제 조합이 있을 때 가끔
  const jg = !J.special && !J.jogressed && JD.jogress.find(j => j.a === J.form);
  if (jg && r() < JD.jogressChance) {
    opts[2] = { text: `${net}에서 만난 ${jg.b}${wa(jg.b)} 마음이 통했다. 힘을 합쳐 조그레스 진화!`, fx: gain({ friend: 2 }, JD.statGain.choice), kind: 'jogress', jg };
  } else if (!J.special && !J.capsuled && J.stage <= 1 && r() < JD.capsuleChance) {
    // 캡슐진화: 성장기·성숙기에 디지멘탈 캡슐을 발견
    const pool = JD.digimentals.filter(d => d.armor !== J.form && (!d.rare || r() < .15));
    const dm = pickFrom(pool);
    opts[2] = { text: `${net}에서 빛나는 「${dm.name}의 디지멘탈」 캡슐을 발견했다. 캡슐진화!`, fx: gain({ [dm.trait]: 2 }, JD.statGain.choice), kind: 'capsule', dm };
  }
  return opts;
}
function offerChoice(region, context = ''){
  clearTimeout(toastTimer); toastEl.classList.remove('in'); toastEl.hidden = true;
  const opts = buildOptions(region);
  J.choosing = true; netEl.classList.add('choosing');
  choiceEl.innerHTML = `
    <div class="tag">CHOICE · ${esc(region.en)}</div>
    ${context ? `<p class="c-ctx">${esc(context)}</p>` : ''}
    <h3>${esc(region.name)}에서 ${esc(J.form)}${wa(J.form)} 무엇을 할까요?</h3>
    <div class="c-opts">${opts.map((o, i) => `<button class="c-opt${o.kind ? ' special' : ''}" type="button" data-i="${i}"><span>${esc(o.text)}</span>
      <em>${o.kind ? `<i class="t-special">${o.kind === 'jogress' ? '조그레스 진화' : '캡슐진화'}</i>` : ''}${fxChips(o.fx)}</em></button>`).join('')}</div>`;
  choiceEl.hidden = false; requestAnimationFrame(() => choiceEl.classList.add('in'));
  return new Promise(res => {
    choiceDone = res;
    choiceEl.querySelectorAll('.c-opt').forEach(b => b.onclick = async () => { choiceDone = null; await choose(opts[+b.dataset.i]); res(); });
    choiceEl.querySelector('.c-opt').focus({ preventScroll: true });
  });
}
async function choose(opt){
  hideChoice();
  addTraits(opt.fx);
  log(opt.text, 'pick', opt.fx);
  if (opt.kind === 'jogress') {
    J.jogressed = true;
    const st = Math.max(J.stage, opt.jg.stage);
    await playEvolution({ name: opt.jg.result, stage: st, label: `${stageLabel(st)} · 조그레스`, path: `조그레스 진화 (${J.form} + ${opt.jg.b})` }, 'JOGRESS EVOLUTION');
  } else if (opt.kind === 'capsule') {
    J.capsuled = true;
    await playEvolution({ name: opt.dm.armor, stage: 1, label: '아머체', path: `캡슐진화 · ${opt.dm.name}의 디지멘탈` }, 'CAPSULE EVOLUTION');
  }
}

/* ---------- panel ---------- */
function renderJourney(){
  if (!J) return;
  $('jStage').textContent = J.label;
  $('jStage').classList.toggle('sp', !!J.special);
  $('jName').textContent = J.form;
  $('jPic').innerHTML = picTag(J.form, 'j-pic-img'); $('jPic').hidden = !picOf(J.form);
  $('jCap').textContent = capacity(J.form, J.stage);
  $('jMoves').textContent = `이동 ${J.moves} · ${J.exp}걸음`;
  $('jRoute').innerHTML = J.route.map((r, i) => `<li class="${r.special ? 'sp' : ''}">${picTag(r.form, 'r-pic')}<b>${esc(r.form)}</b><small>${r.regions.length ? esc(r.regions.join('·')) : (i === J.route.length - 1 ? '지금 여기' : '—')}</small></li>`).join('');
  $('jRoute').scrollLeft = $('jRoute').scrollWidth;
  $('jTraits').innerHTML = TRAITS.map(t => `<div class="tr t-${t}"><span>${JD.traits[t]}</span><div class="bar"><i style="width:${J.traits[t] / JD.statMax * 100}%"></i></div><b>${J.traits[t]}</b></div>`).join('');
  $('jLog').innerHTML = J.log.slice(-6).map(l => `<li class="${l.cls}">${esc(l.text)}${l.fx ? ` <em>${fxChips(l.fx)}</em>` : ''}</li>`).join('');
  $('jLog').scrollTop = $('jLog').scrollHeight;
  $('jProg').style.width = Math.min(100, J.exp / JD.journeyEnd * 100) + '%';
  const nx = JD.evolveAt.find((m, i) => i + 1 > J.stage);
  const found = JD.secrets.filter(d => NET.unlocked.has(NET.regionId(d.region)));
  $('jSecret').innerHTML = (nx && !J.special ? `<p class="j-next">다음 진화까지 ${Math.max(0, nx - J.exp)}걸음</p>` : '') +
    found.map(d => `<p class="hint open">✦ ${esc(d.region)} · 지도 어딘가에 열려 있어요</p>`).join('');
  $('jEnd').disabled = J.busy;
}
function showLog(final = false){
  if (!J || J.busy) return;
  $('journey').hidden = true; hideChoice();
  const sp = J.special;
  const topT = [...TRAITS].sort((a, b) => J.traits[b] - J.traits[a])[0];
  card.innerHTML = `
    <div class="tag">${final ? 'JOURNEY COMPLETE' : 'JOURNEY LOG'} · ${J.moves} TRIPS · ${J.exp} STEPS · ${J.visited.size} REGIONS</div>
    ${final ? '<p class="eyebrow">여행의 끝</p>' : ''}
    ${picOf(J.form) ? `<div class="sum-pic">${picTag(J.form, '')}</div>` : ''}
    <h2 class="sum-title">${esc(J.form)}</h2>
    <p class="cap-line">${esc(J.label)} · ${capacity(J.form, J.stage)}</p>
    <p class="desc">${esc(J.dg.ko)}${wa(J.dg.ko)} 함께 ${J.moves}번 이동하고 ${J.exp}걸음을 걸으며 ${J.visited.size}개 구역을 여행했어요. 가장 강한 성향은 <b class="spt">${JD.traits[topT]}</b>${bat(JD.traits[topT]) > 0 ? '이에요' : '예요'}.${sp ? ` 숨겨진 구역을 찾아 <b class="spt">${sp}</b>${ro(sp)} 특별 진화했어요!` : ''}</p>
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
// 개발용: 주소 끝에 #debug를 붙이면 콘솔에서 __digi.travel(구역번호)로 이동을 시험할 수 있어요
if (location.hash === '#debug') window.__digi = { travel, net: NET, get journey(){ return J; } };
$('jEnd').addEventListener('click', () => showLog());
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

$('netSkip').addEventListener('click', () => NET.skip());
addEventListener('keydown', e => {
  if (e.key !== 'Escape' || netEl.hidden) return;
  if (busy || (J && J.busy)) NET.skip(); else closeNet();
});

$('f').addEventListener('submit', e => {
  e.preventDefault();
  const inp = read();
  if (typeof inp === 'string') { $('err').textContent = inp; return; }
  $('err').textContent = ''; roll = 0;
  run(inp);
});
})();
