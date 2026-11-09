/* 디지몬 이름 → 이미지 파일 · 도감 정보 연결
   1) js/digimon-db.js (digimon.json 에서 만든 표, 그림은 img/digimon) — 공식 한국어 이름으로 찾아요
      앱 데이터의 이름이 조금 다르면 맞춰서 찾아요:
        '벨페몬 - 슬립 모드' → '벨페몬: 슬립 모드', 'OOX' → 'OO(X항체)', 아래 ALIAS 표
   2) 예전 그림 폴더 (img/디지몬_국문 의 같은 이름 파일, img/디지몬_추가 의 EXTRA 표)
   찾지 못하면 null → 화면에는 속성 색 디지알 그림이 나와요. */
(function () {
  'use strict';
  const DB = window.DIGI_DB || {}, DB_DIR = window.DIGI_DB_DIR || 'img/digimon/';
  const DIR = window.DIGI_IMG_DIR || 'img/디지몬_국문/';
  const EXTRA_DIR = 'img/디지몬_추가/';
  const files = new Map((window.DIGI_IMG_FILES || []).map(f => [f.replace(/\.[^.]+$/, ''), f]));

  // 앱 데이터 이름 → digimon.json 의 공식 이름 (모양이 여럿이면 대표 모습)
  const ALIAS = {
    '누메몬': '워매몬', '드리모게몬': '두리몬', '나노몬': '데이터몬', '켄타루몬': '켄터스몬',
    '메탈그레이몬': '메탈그레이몬(백신종)', '아트라캅테리몬': '아트라캅테리몬(레드)', '코어드라몬': '코어드라몬(녹)',
  };
  // 국문 폴더에 없는 디지몬: 한국어 이름 → img/디지몬_추가 파일 (예전 연결, 도감 표에 없을 때만 써요)
  const EXTRA = {
    '피요몬': 'piyomon.jpg', '텐타몬': 'tentomon.jpg', '파닥몬': 'patamon.jpg', '브이몬': 'v-mon.jpg',
    '호크몬': 'hawkmon.jpg', '베타몬': 'betamon.jpg', '울퉁몬': 'gottsumon.jpg', '고부리몬': 'goburimon.jpg',
    '톱니몬': 'hagurumon.jpg', '코로나몬': 'coronamon.jpg', '도루몬': 'dorumon.jpg', '코테몬': 'kotemon.jpg',
    '스팅몬': 'stingmon.jpg', '아큐라몬': 'aquilamon.jpg', '황금아르마몬': 'ankylomon.jpg', '토리에몬': 'turuiemon.jpg',
    '안티라몬': 'andiramon_2.jpg', '우가몬': 'orgemon.jpg', '안드로몬': 'andromon.jpg', '레키스몬': 'lekismon.jpg',
    '플레어몬': 'flaremon.jpg', '화염리자몬': 'flarelizamon.jpg', '데블몬': 'devimon.jpg', '다크티라노몬': 'darktyranomon.jpg', '고스몬': 'bakemon.jpg',
    '아트라캅테리몬': 'atlurkabuterimon.jpg', '로제몬': 'rosemon.jpg', '홀리엔젤몬': 'holyangemon.jpg', '주엘비몬': 'jewelbeemon.jpg',
    '마하가오가몬': 'machgaogamon.jpg', '해바라기몬': 'sunflowmon.jpg', '메탈시드라몬': 'metalseadramon.jpg', '코어드라몬': 'coredramon_g.jpg',
    '윙드라몬': 'wingdramon.jpg', '크레세몬': 'crescemon.jpg', '묘티스몬': 'vamdemon.jpg', '메탈가루몬': 'metalgarurumon.jpg',
    '헤라클레스캅테리몬': 'heraklekabuterimon.jpg', '샤크라몬': 'sakuyamon.jpg', '미라쥬가오가몬': 'miragegaogamon.jpg',
    '아이언레오몬': 'grappuleomon.jpg', '메기드라몬': 'megidramon.jpg', '오메가몬': 'omegamon.jpg', '리리스몬': 'lilithmon.jpg',
    '리바이어몬': 'leviamon.jpg', '벨페몬 - 레이지 모드': 'belphemonragemode.jpg', '벨페몬 - 슬립 모드': 'belphemonsleepmode.jpg',
    '현무몬': 'xuanwumon.jpg', '마르스몬': 'marsmon.jpg', '메르크리몬': 'mercurymon.jpg', '베르스타몬': 'beelstarmon.jpg',
    '화염드라몬': 'fladramon.jpg', '번개드라몬': 'lighdramon.jpg', '호루스몬': 'holsmon.jpg',
  };

  // 도감 표에서 쓸 이름 후보
  function keys(n) {
    const out = [n, ALIAS[n], n.replace(/ - /g, ': ')];
    if (/X$/.test(n)) { const b = n.slice(0, -1); out.push(b + '(X항체)', (ALIAS[b] || b) + '(X항체)', b.replace(/ - /g, ': ') + '(X항체)'); }
    return out.filter(Boolean);
  }
  function entry(name) {
    if (!name) return null;
    const n = String(name).trim();
    for (const k of keys(n)) if (DB[k]) return { name: k, row: DB[k] };
    return null;
  }
  function fileFor(name) {
    if (!name) return null;
    const n = String(name).trim(), e = entry(n);
    if (e && e.row[0]) return DB_DIR + e.row[0];
    if (files.has(n)) return DIR + files.get(n);
    if (EXTRA[n]) return EXTRA_DIR + EXTRA[n];
    const base = /X$/.test(n) ? n.slice(0, -1) : null;
    const cands = base ? [base + '(X항체)', base] : [n + '(X항체)'];
    for (const c of cands) if (files.has(c)) return DIR + files.get(c);
    if (base) { const be = entry(base); if (be && be.row[0]) return DB_DIR + be.row[0]; if (EXTRA[base]) return EXTRA_DIR + EXTRA[base]; }
    return null;
  }
  // 도감 정보: { name(공식 이름), level, type, attribute, attacks[], related[] } 또는 null
  function dataFor(name) {
    const e = entry(name); if (!e) return null;
    const [, level, type, attribute, attacks, related] = e.row;
    return { name: e.name, level, type, attribute, attacks, related };
  }
  window.digiImage = fileFor;
  window.digiData = dataFor;
  window.DIGI_IMG_EXTRA = EXTRA;
})();
