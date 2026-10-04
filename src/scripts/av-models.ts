/* Procedural 3D models for the /variations/3d/ page.
   Built from lathe, extrude and swept geometry (no external model files),
   styled after Sony's over-ear headphones and HT-A3000 home-theatre set. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/* ---------- textures ---------- */

/** Woven speaker-grille fabric, used as both colour and bump map. */
export function fabricTexture(repeatX: number, repeatY: number): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  g.fillStyle = '#1e1e21';
  g.fillRect(0, 0, size, size);
  const cell = 8; // 32 threads per tile
  for (let y = 0; y < size; y += cell) {
    for (let x = 0; x < size; x += cell) {
      const over = ((x / cell) + (y / cell)) % 2 === 0;
      const v = (over ? 74 : 50) + Math.random() * 12;
      const grad = g.createLinearGradient(x, y, over ? x : x + cell, over ? y + cell : y);
      grad.addColorStop(0, `rgb(${v - 18},${v - 18},${v - 15})`);
      grad.addColorStop(0.5, `rgb(${v},${v},${v + 3})`);
      grad.addColorStop(1, `rgb(${v - 18},${v - 18},${v - 15})`);
      g.fillStyle = grad;
      if (over) g.fillRect(x + 0.5, y + 1.5, cell - 1, cell - 3);
      else g.fillRect(x + 1.5, y + 0.5, cell - 3, cell - 1);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Concentric ribs for a speaker cone. */
function coneTexture(): THREE.CanvasTexture {
  const size = 256, c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  for (let r = size / 2; r > 0; r -= 3) {
    const v = 26 + ((r / 3) % 2) * 8 + Math.random() * 4;
    g.beginPath(); g.arc(size / 2, size / 2, r, 0, Math.PI * 2);
    g.fillStyle = `rgb(${v},${v},${v + 2})`; g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ---------- shared materials ---------- */

export function materials() {
  const fabricMap = fabricTexture(1, 1);
  const softTouch = new THREE.MeshPhysicalMaterial({ color: 0x232327, roughness: 0.55, metalness: 0.05, clearcoat: 0.25, clearcoatRoughness: 0.5 });
  const gloss = new THREE.MeshPhysicalMaterial({ color: 0x0c0c0e, roughness: 0.12, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.06 });
  const leather = new THREE.MeshPhysicalMaterial({ color: 0x1d1d20, roughness: 0.62, metalness: 0, sheen: 1, sheenColor: new THREE.Color(0x6a6a72), sheenRoughness: 0.42, clearcoat: 0.12, clearcoatRoughness: 0.6 });
  const brushed = new THREE.MeshPhysicalMaterial({ color: 0x9a9ca3, roughness: 0.28, metalness: 1 });
  const copper = new THREE.MeshPhysicalMaterial({ color: 0xc8916a, roughness: 0.25, metalness: 1 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.85 });
  const liner = new THREE.MeshStandardMaterial({ color: 0x8a8a92, roughness: 1, map: fabricMap, bumpMap: fabricMap, bumpScale: 2 });
  const led = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const ledBlue = new THREE.MeshBasicMaterial({ color: 0x6fb3ff });
  return { softTouch, gloss, leather, brushed, copper, rubber, liner, led, ledBlue };
}
type Mats = ReturnType<typeof materials>;

const shadowAll = (o: THREE.Object3D) => o.traverse(m => { if ((m as THREE.Mesh).isMesh) { m.castShadow = true; m.receiveShadow = true; } });

function roundedRect(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** Closed oval loop of lathe points (r, y), giving a pillow / torus-like solid when revolved. */
function ovalLoop(cr: number, cy: number, rr: number, ry: number, n = 28): THREE.Vector2[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return new THREE.Vector2(cr + Math.cos(a) * rr, cy + Math.sin(a) * ry);
  });
}

/* ---------- headphones (over-ear, styled after the WH-1000XM5) ---------- */

export function buildHeadphones(m: Mats): THREE.Group {
  const hp = new THREE.Group();

  // headband: a flat rounded strap swept along an arch
  const arch = (rx: number, ry: number, y0: number, from: number, to: number) =>
    new THREE.CatmullRomCurve3(Array.from({ length: 25 }, (_, i) => {
      const a = from + (to - from) * (i / 24);
      return new THREE.Vector3(Math.sin(a) * rx, y0 + Math.cos(a) * ry, 0);
    }));
  const strap = new THREE.Mesh(
    new THREE.ExtrudeGeometry(roundedRect(0.03, 0.078, 0.013), { steps: 160, extrudePath: arch(0.47, 0.6, -0.06, -Math.PI / 2, Math.PI / 2), bevelEnabled: false }),
    m.softTouch
  );
  hp.add(strap);
  // leather cushion under the top of the band
  const pad = new THREE.Mesh(
    new THREE.ExtrudeGeometry(roundedRect(0.022, 0.062, 0.01), { steps: 90, extrudePath: arch(0.442, 0.572, -0.06, -1.05, 1.05), bevelEnabled: false }),
    m.leather
  );
  hp.add(pad);

  [-1, 1].forEach(s => {
    // brushed sliders dropping out of the band, and the hinge yoke
    const slider = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.06, 6, 20), m.brushed);
    slider.position.set(s * 0.475, -0.1, 0);
    const yoke = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.06, 0.075, 4, 0.02), m.softTouch);
    yoke.position.set(s * 0.488, -0.155, 0);
    hp.add(slider, yoke);

    // ear cup: lathe shell + pillow cushion + fabric liner, revolved about its own axis
    const cupInner = new THREE.Group();
    const shellProfile = [
      [0, 0.085], [0.06, 0.084], [0.11, 0.08], [0.145, 0.07], [0.168, 0.055], [0.181, 0.035],
      [0.186, 0.012], [0.184, -0.008], [0.176, -0.02], [0.16, -0.026]
    ].map(([r, y]) => new THREE.Vector2(r, y));
    const shell = new THREE.Mesh(new THREE.LatheGeometry(shellProfile, 96), m.softTouch);
    const seam = new THREE.Mesh(new THREE.TorusGeometry(0.183, 0.0035, 8, 128), m.copper);
    seam.rotation.x = Math.PI / 2; seam.position.y = -0.012;
    const cushion = new THREE.Mesh(new THREE.LatheGeometry(ovalLoop(0.128, -0.06, 0.05, 0.034), 96), m.leather);
    const linerDisc = new THREE.Mesh(new THREE.CircleGeometry(0.085, 64), m.liner);
    linerDisc.rotation.x = Math.PI / 2; linerDisc.position.y = -0.03;
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.004, 96), m.softTouch);
    plate.position.y = 0.086;
    cupInner.add(shell, seam, cushion, linerDisc, plate);
    if (s === 1) { // power button and status LED on the right cup
      const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.01, 24), m.brushed);
      btn.position.set(0.17, 0.02, 0.06); btn.rotation.z = Math.PI / 2;
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.005, 12, 12), m.ledBlue);
      led.position.set(0.178, 0.02, 0.03);
      cupInner.add(btn, led);
    }
    cupInner.scale.set(1.22, 1, 1);        // oval ear cup (taller than wide)
    const cup = new THREE.Group();
    cup.add(cupInner);
    cup.rotation.z = -s * Math.PI / 2;     // outer face points away from the head
    cup.rotation.y = s * 0.12;             // slight inward angle, as worn
    cup.position.set(s * 0.5, -0.385, 0);
    hp.add(cup);
  });
  shadowAll(hp);
  return hp;
}

