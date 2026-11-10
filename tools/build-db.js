/* digimon.json → js/digimon-db.js (앱이 읽는 가벼운 표)
   이름마다 [이미지 파일, 등급, 유형, 속성, 필살기 목록, 관련된 디지몬 이름 목록, 진화 후 목록]
   진화 후 목록: [[이름, 대표 진화면 1, 근거 작품(최대 3개)], …] — Wikimon 에서 받은 근거 있는 진화만 (tools/scrape-evolutions.js)
   이미지는 img/digimon 에 실제로 있는 파일만 연결해요 (이름의 ':' 는 저장할 때 '_' 로 바뀐 파일도 찾아요).
   digimon.json 이나 img/digimon 을 바꾼 뒤 한 번 실행하세요:  node tools/build-db.js */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), IMG = 'img/digimon';
const list = JSON.parse(fs.readFileSync(path.join(root, 'digimon.json'), 'utf8'));
const files = new Set(fs.readdirSync(path.join(root, IMG)));
const byId = new Map(list.map(d => [d.info && d.info.id, d.name]));
const pickFile = d => {
  const cands = [d.image, d.image && d.image.replace(/:/g, '_'), d.info && d.info.id + '.jpg', d.info && d.info.id.replace(/:/g, '_') + '.jpg'];
  return cands.find(f => f && files.has(f)) || '';
};
const db = {}; let noImg = 0;
for (const d of list) {
  const i = d.info || {}, f = pickFile(d);
  if (!f) noImg++;
  db[d.name] = [f, i.level || '', i.type || '', i.attribute || '', i.attacks || [], (i.related || []).map(id => byId.get(id)).filter(Boolean),
    (i.evolvesTo || []).filter(e => byId.has(e.id)).map(e => [byId.get(e.id), e.main ? 1 : 0, e.src.slice(0, 3).join(' · ')])];
}
const out = `/* 자동 생성 파일 — 직접 고치지 말고 node tools/build-db.js 를 실행하세요 (${list.length}마리, 그림 없음 ${noImg}) */\n` +
  `window.DIGI_DB_DIR = ${JSON.stringify(IMG + '/')};\nwindow.DIGI_DB = ${JSON.stringify(db)};\n`;
fs.writeFileSync(path.join(root, 'js/digimon-db.js'), out);
console.log(`js/digimon-db.js: ${list.length} digimon, ${noImg} without image, ${list.filter(d => d.info && d.info.type).length} with details`);
