/**
 * ALBUM KENANGAN — photo-engine.js
 * 1) Mengambil daftar foto dari API.
 * 2) Memotong otomatis area hitam (letterbox/pillarbox) di tepi foto.
 *    Jika browser tidak boleh membaca pikselnya (CORS), foto di-zoom
 *    sebagai cadangan sehingga tepi hitam tetap tidak terlihat.
 */
(function () {
  'use strict';

  const CFG = (window.ALBUM_CONFIG = Object.assign({
    api: 'https://temporal-iota.vercel.app/temple.json',
    timeout: 7000,
    darkLuma: 28,        // piksel dengan kecerahan <= ini dianggap hitam (0-255)
    barFraction: 0.985,  // baris/kolom dianggap bingkai jika segini persen pikselnya hitam
    maxSideCut: 0.46,    // maksimal bagian yang boleh dipotong per sisi
    fallbackZoom: 1.3    // zoom cadangan bila pemotongan otomatis tidak memungkinkan
  }, window.ALBUM_CONFIG || {}));

  document.documentElement.style.setProperty('--zoom', CFG.fallbackZoom);

  const BASE = 'https://res.cloudinary.com/mhfge4db/image/upload/v1790218802/gambar-';
  const SNAP = 'kkkkkkkppskpkppkpkpspsskkkkkkkpssssskkkpspkkpkpsss'; // salinan cadangan bila API tak terjangkau
  const SNAP_CAT = { k: 'keluarga', p: 'perjalanan', s: 'seharihari' };
  const CATS = { keluarga: 'Keluarga', perjalanan: 'Perjalanan', seharihari: 'Sehari-hari' };

  const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z]/g, '');
  const catLabel = (c) => CATS[c] || (c ? c[0].toUpperCase() + c.slice(1) : 'Lainnya');

  /* ---------------------------------------------------------------- API */
  async function fetchItems() {
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), CFG.timeout);
      const res = await fetch(CFG.api, { signal: ctl.signal, cache: 'no-cache' });
      clearTimeout(t);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      const arr = Array.isArray(json) ? json : (json.data || json.items || []);
      const items = arr
        .map((o, i) => ({ id: o.id != null ? o.id : i + 1, url: o.image_url || o.url, cat: norm(o.keterangan || o.kategori) }))
        .filter((o) => o.url);
      if (!items.length) throw new Error('kosong');
      return { items, live: true };
    } catch (e) {
      const items = SNAP.split('').map((k, i) => ({ id: i + 1, url: BASE + (i + 1) + '.jpg', cat: SNAP_CAT[k] }));
      return { items, live: false };
    }
  }
  let dataPromise;
  const get = () => dataPromise || (dataPromise = fetchItems());

  /* ------------------------------------------------------ antrean muat */
  const queue = [];
  let active = 0;
  function limit(fn) {
    return new Promise((resolve, reject) => { queue.push({ fn, resolve, reject }); pump(); });
  }
  function pump() {
    while (active < 6 && queue.length) {
      const job = queue.shift();
      active++;
      job.fn().then(job.resolve, job.reject).finally(() => { active--; pump(); });
    }
  }

  function loadImg(src, cors) {
    return new Promise((resolve, reject) => {
      const im = new Image();
      if (cors) im.crossOrigin = 'anonymous';
      im.decoding = 'async';
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error('gagal memuat'));
      im.src = src;
    });
  }

  // Cloudinary: minta versi yang sudah dikecilkan; kalau ditolak, pakai file asli.
  function variants(url, w) {
    return url.includes('/upload/') ? [url.replace('/upload/', '/upload/c_limit,w_' + w + ',q_auto/'), url] : [url];
  }

  /* ------------------------------------------- deteksi area hitam di tepi */
  function detect(img) {
    const W = img.naturalWidth, H = img.naturalHeight;
    const s = Math.min(1, 360 / Math.max(W, H));
    const w = Math.max(8, Math.round(W * s)), h = Math.max(8, Math.round(H * s));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    const d = ctx.getImageData(0, 0, w, h).data; // melempar error jika canvas "tainted"

    const dark = new Uint8Array(w * h);
    for (let i = 0, p = 0; i < d.length; i += 4, p++) {
      const luma = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      dark[p] = (d[i + 3] < 40 || luma <= CFG.darkLuma) ? 1 : 0;
    }
    const rowBar = (y, x0, x1) => { let n = 0; for (let x = x0; x < x1; x++) n += dark[y * w + x]; return n / (x1 - x0) >= CFG.barFraction; };
    const colBar = (x, y0, y1) => { let n = 0; for (let y = y0; y < y1; y++) n += dark[y * w + x]; return n / (y1 - y0) >= CFG.barFraction; };

    let t = 0, b = h, l = 0, r = w;
    for (let pass = 0; pass < 2; pass++) {
      while (t < b - 1 && rowBar(t, l, r)) t++;
      while (b > t + 1 && rowBar(b - 1, l, r)) b--;
      while (l < r - 1 && colBar(l, t, b)) l++;
      while (r > l + 1 && colBar(r - 1, t, b)) r--;
    }
    if (!t && !l && b === h && r === w) return null; // tidak ada bingkai hitam

    // Tepi hitam yang terlalu tebal = kemungkinan foto memang gelap, bukan bingkai.
    const cap = CFG.maxSideCut;
    if (t > h * cap) t = 0;
    if (h - b > h * cap) b = h;
    if (l > w * cap) l = 0;
    if (w - r > w * cap) r = w;
    if ((r - l) * (b - t) < w * h * 0.15) return null;

    // Sisakan margin kecil supaya sisa-sisa garis hitam (artefak JPEG) ikut terbuang.
    const mx = 1.2 / w + 0.003, my = 1.2 / h + 0.003;
    return {
      l: l ? l / w + mx : 0, t: t ? t / h + my : 0,
      r: r < w ? r / w - mx : 1, b: b < h ? b / h - my : 1
    };
  }

  async function cropTo(img, f) {
    const W = img.naturalWidth, H = img.naturalHeight;
    const x = Math.round(f.l * W), y = Math.round(f.t * H);
    const cw = Math.max(1, Math.round((f.r - f.l) * W)), ch = Math.max(1, Math.round((f.b - f.t) * H));
    const c = document.createElement('canvas');
    c.width = cw; c.height = ch;
    c.getContext('2d').drawImage(img, x, y, cw, ch, 0, 0, cw, ch);
    const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.92));
    return { src: blob ? URL.createObjectURL(blob) : c.toDataURL('image/jpeg', 0.92), w: cw, h: ch, mode: 'crop' };
  }

  /* --------------------------------------------------------- proses foto */
  const cache = new Map();
  const bars = new Map();

  async function run(item, w) {
    let img = null, cors = true;
    for (const mode of [true, false]) {
      for (const u of variants(item.url, w)) {
        try { img = await loadImg(u, mode); cors = mode; break; } catch (e) { /* coba varian berikutnya */ }
      }
      if (img) break;
    }
    if (!img) throw new Error('foto tidak dapat dimuat');
    const W = img.naturalWidth, H = img.naturalHeight;
    const zoomed = { src: img.src, w: W, h: H, mode: 'zoom' };
    if (!cors) return zoomed;
    let f = bars.get(item.id);
    if (f === undefined) {
      try { f = detect(img); } catch (e) { return zoomed; }
      bars.set(item.id, f);
    }
    return f ? cropTo(img, f) : { src: img.src, w: W, h: H, mode: 'clean' };
  }

  function process(item, w) {
    w = w || 900;
    const key = item.id + ':' + w;
    if (!cache.has(key)) cache.set(key, limit(() => run(item, w)).catch((e) => { cache.delete(key); throw e; }));
    return cache.get(key);
  }

  // Pasang hasil proses ke elemen <img>; mode "zoom" ditangani lewat CSS.
  function apply(img, res) {
    img.src = res.src; img.width = res.w; img.height = res.h;
    const box = img.closest('.photo');
    if (box) box.dataset.fit = res.mode;
  }

  window.Album = { get, process, apply, catLabel, pad: (n) => String(n).padStart(2, '0') };
})();
