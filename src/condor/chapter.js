import * as THREE from 'three';
import { Actor } from '../game/actor.js';
import { bus } from '../core/bus.js';
import { lamps } from '../core/lamps.js';
import { CondorQuest, OBJECTIVES } from './story.js';
import { LEVEL, markCleared } from '../levels/index.js';
import { createVillageGate } from './gate.js';
import { createSwordArts } from './sword-arts.js';
import { createSoundPanel } from './sound-panel.js';
import { createExperienceQA } from './experience-qa.js';
import { createEncounterExperience } from './encounter.js';
import { createSwordTitle } from './presentation.js';
import './chapter.css';

export async function createCondorChapter(app, game) {
  const quest = new CondorQuest(), d = game.director, P = game.player;
  const chapter = game.chapter = { modal: false, quest };
  await createVillageGate(app);
  document.body.classList.add('condor-story');
  const ch = await game.makeCharacter({ kind: 'hero', seed: 701 });
  const npc = new Actor(game, ch, { id: 'guo', kind: 'hero', team: 0 });
  npc.place(-4.8, 1.5, 0.6); npc.ch.sword.setDrawn(false); npc.anim.setArmed?.(false);
  npc.setLocomotion(0, 0, 0, false);
  // The guest has a distinct muted robe; geometry, skinning and mocap stay with the upstream assets.
  npc.group.traverse(o => { if (o.isMesh && o.material) {
    const tint = m => { const c = m.clone(); if (c.color) c.color.multiply(new THREE.Color(0.7, 0.82, 0.78)); return c; };
    o.material = Array.isArray(o.material) ? o.material.map(tint) : tint(o.material);
  } });
  app.scene.add(npc.group);
  lamps.add({ pos: npc.pos.clone().add(new THREE.Vector3(0, 1.9, 1.3)), color: [1, 0.63, 0.32], weight: 4, flicker: 0.12 });
  lamps.add({ get: () => P.pos.clone().add(new THREE.Vector3(0, 1.7, 0)), color: [0.35, 0.52, 0.65], weight: 1.4 });
  const clue = new THREE.Vector3(LEVEL.layout.stele.x + 1.6, 0, LEVEL.layout.stele.z + 0.7);
  clue.y = game.heightAt(clue.x, clue.z);
  // A physical sealed letter on a rock: it stays in the world and can be approached from any angle.
  const paper = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.018, 0.26),
    new THREE.MeshStandardMaterial({ color: 0xc6b48a, roughness: 0.95, emissive: 0x231b09 }));
  paper.position.copy(clue).y += 0.3; paper.rotation.y = 0.4; app.scene.add(paper);
  const seal = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.022, 0.08), new THREE.MeshStandardMaterial({ color: 0x762c22, roughness: 0.85 }));
  seal.position.copy(paper.position).y += 0.02; app.scene.add(seal);
  const clueLamp = lamps.add({ pos: clue.clone().add(new THREE.Vector3(0, 0.6, 0)), color: [0.5, 0.65, 0.55], weight: 0 });

  const root = document.createElement('div'); root.id = 'condor';
  root.innerHTML = `<div class="cq" hidden><small>射雕 · 序章</small><h2></h2><p></p></div>
    <div class="cloc"><b>牛家村</b>临安府 · 庆元年间</div>
    <div class="ctarget" hidden></div><button class="cprompt" hidden></button>
    <div class="cguide" hidden><i>↑</i><span></span></div>
    <div class="cactions" hidden><button data-do="manual"><kbd>Z</kbd>剑谱</button><button data-do="interact"><kbd>X</kbd>交谈 / 察看</button><button data-do="camera"><kbd>B</kbd>视角归位</button><button data-do="audio">设置</button></div>
    <section class="cdialog" role="dialog" aria-label="江湖对话" aria-modal="true" hidden><div class="cdwrap"><div class="cdlabel">射雕英雄传 · 同人序章</div><div class="cdspeaker"></div><p class="cdtext"></p><div class="cdchoices"></div><span class="cdcount"></span></div></section>
    <section class="cmanual" role="dialog" aria-label="全真剑谱" aria-modal="true" hidden><div class="cmwrap"><small class="cdlabel">本作武学系统 · 丘处机</small><h1>七星剑境</h1><p>精准招架 +2 剑意，极限闪避、制敌各 +1。3 星强化下一次满气 E，7 星释放「北斗合一」。三路共鸣：守、破、御各施一次强化剑境，第三路也会触发北斗合一；印记跨战保留，合一或失败清空。每场试招可额外获得 2 星与 30 真气，无需完成也能继续剧情。剑路为本作原创演绎。</p><div class="cmgrid">
    <article><small>1 · 守势</small><h3>回风剑围</h3><p>环身剑围打击近处敌人架势，恢复自身气血。剑意强化后扩大威力；北斗合一扩大范围并恢复更多气血。</p></article>
    <article><small>2 · 破势</small><h3>惊雷贯日</h3><p>一线高速剑气，向远处贯穿，擅长压制首领架势。强化后伤害与破势能力提高。</p></article>
    <article><small>3 · 御势</small><h3>流云三叠</h3><p>三道剑气分向前方扇面，压制多名敌人。贴身释放时可让多道剑气汇击同一目标。</p></article>
    <article><small>J / 鼠标左键 · 连按</small><h3>连环剑</h3><p>四段剑式有不同的出手方向，按剑刃轨迹、距离与出手窗口判定命中。贴身连续追击积攒真气。</p></article>
    <article><small>K / 鼠标右键 · 看准来势</small><h3>借势反击</h3><p>落剑瞬间招架可破坏敌人架势，并恢复大量真气。按住则防御；红色重击请闪避。</p></article>
    <article><small>C 重剑 · 按住左键蓄力</small><h3>破阵身法</h3><p>重剑压制架势。Space 闪避穿过攻击后，接轻剑追身；方向由 WASD 控制。</p></article>
    </div><p>WASD 行走　J 连击　K 招架　Space 闪避　Q 锁定　E 满气剑境　B 视角归位　M 静音　Esc 暂停</p><button class="cmclose">合上剑谱 · Z</button></div></section>

    <div class="ccredit">同人可玩序章 · 基于 jbang2004 开源《长风》 · 资源署名与许可见 CREDITS.md</div>`;
  document.body.append(root);
  const $ = s => root.querySelector(s);
  const dialog = $('.cdialog'), choices = $('.cdchoices'), panel = $('.cq'), marker = $('.ctarget'), prompt = $('.cprompt'), guide = $('.cguide');
  let pages = [], pageIndex = 0, after = null, started = false, manual = false, lastStage = '', wasLocked = false, endingDelay = 0;
  createSwordArts(app, game, root);
  createEncounterExperience(app, game, root);
  const sound = createSoundPanel(game, root, { isAllowed: () => started, open: modalOn, close: modalOff });
  let previewBoss = null;

  function updateObjective() {
    const [title, text] = OBJECTIVES[quest.stage];
    panel.querySelector('h2').textContent = title;
    panel.querySelector('p').textContent = text;
    root.dataset.stage = quest.stage; root.dataset.route = quest.route ?? '';
  }
  function cinema(speaker, wide = false) {
    const p = speaker === '丘处机' ? P.pos : speaker === '黑衣首领' && previewBoss ? previewBoss.pos : npc.pos;
    const other = speaker === '丘处机' ? npc.pos : P.pos;
    const dx = other.x - p.x, dz = other.z - p.z, len = Math.hypot(dx, dz) || 1;
    const x = dx / len, z = dz / len, dist = wide ? 5.1 : 3.0;
    game.camera.setMode('story', {
      pos: [p.x + x * dist + z * 1.6, p.y + 1.65, p.z + z * dist - x * 1.6],
      target: [p.x, p.y + 1.18, p.z], blend: 1.5,
    });
  }
  function modalOn() {
    wasLocked = game.input.locked;
    chapter.modal = true; game.input.clear(); game.input.exitLock();
    document.body.classList.add('condor-dialogue');
    bus.emit('chapter:modal', { open: true });
    prompt.hidden = true; marker.hidden = true; $('.cactions').hidden = true;
    app.pipeline?.fx?.letterbox?.(true); game.letterboxT = 0;
  }
  function modalOff() {
    chapter.modal = false; game.input.clear(); P.controlEnabled = true;
    document.body.classList.remove('condor-dialogue');
    bus.emit('chapter:modal', { open: false });
    dialog.hidden = true; $('.cmanual').hidden = true;
    $('.caudiopanel').hidden = true;
    $('.cactions').hidden = false;
    app.pipeline?.fx?.letterbox?.(false);
    game.camera.setMode('follow', { heading: game.camera.heading, blend: 1.6 });
    if (wasLocked) game.input.requestLock();
  }
  function showPage() {
    const page = pages[pageIndex];
    $('.cdspeaker').textContent = page.speaker;
    $('.cdtext').textContent = page.text;
    $('.cdcount').textContent = `${String(pageIndex + 1).padStart(2, '0')} / ${String(pages.length).padStart(2, '0')}`;
    choices.replaceChildren();
    cinema(page.speaker, page.wide);
    const opts = page.choices ?? [{ label: pageIndex === pages.length - 1 ? '继续前行' : '继续', action: advance }];
    for (const opt of opts) {
      const button = document.createElement('button'); button.textContent = opt.label;
      if (opt.note) { const note = document.createElement('small'); note.textContent = opt.note; button.append(note); }
      button.onclick = () => { bus.emit('ui:sfx', { kind: 'seal' }); opt.action(); };
      choices.append(button);
    }
    choices.querySelector('button')?.focus({ preventScroll: true });
  }
  function advance() {
    if (pageIndex < pages.length - 1) { pageIndex++; showPage(); }
    else { const fn = after; after = null; modalOff(); fn?.(); }
  }
  function talk(lines, then) {
    modalOn(); pages = lines; pageIndex = 0; after = then;
    dialog.hidden = false; showPage();
  }
  function wave(i) {
    d.clearSent = false; d.sheathed = false; d.startWave(i);
    if (i === 2 && previewBoss) {
      const spawn = d.pending[0];
      if (spawn) { spawn.x = previewBoss.pos.x; spawn.z = previewBoss.pos.z; }
      previewBoss = null;
    }
    game.camera.setMode('follow', { heading: Math.PI, blend: 1.4 });
    game.letterboxT = 0; app.pipeline?.fx?.letterbox?.(false); updateObjective();
  }
  function select(route) {
    if (!quest.choose(route)) return;
    // A real tactical consequence: aid preserves a quiet two-man fight and full qi;
    // pursuit draws an extra spearman but grants qi after the evidence instead.
    LEVEL.waves[0].enemies = route === 'aid' ? ['bandit', 'bandit'] : ['bandit', 'bandit', 'spearman'];
    P.gainFocus(route === 'aid' ? 100 : 40);
    modalOff(); wave(0);
  }
  function interact() {
    if (chapter.modal || game.state !== 'playing' || !started) return;
    if (quest.stage === 'meeting' && P.distTo(npc) < 3.2) {
      talk([
        { speaker: '郭啸天', text: '道长！村口有人截路，杨兄弟还没回来。那些人穿着夜行衣，手里却拿着官家的弩。' },
        { speaker: '丘处机', text: '雨水冲得走脚印，冲不走刀上的杀气。你先到灯下，贫道来会他们。' },
        { speaker: '郭啸天', text: '他们似乎在找一封信。救人要紧，可若让带信的人走脱，村里恐怕再无安宁。', choices: [
          { label: '先安顿伤者', note: '两名追兵 · 以完整真气迎战', action: () => select('aid') },
          { label: '迎上去截住信使', note: '额外枪兵加入 · 寻迹后真气充盈', action: () => select('pursue') },
        ] },
      ]);
    } else if (quest.stage === 'evidence' && P.pos.distanceTo(clue) < 3.5) {
      talk([
        { speaker: '丘处机', text: '蜡封未散，纸角却有官印……“封住渡口，不留活口”。果然不是寻常山贼。' },
        { speaker: '丘处机', text: quest.route === 'aid' ? '郭兄弟躲过了这一劫。可竹林深处，又多了弓弦绷紧的声音。' : '抢下的信使口袋里，还有一丸回气丹。先调匀内息，再破这道箭阵。' },
      ], () => { if (quest.inspect()) { paper.visible = seal.visible = false; P.gainFocus(100); wave(1); } });
    } else if (quest.stage === 'return' && P.distTo(npc) < 3.2) {
      // Reveal the actual opponent for his line, then reuse the same pooled body for the duel.
      previewBoss = game.pool.swordmaster[0];
      previewBoss.place(2.5, -4.5, Math.atan2(P.pos.x - 2.5, P.pos.z + 4.5));
      previewBoss.ch.setVisible(true); previewBoss.ch.sword.setDrawn(true);
      previewBoss.setLocomotion(0, 0, 0, true); previewBoss.pose(0.016, game.time);
      talk([
        { speaker: '郭啸天', text: '这印记……有人故意把祸事引到牛家村。道长，竹影后面那人，从方才起就没动过。' },
        { speaker: '丘处机', text: '既已来了，何必藏头露尾？信在这里。要取，便用你的剑来说话。' },
        { speaker: '黑衣首领', text: '全真门下，果然爱管闲事。今夜的事，你带不出这片竹林。', wide: true },
      ], () => { if (quest.confront()) { P.hp = P.maxHp; bus.emit('player:hp', { hp: P.hp, max: P.maxHp }); P.gainFocus(100); wave(2); } });
    }
  }
  function ending() {
    talk([
      { speaker: '郭啸天', text: quest.route === 'aid' ? '这条命，是道长从雨里捡回来的。等杨兄弟回来，咱们一定好好喝一场。' : '信没有落回他们手中，村里的路便还没断。道长今日抢下的，或许不止是一封密令。' },
      { speaker: '丘处机', text: '一封信，牵出半个江湖。郭兄弟，往后的路，只怕比这一夜更难走。' },
      { speaker: '风雨牛家村 · 序章终', text: '你以全真之剑，留下了这场风雨的第一个答案。此章为独立同人演绎，完整故事尚未展开。', choices: [
        { label: '重走这一夜', note: '尝试另一条选择', action: () => location.reload() },
        { label: '留在牛家村', note: '自由练剑与探索', action: () => { quest.finish(); modalOff(); d.explore(); markCleared('niujia'); bus.emit('chapter:complete'); updateObjective(); } },
      ] },
    ]);
  }
  function begin() {
    started = true; d.explore(); panel.hidden = false; updateObjective();
    talk([
      { speaker: '临安府 · 牛家村', text: '暮雨压住了村口的炊烟。你是全真道人丘处机，循着一伙黑衣人的踪迹，来到这片竹林。', wide: true },
      { speaker: '丘处机', text: '前面有灯，也有人。先问清楚，再拔剑。', wide: true },
    ], () => { game.hud?.showHint?.(true); });
  }
  d.begin = begin;
  const oldRestart = d.restartWave.bind(d);
  d.restartWave = () => {
    if (['meeting', 'evidence', 'return', 'ending', 'complete'].includes(quest.stage)) {
      chapter.modal = false; dialog.hidden = true; manual = false; sound.hide(); $('.cmanual').hidden = true; $('.caudiopanel').hidden = true;
      document.body.classList.remove('condor-dialogue'); bus.emit('chapter:modal', { open: false });
      game.resetArena(); d.explore(); game.paused = false; game.combat.paused = false;
      app.pipeline?.fx?.fade?.(0, 1, 'black'); game.camera.setMode('follow', { force: true });
    } else oldRestart();
    updateObjective();
  };
  const oldToTitle = d.toTitle.bind(d);
  d.toTitle = () => { endingDelay = 0; chapter.modal = false; panel.hidden = true; dialog.hidden = true; $('.cactions').hidden = true; started = false; oldToTitle(); };
  bus.on('wave:clear', ({ index }) => {
    if (!quest.clear(index)) return;
    d.state = 'explore'; d.t = 0; game.player.lockOn(null); game.letterboxT = 0;
    app.pipeline?.fx?.letterbox?.(false); game.camera.setMode('follow', { blend: 1.5 });
    updateObjective();
    if (quest.stage === 'ending') endingDelay = 4;
  });
  function toggleManual() {
    if (!started || game.state !== 'playing' || (chapter.modal && !manual)) return;
    if (manual) { manual = false; modalOff(); }
    else { manual = true; modalOn(); $('.cmanual').hidden = false; $('.cmclose').focus(); }
  }
  $('.cmclose').onclick = toggleManual;
  root.addEventListener('click', e => {
    const action = e.target.closest('[data-do]')?.dataset.do;
    if (action === 'manual') toggleManual(); else if (action === 'interact') interact();
    else if (action === 'camera') game.resetCamera();
    else if (action === 'audio') sound.toggle();
  });
  prompt.onclick = interact;
  addEventListener('keydown', e => {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (sound.isOpen) return;
    if (chapter.modal && !manual && (e.code === 'Enter' || e.code === 'Space')) {
      if (e.target?.closest?.('.cdchoices button')) { e.stopImmediatePropagation(); return; }
      e.preventDefault(); e.stopImmediatePropagation();
      if (!pages[pageIndex]?.choices) advance();
    } else if ((e.code === 'KeyZ') || (manual && e.code === 'Escape')) {
      e.preventDefault(); e.stopImmediatePropagation(); toggleManual();
    } else if (e.code === 'KeyX') { e.preventDefault(); e.stopImmediatePropagation(); interact(); }
    else if (chapter.modal) { e.stopImmediatePropagation(); }
  }, true);

  // Deliberately visible local QA controls: exercise the quest graph through UI, never hidden browser mutations.
  createExperienceQA(app, game, root, [
      ['到目标附近', () => { const target = quest.stage === 'evidence' ? clue : npc.pos; P.place(target.x + 1.8, target.z + 1.2, Math.PI); game.camera.snap(); }],
      ['清除当前敌人', () => { if (d.pending.length) return; for (const e of game.enemies) if (e.active && e.alive) { e.hp = 1; game.combat.playerHits(P, e, e.chest(), 'torso', { damage: 9999, posture: 9999, kind: 'special', reach: 9, arc: 9 }); } }],
  ]);
  const projected = new THREE.Vector3();
  const targetRing = new THREE.Mesh(new THREE.RingGeometry(.54, .57, 48),
    new THREE.MeshBasicMaterial({ color: 0xdac28c, transparent: true, opacity: .6, depthWrite: false, side: THREE.DoubleSide }));
  targetRing.rotation.x = -Math.PI / 2; targetRing.layers.set(1); targetRing.visible = false; app.scene.add(targetRing);
  app.add({ update(dt, t, a, rawDt = dt) {
    if (endingDelay > 0 && game.state === 'playing' && !chapter.modal) {
      endingDelay = Math.max(0, endingDelay - rawDt);
      if (endingDelay === 0) ending();
    }
    npc.lookTarget = P.distTo(npc) < 9 ? P : null;
    npc.pose(dt, t);
    if (previewBoss && chapter.modal) previewBoss.pose(dt, t);
    if (quest.stage !== lastStage) { lastStage = quest.stage; updateObjective(); }
    panel.hidden = !started || game.state !== 'playing' || chapter.modal;
    $('.cloc').hidden = game.state !== 'playing' || chapter.modal;
    $('.cactions').hidden = !started || game.state !== 'playing' || chapter.modal;
    const target = quest.stage === 'evidence' ? clue : ['meeting', 'return'].includes(quest.stage) ? npc.pos : null;
    const usable = !!target && started && game.state === 'playing' && !chapter.modal;
    guide.hidden = !usable; targetRing.visible = usable;
    clueLamp.weight = quest.stage === 'evidence' ? 2.5 : 0;
    if (usable) {
      const distance = Math.hypot(P.pos.x - target.x, P.pos.z - target.z);
      projected.copy(target).applyMatrix4(app.camera.matrixWorldInverse);
      guide.querySelector('i').style.transform = `rotate(${Math.atan2(projected.x, -projected.z)}rad)`;
      guide.querySelector('span').textContent = `${target === clue ? '苔碑 · 遗落的密令' : '灯下 · 郭啸天'}　${Math.ceil(distance)} 步`;
      targetRing.position.copy(target); targetRing.position.y = game.heightAt(target.x, target.z) + .06;
      targetRing.scale.setScalar(1 + Math.sin(t * 2.5) * .12);
      projected.copy(target); projected.y += target === clue ? 0.65 : 2.15;
      projected.project(app.camera);
      marker.hidden = projected.z > 1 || projected.z < -1 || Math.abs(projected.x) > 1 || Math.abs(projected.y) > 1;
      marker.style.left = `${(projected.x * .5 + .5) * innerWidth}px`;
      marker.style.top = `${(-projected.y * .5 + .5) * innerHeight}px`;
      marker.textContent = `${target === clue ? '遗落的密令' : '郭啸天'} · ${Math.ceil(distance)}步`;
      prompt.hidden = distance > 3.2;
      prompt.innerHTML = `<kbd>X</kbd>${target === clue ? '察看密令' : '与郭啸天交谈'}`;
    } else { marker.hidden = prompt.hidden = true; }
    sound.update();
  } });
  const credit = document.querySelector('.scr.title .en i');
  if (credit) credit.textContent = '七星剑境 · 见招拆招 · 三路成阵';
  const title = document.querySelector('.scr.title .go .t b');
  if (title) title.textContent = '点击 · 入江湖';
  createSwordTitle(app, '风雨牛家村 · 丘处机的江湖初夜');
  if (app.params.get('state') === 'playing' || app.params.has('demo')) begin();
  return chapter;
}
