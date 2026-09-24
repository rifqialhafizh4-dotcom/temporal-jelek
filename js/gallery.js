/**
 * ALBUM KENANGAN — gallery.js
 * Galeri dari API: filter kategori, muat bertahap saat scroll, skeleton
 * loading, dan lightbox (panah, swipe, keyboard, klik untuk zoom).
 */
(async function () {
  'use strict';

  const grid = document.getElementById('gallery-grid');
  if (!grid) return;
  const filterBar = document.querySelector('.filter-bar');
  const sentinel = document.getElementById('sentinel');
  const status = document.getElementById('api-status');
  const BATCH = 12;
  const pad = Album.pad;

  const { items, live } = await Album.get();
  const byId = new Map(items.map((i) => [String(i.id), i]));

  /* ---------- status koneksi + tombol filter (dibuat dari data API) ---------- */
  if (status) {
    status.classList.toggle('is-off', !live);
    status.innerHTML = '<span class="dot"></span>' + (live
      ? 'Tersambung ke API · ' + items.length + ' foto'
      : 'API tidak terjangkau · memakai salinan cadangan');
  }
  const cats = [...new Set(items.map((i) => i.cat))];
  filterBar.innerHTML = '';
  [['semua', 'Semua', items.length]].concat(cats.map((c) => [c, Album.catLabel(c), items.filter((i) => i.cat === c).length]))
    .forEach(([key, label, n], idx) => {
      const b = document.createElement('button');
      b.className = 'filter-btn' + (idx === 0 ? ' is-active' : '');
      b.dataset.filter = key;
      b.innerHTML = label + '<span class="count">' + n + '</span>';
      filterBar.appendChild(b);
    });

  /* ---------------------------- grid + muat bertahap ---------------------------- */
  let list = items, cursor = 0, busy = false, gen = 0;

  function skeleton(i) {
    const s = document.createElement('div');
    s.className = 'frame-card is-skeleton';
    s.style.setProperty('--ar', [0.8, 1.25, 1, 0.75, 1.1, 0.85][i % 6]);
    s.innerHTML = '<div class="photo skeleton"></div><figcaption>&nbsp;</figcaption>';
    return s;
  }

  function card(it, r, i) {
    const label = Album.catLabel(it.cat);
    const el = document.createElement('figure');
    el.className = 'frame-card is-entering';
    el.style.setProperty('--i', i);
    el.dataset.id = it.id;
    el.tabIndex = 0;
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', 'Buka foto ' + pad(it.id) + ', ' + label);
    el.innerHTML = '<div class="photo"><img alt="" decoding="async"></div>' +
      '<figcaption><span>No. ' + pad(it.id) + '</span><span class="cat">' + label + '</span></figcaption>';
    const img = el.querySelector('img');
    img.alt = 'Foto ' + label.toLowerCase() + ' nomor ' + it.id;
    Album.apply(img, r);
    return el;
  }

  async function loadBatch() {
    if (busy || cursor >= list.length) return;
    busy = true;
    const g = gen, slice = list.slice(cursor, cursor + BATCH);
    const skels = slice.map((_, i) => skeleton(i));
    grid.append(...skels);
    const res = await Promise.allSettled(slice.map((it) => Album.process(it, 900)));
    if (g !== gen) return;
    skels.forEach((s) => s.remove());
    slice.forEach((it, i) => { if (res[i].status === 'fulfilled') grid.append(card(it, res[i].value, i)); });
    cursor += slice.length;
    busy = false;
    requestAnimationFrame(() => { if (sentinel.getBoundingClientRect().top < innerHeight + 500) loadBatch(); });
  }

  function setFilter(f) {
    list = f === 'semua' ? items : items.filter((i) => i.cat === f);
    cursor = 0; busy = false; gen++;
    grid.innerHTML = '';
    filterBar.querySelectorAll('.filter-btn').forEach((b) => b.classList.toggle('is-active', b.dataset.filter === f));
    loadBatch();
  }

  filterBar.addEventListener('click', (e) => {
    const b = e.target.closest('.filter-btn');
    if (b) setFilter(b.dataset.filter);
  });
  new IntersectionObserver((en) => { if (en[0].isIntersecting) loadBatch(); }, { rootMargin: '500px' }).observe(sentinel);

  /* --------------------------------- lightbox --------------------------------- */
  const lb = document.getElementById('lightbox');
  const box = lb.querySelector('.photo');
  const lbImg = box.querySelector('img');
  const capText = lb.querySelector('.cap-text');
  const capCount = lb.querySelector('.cap-counter');
  let lbList = [], idx = 0, token = 0, lastFocus = null;

  const resetZoom = () => box.classList.remove('is-zoomed');

  async function show(i) {
    idx = (i + lbList.length) % lbList.length;
    const it = lbList[idx], tk = ++token;
    resetZoom();
    box.classList.add('is-loading');
    capText.textContent = Album.catLabel(it.cat) + ' — No. ' + pad(it.id);
    capCount.textContent = (idx + 1) + ' / ' + lbList.length;
    history.replaceState(null, '', '#foto-' + it.id);
    try {
      const r = await Album.process(it, 1800);
      if (tk !== token) return;
      lbImg.classList.remove('is-swapping');
      void lbImg.offsetWidth;
      Album.apply(lbImg, r);
      lbImg.classList.add('is-swapping');
    } catch (e) {
      if (tk === token) capText.textContent = 'Foto tidak dapat dimuat';
    }
    if (tk === token) box.classList.remove('is-loading');
    [1, -1].forEach((d) => Album.process(lbList[(idx + d + lbList.length) % lbList.length], 1800).catch(() => {}));
  }

  function open(id) {
    const cur = list.some((i) => String(i.id) === String(id)) ? list : items;
    if (cur !== list) setFilter('semua');
    lbList = cur;
    lastFocus = document.activeElement;
    lb.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    show(lbList.findIndex((i) => String(i.id) === String(id)));
    lb.querySelector('.lightbox-close').focus();
  }

  function close() {
    lb.classList.remove('is-open');
    document.body.style.overflow = '';
    history.replaceState(null, '', location.pathname);
    if (lastFocus) lastFocus.focus();
  }

  grid.addEventListener('click', (e) => {
    const c = e.target.closest('.frame-card:not(.is-skeleton)');
    if (c) open(c.dataset.id);
  });
  grid.addEventListener('keydown', (e) => {
    const c = e.target.closest('.frame-card:not(.is-skeleton)');
    if (c && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(c.dataset.id); }
  });

  lb.querySelector('.lightbox-close').addEventListener('click', close);
  lb.querySelector('.lightbox-prev').addEventListener('click', () => show(idx - 1));
  lb.querySelector('.lightbox-next').addEventListener('click', () => show(idx + 1));
  lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
  document.addEventListener('keydown', (e) => {
    if (!lb.classList.contains('is-open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(idx - 1);
    if (e.key === 'ArrowRight') show(idx + 1);
  });

  // klik foto = zoom in/out (titik zoom mengikuti kursor)
  const setOrigin = (e) => {
    const r = box.getBoundingClientRect();
    lbImg.style.transformOrigin = ((e.clientX - r.left) / r.width * 100) + '% ' + ((e.clientY - r.top) / r.height * 100) + '%';
  };
  box.addEventListener('click', (e) => { setOrigin(e); box.classList.toggle('is-zoomed'); });
  box.addEventListener('mousemove', (e) => { if (box.classList.contains('is-zoomed')) setOrigin(e); });

  // geser di layar sentuh
  let sx = 0;
  lb.addEventListener('touchstart', (e) => { sx = e.changedTouches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 60 && !box.classList.contains('is-zoomed')) show(idx + (dx < 0 ? 1 : -1));
  }, { passive: true });

  /* -------------------------------- mulai -------------------------------- */
  const hash = decodeURIComponent(location.hash.slice(1));
  const m = /^foto-(\d+)$/.exec(hash);
  if (m && byId.has(m[1])) { setFilter('semua'); open(m[1]); }
  else setFilter(cats.includes(hash) ? hash : 'semua');
})();
