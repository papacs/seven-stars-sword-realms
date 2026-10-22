import * as THREE from 'three';
import { bus } from '../core/bus.js';
import { SWORD_PATHS } from './sword-intent.js';
import './action-feedback.css';

// Read the real controller and confirmed combat events; no separate UI cooldowns.
export function createActionFeedback(app, game, root) {
  const P = game.player;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const dock = document.createElement('section');
  dock.className = 'ccombat'; dock.hidden = true;
  dock.setAttribute('aria-label', '招式与身法状态');
  const actions = [
    ['light', 'J', '斩', '连剑'], ['heavy', 'C', '破', '重剑'],
    ['block', 'K', '守', '招架'], ['dodge', 'SPACE', '闪', '身法'], ['lock', 'Q', '锁', '锁敌'],
  ];
  dock.innerHTML = `<div class="cstance"><i></i><span></span><small></small><div class="caction-meter"><b></b></div></div>
    <div class="cswordstatus"><kbd>E</kbd><span></span><i aria-hidden="true"><b></b></i><small></small></div>
    <div class="ckeys">${actions.map(([action, key, glyph, label]) => `<div data-action="${action}"><b>${glyph}</b><span>${label}</span><kbd>${key}</kbd></div>`).join('')}</div>`;
  const hits = document.createElement('div'); hits.className = 'chits'; hits.setAttribute('aria-hidden', 'true');
  root.append(hits, dock);
  const stance = dock.querySelector('.cstance'), name = stance.querySelector('span'), hint = stance.querySelector('small');
  const meter = stance.querySelector('.caction-meter');
  const swordStatus = dock.querySelector('.cswordstatus'), swordName = swordStatus.querySelector('span'), swordQi = swordStatus.querySelector('small');
  const keys = actions.map(([action]) => [action, dock.querySelector(`[data-action="${action}"]`)]);
  const marks = Array.from({ length: 6 }, () => {
    const el = document.createElement('div'); el.className = 'chit'; el.hidden = true;
    el.innerHTML = '<i></i><b></b><small></small>'; hits.append(el);
    return { el, number: el.querySelector('b'), label: el.querySelector('small'), pos: new THREE.Vector3(), age: 9 };
  });
  let next = 0, feedback = '', feedbackAge = 9, feedbackTone = 'gold';
  const offs = [], on = (event, fn) => offs.push(bus.on(event, fn));
  const canShow = () => game.state === 'playing' && !game.paused && !game.chapter?.modal && P.alive;
  function say(text, tone = 'gold') { if (!canShow()) return; feedback = text; feedbackAge = 0; feedbackTone = tone; }
  on('enemy:hit', p => {
    if (!canShow() || !p.pos) return;
    // Fan-shaped qi can hit one enemy several times in a frame: show one legible total.
    const same = marks.find(m => m.id === p.id && m.age < .1);
    const m = same ?? marks[next++ % marks.length];
    m.damage = (same ? m.damage : 0) + p.damage; m.id = p.id;
    m.pos.copy(p.pos); m.age = 0;
    m.el.dataset.heavy = String(!!p.heavy); m.el.dataset.kill = String(!!p.kill);
    m.number.textContent = p.execute ? '绝' : String(m.damage);
    m.label.textContent = p.kill ? '制敌' : p.heavy ? '重击' : '';
  });
  on('player:parry', p => { if (p.perfect) say('识破 · 可接重剑反击', 'jade'); });
  on('player:evade', p => { if (p.perfect) say('踏隙 · 接轻剑追身', 'jade'); });
  on('player:hurt', () => say('受击 · 闪避脱身', 'red'));
  on('enemy:posture', p => { if (p.broken !== false) say(game.input.touch.enabled ? '破势 · 靠近点斩追击' : '破势 · 靠近按 J 追击'); });
  on('chapter:modal', () => { feedbackAge = 9; for (const m of marks) m.age = 9; });
  on('game:state', () => { feedbackAge = 9; for (const m of marks) m.age = 9; });
  const projected = new THREE.Vector3();
  let tick = 0;
  const system = {
    update(dt, t, a, rawDt = dt) {
      const visible = canShow(); dock.hidden = !visible; hits.hidden = !visible;
      if (!visible) return;
      feedbackAge += rawDt;
      for (const m of marks) {
        m.age += dt;
        m.el.hidden = m.age >= .7;
        if (m.el.hidden) continue;
        projected.copy(m.pos).project(app.camera);
        m.el.hidden = projected.z < -1 || projected.z > 1 || Math.abs(projected.x) > .96 || Math.abs(projected.y) > .94;
        if (m.el.hidden) continue;
        m.el.style.left = `${(projected.x * .5 + .5) * 100}%`;
        m.el.style.top = `${(-projected.y * .5 + .5) * 100}%`;
        m.el.style.opacity = String(Math.min(1, (.7 - m.age) * 5));
        m.el.style.transform = reducedMotion.matches ? 'translate(-50%, -50%)'
          : `translate(-50%, calc(-50% - ${m.age * 38}px)) scale(${1 + Math.max(0, .12 - m.age) * 2})`;
      }
      tick += rawDt; if (tick < .04) return; tick = 0;
      const intent = game.swordArts?.intent, path = SWORD_PATHS.find(p => p.id === intent?.path);
      swordStatus.hidden = !path;
      if (path) {
        swordStatus.style.setProperty('--sword', path.color);
        swordStatus.style.setProperty('--qi', Math.min(1, P.focus / 100));
        swordStatus.classList.toggle('ready', P.focus >= 100);
        swordName.textContent = path.art;
        swordQi.textContent = `${Math.floor(P.focus)}% · ✦ ${intent.stars}/7`;
        swordStatus.setAttribute('aria-label', `${path.art}，真气 ${Math.floor(P.focus)}%，剑意 ${intent.stars} 星`);
      }
      const state = P.state, meta = P.clipMeta;
      let text = '从容行剑', detail = '按下出剑 · 长按转蓄力', tone = 'quiet', progress = null;
      if (state === 'attack') {
        text = P.clip === 'heavy' ? '重剑 · 破阵' : P.clip === 'thrust' ? '追身 · 刺' : `连剑 · ${['一', '二', '三', '四'][Math.max(0, P.comboIdx)] ?? '终'}式`;
        const combo = meta?.combo;
        const open = combo && P.clipT >= combo[0] && P.clipT <= combo[1];
        detail = open ? '连剑可接 · 再按 J' : '行剑中'; tone = open ? 'gold' : 'quiet';
      } else if (state === 'charge') {
        progress = Math.min(1, P.chargeT / .75); text = progress >= 1 ? '蓄势已满' : '凝神 · 蓄势';
        detail = '松手劈斩 · Space 撤步'; tone = 'gold';
      } else if (state === 'dodge') {
        const cancel = meta?.cancel ?? .4;
        progress = Math.min(1, P.clipT / cancel); text = progress >= 1 ? '身法可接' : '踏风 · 闪身';
        detail = progress >= 1 ? 'J 追身 · Space 连闪' : '收势中'; tone = 'jade';
      } else if (state === 'block' || state === 'parry') {
        text = state === 'parry' ? '借势 · 反击' : '守势 · 招架'; detail = '落剑瞬间按 K 识破'; tone = 'jade';
      } else if (state === 'special') {
        text = '剑境 · 释放'; detail = '剑意随锋而出'; tone = 'gold';
      } else if (state === 'react') {
        text = '受击 · 收势'; detail = '稍后可闪避脱身'; tone = 'red';
      } else if (P.lock?.alive) {
        text = '锁敌 · 已定'; detail = 'Q 解锁 · B 视角归位';
      } else if (P.sprinting) {
        text = '轻功 · 疾行'; detail = 'J 追身出剑';
      }
      if (feedbackAge < 1.1) { text = feedback; tone = feedbackTone; }
      if (name.textContent !== text) name.textContent = text;
      if (hint.textContent !== detail) hint.textContent = detail;
      if (stance.dataset.tone !== tone) stance.dataset.tone = tone;
      meter.hidden = progress === null; meter.style.setProperty('--progress', progress ?? 0);
      for (const [action, el] of keys) {
        const active = action === 'light' ? state === 'attack' && P.clip !== 'heavy'
          : action === 'heavy' ? state === 'charge' || P.clip === 'heavy' && state === 'attack'
          : action === 'block' ? state === 'block' || state === 'parry'
          : action === 'dodge' ? state === 'dodge' : !!P.lock?.alive;
        el.classList.toggle('active', active || game.input.b[action].down);
      }
    },
    dispose() { offs.forEach(off => off()); dock.remove(); hits.remove(); app.remove(system); },
  };
  app.add(system);
  return system;
}
