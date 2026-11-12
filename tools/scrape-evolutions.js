/* Wikimon(https://wikimon.net)의 "Evolves To(진화 후)" 목록을 받아 digimon.json 의 info.evolvesTo 에 넣어요.
   Wikimon 문서의 도감 항목(pnN=DRB · puN=<digimon.net id>, 또는 도감 링크)으로 우리 디지몬과 정확히 짝지어요.
   진화 관계마다 Wikimon 이 단 근거 작품을 src 로 함께 저장해요 (근거가 없는 줄은 버려요).
   "Any Lv.4 Digimon from ..." 같은 넓은 규칙 줄은 특정 디지몬이 아니라서 버려요.
   결과는 tools/wikimon-raw.json 에 받아 둬서 다시 실행하면 내려받지 않아요 (다시 받기: --force).
   실행:  node tools/scrape-evolutions.js */
const fs = require('fs'), path = require('path');
const FILE = path.join(__dirname, '..', 'digimon.json'), RAW = path.join(__dirname, 'wikimon-raw.json');
const API = 'https://wikimon.net/api.php', UA = { 'User-Agent': 'digimon-finder fan project (non-commercial)' };
const ALIAS = {
  armamon_burstmode: 'Armamon: Burst Mode', cerunumon: 'Cernumon', fenriloogamon_takemikazuchi: 'Fenriloogamon: Takemikazuchi',
  huanglongmon_ruin: 'Huanglongmon: Ruin Mode', baalmon_x: 'Baalmon (X-Antibody)', imperialdramonfightermode_vi: 'Imperialdramon: Fighter Mode (Black)',
  greymon_blue_x: 'Greymon (Blue) (X-Antibody)', luminamon_nene: 'Luminamon (Nene Ver.)', heraklekabuterimon_x: 'Herakle Kabuterimon (X-Antibody)',
  kazuchimon: 'Kazuchimon', algomon_lv4: 'Algomon (Adult)', algomon: 'Algomon (Ultimate)', ginkakumon_promote: 'Ginkakumon Promote',
  ragnaloardmon: 'Ragna Lordmon', justimon_criticalarm: 'Justimon: Critical Arm', 'madleomon:armedmode': 'Mad Leomon: Armed Mode',
  'miragegaogamon:burstmode': 'Mirage Gaogamon: Burst Mode', 'sakuyamon:mikomode': 'Sakuyamon: Miko Mode', 'omegamon-alter-s': 'Omegamon Alter-S',
  'alphamon:ouryuken': 'Alphamon: Ouryuken', 'aegiochusmon:blue': 'Aegiochusmon: Blue', 'aegiochusmon:dark': 'Aegiochusmon: Dark', 'aegiochusmon:green': 'Aegiochusmon: Green',
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function api(params) {
  const url = API + '?' + new URLSearchParams({ format: 'json', ...params });
  for (let i = 0; i < 4; i++) {
    try { const r = await fetch(url, { headers: UA }); if (r.ok) return await r.json(); } catch (e) { /* retry */ }
    await sleep(2000 * (i + 1));
  }
  throw new Error('fetch failed: ' + url);
}

async function download() {
  const titles = []; let cont = {};
  do {
    const j = await api({ action: 'query', list: 'embeddedin', eititle: 'Template:S2', einamespace: 0, eilimit: 500, ...cont });
    titles.push(...j.query.embeddedin.map(p => p.title)); cont = j.continue || null; await sleep(300);
  } while (cont);
  console.log(titles.length + ' Digimon pages');
  const pages = {};
  for (let i = 0; i < titles.length; i += 50) {
    const j = await api({ action: 'query', prop: 'revisions', rvprop: 'content', rvslots: 'main', titles: titles.slice(i, i + 50).join('|'), redirects: 1 });
    for (const p of Object.values(j.query.pages)) if (p.revisions) pages[p.title] = p.revisions[0].slots.main['*'];
    console.log(`${Math.min(i + 50, titles.length)}/${titles.length}`); await sleep(400);
  }
  fs.writeFileSync(RAW, JSON.stringify(pages));
  return pages;
}

// 도감 id: |pnN=DRB(또는 Digimon Reference Book) 와 같은 번호의 |puN=, 그리고 문서 안의 도감 링크(directory_name=)
function drbIds(w) {
  const ids = new Set();
  for (const m of w.matchAll(/\|pn(\d*)\s*=\s*(?:DRB|Digimon Reference Book)\s*\n/g)) {
    const u = new RegExp('\\|pu' + m[1] + '\\s*=\\s*([^\\n|]+)').exec(w);
    if (u && !/[%=]/.test(u[1])) ids.add(u[1].trim());
  }
  for (const m of w.matchAll(/reference(?:_ko)?\/detail\.php\?directory_name=([\w-]+)/g)) ids.add(m[1]);
  return [...ids];
}
// 근거 작품: <ref>…</ref> 안의 [[링크]], {{rfc|세트|번호}}(카드), {{rfe|작품|화}}(애니) , 이름 붙은 ref
function sources(line, named) {
  const out = new Set();
  for (const m of line.matchAll(/<ref(?:\s+name\s*=\s*"?([^">\/]+)"?)?\s*(\/>|>([\s\S]*?)<\/ref>)/g)) {
    const body = m[3] || (m[1] && named[m[1].trim()]) || '';
    const links = [...body.matchAll(/\[\[([^\]|]+)/g)].map(x => x[1].trim());
    if (links.length) links.forEach(l => out.add(l)); else if (m[1]) out.add(m[1].trim());
  }
  for (const m of line.matchAll(/\{\{rfc\|([^|}]+)\|([^|}]+)/g)) out.add(`카드 ${m[1]}-${m[2]}`.replace(/ \(DCG\)/, ''));
  for (const m of line.matchAll(/\{\{rfe\|([^|}]+)\|([^|}]+)/g)) out.add(`애니 ${m[1]} ${m[2]}화`);
  for (const m of line.matchAll(/\{\{ref\|([\s\S]*?)\}\}(?!\})/g)) { const l = /\[\[([^\]|]+)/.exec(m[1]); if (l) out.add(l[1].trim()); }
  return [...out];
}
function evolvesTo(w) {
  const sec = /==\s*Evolves To\s*==([\s\S]*?)(?:\n==[^=]|$)/.exec(w); if (!sec) return [];
  const named = {};
  for (const m of w.matchAll(/<ref\s+name\s*=\s*"?([^">\/]+)"?\s*>([\s\S]*?)<\/ref>/g)) named[m[1].trim()] = m[2];
  const out = [];
  for (const line of sec[1].split('\n')) {
    if (!/^\*/.test(line)) continue;
    const m = /^\*+\s*('''|'')?\[\[([^\]|#]+)(?:\|[^\]]*)?\]\]/.exec(line); if (!m) continue;
    const target = m[2].trim(); if (/Colors and Levels|^Any /i.test(target)) continue;
    const src = sources(line, named); if (!src.length) continue;
    out.push({ to: target, main: m[1] === "'''", src, ...withPart(line.slice(m.index + m[0].length)) });
  }
  return out;
}
// "(with …)" 부분: 함께 있어야 하는 짝(조그레스) · 디지멘탈 · 그 밖의 아이템
//   with  [[A]] or [[B]]  → 짝 A 또는 B 와 함께여야 해요 (req)
//   with or without [[A]] → 혼자서도, A 와 함께도 돼요 (opt)
//   with [[A]] and [[B]]  → 셋 이상이 합쳐져요 (multi: 이 게임에서는 쓰지 않아요)
//   with a Data Attribute … / certain Digimon … → 정해진 짝이 없어요 (vague)
function withPart(rest) {
  const clean = rest.replace(/<ref[^>]*\/>|<ref[\s\S]*?<\/ref>/g, '').replace(/\{\{(?:ref|rfc|rfe|refd)\|(?:[^{}]|\{\{[^{}]*\}\})*\}\}/g, '');
  const i = clean.search(/\(\s*with\b/i); if (i < 0) return {};
  let d = 0, j = i; for (; j < clean.length; j++) { if (clean[j] === '(') d++; else if (clean[j] === ')' && --d === 0) break; }
  const p = clean.slice(i, j + 1), links = [...p.matchAll(/\[\[([^\]|#]+)/g)].map(x => x[1].trim());
  const dm = (/Digimental of (\w+)/i.exec(p) || [])[1] || null;
  const GROUP = /Colors and Levels|Attributes and Levels|Final Xros|Units|Pendulum|Bracelet|Category|Wikia|Series/i;   // "이런 디지몬들과 함께" 같은 묶음
  const mons = links.filter(l => !/Digimental|Crest|Spirit|Digivice|Card/i.test(l) && !GROUP.test(l));
  return { opt: /\(\s*with\s+or\s+without/i.test(p), withMons: mons, multi: /\]\]\s*,?\s*and\s+(?:the\s+)?\[\[/i.test(p.replace(/'{2,3}/g, '')),   // 굵은 글씨('''[[A]]''' and '''[[B]]''')도 알아봐요
    vague: !mons.length && !dm && (links.some(l => GROUP.test(l)) || /\{\{Wikia/i.test(p)) || !mons.length && !dm && /\b(any|attribute|certain|every|a|an)\b/i.test(p.replace(/\[\[[^\]]*\]\]/g, '')), dm };
}

(async () => {
  const pages = !process.argv.includes('--force') && fs.existsSync(RAW) ? JSON.parse(fs.readFileSync(RAW, 'utf8')) : await download();
  const titleToIds = {};
  for (const [t, w] of Object.entries(pages)) titleToIds[t] = drbIds(w);
  const list = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  const idSet = new Set(list.map(d => d.info && d.info.id));
  let linked = 0, edges = 0;
  const pageOf = {};   // digimon.net id → Wikimon 문서
  for (const [t, ids] of Object.entries(titleToIds)) for (const id of ids) if (idSet.has(id) && !pageOf[id]) pageOf[id] = t;
  // 도감 id 가 적혀 있지 않은 문서: 영문 이름을 그대로 줄인 것이 도감 id 와 같으면 짝지어요 (Sunflowmon → sunflowmon)
  for (const t of Object.keys(titleToIds)) { const id = t.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!titleToIds[t].length && idSet.has(id) && !pageOf[id]) { pageOf[id] = t; titleToIds[t] = [id]; } }
  // 그래도 남은 것: 도감 id 와 Wikimon 문서 이름이 많이 다른 경우 (직접 확인해서 짝지었어요)
  for (const [id, t] of Object.entries(ALIAS)) if (idSet.has(id) && pages[t] && !pageOf[id]) { pageOf[id] = t; if (!titleToIds[t].includes(id)) titleToIds[t].push(id); }
  for (const d of list) {
    const id = d.info && d.info.id, t = pageOf[id];
    delete d.info.evolvesTo; delete d.info.wikimon;
    if (!t) continue;
    linked++; d.info.wikimon = t;
    const seen = new Map();
    for (const e of evolvesTo(pages[t])) for (const to of (titleToIds[e.to] || []).filter(x => idSet.has(x) && x !== id)) {
      // 짝: 우리 도감에 있는 디지몬만. 정해진 짝 없이 "어떤 디지몬과 함께" 이거나 셋 이상이 합쳐지는 줄은 버려요
      const partners = [...new Set((e.withMons || []).flatMap(m => titleToIds[m] || []).filter(x => idSet.has(x) && x !== id && x !== to))];
      const needsPartner = !e.opt && (e.withMons || []).length > 0;
      // 셋 이상 합체: "and"로 이어진 짝 중 실제 디지몬이 둘 이상일 때만 (아이템 · 장치는 세지 않아요)
      const multi = e.multi && (e.withMons || []).filter(m => (titleToIds[m] || []).length).length >= 2;
      if (!e.opt && (multi || e.vague)) continue;
      if (needsPartner && !partners.length) continue;
      const solo = !needsPartner;
      const prev = seen.get(to);
      if (prev) { prev.main = prev.main || e.main; prev.solo = prev.solo || solo; e.src.forEach(s => prev.src.includes(s) || prev.src.push(s));
        partners.forEach(p => prev.with.includes(p) || prev.with.push(p)); prev.dm = prev.dm || e.dm; }
      else seen.set(to, { id: to, main: e.main, src: [...e.src], solo, with: partners, dm: e.dm });
    }
    // solo: 혼자서 진화할 수 있어요 · with: 함께 조그레스할 수 있는 짝 · dm: 필요한 디지멘탈(영문)
    d.info.evolvesTo = [...seen.values()].map(e => ({ id: e.id, main: e.main, src: e.src, ...(e.solo ? {} : { solo: false }), ...(e.with.length ? { with: e.with } : {}), ...(e.dm ? { dm: e.dm } : {}) }));
    edges += seen.size;
  }
  fs.writeFileSync(FILE, JSON.stringify(list, null, 2) + '\n');
  console.log(`linked ${linked}/${list.length} digimon, ${edges} evolution edges`);
})();
