/* 디지몬 이름 → 이미지 파일 · 도감 정보 연결
   js/digimon-db.js (digimon.json 에서 만든 표, 그림은 img/digimon) 를 공식 한국어 이름으로 찾아요.
   앱 데이터의 이름이 조금 다르면 맞춰서 찾아요:
     '벨페몬 - 슬립 모드' → '벨페몬: 슬립 모드', 'OOX' → 'OO(X항체)', 아래 ALIAS 표
   X항체 그림이 없으면 기본 모습으로 대신해요. 찾지 못하면 null → 화면에는 속성 색 디지알 그림이 나와요. */
(function () {
  'use strict';
  const DB = window.DIGI_DB || {}, DB_DIR = window.DIGI_DB_DIR || 'img/digimon/';

  // 앱 데이터 이름 → digimon.json 의 공식 이름 (모양이 여럿이면 대표 모습)
  const ALIAS = {
    '누메몬': '워매몬', '드리모게몬': '두리몬', '나노몬': '데이터몬', '켄타루몬': '켄터스몬',
    '메탈그레이몬': '메탈그레이몬(백신종)', '아트라캅테리몬': '아트라캅테리몬(레드)', '코어드라몬': '코어드라몬(녹)',
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
    const n = String(name).trim();
    if (n === '인간') return 'img/human.svg';          // 파트너 없이 떠난 사람 (스피릿 진화 전)
    let e = entry(n);
    if (!(e && e.row[0]) && /X$/.test(n)) e = entry(n.slice(0, -1));   // X항체 그림이 없으면 기본 모습
    return e && e.row[0] ? DB_DIR + e.row[0] : null;
  }
  // 도감 정보: { name(공식 이름), level, type, attribute, attacks[], related[], evolvesTo[[이름, 대표, 근거]] } 또는 null
  function dataFor(name) {
    const e = entry(name); if (!e) return null;
    const [, level, type, attribute, attacks, related, evolvesTo] = e.row;
    return { name: e.name, level, type, attribute, attacks, related, evolvesTo: evolvesTo || [] };
  }
  window.digiImage = fileFor;
  window.digiData = dataFor;
})();
