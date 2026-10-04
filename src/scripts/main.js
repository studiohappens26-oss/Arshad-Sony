/* RDL Sony Centre: site interactions (shared by every page) */
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const desktop = window.matchMedia('(min-width: 961px)');
  const WA = ($('.wa-fab') || {}).href || 'https://wa.me/919353099534';
  const wa = text => `${WA.split('?')[0]}?text=${encodeURIComponent(text)}`;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------------- Mascots ---------------- */
  $$('[data-mascot]').forEach(el => { el.innerHTML = window.Rudy.svg(el.dataset.mascot); });

  /* ---------------- Reveal on scroll ---------------- */
  const revealIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      revealIO.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
  $$('.grid').forEach(g => $$('.pcard', g).forEach((el, i) => el.style.setProperty('--d', (i % 4) * 90 + 'ms')));
  $$('.points').forEach(g => $$('li', g).forEach((el, i) => el.style.setProperty('--d', i * 90 + 'ms')));
  const startHero = () => setTimeout(() => $$('.hero .lines, .hero .reveal, .phead .lines, .phead .reveal').forEach(el => el.classList.add('is-in')), 120);

  /* ---------------- Preloader (home page, once per session) ---------------- */
  const loader = $('#loader');
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
      }, Math.max(0, 900 - (performance.now() - started)));
    };
    window.addEventListener('load', finish);
    setTimeout(finish, 3000);
  } else {
    if (loader) loader.remove();
    document.body.classList.remove('is-loading');
    startHero();
  }

  /* ---------------- TV filters (cards are pre-rendered) ---------------- */
  const gridTv = $('#gridTv');
  if (gridTv) {
    const cards = $$('.pcard', gridTv);
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
      $('#tvCount').textContent = shown ? `${shown} television${shown > 1 ? 's' : ''}` : 'No televisions match these filters.';
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

  /* ---------------- Quick view ---------------- */
  const modal = $('#modal');
  if (modal) {
    const data = JSON.parse($('#quickData').textContent);
    let lastFocus = null;
    const open = p => {
      lastFocus = document.activeElement;
      $('#mImg').src = p.image; $('#mImg').alt = p.name;
      $('#mCat').textContent = `${p.short} · ${p.model}`;
      $('#mTitle').textContent = p.name;
      $('#mPrice').innerHTML = `${esc(p.price)}${p.mrp ? `<s>${esc(p.mrp)}</s>` : ''}`;
      $('#mSpecs').innerHTML = p.specs.map(([k, v]) => `<li><small>${esc(k)}</small><span>${esc(v)}</span></li>`).join('');
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

  /* ---------------- Header & nav ---------------- */
  const header = $('#header'), progress = $('#progress'), nav = $('#nav'), burger = $('#burger');
  let lastY = window.scrollY;
  function onScrollUI() {
    const y = window.scrollY, h = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${h > 0 ? y / h : 0})`;
    header.classList.toggle('is-scrolled', y > 30);
    header.classList.toggle('is-hidden', y > 500 && y > lastY + 2 && !nav.classList.contains('is-open'));
    if (y < lastY - 2) header.classList.remove('is-hidden');
    lastY = y;
  }
  burger.addEventListener('click', () => {
    const open = !nav.classList.contains('is-open');
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.style.overflow = open ? 'hidden' : '';
  });
  $$('a', nav).forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); document.body.style.overflow = '';
  }));

  /* ---------------- Parallax & hero TV ---------------- */
  const pxEls = $$('[data-speed]');
  const tvshow = $('#tvshow');
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };

  function motion() {
    const vh = innerHeight;
    pxEls.forEach(el => {
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      const s = parseFloat(el.dataset.speed);
      el.style.transform = `translate3d(0, ${((r.top + r.height / 2 - vh / 2) * -s).toFixed(1)}px, 0)`;
    });
    mouse.x += (mouse.tx - mouse.x) * 0.06;
    mouse.y += (mouse.ty - mouse.y) * 0.06;
    if (tvshow) {
      const p = clamp(window.scrollY / vh, 0, 1);
      tvshow.style.transform = `translate3d(${(mouse.x * 18).toFixed(1)}px, ${(p * -60 + mouse.y * 12).toFixed(1)}px, 0) scale(${(1 + p * 0.14).toFixed(3)}) rotateY(${(mouse.x * 4).toFixed(2)}deg)`;
    }
  }
  if (!reduced) {
    window.addEventListener('mousemove', e => {
      mouse.tx = e.clientX / innerWidth - 0.5;
      mouse.ty = e.clientY / innerHeight - 0.5;
    }, { passive: true });
  }


  /* ---------------- Auto carousels (no horizontal scrolling) ---------------- */
  $$('[data-carousel]').forEach(car => {
    const root = car.closest('section') || car.parentElement;
    const slides = $$('.slide', car), dots = $$('[data-go]', root), now = $('[data-now]', root);
    const interval = +car.dataset.interval || 6000;
    let i = 0, timer = 0, inView = false, hover = false;
    root.style.setProperty('--dur', interval + 'ms');
    const show = n => {
      i = (n + slides.length) % slides.length;
      slides.forEach((s, k) => {
        const on = k === i;
        s.classList.toggle('is-on', on);
        s.toggleAttribute('aria-hidden', !on);
        $$('a, button', s).forEach(el => (on ? el.removeAttribute('tabindex') : el.setAttribute('tabindex', '-1')));
      });
      dots.forEach((d, k) => {
        d.classList.remove('is-on'); void d.offsetWidth; // restart the progress fill
        d.classList.toggle('is-on', k === i);
        d.classList.toggle('is-done', k < i);
      });
      if (now) now.textContent = String(i + 1).padStart(2, '0');
      schedule();
    };
    const running = () => !reduced && inView && !hover && !document.hidden;
    function schedule() {
      clearTimeout(timer);
      root.classList.toggle('is-paused', !running());
      if (running()) timer = setTimeout(() => show(i + 1), interval);
    }
    $('[data-prev]', root)?.addEventListener('click', () => show(i - 1));
    $('[data-next]', root)?.addEventListener('click', () => show(i + 1));
    dots.forEach(d => d.addEventListener('click', () => show(+d.dataset.go)));
    root.addEventListener('mouseenter', () => { hover = true; schedule(); });
    root.addEventListener('mouseleave', () => { hover = false; show(i); });
    root.addEventListener('focusin', () => { hover = true; schedule(); });
    root.addEventListener('focusout', () => { hover = false; schedule(); });
    root.addEventListener('keydown', e => { if (e.key === 'ArrowRight') show(i + 1); if (e.key === 'ArrowLeft') show(i - 1); });
    document.addEventListener('visibilitychange', schedule);
    new IntersectionObserver(([e]) => { inView = e.isIntersecting; schedule(); }, { threshold: 0.35 }).observe(car);
    schedule();
    // swipe (no scrolling: the slides crossfade in place)
    let sx = 0, sy = 0;
    car.addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY; });
    car.addEventListener('pointerup', e => {
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) show(i + (dx < 0 ? 1 : -1));
    });
  });

  /* ---------------- Magnetic buttons ---------------- */
  if (finePointer && !reduced) {
    $$('.magnetic').forEach(b => {
      b.addEventListener('mousemove', e => {
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px, ${(e.clientY - r.top - r.height / 2) * 0.3}px)`;
      });
      b.addEventListener('mouseleave', () => { b.style.transform = ''; });
    });
  }

  /* ---------------- Custom cursor ---------------- */
  const cursor = $('#cursor');
  const dot = $('.cursor__dot', cursor), ring = $('.cursor__ring', cursor), label = $('#cursorLabel');
  const cur = { x: innerWidth / 2, y: innerHeight / 2, rx: innerWidth / 2, ry: innerHeight / 2 };
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
      const cardLink = interactive && interactive.matches('.pcard__name a, .cat');
      const themed = !interactive || cardLink;
      ['tv', 'hp', 'sb'].forEach(m => cursor.classList.toggle('m-' + m, mode === m && themed));
      cursor.classList.toggle('is-link', !!interactive && !cardLink);
      let text = '';
      if (themed && zone) {
        const lab = t.closest('[data-cursor-label]');
        text = lab ? lab.dataset.cursorLabel : '';
      } else if (interactive && interactive.dataset.cursorLabel) text = interactive.dataset.cursorLabel;
      label.textContent = text;
      cursor.classList.toggle('has-label', !!text);
    });
  }

  /* ---------------- Rudy the companion ---------------- */
  const buddy = $('#buddy'), buddyBody = $('#buddyBody'), bubble = $('#buddyBubble');
  const tips = {
    hero: ['Hi, I’m <b>Rudy</b>. Everything here is genuine Sony, from an authorised dealer in HSR Layout.', 'The showroom is on <b>6th Main Road</b>, opposite Canara Bank.'],
    tv: ['Not sure about size? Bring your wall measurement and we’ll help you choose.', 'Use the <b>size filter</b> to compare BRAVIA models quickly.'],
    hp: ['The <b>WH-1000XM5</b> is the one for flights and commutes.', 'Studio work? The <b>MDR-7506</b> is a classic.'],
    sb: ['<b>360 Spatial Sound Mapping</b> on the HT-A3000 is worth hearing in person.', 'A soundbar is the easiest upgrade for any BRAVIA.'],
    about: ['Genuine Sony, <b>best prices</b> in Bangalore.'],
    contact: ['Tap <b>Call now</b> and the store picks up, 9 am to 6 pm.']
  };
  const sectionToBuddy = { hero: 'hero', categories: 'hero', tv: 'tv', hp: 'hp', sb: 'sb', about: 'about', contact: 'contact' };
  let buddyVariant = '', bubbleTimer = 0;
  const tipIdx = {};
  function setBuddy(v) {
    if (v === buddyVariant) return;
    buddyVariant = v;
    buddy.classList.remove('is-hop'); void buddy.offsetWidth; buddy.classList.add('is-hop');
    setTimeout(() => { buddyBody.innerHTML = window.Rudy.svg(v); }, reduced ? 0 : 200);
  }
  function buddySay() {
    if (buddy.classList.contains('is-tucked')) return;
    const list = tips[buddyVariant] || tips.hero;
    tipIdx[buddyVariant] = ((tipIdx[buddyVariant] ?? -1) + 1) % list.length;
    bubble.innerHTML = list[tipIdx[buddyVariant]];
    bubble.classList.add('is-on');
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => bubble.classList.remove('is-on'), 5600);
  }
  buddyBody.addEventListener('click', buddySay);
  const first = $('[data-section]');
  setBuddy(sectionToBuddy[first && first.dataset.section] || 'hero');
  // one greeting per visit, on larger screens only
  let greeted = false;
  try { greeted = sessionStorage.getItem('rdl-hi') === '1'; } catch (e) { /* ignore */ }
  if (!greeted && desktop.matches) setTimeout(() => { buddySay(); try { sessionStorage.setItem('rdl-hi', '1'); } catch (e) { /* ignore */ } }, 4200);

  const sectionIO = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) setBuddy(sectionToBuddy[e.target.dataset.section] || 'hero'); });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('[data-section]').forEach(s => sectionIO.observe(s));

  // tuck the companion away where an inline Rudy already lives, and over the footer
  const tuck = new Set();
  const tuckIO = new IntersectionObserver(entries => {
    entries.forEach(e => (e.isIntersecting ? tuck.add(e.target) : tuck.delete(e.target)));
    buddy.classList.toggle('is-tucked', tuck.size > 0);
    if (tuck.size) bubble.classList.remove('is-on');
  }, { threshold: 0.25 });
  $$('.showroom__map, .footer, .phead').forEach(el => tuckIO.observe(el));
  const fab = $('.wa-fab');
  new IntersectionObserver(([e]) => fab.classList.toggle('is-tucked', e.isIntersecting), { threshold: 0.3 }).observe($('.footer'));

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
  $$('.reveal, .lines').forEach(el => { if (!el.closest('.hero, .phead')) revealIO.observe(el); });
  let lastLook = 0;
  function frame(t) {
    onScrollUI();
    if (!reduced) motion();
    if (useCursor) {
      cur.rx += (cur.x - cur.rx) * 0.2;
      cur.ry += (cur.y - cur.ry) * 0.2;
      ring.style.transform = `translate3d(${cur.rx.toFixed(1)}px, ${cur.ry.toFixed(1)}px, 0)`;
    }
    if (t - lastLook > 60) { lastLook = t; window.Rudy.look(document, lookX, lookY); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
