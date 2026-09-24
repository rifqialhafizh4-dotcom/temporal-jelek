/**
 * ALBUM KENANGAN — birthday.js
 * Halaman ucapan: lilin yang bisa ditiup + confetti, bendera hias, polaroid dari API.
 * Nama & pengirim diatur lewat atribut data-nama / data-dari pada <section id="bday">.
 */
(function () {
  'use strict';
  const sec = document.getElementById('bday');
  if (!sec) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (id) => document.getElementById(id);

  /* nama & pengirim */
  const nama = (sec.dataset.nama || '').trim(), dari = (sec.dataset.dari || '').trim();
  if (nama) {
    $('bday-name').textContent = nama;
    $('bday-name').classList.add('has-name');
    $('letter-open').textContent = 'Halo ' + nama + ', selamat ulang tahun!';
  }
  if (dari) $('letter-sign').textContent = 'Dengan sayang, ' + dari + ' ♡';

  /* bendera hias */
  const flags = ['#b98a4e', '#a15c43', '#6b7a5c', '#efe7da'];
  const bunting = $('bunting');
  for (let i = 0; i < 16; i++) {
    const f = document.createElement('span');
    f.style.background = flags[i % 4];
    f.style.animationDelay = (i * -0.35) + 's';
    bunting.appendChild(f);
  }

  /* confetti */
  const cv = $('confetti'), cx = cv.getContext('2d');
  const colors = ['#d9a869', '#b98a4e', '#a15c43', '#6b7a5c', '#efe7da', '#ffd58a'];
  let parts = [], raf = 0;
  function size() { cv.width = innerWidth; cv.height = innerHeight; }
  size(); addEventListener('resize', size);
  function burst() {
    if (reduced) return;
    const n = 160;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6, v = 8 + Math.random() * 12;
      parts.push({ x: innerWidth / 2, y: innerHeight * 0.55, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        w: 5 + Math.random() * 6, h: 3 + Math.random() * 5, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
        c: colors[i % colors.length], life: 1 });
    }
    if (!raf) raf = requestAnimationFrame(tick);
  }
  function tick() {
    cx.clearRect(0, 0, cv.width, cv.height);
    parts.forEach((p) => {
      p.vy += 0.28; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life -= 0.006;
      cx.save(); cx.globalAlpha = Math.max(p.life, 0); cx.translate(p.x, p.y); cx.rotate(p.r);
      cx.fillStyle = p.c; cx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); cx.restore();
    });
    parts = parts.filter((p) => p.life > 0 && p.y < cv.height + 20);
    raf = parts.length ? requestAnimationFrame(tick) : (cx.clearRect(0, 0, cv.width, cv.height), 0);
  }

  /* lilin */
  const cake = $('cake'), btn = $('blow'), hint = $('blow-hint');
  btn.addEventListener('click', () => {
    const out = cake.classList.toggle('is-out');
    btn.textContent = out ? 'Nyalakan lagi ✦' : 'Tiup lilinnya ✦';
    hint.textContent = out ? 'Semoga permintaanmu terkabul. Selamat ulang tahun! 🎉' : 'Buat satu permintaan dulu, lalu tiup.';
    if (out) burst();
  });

  /* polaroid dari API */
  (async function () {
    const box = $('polaroids');
    const { items } = await Album.get();
    const cats = [...new Set(items.map((i) => i.cat))];
    const pools = cats.map((c) => items.filter((i) => i.cat === c));
    const pick = [];
    for (let n = 3; pick.length < 5 && n < 30; n++) pools.forEach((p) => { if (p[n] && pick.length < 5) pick.push(p[n]); });
    const res = await Promise.allSettled(pick.map((it) => Album.process(it, 700)));
    box.innerHTML = '';
    pick.forEach((it, i) => {
      if (res[i].status !== 'fulfilled') return;
      const a = document.createElement('a');
      a.className = 'polaroid reveal';
      a.href = 'gallery.html#foto-' + it.id;
      a.style.transitionDelay = (i * 0.08) + 's';
      a.innerHTML = '<div class="photo"><img alt="" decoding="async" loading="lazy"></div><span></span>';
      a.querySelector('img').alt = 'Foto ' + Album.catLabel(it.cat).toLowerCase() + ' nomor ' + it.id;
      a.querySelector('span').textContent = Album.catLabel(it.cat);
      Album.apply(a.querySelector('img'), res[i].value);
      box.appendChild(a);
    });
    if (window.AlbumObserveReveals) window.AlbumObserveReveals(box);
    const veil = document.querySelector('.page-veil');
    if (veil && !reduced) box.querySelectorAll('a').forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault(); veil.classList.remove('is-entering'); veil.classList.add('is-leaving');
      setTimeout(() => { location.href = a.getAttribute('href'); }, 440);
    }));
  })();
})();
