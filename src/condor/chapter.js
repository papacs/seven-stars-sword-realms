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
import { Mystery, MYSTERY_CLUES, mysteryEnding } from './mystery.js';
import { createMysteryProps } from './mystery-props.js';
import './chapter.css';

export async function createCondorChapter(app, game) {
  const quest = new CondorQuest(), d = game.director, P = game.player;
  const mystery = new Mystery();
  const chapter = game.chapter = { modal: false, quest, mystery };
  await createVillageGate(app);
  const relics = createMysteryProps(app);
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
  const bookWrap = $('.cmanual .cmwrap');
  bookWrap.insertAdjacentHTML('afterbegin', '<nav class="cbooknav" aria-label="剑谱章节"><button data-book="moves">剑招</button><button data-book="mystery">雨夜异闻</button><button data-book="close">合上剑谱</button></nav>');
  $('.cmanual .cmgrid').insertAdjacentHTML('afterend', `<section class="cmysterybook" aria-label="雨夜异闻"><header><small>拾遗 · 留意主路之外</small><h2>雨夜异闻 <span></span></h2><p>旧物未必会说真话。将听见的、看见的留在此处，再回头对照。</p></header><div class="cmysteryentries"></div></section>`);
  root.insertAdjacentHTML('beforeend', '<div class="cmysterynotice" role="status" hidden></div>');
  const dialog = $('.cdialog'), choices = $('.cdchoices'), panel = $('.cq'), marker = $('.ctarget'), prompt = $('.cprompt'), guide = $('.cguide');
  let pages = [], pageIndex = 0, after = null, started = false, manual = false, lastStage = '', wasLocked = false, endingDelay = 0;
  createSwordArts(app, game, root);
  createEncounterExperience(app, game, root);
  const sound = createSoundPanel(game, root, { isAllowed: () => started, open: modalOn, close: modalOff });
  let previewBoss = null;
  let discoveryTime = 0, bellReward = false;

  function renderJournal() {
    $('.cmysterybook h2 span').textContent = `${mystery.discoveries.size} / 3`;
    $('.cmysteryentries').replaceChildren(...MYSTERY_CLUES.map((entry, i) => {
      const found = mystery.discoveries.has(entry.id), article = document.createElement('article');
      article.classList.toggle('found', found);
      const label = document.createElement('small'); label.textContent = `${String(i + 1).padStart(2, '0')} · ${found ? '已记' : '待察'}`;
      const title = document.createElement('h3'); title.textContent = entry.id === 'bell' && !found ? '檐下铜铃' : entry.name;
      const text = document.createElement('p'); text.textContent = found ? entry.record : entry.hint;
      article.append(label, title, text); return article;
    }));
  }
  function foundRelic(id) {
    renderJournal();
    $('.cmysterynotice').textContent = mystery.complete ? '三处异闻已齐 · 可回铜铃旁听余声' : `${MYSTERY_CLUES.find(c => c.id === id).name} · 已记入剑谱异闻`;
    discoveryTime = 4;
    if (id === 'bell') bellReward = true;
    bus.emit('ui:sfx', { kind: 'focus' });
  }
  renderJournal();

  function updateObjective() {
    const [title, text] = OBJECTIVES[quest.stage];
    panel.querySelector('h2').textContent = title;
    panel.querySelector('p').textContent = text;
    root.dataset.stage = quest.stage; root.dataset.route = quest.route ?? '';
  }
  function cinema(speaker, wide = false, focus = null) {
    if (focus) {
      game.camera.setMode('story', { pos: [focus.x + 2.3, focus.y + 1.2, focus.z + 2.3], target: focus.toArray(), blend: 3 });
      return;
    }
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
    if (bellReward) { bellReward = false; P.gainFocus(35); game.swordArts.earn(2, '旧铃回响'); }
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
    cinema(page.speaker, page.wide, page.focus);
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
  function nearbyInteraction() {
    const main = quest.stage === 'evidence' ? { id: 'letter', pos: clue, name: '察看密令', reach: 3.5 }
      : ['meeting', 'return'].includes(quest.stage) ? { id: 'npc', pos: npc.pos, name: '与郭啸天交谈', reach: 3.2 } : null;
    let closest = main && P.pos.distanceTo(main.pos) < main.reach ? main : null;
    if (['meeting', 'evidence', 'return', 'complete'].includes(quest.stage)) {
      for (const entry of MYSTERY_CLUES) {
        const point = relics[entry.id], distance = Math.hypot(P.pos.x - point.pos.x, P.pos.z - point.pos.z);
        if (distance < 2.8 && (!closest || distance + .35 < P.pos.distanceTo(closest.pos))) {
          closest = { id: entry.id, pos: point.pos, name: `察看${entry.id === 'bell' ? '檐下铜铃' : entry.name}` };
        }
      }
    }
    return closest;
  }
  function bellPage(text) {
    return { speaker: '檐下铜铃', focus: relics.bell.focus, text, choices: [
      { label: mystery.bellRings ? '再叩一下' : '轻叩铜铃', note: '铃身已有敲击的旧痕', action: () => {
        const outcome = mystery.ringBell(); relics.ringBell(outcome === 'warning');
        const lines = {
          first: '第一声。铃响得很近，竹林里的回声却来得太迟。铃舌上缠着一根细线，还可以再叩。',
          second: mystery.discoveries.has('stele') ? '第二声。细线松了，一角纸从铜铃底部露出。林间的回声忽然停了。你要继续，还是收手？' : '第二声。铃身嗡嗡响着，你还辨不出这两道回声。碑后那半行字，也许能解释这只铃的机关。',
          warning: '第三声刚落，竹林深处也响了一声，迟了半拍。细线重新绷紧，纸角缩了回去。你攥住铃身，四下复归雨声。',
        };
        pages[pageIndex] = bellPage(lines[outcome] ?? '铃声已歇，那张纸条仍在你的剑谱中。'); showPage();
      } },
      { label: '收手听雨', note: '有时，不出第三下也是答案', action: () => {
        if (mystery.leaveBell()) {
          foundRelic('bell');
          pages = [
            { speaker: '丘处机', focus: relics.bell.focus, text: '你按碑句扶住铃身，等第二声余音散去，才松开那根细线。铃腹掉出一张油纸：“照旧痕，候来客。回风收势，右偏半寸。”六点墨旁，留着一个空圈。' },
            { speaker: '无名留笺', focus: relics.bell.focus, text: '纸背还有一句极淡的字：“长风过处，莫问姓名。”有人照着旧剑痕记下了你的剑路，再把它交给今夜的黑衣人。可是，留下剑痕的人又是谁？' },
          ]; pageIndex = 0; after = () => { if (mystery.complete) relics.reveal(); }; showPage();
        } else modalOff();
      } },
    ] };
  }
  function inspectRelic(id) {
    if (id === 'bell') {
      if (mystery.discoveries.has('bell')) return talk([{ speaker: '檐下铜铃', focus: relics.bell.focus, text: mystery.complete ? '三处记号，如今都已在你的剑谱里。你扶住铃舌，等雨声缓上一拍。铃下的六处浅痕，似乎正围着一处空白。' : '油纸已收进剑谱。铃下只剩半截细线，在风里轻晃。两声之后，不必再问。' }], () => { if (mystery.complete) relics.reveal(); });
      mystery.leaveBell();
      talk([bellPage('檐下这只旧铃没有积灰，铃舌上却多了一根新线。线的另一头，牵着一张藏在铃腹里的纸。碑后似乎刻过与叩铃有关的话。')]);
    } else {
      if (mystery.discover(id)) foundRelic(id);
      const record = MYSTERY_CLUES.find(c => c.id === id);
      talk([{ speaker: record.name, focus: relics[id].focus, text: record.record }]);
    }
  }
  function interact() {
    if (chapter.modal || game.state !== 'playing' || !started) return;
    const near = nearbyInteraction();
    if (near && ['gate', 'stele', 'bell'].includes(near.id)) return inspectRelic(near.id);
    if (quest.stage === 'meeting' && P.distTo(npc) < 3.2) {
      talk([
        { speaker: '郭啸天', text: '道长！那些黑衣人不抢财物，进村却先问一个青衣道人。他们说，你今晚一定会来……我还未报你的姓名。' },
        { speaker: '丘处机', text: '贫道循着七日前的无名信而来，信上也画着六点星位。先到灯下，雨里的人，由贫道来问。' },
        { speaker: '郭啸天', text: '带信的人正往村门退。还有件怪事：门槛旧痕，与你握剑的手势很像；碑后那句话，我也从来没看懂。救人还是追信，只能先顾一头。', choices: [
          { label: '先安顿伤者', note: '两名追兵 · 以完整真气迎战', action: () => select('aid') },
          { label: '迎上去截住信使', note: '额外枪兵加入 · 寻迹后真气充盈', action: () => select('pursue') },
        ] },
      ]);
    } else if (quest.stage === 'evidence' && P.pos.distanceTo(clue) < 3.5) {
      talk([
        { speaker: '丘处机', text: `蜡封缺了半个月牙。密令上写着：“戌正，青衣道人至。${quest.route === 'aid' ? '来客会停在灯下。' : '来客会追过村门。'}试其剑，勿问第七人。”落款却是昨日。有人竟先写好了我的来路。` },
        { speaker: '丘处机', text: quest.route === 'aid' ? '郭兄弟还活着，便不是一纸密令能定下的结局。纸背有“右偏半寸”四字……先收好。竹林里又多了弓弦声。' : '信使遗下的丹丸，还未被雨水浸透。先调匀内息。写信的人知道我会追，却未必知道我会追到哪一步。' },
      ], () => { if (quest.inspect()) { paper.visible = seal.visible = false; P.gainFocus(100); wave(1); } });
    } else if (quest.stage === 'return' && P.distTo(npc) < 3.2) {
      // Reveal the actual opponent for his line, then reuse the same pooled body for the duel.
      previewBoss = game.pool.swordmaster[0];
      previewBoss.place(2.5, -4.5, Math.atan2(P.pos.x - 2.5, P.pos.z + 4.5));
      previewBoss.ch.setVisible(true); previewBoss.ch.sword.setDrawn(true);
      previewBoss.setLocomotion(0, 0, 0, true); previewBoss.pose(0.016, game.time);
      talk([
        { speaker: '郭啸天', text: '这不是官印，是一枚缺星的私印。昨夜有人借灯，在碑前站了半宿。道长，竹影后的那个人，手上也缠着同样的细线。' },
        { speaker: '丘处机', text: '你们追的不是信，是贫道的剑。既然认得回风收势，何不出来看清楚？' },
        { speaker: '黑衣首领', text: '收势右偏半寸，果然与旧痕一样。有人叫我记住你的每一剑，却不许我问留下旧痕的人。第七个名字，你最好也别问。', wide: true },
      ], () => { if (quest.confront()) { P.hp = P.maxHp; bus.emit('player:hp', { hp: P.hp, max: P.maxHp }); P.gainFocus(100); wave(2); } });
    }
  }
  function ending() {
    talk([
      ...mysteryEnding(mystery, quest.route),
      { speaker: mystery.complete ? '雨夜异闻 · 第七处留白' : '风雨牛家村 · 未署名的信', text: mystery.complete ? '三处旧物，终于指向同一场布置。你将那张写有“长风”二字的纸夹入剑谱。远处传来两声铃响，第三声始终没有到来。' : '信使走了，留信的人仍未现身。村门、苔碑、檐下铜铃，都还留在雨里。有些答案，须得回头再看一眼。', choices: [
        { label: '重走这一夜', note: '尝试另一条选择', action: () => location.reload() },
        { label: '留在牛家村', note: '自由练剑与探索', action: () => { quest.finish(); modalOff(); d.explore(); markCleared('niujia'); bus.emit('chapter:complete'); updateObjective(); } },
      ] },
    ]);
  }
  function begin() {
    started = true; d.explore(); panel.hidden = false; updateObjective();
    talk([
      { speaker: '临安府 · 牛家村', text: '七日前，一封没有署名的信送到你手上。信中只说：雨起牛家村，来客莫回头。今夜，你循着黑衣人的足迹来到这里，雨恰好落下。', wide: true },
      { speaker: '丘处机', text: '信上六点星位，第七处却空着。前面有灯，也有人。先问清楚，再拔剑。', wide: true },
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
  d.toTitle = () => {
    endingDelay = discoveryTime = 0; bellReward = false; chapter.modal = false;
    mystery.reset(); quest.stage = 'meeting'; quest.route = null; renderJournal();
    paper.visible = seal.visible = true;
    panel.hidden = true; dialog.hidden = true; $('.cactions').hidden = true; started = false; oldToTitle();
  };
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
    else {
      manual = true; modalOn(); $('.cmanual').hidden = false;
      bookWrap.scrollTop = 0; $('[data-book="moves"]').focus({ preventScroll: true });
    }
  }
  $('.cmclose').onclick = toggleManual;
  root.addEventListener('click', e => {
    const bookAction = e.target.closest('[data-book]')?.dataset.book;
    if (bookAction === 'close') toggleManual();
    else if (bookAction) $(bookAction === 'mystery' ? '.cmysterybook' : '.cmanual .cmgrid').scrollIntoView({ block: 'start' });
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
      ...[['gate', '到旧剑痕附近'], ['stele', '到碑阴附近'], ['bell', '到铜铃附近']].map(([id, name]) => [name, () => {
        const target = relics[id].pos; P.place(target.x, target.z + .9, Math.PI); game.camera.resetBehind(Math.PI);
      }]),
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
    const canExplore = started && game.state === 'playing' && !chapter.modal && !game.paused;
    $('.cmysterynotice').hidden = discoveryTime <= 0 || !canExplore;
    if (canExplore) discoveryTime = Math.max(0, discoveryTime - rawDt);
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
    } else marker.hidden = true;
    const near = canExplore ? nearbyInteraction() : null;
    prompt.hidden = !near;
    if (near && prompt.dataset.target !== near.id) {
      prompt.dataset.target = near.id; prompt.innerHTML = `<kbd>X</kbd>${near.name}`;
    }
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