/* ---------- soundbar (styled after the HT-A3000) ---------- */

export function buildSoundbar(m: Mats, length = 2.1): THREE.Group {
  const bar = new THREE.Group();
  const H = 0.1, D = 0.15;
  // soft cross-section (front-top fully rounded), extruded along the length with rounded ends
  const prof = new THREE.Shape();
  prof.moveTo(-D / 2 + 0.02, -H / 2);
  prof.lineTo(D / 2 - 0.035, -H / 2);
  prof.quadraticCurveTo(D / 2, -H / 2, D / 2, -H / 2 + 0.035);
  prof.lineTo(D / 2, H / 2 - 0.04);
  prof.quadraticCurveTo(D / 2, H / 2, D / 2 - 0.04, H / 2);
  prof.lineTo(-D / 2 + 0.02, H / 2);
  prof.quadraticCurveTo(-D / 2, H / 2, -D / 2, H / 2 - 0.02);
  prof.lineTo(-D / 2, -H / 2 + 0.02);
  prof.quadraticCurveTo(-D / 2, -H / 2, -D / 2 + 0.02, -H / 2);
  const bevel = 0.03;
  const geo = new THREE.ExtrudeGeometry(prof, { depth: length - bevel * 2, bevelEnabled: true, bevelSize: bevel * 0.9, bevelThickness: bevel, bevelSegments: 8, curveSegments: 16 });
  geo.center();
  geo.rotateY(Math.PI / 2); // length along X, front along +Z
  const fabMap = fabricTexture(5, 5);
  const grille = new THREE.MeshStandardMaterial({ color: 0xb4b4bb, roughness: 1, map: fabMap, bumpMap: fabMap, bumpScale: 2.2 });
  const body = new THREE.Mesh(geo, grille);
  bar.add(body);
  // glossy top panel with touch buttons
  const top = new THREE.Mesh(new RoundedBoxGeometry(length * 0.97, 0.006, D * 0.5, 3, 0.003), m.gloss);
  top.position.set(0, H / 2 + 0.002, -D * 0.16);
  bar.add(top);
  for (let i = 0; i < 4; i++) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.002, 20), m.brushed);
    b.position.set(length * 0.38 + i * 0.04, H / 2 + 0.006, -D * 0.16);
    bar.add(b);
  }
  // brushed trim along the top front edge, and a small badge plate
  const trim = new THREE.Mesh(new THREE.CapsuleGeometry(0.0035, length * 0.94, 4, 12), m.brushed);
  trim.rotation.z = Math.PI / 2;
  trim.position.set(0, H / 2 - 0.012, D / 2 - 0.012);
  const badge = new THREE.Mesh(new RoundedBoxGeometry(0.07, 0.012, 0.003, 2, 0.002), m.brushed);
  badge.position.set(-length * 0.36, -H * 0.12, D / 2 + 0.002);
  bar.add(trim, badge);
  // front status light and rubber feet
  const led = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.006, 0.004, 2, 0.002), m.led);
  led.position.set(0, -H * 0.18, D / 2 + 0.003);
  bar.add(led);
  [-1, 1].forEach(s => {
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.008, 20), m.rubber);
    foot.position.set(s * length * 0.42, -H / 2 - 0.004, 0);
    bar.add(foot);
  });
  shadowAll(bar);
  bar.userData.height = H;
  return bar;
}

