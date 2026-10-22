// Shared settings for the story and every practice map.
export function createSoundPanel(game, root, { isAllowed, open, close }) {
  const $ = s => root.querySelector(s);
  let soundOpen = false;
  root.insertAdjacentHTML('beforeend', `    <section class="cmanual caudiopanel" role="dialog" aria-label="江湖设置" aria-modal="true" hidden><div class="cmwrap"><header class="csettingshead"><h1>江湖设置</h1><button data-audio="close">返回江湖</button></header><nav class="csettingstabs" aria-label="设置分类"><button data-settings="sword" aria-pressed="false">剑境选择</button><button data-settings="sound" aria-pressed="false">声音设置</button></nav><div data-settings-pane="sword" hidden><div class="cssettings"></div><p class="cssettingstip">选择剑路后返回江湖，真气满时点击「气」释放剑境。三路印记与剑意会保留。</p></div><div data-settings-pane="sound" hidden><small class="cdlabel">声音 · 让兵刃清晰，让风雨留白</small><output class="caudiostate" aria-live="polite"></output><meter class="cameter" min="0" max="1" value="0" aria-label="声音输出"></meter><span class="cadblevel"></span><div class="camixer">
      <label>总音量<input data-volume type="range" min="0" max="100" aria-label="总音量"></label>
      <label>乐声<input data-mix="music" type="range" min="0" max="100" aria-label="乐声"></label>
      <label>兵刃与招式<input data-mix="sfx" type="range" min="0" max="100" aria-label="兵刃与招式"></label>
      <label>风雨环境<input data-mix="amb" type="range" min="0" max="100" aria-label="风雨环境"></label>
      <label class="cvoice"><input data-voices type="checkbox">招式呼喝<small>合成人声，可按喜好开启</small></label>
      </div><div class="caudiobuttons"><button data-audio="preview">试听</button><button data-audio="mute">静音</button><button data-audio="recover">恢复声音</button></div><p>切换窗口回来后会尝试恢复声音。若仍无声，可点「恢复声音」；M 可快速静音或取消静音。</p></div></div></section>`);
  const sword = game.swordArts?.panel;
  if (sword) $('.cssettings').append(sword);
  function showPage(name) {
    for (const pane of root.querySelectorAll('[data-settings-pane]')) pane.hidden = pane.dataset.settingsPane !== name;
    for (const button of root.querySelectorAll('[data-settings]')) button.setAttribute('aria-pressed', String(button.dataset.settings === name));
  }
  function hide() {
    soundOpen = false; $('.caudiopanel').hidden = true;
  }
  function toggleSound() {
    if (!isAllowed() || (game.chapter?.modal && !soundOpen)) return;
    if (soundOpen) { hide(); close(); $('[data-do="audio"]')?.focus({ preventScroll: true }); return; }
    soundOpen = true; open(); $('.caudiopanel').hidden = false;
    showPage('sword');
    $('.cssettingstip').textContent = game.input.touch.enabled
      ? '选择剑路后返回江湖，真气满时点击「气」释放剑境。三路印记与剑意会保留。'
      : '选择剑路后返回江湖，真气满时按 E 释放剑境；战斗中也可按 1 / 2 / 3 快捷换路。三路印记与剑意会保留。';
    $('.caudiopanel .cmwrap').scrollTop = 0;
    const audio = game.audio;
    $('[data-volume]').value = String(Math.round((audio?.volume ?? .8) * 100));
    for (const input of root.querySelectorAll('[data-mix]')) input.value = String(Math.round((audio?.mix[input.dataset.mix] ?? 1) * 100));
    $('[data-voices]').checked = audio?.mix.voices ?? false;
    $('[data-audio="close"]').focus(); updateAudioState();
  }
  function updateAudioState() {
    if (!soundOpen) return;
    const s = game.audio?.stats();
    const label = !s ? '当前浏览器未能加载声音' : s.muted || s.volume === 0 ? '当前已静音' : s.state === 'running' ? '声音已开启' : '声音尚未开启或已中断，可点「恢复声音」';
    if ($('.caudiostate').textContent !== label) $('.caudiostate').textContent = label;
    const muteLabel = s?.muted ? '取消静音' : '静音';
    if ($('[data-audio="mute"]').textContent !== muteLabel) $('[data-audio="mute"]').textContent = muteLabel;
    const rms = s?.level?.rms ?? 0;
    $('.cameter').value = Math.min(1, rms * 4);
    const db = rms > 0.00001 ? `${Math.round(20 * Math.log10(rms))} dB` : '安静';
    if ($('.cadblevel').textContent !== db) $('.cadblevel').textContent = db;
  }
  root.addEventListener('input', e => {
    if (e.target.matches('[data-volume]')) game.audio?.setVolume(Number(e.target.value) / 100);
    if (e.target.dataset.mix) game.audio?.setMix({ [e.target.dataset.mix]: Number(e.target.value) / 100 });
    if (e.target.matches('[data-voices]')) game.audio?.setMix({ voices: e.target.checked });
    updateAudioState();
  });
  root.addEventListener('click', async e => {
    const page = e.target.closest('[data-settings]')?.dataset.settings;
    if (page) showPage(page);
    const action = e.target.closest('[data-audio]')?.dataset.audio, audio = game.audio;
    if (action === 'close') toggleSound();
    else if (action === 'mute') audio?.setMuted(!audio.muted);
    else if (action === 'recover' && audio) {
      audio.setMuted(false); if (audio.volume === 0) audio.setVolume(.65);
      await audio.recover(); audio.play('ui:sfx', { kind: 'seal' });
    } else if (action === 'preview' && audio) { await audio.start(); audio.play('ui:sfx', { kind: 'seal' }); }
    updateAudioState();
  });
  const pauseMenu = document.querySelector('.wx .pause .mn');
  if (pauseMenu) {
    const sound = document.createElement('button'); sound.innerHTML = '<b>设置</b><i>sword · sound</i>';
    sound.onclick = toggleSound; pauseMenu.append(sound);
  }

  addEventListener('keydown', e => {
    if (soundOpen) {
      if (!e.repeat && e.code === 'Escape') { e.preventDefault(); toggleSound(); }
      e.stopImmediatePropagation(); return;
    }
    if (!e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey && e.code === 'KeyM' && game.state !== 'title' && !game.chapter?.modal) {
      e.preventDefault(); e.stopImmediatePropagation(); game.audio?.setMuted(!game.audio?.muted);
    }
  }, true);
  return { toggle: toggleSound, update: updateAudioState, get isOpen() { return soundOpen; }, hide };
}
