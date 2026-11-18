/* 진화 도감: 도감에 있는 모든 디지몬을 단계별로 보여 주고, 누르면 진화 전 · 진화 후 루트를 보여 줘요.
   완전체 · 궁극체 · 하이브리드체는 검은 실루엣과 ???로 가려져요. 여행에서 그 모습으로 진화하거나 만나면
   이 브라우저에 기억해 두고 이름과 그림을 밝혀 줘요. 언제든 화면 구석의 「진화 도감」 버튼으로 펼쳐 볼 수 있어요. */
(function () {
  'use strict';
  const DB = window.DIGI_DB || {}, $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const GROUPS = ['유아기', '유년기', '성장기', '성숙기', '아머체', '완전체', '궁극체', '하이브리드체', '기타'];
  const HIDDEN = new Set(['완전체', '궁극체', '하이브리드체']);
  const ATTR_CLS = { '백신': 'attr-vac', '데이터': 'attr-dat', '바이러스': 'attr-vir', '프리': 'attr-fre' };
  const KEY = 'digi-dex-seen';

  let seen = new Set();
  try { seen = new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch (e) {}
  const groupOf = lv => { const l = String(lv || '').replace(/\(.*\)/, '').replace(/[ⅠⅡ]/g, ''); return GROUPS.includes(l) ? l : '기타'; };

  // 목록 · 진화 전 목록 (처음 펼칠 때 한 번 만들어요)
  let list = null, byName = null, from = null;
  function build() {
    if (list) return;
    list = Object.entries(DB).map(([n, r]) => ({ n, img: r[0], g: groupOf(r[1]), lv: r[1], type: r[2], attr: r[3], attacks: r[4] || [], to: r[6] || [] }));
    const order = Object.fromEntries(GROUPS.map((g, i) => [g, i]));
    list.sort((a, b) => order[a.g] - order[b.g] || a.n.localeCompare(b.n, 'ko'));
    byName = new Map(list.map((d, i) => [d.n, i]));
    from = new Map();
    for (const d of list) for (const e of d.to) { if (!byName.has(e[0])) continue; const arr = from.get(e[0]) || []; if (!arr.includes(d.n)) arr.push(d.n); from.set(e[0], arr); }
  }
  const hidden = d => HIDDEN.has(d.g) && !seen.has(d.n);

  // 실루엣: 흰 배경을 가장자리부터 지우고 나머지를 검게 칠해요 (작게 만들어 기억해 둬요)
  const silCache = new Map();
  function silhouette(src) {
    if (silCache.has(src)) return silCache.get(src);
    const p = new Promise(res => {
      const im = new Image();
      im.onload = () => {
        try {
          const S = 96, c = document.createElement('canvas'); c.width = c.height = S;
          const g = c.getContext('2d'), k = Math.min(S / im.naturalWidth, S / im.naturalHeight), w = im.naturalWidth * k, h = im.naturalHeight * k;
          g.fillStyle = '#fff'; g.fillRect(0, 0, S, S); g.drawImage(im, (S - w) / 2, (S - h) / 2, w, h);
          const d = g.getImageData(0, 0, S, S), px = d.data, gone = new Uint8Array(S * S), st = [];
          const light = i => px[i * 4] > 228 && px[i * 4 + 1] > 228 && px[i * 4 + 2] > 228;
          for (let i = 0; i < S; i++) st.push(i, (S - 1) * S + i, i * S, i * S + S - 1);
          while (st.length) { const i = st.pop(); if (gone[i] || !light(i)) continue; gone[i] = 1; const x = i % S, y = (i / S) | 0;
            if (x > 0) st.push(i - 1); if (x < S - 1) st.push(i + 1); if (y > 0) st.push(i - S); if (y < S - 1) st.push(i + S); }
          for (let i = 0; i < S * S; i++) { px[i * 4] = 5; px[i * 4 + 1] = 6; px[i * 4 + 2] = 15; px[i * 4 + 3] = gone[i] ? 0 : 255; }
          g.putImageData(d, 0, 0); res(c.toDataURL());
        } catch (e) { res(null); }
      };
      im.onerror = () => res(null);
      im.src = (window.DIGI_DB_DIR || 'img/digimon/') + src;
    });
    silCache.set(src, p); return p;
  }
  // 화면에 들어온 실루엣만 차례로 만들어요
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; io.unobserve(e.target); fillSil(e.target);
  }), { rootMargin: '300px' }) : null;
  function fillSil(el) { silhouette(el.dataset.sil).then(u => { if (u) el.innerHTML = `<img src="${u}" alt="">`; }); }

  const pic = (d, cls) => !d.img ? `<span class="${cls} dx-none">?</span>`
    : hidden(d) ? `<span class="${cls} dx-sil" data-sil="${esc(d.img)}"></span>`
    : `<span class="${cls}"><img src="${esc((window.DIGI_DB_DIR || 'img/digimon/') + d.img)}" alt="" loading="lazy"></span>`;
  const nameOf = d => hidden(d) ? '???' : d.n;
  function hookSil(root) { root.querySelectorAll('.dx-sil[data-sil]').forEach(el => io ? io.observe(el) : fillSil(el)); }

  let tab = '전체', query = '';
  function renderTabs() {
    $('dexTabs').innerHTML = ['전체', ...GROUPS].map(g => `<button type="button" role="tab" class="dx-tab${g === tab ? ' on' : ''}" data-g="${g}" aria-selected="${g === tab}">${g}</button>`).join('');
  }
  function renderGrid() {
    const q = query.trim();
    const rows = list.filter(d => (tab === '전체' || d.g === tab) && (!q || (!hidden(d) && d.n.includes(q))));
    const total = list.length, open = list.filter(d => !hidden(d)).length;
    $('dexCount').textContent = `전체 ${total}종 · 밝혀진 디지몬 ${open}종 · 완전체부터는 여행에서 진화하거나 만나면 밝혀져요`;
    $('dexGrid').innerHTML = rows.length ? rows.map(d => `<button type="button" class="dx-c${hidden(d) ? ' hid' : ''}" data-i="${byName.get(d.n)}">${pic(d, 'dx-p')}<b>${esc(nameOf(d))}</b><small>${esc(d.g)}</small></button>`).join('')
      : '<p class="dx-empty">찾는 디지몬이 없어요. 가려진 디지몬은 이름으로 찾을 수 없어요.</p>';
    hookSil($('dexGrid'));
  }
  const chip = (n, extra = '') => { const i = byName.get(n); if (i === undefined) return ''; const d = list[i];
    return `<button type="button" class="dx-chip${hidden(d) ? ' hid' : ''}" data-i="${i}">${pic(d, 'dx-cp')}<span>${esc(nameOf(d))}${extra ? `<em>${extra}</em>` : ''}</span></button>`; };
  function showDetail(i) {
    const d = list[i], hid = hidden(d), el = $('dexDetail');
    const after = d.to.filter(e => byName.has(e[0])).map(e => {
      const jog = e.length >= 4 && e[3] !== 1 && e[4] && e[4].length, mates = jog ? e[4].map(m => { const k = byName.get(m); return k === undefined ? m : nameOf(list[k]); }) : [];
      return chip(e[0], jog ? `조그레스 · ${esc(mates.join(', '))}` : e[5] ? `${esc(e[5])}의 디지멘탈` : '');
    }).join('');
    const before = (from.get(d.n) || []).map(n => chip(n)).join('');
    el.innerHTML = `
      <button type="button" class="dx-back">← 목록으로</button>
      <div class="dx-hero">${pic(d, 'dx-big')}<div><div class="eyebrow">${esc(d.lv || '등급 불명')}</div><h3>${esc(nameOf(d))}</h3>
        <div class="chips">${hid ? '<span class="chip">아직 밝혀지지 않았어요</span>' : `${d.attr && ATTR_CLS[d.attr] ? `<span class="chip attr ${ATTR_CLS[d.attr]}">${esc(d.attr)}</span>` : d.attr ? `<span class="chip">${esc(d.attr)}</span>` : ''}${d.type && d.type !== '-' ? `<span class="chip">${esc(d.type)}</span>` : ''}`}</div></div></div>
      ${!hid && d.attacks.length ? `<p class="dx-att">필살기 · ${esc(d.attacks.join(' · '))}</p>` : ''}
      <h4>진화 전 <small>${(from.get(d.n) || []).length}</small></h4><div class="dx-chips">${before || '<p class="dx-empty">알려진 진화 전 모습이 없어요.</p>'}</div>
      <h4>진화 후 <small>${d.to.filter(e => byName.has(e[0])).length}</small></h4><div class="dx-chips">${after || '<p class="dx-empty">알려진 진화 후 모습이 없어요.</p>'}</div>`;
    el.hidden = false; el.scrollTop = 0; $('dex').classList.add('detail');
    hookSil(el);
    el.querySelector('.dx-back').onclick = () => { el.hidden = true; $('dex').classList.remove('detail'); };
  }

  function open() {
    build(); renderTabs(); renderGrid();
    $('dex').hidden = false; requestAnimationFrame(() => $('dex').classList.add('on'));
    $('dexBtn').setAttribute('aria-expanded', 'true');
    $('dexQ').focus({ preventScroll: true });
  }
  function close() { $('dex').classList.remove('on', 'detail'); $('dexDetail').hidden = true; $('dex').hidden = true; $('dexBtn').setAttribute('aria-expanded', 'false'); $('dexBtn').focus({ preventScroll: true }); }

  $('dexBtn').addEventListener('click', () => ($('dex').hidden ? open() : close()));
  $('dexX').addEventListener('click', close);
  $('dex').addEventListener('click', e => { if (e.target === $('dex')) close(); });
  $('dexTabs').addEventListener('click', e => { const b = e.target.closest('[data-g]'); if (!b) return; tab = b.dataset.g; renderTabs(); renderGrid(); $('dexGrid').scrollTop = 0; });
  $('dexQ').addEventListener('input', e => { query = e.target.value; renderGrid(); });
  $('dex').addEventListener('click', e => { const b = e.target.closest('.dx-c, .dx-chip'); if (b) showDetail(+b.dataset.i); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !$('dex').hidden) { e.stopImmediatePropagation(); close(); } }, true);

  // 여행에서 진화하거나 만난 디지몬을 밝혀요 (도감의 공식 이름으로 기억해요)
  function reveal(name) {
    const d = window.digiData && window.digiData(name), n = d ? d.name : name;
    if (!n || seen.has(n) || !DB[n]) return;
    seen.add(n);
    try { localStorage.setItem(KEY, JSON.stringify([...seen])); } catch (e) {}
    if (list && !$('dex').hidden) renderGrid();
  }
  window.digiDex = { open, close, reveal };
})();
