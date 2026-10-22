import { levelUrl } from '../levels/index.js';

export function createSwordTitle(app, subtitle) {
  const title = document.querySelector('.wx .title');
  if (!title) return;
  title.classList.add('sword-title');
  title.querySelector('.tt').textContent = '七星剑境';
  title.querySelector('.tt').style.fontSize = '';
  title.querySelector('.tg').textContent = subtitle;
  title.querySelector('.en b').textContent = 'SEVEN STARS · SWORD REALMS';
  title.querySelector('.en i').textContent = '借一场风雨，试一身剑意。';
  const go = title.querySelector('.go');
  go.setAttribute('role', 'button'); go.setAttribute('tabindex', '0');
  go.setAttribute('aria-label', '入江湖，开始游戏');
  go.querySelector('.t b').textContent = '入江湖';
  go.querySelector('.t i').textContent = 'ENTER / 点击启程';
  title.insertAdjacentHTML('beforeend', `
    <div class="ctitle-brand"><b>射雕</b><span>同人演武 · 可玩序章</span></div>
    <div class="ctitle-chart" aria-hidden="true"><svg viewBox="0 0 500 500" fill="none">
      <circle cx="250" cy="250" r="207"/><circle cx="250" cy="250" r="190" stroke-dasharray="1 12"/>
      <path d="M43 250h45m324 0h45M250 43v45m0 324v45M115 140l65 45 65-20 55 72 59 33-25 71-77 28"/>
      <path d="M115 140l130 25 114 105-102 99" opacity=".25"/>
      ${[[115,140],[180,185],[245,165],[300,237],[359,270],[334,341],[257,369]].map(([x,y],i)=>`<g style="--i:${i}"><circle cx="${x}" cy="${y}" r="4" class="star"/><circle cx="${x}" cy="${y}" r="10" class="halo"/></g>`).join('')}
    </svg><span class="chart-north">北 斗</span><span class="chart-verse">以守凝意<br>以破开路<br>以御成阵</span><small>七星为引 · 三路归一</small></div>
    <div class="ctitle-note"><span>01 / 见招</span><b>识破来势，凝成剑意</b><span>02 / 换势</span><b>守 · 破 · 御，三路成印</b><span>03 / 合一</span><b>七星齐明，一剑破阵</b></div>
    <nav class="ctitle-realms" aria-label="选择剑境">${[['niujia','剧情 · 牛家村'],['steppe','演武 · 长风'],['bamboo','演武 · 夜雨'],['town','演武 · 灯火']].map(([id,name])=>`<a href="${levelUrl(id)}" ${id===app.level.id ? 'aria-current="page"' : ''}>${name}</a>`).join('')}</nav>
    <div class="ctitle-foot">WASD 行走　J 连击　K 招架　Space 闪避<span>建议佩戴耳机 · 听雨，辨剑</span></div>`);
  const root = document.getElementById('condor');
  root?.addEventListener('keydown', e => {
    if (e.target.closest('button') && ['Space', 'Enter'].includes(e.code)) e.stopPropagation();
  });
  root?.addEventListener('keyup', e => {
    if (e.target.closest('button') && ['Space', 'Enter'].includes(e.code)) e.stopPropagation();
  });
}
