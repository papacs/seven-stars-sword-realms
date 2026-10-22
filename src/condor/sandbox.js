import { bus } from '../core/bus.js';
import { createSwordArts } from './sword-arts.js';
import { createSoundPanel } from './sound-panel.js';
import { SWORD_PATHS } from './sword-intent.js';
import { createExperienceQA } from './experience-qa.js';
import { createEncounterExperience } from './encounter.js';
import { createSwordTitle } from './presentation.js';
import './chapter.css';

// Original environments become practice maps for the same authored sword system.
export function createSwordSandbox(app, game) {
  const modal = game.chapter = { modal: false, sandbox: true };
  const root = document.createElement('div'); root.id = 'condor';
  root.innerHTML = `<div class="cloc"><b>${app.level.title}</b>七星剑境 · 演武篇</div>
    <div class="cactions" hidden><button data-do="manual"><kbd>Z</kbd>剑谱</button><button data-do="camera"><kbd>B</kbd>视角归位</button><button data-do="audio">设置</button></div>
    <section class="cmanual csandboxbook" role="dialog" aria-label="七星剑谱" aria-modal="true" hidden><div class="cmwrap"><small class="cdlabel">本作原创武学系统</small><h1>七星剑境</h1><p>精准招架 +2 剑意，极限闪避、制敌各 +1。3 星强化满气 E，7 星北斗合一。三路各施一次强化剑境，第三路触发「三路共鸣 · 北斗合一」。印记跨战保留，合一或失败清空。每场可选试招奖励 2 星与 30 真气。</p><div class="cmgrid">${SWORD_PATHS.map(p => `<article><small>${p.key} · ${p.name}</small><h3>${p.art}</h3><p>${p.description}。满气时按 E，剑意可进一步强化效果。</p></article>`).join('')}</div><p>WASD 移动　J 连击　K 招架　Space 闪避　Q 锁定　E 满气剑境　B 视角归位　M 静音</p><button class="cmclose">返回演武</button></div></section>
    <div class="ccredit">七星剑境改编 · 剑路 / 剑意 / 剑阵为本作新增 · 场景与动作源自 jbang2004 开源《长风》</div>`;
  document.body.append(root); document.body.classList.add('condor-story');
  let bookOpen = false, locked = false;
  const actions = root.querySelector('.cactions'), book = root.querySelector('.csandboxbook');
  function open() {
    locked = game.input.locked; modal.modal = true; game.input.clear(); game.input.exitLock();
    document.body.classList.add('condor-dialogue'); bus.emit('chapter:modal', { open: true });
  }
  function close() {
    modal.modal = false; game.input.clear(); book.hidden = true;
    document.body.classList.remove('condor-dialogue'); bus.emit('chapter:modal', { open: false });
    if (locked && !game.paused) game.input.requestLock();
  }
  const sound = createSoundPanel(game, root, { isAllowed: () => game.state !== 'title', open, close });
  createSwordArts(app, game, root);
  createEncounterExperience(app, game, root);
  createExperienceQA(app, game, root);
  function toggleBook() {
    if (game.state === 'title' || (modal.modal && !bookOpen)) return;
    if (bookOpen) { bookOpen = false; close(); }
    else { bookOpen = true; open(); book.hidden = false; root.querySelector('.cmclose').focus(); }
  }
  root.querySelector('.cmclose').onclick = toggleBook;
  root.addEventListener('click', e => {
    const action = e.target.closest('[data-do]')?.dataset.do;
    if (action === 'manual') toggleBook(); else if (action === 'camera') game.resetCamera(); else if (action === 'audio') sound.toggle();
  });
  addEventListener('keydown', e => {
    if (sound.isOpen) return;
    if (!e.repeat && (e.code === 'KeyZ' || (bookOpen && e.code === 'Escape'))) {
      e.preventDefault(); e.stopImmediatePropagation(); toggleBook();
    } else if (bookOpen) e.stopImmediatePropagation();
  }, true);
  const title = document.querySelector('.scr.title');
  if (title) {
    title.querySelector('.tt').textContent = '七星剑境';
    title.querySelector('.tt').style.fontSize = 'clamp(64px,8.9vh,140px)';
    title.querySelector('.tg').textContent = `${app.level.title} · 演武`;
    title.querySelector('.en b').textContent = 'SEVEN STARS · SWORD REALMS';
    title.querySelector('.en i').textContent = '三路剑法 · 见招拆招 · 七星合一';
  }
  createSwordTitle(app, `${app.level.title} · 三路演武`);
  app.add({ update() { actions.hidden = game.state !== 'playing' || modal.modal; root.querySelector('.cloc').hidden = actions.hidden; sound.update(); } });
}
