/**
 * ALBUM KENANGAN — main.js
 * Perilaku yang dipakai bersama di semua halaman: navigasi, scroll reveal,
 * sequence animasi hero, partikel cahaya, dan transisi antar halaman.
 */
(function () {
  'use strict';

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------------
   * Navigasi: latar solid saat discroll + menu mobile
   * ------------------------------------------------------------------- */
  const nav = document.querySelector('.site-nav');
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');

  function onScrollNav() {
    if (!nav) return;
    nav.classList.toggle('is-solid', window.scrollY > 24);
  }
  window.addEventListener('scroll', onScrollNav, { passive: true });
  onScrollNav();

  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const open = links.classList.toggle('is-open');
      toggle.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    });
    links.querySelectorAll('a').forEach((a) =>
      a.addEventListener('click', () => {
        links.classList.remove('is-open');
        toggle.classList.remove('is-open');
      })
    );
  }

  /* ---------------------------------------------------------------------
   * Scroll reveal — sekali muncul, lalu berhenti diamati
   * ------------------------------------------------------------------- */
  const revealIO = prefersReduced
    ? null
    : new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              obs.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.16, rootMargin: '0px 0px -40px 0px' }
      );

  function observeReveals(root) {
    const scope = root || document;
    const items = scope.querySelectorAll('.reveal:not(.is-visible), .reveal-stagger:not(.is-visible)');
    items.forEach((el) => {
      if (prefersReduced) el.classList.add('is-visible');
      else revealIO.observe(el);
    });
  }
  window.AlbumObserveReveals = observeReveals;
  observeReveals();

  /* ---------------------------------------------------------------------
   * Sequence animasi hero — dipicu sekali saat halaman dimuat
   * ------------------------------------------------------------------- */
  const hero = document.querySelector('.hero');
  if (hero) {
    requestAnimationFrame(() => hero.classList.add('is-loaded'));
  }

  /* ---------------------------------------------------------------------
   * Partikel cahaya melayang (seperti debu tertimpa sinar lampu galeri)
   * ------------------------------------------------------------------- */
  document.querySelectorAll('.light-dust').forEach((field) => {
    if (prefersReduced) return;
    const count = parseInt(field.dataset.count || '16', 10);
    for (let i = 0; i < count; i++) {
      const mote = document.createElement('span');
      mote.className = 'mote';
      const left = Math.random() * 100;
      const duration = 10 + Math.random() * 12;
      const delay = Math.random() * duration * -1;
      const driftX = (Math.random() * 60 - 30).toFixed(0) + 'px';
      mote.style.left = left + '%';
      mote.style.animationDuration = duration.toFixed(1) + 's';
      mote.style.animationDelay = delay.toFixed(1) + 's';
      mote.style.setProperty('--drift-x', driftX);
      field.appendChild(mote);
    }
  });

  /* ---------------------------------------------------------------------
   * Veil transisi halaman: memberi kesan satu pengalaman yang menyambung,
   * bukan reload halaman yang kaku, saat berpindah antar halaman internal.
   * ------------------------------------------------------------------- */
  const veil = document.querySelector('.page-veil');
  if (veil && !prefersReduced) {
    requestAnimationFrame(() => veil.classList.add('is-entering'));

    document.querySelectorAll('a[href]').forEach((a) => {
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('http') || a.target === '_blank') return;
      a.addEventListener('click', (e) => {
        e.preventDefault();
        veil.classList.remove('is-entering');
        veil.classList.add('is-leaving');
        setTimeout(() => { window.location.href = href; }, 440);
      });
    });
  }
})();
