/* RDL Sony Centre: site interactions */
(function () {
  'use strict';

  const PHONE = '919353099534';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const inr = n => '₹' + Number(n).toLocaleString('en-IN');
  const wa = text => `https://wa.me/${PHONE}?text=${encodeURIComponent(text)}`;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  document.body.classList.add('is-loading');
  $('#year').textContent = new Date().getFullYear();

  /* ---------------- Preloader ---------------- */
  const loader = $('#loader'), bar = $('#loaderBar');
  const started = performance.now();
  const heroImgs = $$('.hero img');
  let loaded = 0;
  const tick = () => { loaded++; bar.style.width = Math.min(100, (loaded / heroImgs.length) * 100) + '%'; };
  heroImgs.forEach(img => (img.complete ? tick() : img.addEventListener('load', tick, { once: true })));
  let finished = false;
  function finishLoading() {
    if (finished) return;
    finished = true;
    bar.style.width = '100%';
    const wait = Math.max(0, (reduced ? 0 : 1100) - (performance.now() - started));
    setTimeout(() => {
      loader.classList.add('is-done');
      document.body.classList.remove('is-loading');
      setTimeout(() => $$('.hero .split, .hero .reveal').forEach(el => el.classList.add('is-in')), 250);
      setTimeout(() => buddySay('hero', true), 1400);
    }, wait);
  }
  window.addEventListener('load', finishLoading);
  setTimeout(finishLoading, 3500);

  /* ---------------- Mascots ---------------- */
  $$('[data-mascot]').forEach(el => { el.innerHTML = window.Rudy.svg(el.dataset.mascot); });

  /* ---------------- Split headings ---------------- */
  $$('.split').forEach(el => {
    let i = 0;
    const frag = document.createDocumentFragment();
    Array.from(el.childNodes).forEach(node => {
      const isEm = node.nodeType === 1 && node.tagName === 'EM';
      const text = node.textContent;
      text.split(/(\s+)/).forEach(part => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
        const w = document.createElement('span');
        w.className = 'w';
        const inner = document.createElement(isEm ? 'em' : 'span');
        inner.textContent = part;
        inner.style.setProperty('--i', i++);
        w.appendChild(inner);
        frag.appendChild(w);
      });
    });
    el.setAttribute('aria-label', el.textContent.trim());
    el.textContent = '';
    el.appendChild(frag);
    $$('.w', el).forEach(w => w.setAttribute('aria-hidden', 'true'));
  });

  /* ---------------- Reveal on scroll ---------------- */
  const revealIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      revealIO.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  function observeReveals(root = document) {
    $$('.reveal, .split', root).forEach(el => {
      if (el.closest('.hero')) return; // hero animates after the loader
      revealIO.observe(el);
    });
  }
  // stagger siblings
  $$('.mvv, .why__grid, .promise__grid, .contact__list').forEach(g => $$('.reveal', g).forEach((el, i) => el.style.setProperty('--d', i * 90 + 'ms')));

  /* ---------------- Counters ---------------- */
  const countIO = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target, to = +el.dataset.to, t0 = performance.now(), dur = 1600;
    const step = now => {
      const p = Math.min(1, (now - t0) / dur);
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    countIO.unobserve(el);
  }), { threshold: 0.6 });
  $$('.count').forEach(el => countIO.observe(el));

  /* ---------------- Products ---------------- */
  let products = [];
  const catLabel = { tv: 'Television', headphones: 'Headphones', soundbars: 'Soundbar' };
  const cursorFor = { tv: 'tv', headphones: 'hp', soundbars: 'sb' };

  function tagsFor(p) {
    if (p.category === 'tv') return [`${p.size}"`, p.series, p.panel !== 'LED' ? p.panel : p.resolution];
    if (p.category === 'headphones') return p.type.split(' · ');
    return [p.channels, 'Home theatre'];
  }

  function card(p) {
    const save = p.mrp ? Math.round((1 - p.price / p.mrp) * 100) : 0;
    const badge = p.tags && p.tags.includes('new') ? '<span class="badge">New</span>'
      : p.tags && p.tags.includes('highlight') ? '<span class="badge">Highlight</span>'
      : p.tags && p.tags.includes('trending') ? '<span class="badge">Trending</span>' : '';
    return `
      <article class="card" data-id="${esc(p.id)}" data-cursor="${cursorFor[p.category]}" data-cursor-label="View" tabindex="0" aria-label="${esc(p.name)}, ${inr(p.price)}">
        <div class="card__media">
          ${badge}${save ? `<span class="badge badge--save">Save ${save}%</span>` : ''}
          <img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy" width="1000" height="1000">
          <span class="card__glare"></span>
        </div>
        <div class="card__meta">${tagsFor(p).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
        <h3>${esc(p.name)}</h3>
        <div class="price"><b>${inr(p.price)}</b>${p.mrp ? `<s>${inr(p.mrp)}</s>` : ''}</div>
        <div class="card__actions">
          <a class="btn btn--solid" href="${wa(enquiryText(p))}" target="_blank" rel="noopener" data-cursor-label="Enquire">Enquire now</a>
          <button class="card__quick" type="button" aria-label="Quick view ${esc(p.model)}" data-quick><svg viewBox="0 0 24 24"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg></button>
        </div>
      </article>`;
  }

  function enquiryText(p) {
    return `Hi RDL Sony Centre, I'm interested in the ${p.name} (${p.model}) listed at ${inr(p.price)}. Is it available?`;
  }

  function render(el, list) {
    el.innerHTML = list.map(card).join('');
    $$('.card', el).forEach((c, i) => { c.classList.add('reveal'); c.style.setProperty('--d', (i % 4) * 80 + 'ms'); });
    observeReveals(el);
    bindTilt($$('.card', el));
  }

  /* TV filtering */
  const tvState = { tab: 'all', size: 'all', sort: 'price-asc' };
  function renderTVs() {
    let list = products.filter(p => p.category === 'tv');
    if (tvState.tab !== 'all') list = list.filter(p => p.tags.includes(tvState.tab));
    if (tvState.size !== 'all') list = list.filter(p => String(p.size) === tvState.size);
    const [k, dir] = tvState.sort.split('-');
    list.sort((a, b) => (k === 'size' ? (b.size - a.size) || (a.price - b.price) : dir === 'asc' ? a.price - b.price : b.price - a.price));
    render($('#gridTv'), list);
    $('#tvCount').textContent = list.length ? `Showing ${list.length} BRAVIA TV${list.length > 1 ? 's' : ''}` : 'No TVs match these filters. Try another size.';
  }

  function setupTVFilters() {
    const sizes = [...new Set(products.filter(p => p.category === 'tv').map(p => p.size))].sort((a, b) => a - b);
    $('#sizeChips').innerHTML = `<button class="is-on" data-size="all" aria-pressed="true">All sizes</button>` +
      sizes.map(s => `<button data-size="${s}" aria-pressed="false">${s}"</button>`).join('');
    $('#sizeChips').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      $$('#sizeChips button').forEach(x => { x.classList.toggle('is-on', x === b); x.setAttribute('aria-pressed', x === b); });
      tvState.size = b.dataset.size; renderTVs();
    });
    $('#tvTabs').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      $$('#tvTabs button').forEach(x => x.classList.toggle('is-on', x === b));
      tvState.tab = b.dataset.tab; renderTVs();
    });
    $('#tvSort').addEventListener('change', e => { tvState.sort = e.target.value; renderTVs(); });
  }

  fetch('data/products.json')
    .then(r => r.json())
    .then(d => {
      products = d.products;
      render($('#gridNew'), products.filter(p => p.tags && p.tags.includes('new')));
      setupTVFilters();
      renderTVs();
      render($('#gridHp'), products.filter(p => p.category === 'headphones'));
      render($('#gridSb'), products.filter(p => p.category === 'soundbars'));
    })
    .catch(() => {
      $$('#gridNew, #gridTv, #gridHp, #gridSb').forEach(g => {
        g.innerHTML = `<p class="muted">Our catalogue couldn't load right now. <a class="link-arrow" href="${wa('Hi RDL Sony Centre, please share your latest Sony price list.')}">Ask us on WhatsApp</a></p>`;
      });
    });

  /* ---------------- Quick view modal ---------------- */
  const modal = $('#modal');
  let lastFocus = null;
  function openModal(p) {
    lastFocus = document.activeElement;
    $('#mImg').src = p.image; $('#mImg').alt = p.name;
    $('#mCat').textContent = catLabel[p.category] + ' · ' + p.model;
    $('#mTitle').textContent = p.name;
    $('#mPrice').innerHTML = `<b>${inr(p.price)}</b>${p.mrp ? `<s>${inr(p.mrp)}</s>` : ''}`;
    const specs = p.category === 'tv'
      ? [['Screen', `${p.size}" (${p.cm} cm)`], ['Series', p.series], ['Resolution', p.resolution], ['Panel', p.panel], ['Platform', 'Google TV'], ['Model', p.model]]
      : p.category === 'headphones'
        ? [['Type', p.type], ['Model', p.model], ['Brand', 'Sony'], ['Warranty', 'Sony India']]
        : [['Channels', p.channels], ['Model', p.model], ['Brand', 'Sony'], ['Warranty', 'Sony India']];
    $('#mSpecs').innerHTML = specs.map(([k, v]) => `<li><small>${esc(k)}</small>${esc(v)}</li>`).join('');
    $('#mWa').href = wa(enquiryText(p));
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    $('.modal__close', modal).focus();
  }
  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }
  modal.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeModal(); });
  document.addEventListener('keydown', e => {
    if (modal.hidden) return;
    if (e.key === 'Escape') closeModal();
    if (e.key === 'Tab') { // keep focus inside the dialog
      const f = $$('a[href], button', modal).filter(x => x.offsetParent);
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  document.addEventListener('click', e => {
    const c = e.target.closest('.card');
    if (!c || e.target.closest('a')) return;
    const p = products.find(x => x.id === c.dataset.id);
    if (p) openModal(p);
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || !e.target.classList || !e.target.classList.contains('card')) return;
    const p = products.find(x => x.id === e.target.dataset.id);
    if (p) openModal(p);
  });

  /* ---------------- Header, progress, nav ---------------- */
  const header = $('#header'), progress = $('#progress'), toTop = $('#toTop');
  let lastY = window.scrollY;
  function onScrollUI() {
    const y = window.scrollY, h = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${h > 0 ? y / h : 0})`;
    header.classList.toggle('is-scrolled', y > 40);
    header.classList.toggle('is-hidden', y > 400 && y > lastY && !$('#nav').classList.contains('is-open'));
    toTop.classList.toggle('is-on', y > 900);
    lastY = y;
  }
  toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }));

  const burger = $('#burger'), nav = $('#nav');
  burger.addEventListener('click', () => {
    const open = !nav.classList.contains('is-open');
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', open);
  });
  $$('a', nav).forEach(a => a.addEventListener('click', () => { nav.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); }));

  const navMap = { tv: '#televisions', hp: '#headphones', sb: '#soundbars', about: '#about', contact: '#contact' };

  /* ---------------- Parallax ---------------- */
  const pxEls = $$('[data-speed]');
  const stage = $('#heroStage');
  const layers = $$('[data-depth]', stage);
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  function parallax() {
    const vh = innerHeight;
    pxEls.forEach(el => {
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      const center = r.top + r.height / 2 - vh / 2;
      const s = parseFloat(el.dataset.speed);
      const y = el.classList.contains('parallax-img') ? center * -s : (el.closest('.hero') ? window.scrollY * s : center * -s);
      el.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
    });
    // hero layers: mouse + scroll depth
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
  function bindTilt(els) {
    if (!finePointer || reduced) return;
    els.forEach(el => {
      if (el.dataset.tiltBound) return;
      el.dataset.tiltBound = '1';
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
  }
  bindTilt($$('.tilt'));

  /* ---------------- Magnetic buttons ---------------- */
  if (finePointer && !reduced) {
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
  if (finePointer && !reduced) {
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
      const interactive = t.closest('a, button, select, input, textarea, label, [data-quick]');
      cursor.classList.toggle('m-tv', mode === 'tv' && !interactive);
      cursor.classList.toggle('m-hp', mode === 'hp' && !interactive);
      cursor.classList.toggle('m-sb', mode === 'sb' && !interactive);
      cursor.classList.toggle('is-link', !!interactive);
      cursor.classList.toggle('is-dark', !!t.closest(darkZones));
      const lab = t.closest('[data-cursor-label]');
      const text = lab && (lab.matches('.card, .cat, .card .btn') || interactive === lab) ? lab.dataset.cursorLabel : '';
      label.textContent = text;
      cursor.classList.toggle('has-label', !!text);
    });
  }
  function moveRing() {
    cur.rx += (cur.x - cur.rx) * 0.18;
    cur.ry += (cur.y - cur.ry) * 0.18;
    ring.style.transform = `translate3d(${cur.rx.toFixed(1)}px, ${cur.ry.toFixed(1)}px, 0)`;
  }

  /* ---------------- Rudy the companion ---------------- */
  const buddy = $('#buddy'), buddyBody = $('#buddyBody'), bubble = $('#buddyBubble');
  const tips = {
    hero: ['Hi, I\'m <b>Rudy</b>! Your guide to genuine Sony at RDL, HSR Layout.', 'Psst, we\'re a <b>Sony Authorised Dealer</b>. Everything here is 100% genuine.'],
    tv: ['From <b>32" to 98"</b>: let\'s find your perfect BRAVIA!', 'Movie night? The <b>BRAVIA 9 Mini LED</b> is my favourite seat in the house.', 'Tip: filter by screen size to compare models quickly.'],
    hp: ['Shhh… <b>noise cancelling</b> in progress.', 'The <b>WH-1000XM5</b> makes Bangalore traffic disappear.', 'Studio-grade sound? The <b>MDR-7506</b> is a pro favourite.'],
    sb: ['Turn it up! Feel the <b>bass</b>!', '<b>360 Spatial Sound Mapping</b> on the HT-A3000 is pure magic.', 'Pair a soundbar with your BRAVIA for true cinema at home.'],
    about: ['Authentic Sony. <b>Best prices</b> in Bangalore.', 'Come say hi at our <b>HSR Layout</b> store, 9 am to 6 pm.'],
    contact: ['Drop by <b>HSR Layout</b> or ping us on WhatsApp!', 'Call us at <b>93530 99534</b>. I\'ll pass the phone along!']
  };
  const sectionToBuddy = { hero: 'hero', categories: 'hero', arrivals: 'tv', offer: 'tv', tv: 'tv', hp: 'hp', sb: 'sb', about: 'about', why: 'about', gallery: 'hero', promise: 'contact', news: 'contact', contact: 'contact' };
  let buddyVariant = '', bubbleTimer = 0, tipIdx = {};
  function setBuddy(v) {
    if (v === buddyVariant) return;
    buddyVariant = v;
    buddy.classList.remove('is-hop'); void buddy.offsetWidth; buddy.classList.add('is-hop');
    setTimeout(() => { buddyBody.innerHTML = window.Rudy.svg(v); }, reduced ? 0 : 220);
  }
  const smallScreen = window.matchMedia('(max-width: 560px)');
  function buddySay(v, force, fromUser) {
    if (smallScreen.matches && !fromUser) return; // on phones Rudy only talks when tapped
    const list = tips[v] || tips.hero;
    tipIdx[v] = force ? (tipIdx[v] || 0) : ((tipIdx[v] ?? -1) + 1) % list.length;
    bubble.innerHTML = list[tipIdx[v]];
    bubble.classList.add('is-on');
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => bubble.classList.remove('is-on'), 5200);
  }
  buddyBody.addEventListener('click', () => buddySay(buddyVariant, false, true));
  setBuddy('hero');

  const sectionIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const key = e.target.dataset.section;
      const v = sectionToBuddy[key] || 'hero';
      if (v !== buddyVariant) { setBuddy(v); if (!document.body.classList.contains('is-loading')) setTimeout(() => buddySay(v), 500); }
      $$('.nav a').forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === navMap[key]));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('[data-section]').forEach(s => sectionIO.observe(s));

  // tuck the companion away over the contact form and footer, where an inline Rudy already lives
  const tuckZones = new Set();
  const tuckIO = new IntersectionObserver(entries => {
    entries.forEach(e => (e.isIntersecting ? tuckZones.add(e.target) : tuckZones.delete(e.target)));
    buddy.classList.toggle('is-tucked', tuckZones.size > 0);
    if (tuckZones.size) bubble.classList.remove('is-on');
  }, { threshold: 0.2 });
  [$('.contact__form'), $('.footer')].forEach(el => tuckIO.observe(el));

  let lookX = innerWidth / 2, lookY = innerHeight / 2;
  window.addEventListener('mousemove', e => { lookX = e.clientX; lookY = e.clientY; }, { passive: true });

  /* ---------------- Forms → WhatsApp ---------------- */
  $('#contactForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target, err = $('#formError');
    const name = f.name.value.trim(), phone = f.phone.value.trim();
    if (!name) { err.textContent = 'Please tell us your name.'; f.name.focus(); return; }
    if (!/^[0-9+ ]{10,15}$/.test(phone)) { err.textContent = 'Please enter a valid phone number.'; f.phone.focus(); return; }
    err.textContent = '';
    const msg = `Hi RDL Sony Centre, I'm ${name} (${phone}). I'm interested in: ${f.interest.value}.` + (f.message.value.trim() ? `\n\n${f.message.value.trim()}` : '');
    window.open(wa(msg), '_blank', 'noopener');
  });
  $('#newsForm').addEventListener('submit', e => {
    e.preventDefault();
    const phone = e.target.phone.value.trim();
    window.open(wa(`Hi RDL Sony Centre, please add me (${phone}) to your Sony offers & new arrivals updates.`), '_blank', 'noopener');
  });

  /* ---------------- Main loop ---------------- */
  observeReveals();
  let lastLook = 0;
  function frame(t) {
    onScrollUI();
    if (!reduced) parallax();
    if (finePointer && !reduced) moveRing();
    if (t - lastLook > 50) { lastLook = t; window.Rudy.look(document, lookX, lookY); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
