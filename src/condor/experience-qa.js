// Visible local QA controls; never created in normal play.
export function createExperienceQA(app, game, root, extraButtons = []) {
  if (!app.params.has('verify')) return;
  const P = game.player, tools = document.createElement('div'); tools.className = 'cverify';
  const buttons = [...extraButtons,
    ['补气', () => { P.gainFocus(100); P.invulnerable = true; }],
    ['补满七星', () => { game.swordArts.intent.gain(7); P.gainFocus(100); }],
    ['补至三星', () => { game.swordArts.intent.stars = 3; P.gainFocus(100); }],
    ['远景复现', () => game.camera.toggleOrbit('crane')],
    ['挂起音频', () => game.audio?.ctx?.suspend().catch(() => {})],
    ['剑境出招', () => { if (P.alive) { P.setDrawn(true); P.startSpecial(); } }],
    ['慢放预览', () => { app.time.userScale = app.time.userScale < 1 ? 1 : .15; }],
    ['定格下一招 / 继续', () => { if (app.time.frozen) app.freeze(false); else game.swordArts.freezeNext = true; }],
    ['损失气血', () => { P.hp = Math.max(10, P.hp - 30); }],
    ['模拟战败', () => { if (game.state === 'playing' && !game.chapter?.modal && P.alive) { P.hp = 0; P.die(); } }],
  ];
  for (const [label, fn] of buttons) { const b = document.createElement('button'); b.textContent = label; b.onclick = fn; tools.append(b); }
  const status = document.createElement('output'); status.className = 'cstatus'; tools.append(status); root.append(tools);
  let elapsed = 0;
  app.add({ update(dt, t, a, raw = dt) {
    elapsed += raw; if (elapsed < .2) return; elapsed = 0;
    const audio = game.audio?.stats();
    const last = game.swordArts.lastCast;
    status.textContent = `${app.stats().fps} FPS · ${game.enemies.filter(e => e.active && e.alive).length} 敌 · ${game.chapter.quest?.stage ?? '演武'} · ${P.state} · 镜头 ${game.camera.orbit ?? game.camera.mode} · 音频 ${audio?.state ?? 'none'} ${audio?.level.rms.toFixed(3) ?? '0'} · 气血 ${Math.round(P.hp)} · 剑气 ${game.combat.qi.length} · ${game.swordArts.intent.path} ${game.swordArts.intent.stars}星${last ? ` · 上次${last.name} ${last.projectiles}道 +${last.healed}血` : ''}`;
  } });
}
