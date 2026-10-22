import * as THREE from 'three';
import { patchMaterial } from '../core/atmosphere.js';
import { LAYERS } from '../core/globals.js';
import { lamps } from '../core/lamps.js';
import { bus } from '../core/bus.js';
import { LEVEL } from '../levels/index.js';

// Physical, optional clues: the marks belong to the landscape before they mean anything.
export function createMysteryProps(app) {
  const root = new THREE.Group(); root.name = '雨夜遗痕'; app.scene.add(root);
  const mat = (color, extra = {}) => patchMaterial(new THREE.MeshStandardMaterial({ color, roughness: .92, ...extra }));
  const slate = mat(0x39443e), timber = mat(0x5e5140), groove = mat(0x182623), jade = mat(0x7b9b84, { emissive: 0x577d65, emissiveIntensity: .12 });
  const bronze = mat(0x82704a, { metalness: .64, roughness: .68, emissive: 0x8f6839, emissiveIntensity: .02 });
  const rope = mat(0x524a3a), rim = mat(0x6f704b, { metalness: .45, roughness: .8 });
  function mesh(parent, geometry, material, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(geometry, material); m.position.set(x, y, z);
    m.layers.set(LAYERS.WORLD); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
  }
  function place(name, x, z, h) {
    const pos = new THREE.Vector3(x, app.world.heightAt(x, z), z), group = new THREE.Group();
    group.name = name; group.position.copy(pos); root.add(group);
    return { group, pos, focus: pos.clone().add(new THREE.Vector3(0, h, 0)) };
  }
  const gate = place('村门旧剑痕', -3.8, -10, .18);
  const threshold = mesh(gate.group, new THREE.BoxGeometry(1, .16, .55), timber, 0, .07);
  threshold.rotation.y = -.15;
  const scar = new THREE.Group(); scar.position.y = .18; scar.rotation.x = -Math.PI / 2; gate.group.add(scar);
  for (const angle of [-.55, .65]) {
    const cut = mesh(scar, new THREE.BoxGeometry(.018, .42, .008), groove); cut.rotation.z = angle;
    const edge = mesh(cut, new THREE.BoxGeometry(.004, .35, .004), jade, -.008, -.02, .005);
    edge.castShadow = false;
  }

  const S = LEVEL.layout.stele, stele = place('缺星石拓', S.x - .8, S.z - 1.8, .62);
  const tablet = new THREE.Group(); tablet.position.y = .39; tablet.rotation.set(-.23, -.32, .08); stele.group.add(tablet);
  mesh(tablet, new THREE.BoxGeometry(.78, .68, .13), slate);
  const marks = [[-.25, .12], [-.15, .04], [-.05, .08], [.04, -.02], [.15, -.07], [.24, -.18], [.1, -.24]];
  marks.forEach(([x, y], i) => {
    // The last star is a dark, empty socket; six worn jade inlays remain.
    mesh(tablet, new THREE.CylinderGeometry(.026, .026, .01, 8), groove, x, y, .071).rotation.x = Math.PI / 2;
    if (i < 6) mesh(tablet, new THREE.SphereGeometry(.016, 6, 4), jade, x, y, .079).scale.z = .35;
    if (i < 5) {
      const [nx, ny] = marks[i + 1], length = Math.hypot(nx - x, ny - y);
      const line = mesh(tablet, new THREE.BoxGeometry(.006, length, .004), groove, (x + nx) / 2, (y + ny) / 2, .069);
      line.rotation.z = -Math.atan2(nx - x, ny - y);
    }
  });
  for (let i = 0; i < 4; i++) {
    const nick = mesh(tablet, new THREE.BoxGeometry(.1 + i * .018, .006, .006), groove, -.18 + i * .11, .27 - (i % 2) * .022, .07);
    nick.rotation.z = .2 - i * .13;
  }

  const P = LEVEL.layout.pavilion, bell = place('檐下无名铜铃', P.x, P.z + P.r * .75, 2.1);
  const pivot = new THREE.Group(); pivot.position.y = 2.9; bell.group.add(pivot);
  mesh(bell.group, new THREE.CylinderGeometry(.014, .014, .43, 6), rope, 0, 3.1);
  const hanger = mesh(pivot, new THREE.TorusGeometry(.072, .019, 6, 12), rim, 0, -.04); hanger.rotation.y = Math.PI / 2;
  const profile = [[.28, -.59], [.29, -.55], [.25, -.49], [.23, -.34], [.18, -.16], [.1, -.1], [.06, -.09]];
  const body = mesh(pivot, new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 20), bronze);
  body.material.side = THREE.DoubleSide;
  for (const y of [-.54, -.23]) {
    const band = mesh(pivot, new THREE.TorusGeometry(y < -.4 ? .27 : .2, .011, 5, 20), rim, 0, y); band.rotation.x = Math.PI / 2;
  }
  mesh(pivot, new THREE.SphereGeometry(.06, 8, 6), rim, 0, -.48);
  mesh(pivot, new THREE.CylinderGeometry(.012, .012, .94, 6), rope, 0, -.97);
  const knot = mesh(pivot, new THREE.SphereGeometry(.035, 6, 4), rope, 0, -1.46); knot.scale.y = 1.8;

  // The revealed pattern is small enough to find at one's feet, outside the pavilion's solid terrace.
  const points = [[-.9, 0], [-.5, .3], [-.15, .12], [.2, .38], [.65, .53], [.9, .9], [.35, 1.05]];
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xb9cda5, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
  const starGeo = new THREE.SphereGeometry(.045, 8, 5);
  const stars = points.map(([x, z]) => {
    x += bell.pos.x; z += bell.pos.z + 1.8;
    const star = mesh(root, starGeo, lightMat, x, app.world.heightAt(x, z) + .1, z);
    star.layers.set(LAYERS.TRANSPARENT); star.castShadow = star.receiveShadow = false; star.visible = false; return star;
  });
  let age = 99, strength = 0, elapsed = 0, revealAge = 99, glow = null;
  function ringBell(warning = false) {
    age = 0; strength = warning ? .18 : .3;
    glow?.remove(); glow = lamps.flash(bell.focus, [1, .72, .38], 1.8, .85);
    bus.emit('ui:sfx', { kind: 'bell', warning });
  }
  function reveal() {
    revealAge = 0; stars.forEach(s => { s.visible = true; });
    glow?.remove(); glow = lamps.flash(bell.focus, [.65, .85, .65], 1.8, 1.2);
  }
  app.add({
    update(dt, _t, _app, rawDt = dt) {
      elapsed += dt; age += rawDt; revealAge += rawDt;
      pivot.rotation.z = Math.sin(elapsed * 1.3) * .012 + Math.sin(age * 8) * strength * Math.exp(-age * 1.1);
      bronze.emissiveIntensity = .02 + Math.exp(-age * 3) * .38;
      const visible = revealAge < 8;
      lightMat.opacity = visible ? Math.min(1, revealAge / .6, (8 - revealAge) / 2) * .8 : 0;
      stars.forEach((star, i) => { star.visible = visible && revealAge > i * .16; });
    },
    dispose() {
      glow?.remove(); root.removeFromParent();
      const geometries = new Set(); root.traverse(o => { if (o.geometry) geometries.add(o.geometry); });
      geometries.forEach(g => g.dispose()); [slate, timber, groove, jade, bronze, rope, rim, lightMat].forEach(m => m.dispose());
    },
  });
  return { gate: { pos: gate.pos, focus: gate.focus }, stele: { pos: stele.pos, focus: stele.focus },
    bell: { pos: bell.pos, focus: bell.focus }, ringBell, reveal };
}
