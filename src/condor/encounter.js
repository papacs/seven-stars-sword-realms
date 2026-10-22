import { bus } from '../core/bus.js';

const TRIALS = [
  { label: '精准招架一次', hint: '敌刃将落时按 K，识破来势', event: 'parry' },
  { label: '施展一次剑境', hint: '击中、招架积气，满气按 E', event: 'art' },
  { label: '完成一次极限闪避', hint: '红色重击将至时按 Space', event: 'evade' },
];

export class Encounter {
  constructor(index, title, now) {
    this.title = title; this.start = now; this.trial = TRIALS[(index - 1) % TRIALS.length];
    this.parries = 0; this.evades = 0; this.kills = 0; this.damage = 0; this.arts = 0; this.complete = false;
  }
  record(event, amount = 1) {
    const field = { parry: 'parries', evade: 'evades', kill: 'kills', hurt: 'damage', art: 'arts' }[event];
    if (field) this[field] += amount;
    if (this.complete || event !== this.trial.event) return false;
    this.complete = true; return true;
  }
  result(now) {
    return { title: this.damage === 0 ? '无伤破阵' : this.parries + this.evades >= 2 ? '见招拆招' : '破阵而出',
      seconds: Math.max(0, Math.round(now - this.start)), parries: this.parries, evades: this.evades,
      kills: this.kills, damage: this.damage, complete: this.complete };
  }
}

// Optional combat experiments teach timing without blocking the story.
export function createEncounterExperience(app, game, root) {
  const panel = document.createElement('section'); panel.className = 'cencounter'; panel.hidden = true;
  panel.innerHTML = '<small>本场试招 · 额外剑意 +2 / 真气 +30</small><b></b><p></p><span></span>';
  const result = document.createElement('section'); result.className = 'cresult'; result.hidden = true;
  result.setAttribute('role', 'status');
  root.append(panel, result);
  let current = null, summaryTime = 0, refresh = 0;
  function record(event, amount) {
    if (!current || game.state !== 'playing' || game.chapter?.modal || !game.player.alive) return;
    if (current.record(event, amount)) {
      game.swordArts.earn(2, '试招有成'); game.player.gainFocus(30);
      panel.classList.add('complete'); bus.emit('ui:sfx', { kind: 'seal' });
    }
  }
  bus.on('wave:start', p => {
    current = new Encounter(p.index, p.title, game.time); summaryTime = 0;
    panel.classList.remove('complete'); result.hidden = true;
  });
  bus.on('player:parry', p => { if (p.perfect) record('parry'); });
  bus.on('player:evade', p => { if (p.perfect) record('evade'); });
  bus.on('sword:art', () => record('art'));
  bus.on('enemy:death', () => record('kill'));
  bus.on('player:hurt', p => record('hurt', p.damage));
  bus.on('wave:clear', () => {
    if (!current) return;
    const s = current.result(game.time);
    result.innerHTML = `<small>${current.title} · 战斗小结</small><h2>${s.title}</h2><div><b>${s.seconds}<i>用时 / 秒</i></b><b>${s.parries}<i>精准招架</i></b><b>${s.evades}<i>极限闪避</i></b></div><p>${s.complete ? '试招已成 · 带着新的剑意继续前行' : '下场试试招架与闪避，借来势凝成剑意'}</p>`;
    current = null; summaryTime = 7;
  });
  bus.on('player:death', () => { current = null; summaryTime = 0; });
  bus.on('game:state', p => { if (p.state === 'title') { current = null; summaryTime = 0; } });
  app.add({ update(dt, t, a, raw = dt) {
    const visible = game.state === 'playing' && !game.chapter?.modal;
    panel.hidden = !visible || !current;
    result.hidden = !visible || summaryTime <= 0;
    if (visible) summaryTime = Math.max(0, summaryTime - raw);
    refresh += raw; if (!current || refresh < .2) return; refresh = 0;
    panel.querySelector('b').textContent = current.complete ? '试招有成 · 已获奖励' : current.trial.label;
    panel.querySelector('p').textContent = current.complete ? '剑意 +2 · 真气 +30' : current.trial.hint;
    const remaining = game.enemies.filter(e => e.active && e.alive).length + game.director.pending.length;
    panel.querySelector('span').textContent = `${current.title} · 余敌 ${remaining}`;
  } });
}
