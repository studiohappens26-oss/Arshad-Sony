/* RDL Sony Centre: site interactions (shared by every page) */
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const smallScreen = window.matchMedia('(max-width: 560px)');
  const WA = ($('.wa-fab') || {}).href || 'https://wa.me/919353099534';
  const wa = text => `${WA.split('?')[0]}?text=${encodeURIComponent(text)}`;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------------- Mascots ---------------- */
  $$('[data-mascot]').forEach(el => { el.innerHTML = window.Rudy.svg(el.dataset.mascot); });

  /* ---------------- Split headings ---------------- */
  $$('.split').forEach(el => {
    let i = 0;
    const frag = document.createDocumentFragment();
    Array.from(el.childNodes).forEach(node => {
      const isEm = node.nodeType === 1 && node.tagName === 'EM';
      node.textContent.split(/(\s+)/).forEach(part => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
        const w = document.createElement('span');
        w.className = 'w';
        w.setAttribute('aria-hidden', 'true');
        const inner = document.createElement(isEm ? 'em' : 'span');
        inner.textContent = part;
        inner.style.setProperty('--i', i++);
        w.appendChild(inner);
        frag.appendChild(w);
      });
    });
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    el.textContent = '';
    el.appendChild(frag);
  });

  /* ---------------- Reveal on scroll ---------------- */
  const revealIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      revealIO.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  $$('.mvv, .why__grid, .promise__grid, .contact__list, .grid').forEach(g =>
    $$('.reveal, .card', g).forEach((el, i) => el.style.setProperty('--d', (i % 4) * 80 + 'ms')));
  $$('.card').forEach(c => c.classList.add('reveal'));
  const observeReveals = () => $$('.reveal, .split').forEach(el => { if (!el.closest('.hero')) revealIO.observe(el); });

  /* ---------------- Preloader (home page, once per session) ---------------- */
  const loader = $('#loader');
  const startHero = () => setTimeout(() => $$('.hero .split, .hero .reveal').forEach(el => el.classList.add('is-in')), 150);
  let seen = false;
  try { seen = sessionStorage.getItem('rdl-intro') === '1'; sessionStorage.setItem('rdl-intro', '1'); } catch (e) { /* storage blocked */ }
  if (loader && !seen && !reduced) {
    const bar = $('#loaderBar'), started = performance.now(), imgs = $$('.hero img');
    let loaded = 0, finished = false;
    const tick = () => { loaded++; bar.style.width = Math.min(100, (loaded / imgs.length) * 100) + '%'; };
    imgs.forEach(img => (img.complete ? tick() : img.addEventListener('load', tick, { once: true })));
    const finish = () => {
      if (finished) return;
      finished = true;
      bar.style.width = '100%';
      setTimeout(() => {
        loader.classList.add('is-done');
        document.body.classList.remove('is-loading');
        startHero();
        setTimeout(() => buddySay('hero', true), 1400);
      }, Math.max(0, 1100 - (performance.now() - started)));
    };
    window.addEventListener('load', finish);
    setTimeout(finish, 3500);
  } else {
    if (loader) loader.remove();
    document.body.classList.remove('is-loading');
    startHero();
    setTimeout(() => buddySay(buddyVariant, true), 1500);
  }

  /* ---------------- Counters ---------------- */
  const countIO = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target, to = +el.dataset.to, t0 = performance.now(), dur = 1600;
    const step = now => {
      const p = Math.min(1, (now - t0) / dur);
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    if (!reduced) requestAnimationFrame(step);
    countIO.unobserve(el);
  }), { threshold: 0.6 });
  $$('.count').forEach(el => countIO.observe(el));

  /* ---------------- TV filters (cards are pre-rendered) ---------------- */
  const gridTv = $('#gridTv');
  if (gridTv) {
    const cards = $$('.card', gridTv);
    const state = { tab: 'all', size: 'all', sort: 'price-asc' };
    const apply = () => {
      const [k, dir] = state.sort.split('-');
      const sorted = cards.slice().sort((a, b) => {
        const pa = +a.dataset.price, pb = +b.dataset.price;
        if (k === 'size') return (+b.dataset.size - +a.dataset.size) || (pa - pb);
        return dir === 'asc' ? pa - pb : pb - pa;
      });
      let shown = 0;
      sorted.forEach(c => {
        const ok = (state.tab === 'all' || c.dataset.tags.split(' ').includes(state.tab)) && (state.size === 'all' || c.dataset.size === state.size);
        c.hidden = !ok;
        if (ok) { shown++; c.classList.add('is-in'); }
        gridTv.appendChild(c);
      });
      $('#tvCount').textContent = shown ? `Showing ${shown} BRAVIA TV${shown > 1 ? 's' : ''}` : 'No TVs match these filters. Try another size.';
    };
    const group = (sel, key, attr) => $(sel).addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      $$(sel + ' button').forEach(x => { x.classList.toggle('is-on', x === b); x.setAttribute('aria-pressed', x === b); });
      state[key] = b.dataset[attr]; apply();
    });
    group('#tvTabs', 'tab', 'tab');
    group('#sizeChips', 'size', 'size');
    $('#tvSort').addEventListener('change', e => { state.sort = e.target.value; apply(); });
  }

  /* ---------------- Quick view modal ---------------- */
  const modal = $('#modal');
  if (modal) {
    const data = JSON.parse($('#quickData').textContent);
    let lastFocus = null;
    const open = p => {
      lastFocus = document.activeElement;
      $('#mImg').src = p.image; $('#mImg').alt = p.name;
      $('#mCat').textContent = `${p.cat} · ${p.model}`;
      $('#mTitle').textContent = p.name;
      $('#mPrice').innerHTML = `<b>${esc(p.price)}</b>${p.mrp ? `<s>${esc(p.mrp)}</s>` : ''}`;
      $('#mSpecs').innerHTML = p.specs.map(([k, v]) => `<li><small>${esc(k)}</small>${esc(v)}</li>`).join('');
      $('#mWa').href = p.wa;
      $('#mUrl').href = p.url;
      modal.hidden = false;
      document.body.style.overflow = 'hidden';
      $('.modal__close', modal).focus();
    };
    const close = () => {
      modal.hidden = true;
      document.body.style.overflow = '';
      if (lastFocus) lastFocus.focus();
    };
    modal.addEventListener('click', e => { if (e.target.closest('[data-close]')) close(); });
    document.addEventListener('keydown', e => {
      if (modal.hidden) return;
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') {
        const f = $$('a[href], button', modal).filter(x => x.offsetParent);
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    });
    document.addEventListener('click', e => {
      const b = e.target.closest('[data-quick]');
      if (!b) return;
      const p = data.find(x => x.id === b.dataset.quick);
      if (p) open(p);
    });
  }

  /* ---------------- Header, progress, nav ---------------- */
  const header = $('#header'), progress = $('#progress'), toTop = $('#toTop'), nav = $('#nav'), burger = $('#burger');
  let lastY = window.scrollY;
  function onScrollUI() {
    const y = window.scrollY, h = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${h > 0 ? y / h : 0})`;
    header.classList.toggle('is-scrolled', y > 40);
    header.classList.toggle('is-hidden', y > 400 && y > lastY && !nav.classList.contains('is-open'));
    toTop.classList.toggle('is-on', y > 900);
    lastY = y;
  }
  toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }));
  burger.addEventListener('click', () => {
    const open = !nav.classList.contains('is-open');
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', open);
  });
  $$('a', nav).forEach(a => a.addEventListener('click', () => { nav.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); }));

  /* ---------------- Parallax ---------------- */
  const pxEls = $$('[data-speed]');
  const layers = $$('#heroStage [data-depth]');
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  function parallax() {
    const vh = innerHeight;
    pxEls.forEach(el => {
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      const s = parseFloat(el.dataset.speed);
      const y = el.closest('.hero') && !el.classList.contains('parallax-img') ? window.scrollY * s : (r.top + r.height / 2 - vh / 2) * -s;
      el.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
    });
    if (!layers.length) return;
    mouse.x += (mouse.tx - mouse.x) * 0.08;
    mouse.y += (mouse.ty - mouse.y) * 0.08;
    const sy = Math.min(window.scrollY, vh);
    layers.forEach(l => {
      const d = parseFloat(l.dataset.depth);
      l.style.transform = `translate3d(${(mouse.x * d * 40).toFixed(1)}px, ${(mouse.y * d * 30 - sy * d * 0.5).toFixed(1)}px, 0)`;
    });
  }
  if (!reduced) {
    window.addEventListener('mousemove', e => {
      mouse.tx = e.clientX / innerWidth - 0.5;
      mouse.ty = e.clientY / innerHeight - 0.5;
    }, { passive: true });
  }

  /* ---------------- Tilt + glare ---------------- */
  if (finePointer && !reduced) {
    $$('.tilt, .card').forEach(el => {
      const max = el.classList.contains('card') ? 7 : 9;
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        el.style.transform = `perspective(900px) rotateX(${((0.5 - py) * max).toFixed(2)}deg) rotateY(${((px - 0.5) * max).toFixed(2)}deg) translateY(-6px)`;
        el.style.setProperty('--gx', px * 100 + '%');
        el.style.setProperty('--gy', py * 100 + '%');
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
    $$('.magnetic').forEach(b => {
      b.addEventListener('mousemove', e => {
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.25}px, ${(e.clientY - r.top - r.height / 2) * 0.35}px)`;
      });
      b.addEventListener('mouseleave', () => { b.style.transform = ''; });
    });
  }

  /* ---------------- Custom cursor ---------------- */
  const cursor = $('#cursor');
  const dot = $('.cursor__dot', cursor), ring = $('.cursor__ring', cursor), label = $('#cursorLabel');
  const cur = { x: innerWidth / 2, y: innerHeight / 2, rx: innerWidth / 2, ry: innerHeight / 2 };
  const darkZones = '.hps, .offer, .news, .footer, .marquee, .promise, .topbar, .loader';
  const useCursor = finePointer && !reduced;
  if (useCursor) {
    document.documentElement.classList.add('has-cursor');
    window.addEventListener('mousemove', e => {
      cur.x = e.clientX; cur.y = e.clientY;
      dot.style.transform = `translate3d(${cur.x}px, ${cur.y}px, 0)`;
      cursor.classList.remove('is-hidden');
    }, { passive: true });
    document.addEventListener('mouseleave', () => cursor.classList.add('is-hidden'));
    document.addEventListener('mouseover', e => {
      const t = e.target;
      const zone = t.closest('[data-cursor]');
      const mode = zone ? zone.dataset.cursor : '';
      const interactive = t.closest('a, button, select, input, textarea, label');
      const onCardLink = interactive && interactive.closest('.card') && !interactive.matches('.btn, .card__icon');
      const themed = !interactive || onCardLink;
      cursor.classList.toggle('m-tv', mode === 'tv' && themed);
      cursor.classList.toggle('m-hp', mode === 'hp' && themed);
      cursor.classList.toggle('m-sb', mode === 'sb' && themed);
      cursor.classList.toggle('is-link', !!interactive && !onCardLink);
      cursor.classList.toggle('is-dark', !!t.closest(darkZones));
      const lab = t.closest('[data-cursor-label]');
      const text = lab && (lab.matches('.card, .cat') || interactive === lab) ? lab.dataset.cursorLabel : '';
      label.textContent = text;
      cursor.classList.toggle('has-label', !!text);
    });
  }

  /* ---------------- Rudy the companion ---------------- */
  const buddy = $('#buddy'), buddyBody = $('#buddyBody'), bubble = $('#buddyBubble');
  const tips = {
    hero: ['Hi, I\'m <b>Rudy</b>! Your guide to genuine Sony at RDL, HSR Layout.', 'Psst, we\'re a <b>Sony Authorised Dealer</b>. Everything here is 100% genuine.'],
    tv: ['From <b>32" to 98"</b>: let\'s find your perfect BRAVIA!', 'Movie night? The <b>BRAVIA 9 Mini LED</b> is my favourite seat in the house.', 'Tip: filter by screen size to compare models quickly.'],
    hp: ['Shhh… <b>noise cancelling</b> in progress.', 'The <b>WH-1000XM5</b> makes Bangalore traffic disappear.', 'Studio-grade sound? The <b>MDR-7506</b> is a pro favourite.'],
    sb: ['Turn it up! Feel the <b>bass</b>!', '<b>360 Spatial Sound Mapping</b> on the HT-A3000 is pure magic.', 'Pair a soundbar with your BRAVIA for true cinema at home.'],
    about: ['Authentic Sony. <b>Best prices</b> in Bangalore.', 'Come say hi at our <b>HSR Layout</b> store, 9 am to 6 pm.'],
    contact: ['Drop by <b>HSR Layout</b> or ping us on WhatsApp!', 'Tap <b>Call now</b> and the store picks up. I\'ll pass the phone along!']
  };
  const sectionToBuddy = { hero: 'hero', categories: 'hero', arrivals: 'tv', offer: 'tv', tv: 'tv', hp: 'hp', sb: 'sb', about: 'about', why: 'about', gallery: 'hero', promise: 'contact', news: 'contact', contact: 'contact' };
  let buddyVariant = '', bubbleTimer = 0;
  const tipIdx = {};
  function setBuddy(v) {
    if (v === buddyVariant) return;
    buddyVariant = v;
    buddy.classList.remove('is-hop'); void buddy.offsetWidth; buddy.classList.add('is-hop');
    setTimeout(() => { buddyBody.innerHTML = window.Rudy.svg(v); }, reduced ? 0 : 220);
  }
  function buddySay(v, force, fromUser) {
    if (smallScreen.matches && !fromUser) return; // on phones Rudy only talks when tapped
    if (buddy.classList.contains('is-tucked')) return;
    const list = tips[v] || tips.hero;
    tipIdx[v] = force ? (tipIdx[v] || 0) : ((tipIdx[v] ?? -1) + 1) % list.length;
    bubble.innerHTML = list[tipIdx[v]];
    bubble.classList.add('is-on');
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => bubble.classList.remove('is-on'), 5200);
  }
  buddyBody.addEventListener('click', () => buddySay(buddyVariant, false, true));
  const firstSection = $('[data-section]');
  setBuddy(sectionToBuddy[firstSection && firstSection.dataset.section] || 'hero');

  const sectionIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const v = sectionToBuddy[e.target.dataset.section] || 'hero';
      if (v !== buddyVariant) { setBuddy(v); if (!document.body.classList.contains('is-loading')) setTimeout(() => buddySay(v), 500); }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('[data-section]').forEach(s => sectionIO.observe(s));

  // tuck the companion away where an inline Rudy already lives (contact form, visit band) and over the footer
  const tuckZones = new Set();
  const tuckIO = new IntersectionObserver(entries => {
    entries.forEach(e => (e.isIntersecting ? tuckZones.add(e.target) : tuckZones.delete(e.target)));
    buddy.classList.toggle('is-tucked', tuckZones.size > 0);
    if (tuckZones.size) bubble.classList.remove('is-on');
  }, { threshold: 0.2 });
  $$('.contact__form, .visit, .footer').forEach(el => tuckIO.observe(el));
  const floatBadge = $('.float-badge');
  new IntersectionObserver(([e]) => floatBadge.classList.toggle('is-tucked', e.isIntersecting), { threshold: 0.05 }).observe($('.footer'));

  let lookX = innerWidth / 2, lookY = innerHeight / 2;
  window.addEventListener('mousemove', e => { lookX = e.clientX; lookY = e.clientY; }, { passive: true });

  /* ---------------- Forms → WhatsApp ---------------- */
  const contactForm = $('#contactForm');
  if (contactForm) contactForm.addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target, err = $('#formError');
    const name = f.name.value.trim(), phone = f.phone.value.trim();
    if (!name) { err.textContent = 'Please tell us your name.'; f.name.focus(); return; }
    if (!/^[0-9+ ]{10,15}$/.test(phone)) { err.textContent = 'Please enter a valid phone number.'; f.phone.focus(); return; }
    err.textContent = '';
    const msg = `Hi RDL Sony Centre, I'm ${name} (${phone}). I'm interested in: ${f.interest.value}.` + (f.message.value.trim() ? `\n\n${f.message.value.trim()}` : '');
    window.open(wa(msg), '_blank', 'noopener');
  });
  const newsForm = $('#newsForm');
  if (newsForm) newsForm.addEventListener('submit', e => {
    e.preventDefault();
    window.open(wa(`Hi RDL Sony Centre, please add me (${e.target.phone.value.trim()}) to your Sony offers & new arrivals updates.`), '_blank', 'noopener');
  });

  /* ---------------- Main loop ---------------- */
  observeReveals();
  let lastLook = 0;
  function frame(t) {
    onScrollUI();
    if (!reduced) parallax();
    if (useCursor) {
      cur.rx += (cur.x - cur.rx) * 0.18;
      cur.ry += (cur.y - cur.ry) * 0.18;
      ring.style.transform = `translate3d(${cur.rx.toFixed(1)}px, ${cur.ry.toFixed(1)}px, 0)`;
    }
    if (t - lastLook > 50) { lastLook = t; window.Rudy.look(document, lookX, lookY); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
