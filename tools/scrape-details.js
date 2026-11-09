/* digimon.json 의 상세 페이지(detailUrl)에서 사실 정보만 모아 info 에 채워요.
   등급(level) · 유형(type) · 속성(attribute) · 필살기(attacks) · 관련된 디지몬(related: id 목록)
   프로필 문장은 공식 저작물이라 옮겨 오지 않아요 (앱의 설명은 js/digi-info.js 의 직접 쓴 문장을 써요).
   이미 받은 항목은 건너뛰어요. 실행:  node tools/scrape-details.js   (다시 받기: --force) */
const fs = require('fs'), path = require('path');
const FILE = path.join(__dirname, '..', 'digimon.json');
const list = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const force = process.argv.includes('--force');
const CONCURRENCY = 3, GAP_MS = 250;

const strip = s => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#039;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
function parse(html) {
  const out = {};
  const box = (html.match(/<div class="p-ref__info">([\s\S]*?)<\/div>/) || [])[1] || '';
  for (const m of box.matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd>([\s\S]*?)<\/dd>/g)) {
    const k = strip(m[1]), raw = m[2];
    if (k === '등급') out.level = strip(raw);
    else if (k === '유형') out.type = strip(raw);
    else if (k === '속성') out.attribute = strip(raw);
    else if (k === '필살기') out.attacks = raw.split(/<br\s*\/?>/i).map(strip).map(s => s.replace(/^[・･·]\s*/, '')).filter(Boolean);
  }
  const rel = (html.match(/<ul class="p-refRelationLists">([\s\S]*?)<\/ul>/) || [])[1] || '';
  out.related = [...rel.matchAll(/directory_name=([^"&]+)"/g)].map(m => decodeURIComponent(m[1]));
  return out;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (digimon-finder fan project)', 'Accept-Language': 'ko' } });
      if (res.ok) return await res.text();
      if (res.status === 404) return null;
    } catch (e) { /* retry */ }
    await sleep(1500 * (i + 1));
  }
  return null;
}
const save = () => fs.writeFileSync(FILE, JSON.stringify(list, null, 2) + '\n');

(async () => {
  const todo = list.filter(d => d.info && d.info.detailUrl && (force || !d.info.type));
  console.log(`${todo.length} / ${list.length} to fetch`);
  let done = 0, fail = 0, idx = 0;
  const worker = async () => {
    while (idx < todo.length) {
      const d = todo[idx++];
      const html = await get(d.info.detailUrl);
      if (html) { const p = parse(html); if (p.type || p.attribute || p.level) Object.assign(d.info, p); else fail++; }
      else fail++;
      if (++done % 50 === 0) { save(); console.log(`${done}/${todo.length} (fail ${fail})`); }
      await sleep(GAP_MS);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  save();
  console.log(`done ${done}, fail ${fail}`);
})();
