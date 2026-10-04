/* Rudy: the RDL Sony Centre mascot.
   A little BRAVIA-style TV with a face, drawn as inline SVG so each section
   can dress him differently (popcorn & remote for TVs, headphones for audio,
   a soundbar stage for home theatre, a phone for contact). */
(function () {
  const ROSE = '#e6b08c';
  const INK = '#1c1416';

  const arms = {
    wave: `<g class="r-arm r-arm--wave"><path d="M136 92 q18 -6 16 -30" class="r-limb"/><circle cx="152" cy="58" r="8" class="r-hand"/></g>`,
    restL: `<g class="r-arm"><path d="M24 96 q-14 12 -10 32" class="r-limb"/><circle cx="14" cy="130" r="8" class="r-hand"/></g>`,
    restR: `<g class="r-arm"><path d="M136 96 q14 12 10 32" class="r-limb"/><circle cx="146" cy="130" r="8" class="r-hand"/></g>`,
    upL: `<g class="r-arm r-arm--danceL"><path d="M24 90 q-18 -6 -16 -32" class="r-limb"/><circle cx="8" cy="56" r="8" class="r-hand"/></g>`,
    upR: `<g class="r-arm r-arm--danceR"><path d="M136 90 q18 -6 16 -32" class="r-limb"/><circle cx="152" cy="56" r="8" class="r-hand"/></g>`,
    holdR: `<g class="r-arm"><path d="M136 98 q18 6 16 24" class="r-limb"/><circle cx="152" cy="124" r="8" class="r-hand"/></g>`,
    holdL: `<g class="r-arm"><path d="M24 98 q-18 6 -16 24" class="r-limb"/><circle cx="8" cy="124" r="8" class="r-hand"/></g>`,
    phoneR: `<g class="r-arm"><path d="M136 100 q20 -2 18 -22" class="r-limb"/><circle cx="154" cy="76" r="8" class="r-hand"/></g>`
  };

  const eyesOpen = `
    <g class="r-eyes">
      <g class="r-eye"><ellipse cx="62" cy="80" rx="10" ry="11" fill="#fff"/><g class="r-pupil"><circle cx="62" cy="81" r="5.2" fill="${INK}"/><circle cx="64" cy="78.5" r="1.7" fill="#fff"/></g></g>
      <g class="r-eye"><ellipse cx="98" cy="80" rx="10" ry="11" fill="#fff"/><g class="r-pupil"><circle cx="98" cy="81" r="5.2" fill="${INK}"/><circle cx="100" cy="78.5" r="1.7" fill="#fff"/></g></g>
    </g>`;
  const eyesHappy = `
    <g class="r-eyes r-eyes--happy">
      <path d="M53 83 q9 -11 18 0" /><path d="M89 83 q9 -11 18 0" />
    </g>`;
  const eyesStar = `
    <g class="r-eyes r-eyes--star">
      <path d="M62 70 l3 7 7 .6 -5.4 4.6 1.7 7 -6.3 -3.8 -6.3 3.8 1.7 -7 -5.4 -4.6 7 -.6z"/>
      <path d="M98 70 l3 7 7 .6 -5.4 4.6 1.7 7 -6.3 -3.8 -6.3 3.8 1.7 -7 -5.4 -4.6 7 -.6z"/>
    </g>`;

  const props = {
    medal: `<g class="r-prop"><circle cx="14" cy="132" r="13" fill="url(#rdRose)" stroke="#a87452" stroke-width="1.5"/><path d="M8 132 l4.5 4.5 l8 -9" stroke="#3d0410" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`,
    remote: `<g class="r-prop"><rect x="146" y="106" width="12" height="28" rx="4" fill="#222" stroke="${ROSE}" stroke-width="1.2"/><circle cx="152" cy="112" r="2.3" fill="#e2463f"/><rect x="149" y="118" width="6" height="2" rx="1" fill="#777"/><rect x="149" y="122" width="6" height="2" rx="1" fill="#777"/><rect x="149" y="126" width="6" height="2" rx="1" fill="#777"/></g>`,
    popcorn: `<g class="r-prop"><g class="r-pop"><circle cx="2" cy="108" r="5" fill="#fff6e3"/><circle cx="10" cy="104" r="5.5" fill="#fff1d6"/><circle cx="18" cy="108" r="5" fill="#fff6e3"/><circle cx="7" cy="112" r="4" fill="#ffe8b8"/><circle cx="15" cy="113" r="4" fill="#fff1d6"/></g><path d="M-4 112 h26 l-4 26 h-18z" fill="#fff"/><path d="M1 112 l1.5 26 M8.5 112 v26 M16 112 l-1.5 26" stroke="#5B0714" stroke-width="3"/></g>`,
    headphones: `<g class="r-prop r-hp"><path d="M14 92 C10 14 150 14 146 92" stroke="#232326" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M19 80 C20 26 140 26 141 80" stroke="${ROSE}" stroke-width="2" fill="none" opacity=".7"/><rect x="0" y="70" width="24" height="42" rx="11" fill="#2a2a2e" stroke="${ROSE}" stroke-width="2"/><rect x="136" y="70" width="24" height="42" rx="11" fill="#2a2a2e" stroke="${ROSE}" stroke-width="2"/><g class="r-sw"><path d="M-8 82 q-6 9 0 18"/><path d="M168 82 q6 9 0 18"/></g></g>`,
    soundbar: `<g class="r-prop"><rect x="4" y="166" width="152" height="16" rx="8" fill="#1d1d20" stroke="${ROSE}" stroke-width="1.5"/><g fill="#3a3a40">${Array.from({ length: 18 }, (_, i) => `<circle cx="${16 + i * 7.6}" cy="174" r="1.6"/>`).join('')}</g><rect x="68" y="171" width="24" height="6" rx="3" fill="${ROSE}" opacity=".85"/></g>`,
    notes: `<g class="r-notes" fill="${ROSE}"><g class="r-note n1"><ellipse cx="-2" cy="40" rx="5" ry="4"/><path d="M3 40 V20 l8 3" stroke="${ROSE}" stroke-width="2" fill="none"/></g><g class="r-note n2"><ellipse cx="160" cy="34" rx="5" ry="4"/><path d="M165 34 V14 l8 3" stroke="${ROSE}" stroke-width="2" fill="none"/></g><g class="r-note n3"><ellipse cx="128" cy="10" rx="4" ry="3.2"/><path d="M132 10 V-6" stroke="${ROSE}" stroke-width="2"/></g></g>`,
    phone: `<g class="r-prop"><rect x="148" y="54" width="16" height="28" rx="4" fill="#3d0410" stroke="${ROSE}" stroke-width="1.6"/><rect x="151" y="58" width="10" height="17" rx="1.5" fill="${ROSE}"/><g class="r-sw"><path d="M170 58 q5 6 0 12"/><path d="M175 54 q8 10 0 20"/></g></g>`,
    sparkles: `<g class="r-spark" fill="${ROSE}"><path d="M150 26 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2z"/><path d="M8 30 l1.4 4 4 1.4 -4 1.4 -1.4 4 -1.4 -4 -4 -1.4 4 -1.4z"/></g>`
  };

  const variants = {
    hero:    { arms: [arms.restL, arms.wave], eyes: eyesOpen, props: [props.medal], antenna: true, mode: 'wave' },
    tv:      { arms: [arms.holdL, arms.holdR], eyes: eyesStar, props: [props.popcorn, props.remote, props.sparkles], antenna: true, mode: 'watch' },
    hp:      { arms: [arms.restL, arms.restR], eyes: eyesHappy, props: [props.headphones], antenna: false, mode: 'bob' },
    sb:      { arms: [arms.upL, arms.upR], eyes: eyesHappy, props: [props.soundbar, props.notes], antenna: true, mode: 'dance', lift: true },
    contact: { arms: [arms.restL, arms.phoneR], eyes: eyesOpen, props: [props.phone], antenna: true, mode: 'talk' },
    about:   { arms: [arms.restL, arms.wave], eyes: eyesOpen, props: [props.medal, props.sparkles], antenna: true, mode: 'wave' }
  };

  function svg(name) {
    const v = variants[name] || variants.hero;
    const legs = v.lift
      ? `<path d="M62 132 v28 M98 132 v28" class="r-leg"/><ellipse cx="58" cy="163" rx="11" ry="5.5" class="r-shoe"/><ellipse cx="102" cy="163" rx="11" ry="5.5" class="r-shoe"/>`
      : `<path d="M62 132 v30 M98 132 v30" class="r-leg"/><ellipse cx="58" cy="166" rx="11" ry="6" class="r-shoe"/><ellipse cx="102" cy="166" rx="11" ry="6" class="r-shoe"/>`;
    return `
<svg class="rudy rudy--${v.mode}" viewBox="-14 -14 192 206" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="rdBody" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a0b1a"/><stop offset="1" stop-color="#5B0714"/></linearGradient>
    <linearGradient id="rdScreen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c0b0e"/><stop offset="1" stop-color="#140709"/></linearGradient>
    <linearGradient id="rdRose" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6b08c"/><stop offset="1" stop-color="#e6b08c"/></linearGradient>
  </defs>
  <ellipse cx="80" cy="186" rx="44" ry="5" class="r-shadow"/>
  ${v.props.includes(props.soundbar) ? props.soundbar : ''}
  <g class="r-bodywrap">
    ${v.antenna ? `<g class="r-ant"><path d="M66 40 L54 14 M94 40 L106 14"/><circle cx="54" cy="12" r="5"/><circle cx="106" cy="12" r="5"/></g>` : ''}
    ${legs}
    ${v.arms.join('')}
    <rect x="20" y="38" width="120" height="96" rx="22" fill="url(#rdBody)" stroke="#e6b08c" stroke-width="2.5"/>
    <rect x="31" y="49" width="98" height="70" rx="15" fill="url(#rdScreen)"/>
    
    <g class="r-face">
      ${v.eyes}
      <ellipse cx="48" cy="98" rx="6" ry="3.4" fill="${ROSE}" opacity=".45"/>
      <ellipse cx="112" cy="98" rx="6" ry="3.4" fill="${ROSE}" opacity=".45"/>
      <path class="r-mouth" d="M71 97 q9 9 18 0" />
    </g>
    <circle cx="70" cy="127" r="2" fill="${ROSE}"/><circle cx="80" cy="127" r="2" fill="${ROSE}"/><circle cx="90" cy="127" r="2" fill="${ROSE}" class="r-led"/>
    ${v.props.filter(p => p !== props.soundbar).join('')}
  </g>
</svg>`;
  }

  /* Point the pupils of every mascot inside `root` toward a screen coordinate. */
  function look(root, x, y) {
    root.querySelectorAll('.rudy').forEach(s => {
      const r = s.getBoundingClientRect();
      if (!r.width) return;
      const cx = r.left + r.width / 2, cy = r.top + r.height * 0.42;
      const a = Math.atan2(y - cy, x - cx);
      const d = Math.min(1, Math.hypot(x - cx, y - cy) / 300);
      const tx = Math.cos(a) * 3.6 * d, ty = Math.sin(a) * 3.6 * d;
      s.querySelectorAll('.r-pupil').forEach(p => p.setAttribute('transform', `translate(${tx.toFixed(2)} ${ty.toFixed(2)})`));
    });
  }

  window.Rudy = { svg, look, variants: Object.keys(variants) };
})();
