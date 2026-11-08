/* img/디지몬_국문 폴더의 이미지 목록을 js/images-list.js로 만들어요.
   이미지를 추가·삭제한 뒤 한 번 실행하세요:  node tools/list-images.js */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), dir = 'img/디지몬_국문';
const files = fs.readdirSync(path.join(root, dir)).filter(f => /\.(png|jpe?g|webp|gif)$/i.test(f)).sort();
const out = `/* 자동 생성 파일 — 직접 고치지 말고 node tools/list-images.js 를 실행하세요 (${files.length}장) */\n` +
  `window.DIGI_IMG_DIR = ${JSON.stringify(dir + '/')};\nwindow.DIGI_IMG_FILES = ${JSON.stringify(files)};\n`;
fs.writeFileSync(path.join(root, 'js/images-list.js'), out);
console.log(`js/images-list.js: ${files.length} images`);