/* ---------- subwoofer with a visible front-firing driver ---------- */

export function buildSubwoofer(m: Mats): { group: THREE.Group; cone: THREE.Object3D } {
  const g = new THREE.Group();
  const W = 0.44, H = 0.62, D = 0.46;
  const fab = fabricTexture(1.6, 2.2);
  const cab = new THREE.Mesh(new RoundedBoxGeometry(W, H, D, 8, 0.07), new THREE.MeshStandardMaterial({ color: 0xb4b4bb, roughness: 1, map: fab, bumpMap: fab, bumpScale: 2.2 }));
  g.add(cab);
  const top = new THREE.Mesh(new RoundedBoxGeometry(W - 0.15, 0.006, D - 0.15, 4, 0.003), m.gloss);
  top.position.y = H / 2 + 0.0005; // inset within the flat part of the rounded top
  g.add(top);

  const driver = new THREE.Group();
  const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.152, 0.016, 20, 96), m.gloss);
  const surround = new THREE.Mesh(new THREE.LatheGeometry(
    Array.from({ length: 13 }, (_, i) => { const a = Math.PI * (i / 12); return new THREE.Vector2(0.128 + Math.cos(a) * 0.016, Math.sin(a) * 0.014); }), 96), m.rubber);
  surround.rotation.x = Math.PI / 2;
  const coneMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2d, roughness: 0.8, map: coneTexture() });
  const cone = new THREE.Group();
  const coneMesh = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0.112, 0), new THREE.Vector2(0.08, -0.018), new THREE.Vector2(0.045, -0.036), new THREE.Vector2(0.04, -0.038)], 96), coneMat);
  coneMesh.rotation.x = Math.PI / 2; // recessed into the cabinet
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.046, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), m.gloss);
  cap.scale.set(1, 0.45, 1); cap.rotation.x = Math.PI / 2; cap.position.z = -0.036;
  cone.add(coneMesh, cap);
  driver.add(bezel, surround, cone);
  driver.position.set(0, -0.02, D / 2 + 0.002);
  g.add(driver);

  const badge = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.008, 0.004, 2, 0.002), m.brushed);
  badge.position.set(0, -H / 2 + 0.06, D / 2 + 0.003);
  g.add(badge);
  shadowAll(g);
  return { group: g, cone };
}

/* ---------- compact rear surround speaker ---------- */

export function buildRearSpeaker(m: Mats): THREE.Group {
  const g = new THREE.Group();
  const fab = fabricTexture(0.7, 1);
  const box = new THREE.Mesh(new RoundedBoxGeometry(0.17, 0.26, 0.17, 6, 0.05), new THREE.MeshStandardMaterial({ color: 0xb4b4bb, roughness: 1, map: fab, bumpMap: fab, bumpScale: 2.2 }));
  const top = new THREE.Mesh(new RoundedBoxGeometry(0.07, 0.005, 0.07, 3, 0.002), m.gloss);
  top.position.y = 0.1305;
  g.add(box, top);
  shadowAll(g);
  return g;
}
