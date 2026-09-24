/**
 * ALBUM KENANGAN — home.js
 * Beranda dari API: slideshow hero, angka statistik, dan deretan foto pilihan.
 */
(async function () {
  'use strict';

  const stage = document.getElementById('hero-stage');
  if (!stage) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const { items } = await Album.get();
  const cats = [...new Set(items.map((i) => i.cat))];
  const $ = (id) => document.getElementById(id);

  // urutan selang-seling antar kategori supaya tampilan beragam
  const mixed = [];
  const pools = cats.map((c) => items.filter((i) => i.cat === c));
  for (let n = 0; pools.some((p) => n < p.length); n++) pools.forEach((p) => { if (p[n]) mixed.push(p[n]); });

  /* --- statistik --- */
  $('stat-total').textContent = items.length;
  $('stat-cats').textContent = cats.length;

  /* --- hero: crossfade antar foto --- */
  const heroPicks = mixed.slice(0, 8);
  const done = (await Promise.allSettled(heroPicks.map((it) => Album.process(it, 1000))))
    .map((r, i) => (r.status === 'fulfilled' ? { it: heroPicks[i], r: r.value } : null)).filter(Boolean);
  const portrait = done.filter((d) => d.r.h / d.r.w >= 0.85);
  const slides = (portrait.length >= 3 ? portrait : done).slice(0, 5);
  stage.innerHTML = '';
  const dots = $('hero-dots');
  slides.forEach((s, i) => {
    const im = document.createElement('img');
    im.className = 'slide';
    im.alt = 'Foto ' + Album.catLabel(s.it.cat).toLowerCase() + ' nomor ' + s.it.id;
    stage.appendChild(im);
    Album.apply(im, s.r);
    s.el = im;
    const d = document.createElement('button');
    d.setAttribute('aria-label', 'Tampilkan foto ' + (i + 1));
    d.addEventListener('click', () => { go(i); restart(); });
    dots.appendChild(d);
  });
  let cur = -1, timer;
  function go(i) {
    if (!slides.length) return;
    cur = (i + slides.length) % slides.length;
    slides.forEach((s, k) => { s.el.classList.toggle('is-active', k === cur); dots.children[k].classList.toggle('is-on', k === cur); });
    stage.dataset.fit = slides[cur].r.mode;
    $('hero-num').textContent = 'No. ' + Album.pad(slides[cur].it.id);
    $('hero-cap').textContent = Album.catLabel(slides[cur].it.cat);
  }
  function restart() { clearInterval(timer); if (!reduced && slides.length > 1) timer = setInterval(() => { if (!document.hidden) go(cur + 1); }, 6000); }
  go(0); restart();

  /* --- foto pilihan --- */
  const track = $('featured-track');
  const feat = mixed.slice(2, 12);
  const res = await Promise.allSettled(feat.map((it) => Album.process(it, 700)));
  track.innerHTML = '';
  feat.forEach((it, i) => {
    if (res[i].status !== 'fulfilled') return;
    const a = document.createElement('a');
    a.className = 'featured-card';
    a.href = 'gallery.html#foto-' + it.id;
    a.innerHTML = '<div class="photo"><img alt="" decoding="async" loading="lazy"></div><figcaption></figcaption>';
    a.querySelector('img').alt = 'Foto ' + Album.catLabel(it.cat).toLowerCase() + ' nomor ' + it.id;
    a.querySelector('figcaption').textContent = Album.catLabel(it.cat) + ' · No. ' + Album.pad(it.id);
    Album.apply(a.querySelector('img'), res[i].value);
    track.appendChild(a);
  });
  document.querySelectorAll('.track-nav').forEach((b) =>
    b.addEventListener('click', () => track.scrollBy({ left: +b.dataset.dir * 320, behavior: 'smooth' })));

  // tautan baru (kartu foto pilihan) ikut transisi halaman
  const veil = document.querySelector('.page-veil');
  if (veil && !reduced) track.querySelectorAll('a').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault(); veil.classList.remove('is-entering'); veil.classList.add('is-leaving');
    setTimeout(() => { location.href = a.getAttribute('href'); }, 440);
  }));
})();
