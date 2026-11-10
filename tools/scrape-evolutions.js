/* Wikimon(https://wikimon.net)의 "Evolves To(진화 후)" 목록을 받아 digimon.json 의 info.evolvesTo 에 넣어요.
   Wikimon 문서의 도감 항목(pnN=DRB · puN=<digimon.net id>, 또는 도감 링크)으로 우리 디지몬과 정확히 짝지어요.
   진화 관계마다 Wikimon 이 단 근거 작품을 src 로 함께 저장해요 (근거가 없는 줄은 버려요).
   "Any Lv.4 Digimon from ..." 같은 넓은 규칙 줄은 특정 디지몬이 아니라서 버려요.
   결과는 tools/wikimon-raw.json 에 받아 둬서 다시 실행하면 내려받지 않아요 (다시 받기: --force).
   실행:  node tools/scrape-evolutions.js */
const fs = require('fs'), path = require('path');
const FILE = path.join(__dirname, '..', 'digimon.json'), RAW = path.join(__dirname, 'wikimon-raw.json');
const API = 'https://wikimon.net/api.php', UA = { 'User-Agent': 'digimon-finder fan project (non-commercial)' };
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
    out.push({ to: target, main: m[1] === "'''", src });
  }
  return out;
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
  for (const d of list) {
    const id = d.info && d.info.id, t = pageOf[id];
    delete d.info.evolvesTo; delete d.info.wikimon;
    if (!t) continue;
    linked++; d.info.wikimon = t;
    const seen = new Map();
    for (const e of evolvesTo(pages[t])) for (const to of (titleToIds[e.to] || []).filter(x => idSet.has(x) && x !== id)) {
      const prev = seen.get(to);
      if (prev) { prev.main = prev.main || e.main; e.src.forEach(s => prev.src.includes(s) || prev.src.push(s)); }
      else seen.set(to, { id: to, main: e.main, src: [...e.src] });
    }
    d.info.evolvesTo = [...seen.values()]; edges += seen.size;
  }
  fs.writeFileSync(FILE, JSON.stringify(list, null, 2) + '\n');
  console.log(`linked ${linked}/${list.length} digimon, ${edges} evolution edges`);
})();
