/* 디지몬 이름 → 이미지 파일 연결
   데이터의 이름은 공식 한국어판 이름으로 써요.
   1) img/디지몬_국문 에 이름과 똑같은 파일 (예: 아구몬 → 아구몬.jpg)
   2) img/디지몬_추가 의 영어 이름 파일 (아래 EXTRA 표)
   3) 'X항체' 형태 (예: 워그레이몬X → 워그레이몬(X항체).jpg)
   4) 기본 형태 그림이 없으면 X항체 그림으로, X항체 그림이 없으면 기본 형태로 대신
   찾지 못하면 null → 화면에는 속성 색 디지알 그림이 나와요. */
(function () {
  'use strict';
  const DIR = window.DIGI_IMG_DIR || 'img/디지몬_국문/';
  const EXTRA_DIR = 'img/디지몬_추가/';
  const files = new Map((window.DIGI_IMG_FILES || []).map(f => [f.replace(/\.[^.]+$/, ''), f]));

  // 국문 폴더에 없는 디지몬: 한국어 이름 → img/디지몬_추가 파일
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

  function fileFor(name) {
    if (!name) return null;
    const n = String(name).trim();
    if (files.has(n)) return DIR + files.get(n);
    if (EXTRA[n]) return EXTRA_DIR + EXTRA[n];
    const base = /X$/.test(n) ? n.slice(0, -1) : null;
    const cands = base ? [base + '(X항체)', base] : [n + '(X항체)'];
    for (const c of cands) if (files.has(c)) return DIR + files.get(c);
    if (base && EXTRA[base]) return EXTRA_DIR + EXTRA[base];
    return null;
  }
  window.digiImage = fileFor;
  window.DIGI_IMG_EXTRA = EXTRA;
})();
