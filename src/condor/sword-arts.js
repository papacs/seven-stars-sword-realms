import * as THREE from 'three';
import { bus } from '../core/bus.js';
import { lamps } from '../core/lamps.js';
import { LAYERS } from '../core/globals.js';
import { SwordIntent, SWORD_PATHS } from './sword-intent.js';

// Timing builds intent; changing empowered paths completes a three-seal constellation.
export function createSwordArts(app, game, root) {
  const intent = new SwordIntent(), P = game.player;
  const hud = document.createElement('section'); hud.className = 'csword'; hud.setAttribute('aria-label', '七星剑意');
  hud.innerHTML = `<div class="cscaption"><span>七星剑境</span><small>SEVEN STARS</small></div>
    <div class="cspaths">${SWORD_PATHS.map(p => `<button data-path="${p.id}" aria-pressed="false" title="${p.description}"><kbd>${p.key}</kbd><span>${p.name}</span><i aria-label="共鸣印记"></i></button>`).join('')}</div>
    <div class="csstars" role="meter" aria-label="剑意" aria-valuemin="0" aria-valuemax="7">${Array.from({ length: 7 }, (_, i) => `<i data-star="${i}"></i>`).join('')}</div>
    <div class="csread"><b></b><span></span></div><p></p>
    <button class="cscast" disabled><kbd>E</kbd><span></span><small></small><i></i></button>
    <div class="csresonance"></div>`;
  hud.hidden = true; root.append(hud);
  const notice = document.createElement('div'); notice.className = 'csnotice'; notice.setAttribute('role', 'status'); root.append(notice);
  let noticeAge = 10, activeCast = null;
  function announce(text) { notice.textContent = text; noticeAge = 0; }
  function render() {
    const path = SWORD_PATHS.find(p => p.id === intent.path);
    hud.style.setProperty('--sword', path.color);
    hud.querySelectorAll('[data-path]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.path === intent.path)));
    hud.querySelectorAll('[data-path]').forEach(b => b.classList.toggle('sealed', intent.seals.has(b.dataset.path)));
    hud.querySelectorAll('[data-star]').forEach((el, i) => el.classList.toggle('lit', i < intent.stars));
    hud.querySelector('.csstars').setAttribute('aria-valuenow', intent.stars);
    const completes = intent.seals.size === 2 && !intent.seals.has(intent.path);
    hud.querySelector('.csread b').textContent = intent.stars === 7 ? '七星齐明 · 北斗合一' : intent.stars >= 3 ? (completes ? '第三印 · 共鸣合一' : '三颗星 · 强化已就') : '识破 +2 · 踏隙 / 制敌 +1';
    hud.querySelector('.csread span').textContent = `${intent.stars} / 7`;
    hud.querySelector('p').textContent = path.description;
    hud.querySelector('.csresonance').textContent = intent.seals.size ? `三路共鸣 ${intent.seals.size}/3 · 换用未亮的剑路，强化成印` : '三路各施一次强化剑境 · 第三路北斗合一';
    const full = P.focus >= 100, cast = hud.querySelector('.cscast');
    cast.disabled = !full || !P.alive || P.state === 'special';
    cast.querySelector('span').textContent = path.art;
    cast.querySelector('small').textContent = full ? '真气已满 · 释放' : `真气 ${Math.floor(P.focus)}%`;
    cast.style.setProperty('--qi', `${P.focus}%`);
    hud.classList.toggle('ready', full);
    hud.classList.toggle('union', intent.stars === 7 || (completes && intent.stars >= 3));
    hud.dataset.path = intent.path; hud.dataset.stars = String(intent.stars);
  }
  hud.querySelector('.cscast').onclick = () => {
    if (game.state === 'playing' && !game.chapter?.modal && !game.paused) game.input.virtual.press('special');
  };
  function select(id) {
    const inSettings = !!hud.closest('.caudiopanel:not([hidden])');
    if (!P.alive || (!inSettings && (game.state !== 'playing' || game.chapter?.modal))) return;
    if (P.state === 'special') { announce('收势后再换剑路'); return; }
    if (intent.path === id || !intent.select(id)) return;
    render(); announce(`${SWORD_PATHS.find(p => p.id === id).name} · 剑路切换`);
    bus.emit('ui:sfx', { kind: 'tick' });
  }
  hud.addEventListener('click', e => { const id = e.target.closest('[data-path]')?.dataset.path; if (id) select(id); });
  addEventListener('keydown', e => {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || game.chapter?.modal) return;
    const i = ['Digit1', 'Digit2', 'Digit3'].indexOf(e.code);
    if (i >= 0) { e.preventDefault(); select(SWORD_PATHS[i].id); }
  });
  function earn(amount, label) {
    if (game.state !== 'playing' || game.chapter?.modal || !P.alive) return;
    const gained = intent.gain(amount);
    if (gained) { render(); announce(`${label} · 剑意 +${gained}${intent.stars === 7 ? ' · 七星齐明' : ''}`); }
  }
  bus.on('player:parry', p => { if (p.perfect) earn(2, '识破'); });
  bus.on('player:evade', p => { if (p.perfect) earn(1, '踏隙'); });
  bus.on('enemy:death', () => earn(1, '制敌'));
  let openingGift = false;
  bus.on('wave:start', p => { if (p.index === 1 && !openingGift) { openingGift = true; earn(3, '凝神入阵'); } });
  bus.on('player:death', () => { intent.reset(); activeCast = null; render(); });
  bus.on('game:state', p => { if (p.state === 'title') { intent.reset(); openingGift = false; activeCast = null; render(); } });

  // A terrain-conforming constellation and a narrow luminous ring, all in world space.
  const positions = [[-1.9, -.8], [-1.3, -.1], [-.65, -.45], [0, 0], [.8, .2], [1.35, .95], [.35, 1.5]];
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(12 * 3), 3));
  const lineMat = new THREE.LineBasicMaterial({ color: 0xa8eaff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const lines = new THREE.LineSegments(geo, lineMat); lines.layers.set(LAYERS.TRANSPARENT); lines.frustumCulled = false;
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xa8eaff, transparent: true, opacity: 0, side: THREE.DoubleSide,
    depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.1, 2.14, 96), ringMat); ring.rotation.x = -Math.PI / 2;
  ring.layers.set(LAYERS.TRANSPARENT); ring.frustumCulled = false;
  const starGeo = new THREE.SphereGeometry(.055, 10, 6), starMat = ringMat.clone();
  const stars = positions.map(() => { const s = new THREE.Mesh(starGeo, starMat); s.layers.set(LAYERS.TRANSPARENT); app.scene.add(s); return s; });
  app.scene.add(lines, ring);
  let sigilAge = 9, sigilLife = 1.4, sigilRadius = 1;
  function sigil(plan, pos) {
    sigilAge = 0; sigilLife = plan.union ? 2.1 : 1.35; sigilRadius = plan.path === 'guard' ? plan.radius : 2.5;
    const color = new THREE.Color(plan.union ? '#ffe1a0' : plan.color).multiplyScalar(plan.union ? 3.3 : 2.0);
    lineMat.color.copy(color); ringMat.color.copy(color); starMat.color.copy(color);
    // Put the constellation ahead of the sword hand so it reads in the normal shoulder camera.
    const cs = Math.cos(P.yaw), sn = Math.sin(P.yaw);
    const world = positions.map(([x, z]) => {
      const dx = x * 1.25, dz = z * 1.25 + 2.1;
      return new THREE.Vector3(pos.x + dx * cs + dz * sn, 0, pos.z - dx * sn + dz * cs);
    });
    world.forEach(p => { p.y = game.heightAt(p.x, p.z) + .07; });
    const attr = geo.attributes.position;
    for (let i = 0; i < world.length - 1; i++) { attr.setXYZ(i * 2, ...world[i].toArray()); attr.setXYZ(i * 2 + 1, ...world[i + 1].toArray()); }
    attr.needsUpdate = true;
    stars.forEach((s, i) => s.position.copy(world[i]));
    if (plan.union) for (const point of world) game.vfx?.hitGlow?.(point, .7, [1, .82, .4]);
    ring.position.copy(pos); ring.position.y = game.heightAt(pos.x, pos.z) + .09;
    lamps.flash(pos.clone().add(new THREE.Vector3(0, 1, 0)), new THREE.Color(plan.color).toArray(), plan.union ? 10 : 6, .45);
  }
  let freezeCountdown = 0;
  const arts = {
    intent, earn,
    prepare() {
      activeCast = intent.cast();
      if (!app.params.has('record')) game.camera.setMode('follow', { heading: P.yaw, force: true, blend: 5 });
      render();
    },
    fireQi(actor, combat) {
      const plan = activeCast ?? intent.cast(); activeCast = null; render();
      sigil(plan, actor.pos);
      const path = SWORD_PATHS.find(p => p.id === plan.path);
      const beforeQi = combat.qi.length, beforeHp = actor.hp;
      announce(`${plan.resonance ? '三路共鸣 · 北斗合一 · ' : plan.union ? '北斗合一 · ' : plan.empowered ? '剑境 · ' : ''}${path.art}`);
      if (plan.path === 'guard') {
        actor.hp = Math.min(actor.maxHp, actor.hp + plan.heal);
        bus.emit('player:hp', { hp: actor.hp, max: actor.maxHp });
        for (const enemy of game.enemies) if (enemy.active && enemy.alive && actor.distTo(enemy) <= plan.radius) {
          combat.playerHits(actor, enemy, enemy.chest(), 'torso', { damage: plan.damage, posture: plan.posture, kind: 'special', reach: plan.radius, arc: Math.PI * 2 });
        }
        game.vfx?.shockwave?.(actor.pos.x, actor.pos.z, plan.empowered ? 1.6 : 1);
      } else {
        const origin = actor.pos.clone(); origin.y += 1.1;
        for (const angle of plan.angles) {
          const dir = new THREE.Vector3(Math.sin(actor.yaw + angle), 0, Math.cos(actor.yaw + angle));
          const pos = origin.clone().addScaledVector(dir, .8);
          const handle = game.vfx?.qiWave?.(pos, dir, { color: plan.union ? '#ffe0a0' : plan.color, width: (plan.path === 'pierce' ? .65 : .85) * (plan.union ? 1.3 : 1), speed: plan.speed, life: plan.life });
          combat.qi.push({ pos: pos.clone(), prev: pos.clone(), dir, speed: plan.speed, life: plan.life, age: 0,
            hit: new Set(), handle, owner: actor, damage: plan.damage, posture: plan.posture, radius: plan.radius });
        }
      }
      game.camera.shake(plan.union ? .4 : .2);
      bus.emit('special', { pos: actor.pos.clone(), dir: { x: Math.sin(actor.yaw), y: 0, z: Math.cos(actor.yaw) } });
      bus.emit('sword:art', { ...plan, name: path.art });
      arts.lastCast = { name: path.art, projectiles: combat.qi.length - beforeQi, healed: actor.hp - beforeHp, union: plan.union };
      if (arts.freezeNext) { arts.freezeNext = false; freezeCountdown = 2; }
      game.log('sword art', plan.path, plan.empowered ? 'empowered' : 'normal', plan.union ? 'seven stars' : '');
    },
  };
  game.swordArts = arts; render();
  let refresh = 0;
  app.add({ update(dt, t, a, rawDt = dt) {
    if (freezeCountdown > 0 && --freezeCountdown === 0) app.freeze(true);
    refresh += rawDt;
    if (refresh >= .1) { render(); refresh = 0; }
    hud.hidden = !hud.closest('.caudiopanel:not([hidden])') && (game.state !== 'playing' || !!game.chapter?.modal);
    noticeAge += rawDt; notice.style.opacity = noticeAge < 2 ? String(Math.min(1, (2 - noticeAge) * 3)) : '0';
    if (game.chapter?.modal || game.state !== 'playing') notice.style.opacity = '0';
    if (!game.paused && !game.chapter?.modal) sigilAge += dt;
    const fade = Math.max(0, 1 - sigilAge / sigilLife), born = Math.min(1, sigilAge * 9);
    lineMat.opacity = starMat.opacity = fade * born;
    ringMat.opacity = fade * born * .65;
    ring.scale.setScalar((.2 + Math.min(1, sigilAge * 1.8) * .8) * sigilRadius / 2.1);
    stars.forEach((s, i) => s.scale.setScalar(1 + Math.sin(t * 8 + i) * .2));
  } });
  return arts;
}
