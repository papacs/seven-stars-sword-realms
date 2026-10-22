// Browser regression: real controls and visible QA buttons drive the game; evaluation only reads state.
// npm start, then node tools/verify-experience.mjs (CHROME_PATH and GAME_URL are optional).
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const base = process.env.GAME_URL ?? 'http://127.0.0.1:4173/';
const regressionsOnly = process.argv.includes('--regressions');
const polishOnly = process.argv.includes('--polish');
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/chromium',
  ].find(existsSync),
  headless: true, args: ['--enable-gpu', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
page.setDefaultTimeout(30000);
const errors = [], checks = [];
page.on('pageerror', e => errors.push(e.stack));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
mkdirSync('../previews', { recursive: true });
const button = name => page.getByRole('button', { name, exact: true });
const state = () => page.evaluate(() => {
  const g = window.__full.game;
  return { stage: g.chapter.quest?.stage, route: g.chapter.quest?.route, state: g.state,
    player: g.player.state, hp: g.player.hp, focus: g.player.focus, stars: g.swordArts.intent.stars, path: g.swordArts.intent.path,
    seals: [...g.swordArts.intent.seals], cast: g.swordArts.lastCast,
    paused: g.paused, modal: g.chapter.modal, enemies: g.enemies.filter(e => e.active && e.alive).length,
    pending: g.director.pending.length, camera: g.camera.mode };
});
async function load(query) {
  console.log(`Loading ${query || 'release'}…`);
  await page.goto(`${base}?q=low&harness=1${query}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__ready === true && !!window.__full?.game, null, { timeout: 180000 });
  await page.locator('#load').waitFor({ state: 'detached', timeout: 10000 });
  assert.deepEqual(await page.evaluate(() => window.__integration.failed), []);
  console.log('World and characters ready');
}
async function begin() {
  await page.locator('.title .go').click();
  await button('继续').click(); await button('继续前行').click();
  await page.locator('.cguide:not([hidden])').waitFor();
  await page.waitForFunction(() => window.__full.game.camera.mode === 'follow' && window.__full.game.camera.modeT > 2.8);
}
async function talkRoute(route) {
  await button('到目标附近').click(); await page.keyboard.press('x');
  await button('继续').click(); await button('继续').click();
  await page.getByRole('button', { name: route === 'aid' ? /^先安顿伤者/ : /^迎上去截住信使/ }).focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__full.game.director.pending.length === 0 && window.__full.game.enemies.some(e => e.active && e.alive));
}
async function clearTo(stage) {
  await button('清除当前敌人').click();
  await page.waitForFunction(s => window.__full.game.chapter.quest.stage === s, stage);
}
async function selectSword(path) {
  const before = await state();
  assert.equal(await page.locator('#condor>.csword').count(), 0, 'the battlefield must not contain a sword selection panel');
  await button('设置').click();
  await page.getByRole('dialog', { name: '江湖设置' }).waitFor();
  assert.equal(await button('剑境选择').getAttribute('aria-pressed'), 'true', 'settings opens on sword selection on every device');
  assert.equal(await page.locator('.cssettings .csword').isVisible(), true);
  const touch = await page.evaluate(() => window.__full.game.input.touch.enabled);
  assert.match(await page.locator('.cssettingstip').innerText(), touch ? /点击「气」/ : /按 E/);
  await page.locator(`.cssettings button[data-path="${path}"]`).click();
  assert.equal(await page.locator(`.cssettings button[data-path="${path}"]`).getAttribute('aria-pressed'), 'true');
  await page.screenshot({ path: `../previews/七星剑境-${touch ? '触控' : '桌面'}设置.png` });
  await button('返回江湖').click();
  await page.waitForFunction(() => !window.__full.game.chapter.modal);
  assert.equal(await page.locator('.csword').isVisible(), false);
  const after = await state();
  assert.equal(after.path, path); assert.equal(after.stars, before.stars); assert.deepEqual(after.seals, before.seals);
}
async function castSword() {
  await page.locator('#c').focus();
  await page.keyboard.press('e');
}
try {
  if (polishOnly) {
    await load('&verify=1'); await begin();
    await selectSword('guard');
    await page.locator('#c').focus();
    for (const [key, path] of [['2', 'pierce'], ['3', 'flow'], ['1', 'guard'], ['2', 'pierce']]) {
      await page.keyboard.press(key);
      await page.waitForFunction(p => window.__full.game.swordArts.intent.path === p, path);
    }
    await page.waitForFunction(() => document.querySelector('.cswordstatus>span').textContent === '惊雷贯日');
    checks.push('desktop settings default to sword selection; selection preserves intent, closes cleanly and keyboard shortcuts update compact status');
    await page.locator('#c').focus();
    // The story starts with the sword sheathed; test cuts after the authored draw animation.
    await page.keyboard.press('f');
    await page.waitForFunction(() => window.__full.game.player.drawn && window.__full.game.player.state === 'loco');
    await page.keyboard.down('j');
    await page.waitForFunction(() => window.__full.game.player.clip === 'attack1');
    await page.locator('.ckeys [data-action="light"].active').waitFor();
    await page.keyboard.up('j');
    await page.waitForFunction(() => window.__full.game.player.state === 'loco');
    await page.keyboard.down('j');
    await page.waitForFunction(() => window.__full.game.player.state === 'charge');
    await page.waitForFunction(() => window.__full.game.player.chargeT > .8);
    assert.match(await page.locator('.cstance').innerText(), /蓄势已满/);
    await page.screenshot({ path: '../previews/七星剑境-蓄势反馈.png' });
    await page.keyboard.up('j');
    await page.waitForFunction(() => window.__full.game.player.clip === 'heavy');
    await page.waitForFunction(() => window.__full.game.player.state === 'loco');
    await page.keyboard.press('Space');
    await page.locator('.ckeys [data-action="dodge"].active').waitFor();
    await page.screenshot({ path: '../previews/七星剑境-身法反馈.png' });
    await page.waitForFunction(() => window.__full.game.player.state === 'loco');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => window.__full.game.paused);
    assert.equal(await page.locator('.ccombat').isVisible(), false);
    assert.equal(await page.locator('#condor>.csword').count(), 0);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !window.__full.game.paused);
    checks.push('press feedback, held-light charge, heavy release, dodge progress and pause visibility');
    await button('补气').click(); await talkRoute('aid');
    await page.locator('#c').focus(); await page.keyboard.press('q');
    await page.waitForFunction(() => window.__full.game.enemies.some(e => e.active && e.alive && e.distTo(window.__full.game.player) < 3));
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('j');
      await page.waitForTimeout(200);
      if (await page.locator('.chit:not([hidden])').count()) break;
    }
    await page.locator('.chit:not([hidden])').first().waitFor();
    await page.screenshot({ path: '../previews/七星剑境-命中反馈.png' });
    checks.push('real melee contact produces a projected hit confirmation');
    await page.setViewportSize({ width: 844, height: 390 });
    await load('&touch=1'); await begin();
    await selectSword('flow');
    const light = page.locator('.tb[data-a="light"]'), dodge = page.locator('.tb[data-a="dodge"]');
    const box = await light.boundingBox();
    await page.mouse.move(box.x + box.width/2, box.y + box.height/2); await page.mouse.down();
    await page.locator('.tb[data-a="light"].charge').waitFor();
    assert.equal(await light.locator('.c-btn-label').innerText(), '松手出剑');
    await page.screenshot({ path: '../previews/七星剑境-触控蓄力.png' });
    await page.mouse.up();
    await page.waitForFunction(() => window.__full.game.player.state === 'loco');
    await dodge.click();
    await page.locator('.tb[data-a="dodge"].recovering').waitFor();
    assert.equal(await dodge.locator('.c-btn-label').innerText(), '收势中');
    await page.screenshot({ path: '../previews/七星剑境-触控身法.png' });
    await page.waitForFunction(() => window.__full.game.player.state === 'loco');
    assert.equal(await dodge.locator('.c-btn-label').innerText(), '闪避');
    assert.equal(await page.locator('.ckeys').isVisible(), false);
    assert.equal(await page.locator('#condor>.csword').count(), 0);
    checks.push('touch hold/release, charging arc, dodge recovery arc and uncluttered layout');
  } else {
  if (!regressionsOnly) {
  await load('');
  assert.equal(await page.locator('.cverify').count(), 0);
  await page.screenshot({ path: '../previews/七星剑境-新版首页.png' });
  await begin();
  assert.equal((await state()).stage, 'meeting');
  await page.screenshot({ path: '../previews/七星剑境-新版实机.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '../previews/七星剑境-竖屏布局.png' });
  checks.push('normal release has no QA controls; title, guide and portrait layout render');
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await load('&verify=1'); await begin();
  await page.keyboard.press('z'); await page.locator('.cmanual:not([hidden])').waitFor();
  assert.equal((await state()).modal, true);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.__full.game.paused);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !window.__full.game.paused);
  checks.push('manual opens and closes; pause and resume restore play');
  await button('损失气血').click();
  for (const [path, art, seals] of [['guard','回风剑围',1],['pierce','惊雷贯日',2],['flow','流云三叠',0]]) {
    await selectSword(path);
    await button('补至三星').click();
    if (path === 'flow') await button('定格下一招 / 继续').click();
    await castSword();
    await page.waitForFunction(name => window.__full.game.swordArts.lastCast?.name === name, art);
    if (path === 'flow') {
      await page.waitForFunction(() => window.__app.time.frozen);
      await page.screenshot({ path: '../previews/七星剑境-三路共鸣验收.png' });
      await button('定格下一招 / 继续').click();
    }
    await page.waitForFunction(() => window.__full.game.player.state === 'loco');
    assert.equal((await state()).seals.length, seals);
    if (path === 'guard') assert.equal((await state()).hp, 106);
  }
  assert.equal((await state()).cast.union, true);
  assert.equal((await state()).cast.projectiles, 3);
  checks.push('three real empowered casts heal, pierce and fan; third path forms union and clears seals');

  for (const route of ['aid', 'pursue']) {
    if (route === 'pursue') { await load('&verify=1'); await begin(); }
    await button('补气').click(); await talkRoute(route);
    assert.equal((await state()).enemies, route === 'aid' ? 2 : 3);
    if (route === 'aid') {
      await selectSword('guard');
      await button('补至三星').click(); await castSword();
      await page.waitForFunction(() => window.__full.game.swordArts.lastCast?.name === '回风剑围');
      await page.waitForFunction(() => window.__full.game.player.state === 'loco');
      assert.equal((await state()).seals.length, 1);
      await button('补至三星').click(); await button('模拟战败').click();
      await page.waitForFunction(() => window.__full.game.state === 'defeat');
      assert.equal((await state()).stars, 0); assert.equal((await state()).seals.length, 0);
      await page.locator('#c').focus();
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => window.__full.game.state === 'playing' && window.__full.game.director.pending.length === 0);
      assert.equal((await state()).stage, 'ambush');
      checks.push('death clears intent and seals; retry resumes the same story encounter');
    }
    await clearTo('evidence');
    await page.locator('.cresult:not([hidden])').waitFor();
    assert.match(await page.locator('.cguide').innerText(), /密令/);
    await button('到目标附近').click(); await page.keyboard.press('x');
    await button('继续').click(); await button('继续前行').click();
    await page.waitForFunction(() => window.__full.game.director.pending.length === 0 && window.__full.game.enemies.some(e => e.active && e.alive));
    await clearTo('return');
    await button('到目标附近').click(); await page.keyboard.press('x');
    await button('继续').click(); await button('继续').click(); await button('继续前行').click();
    await page.waitForFunction(() => window.__full.game.director.pending.length === 0 && window.__full.game.enemies.some(e => e.active && e.alive));
    await clearTo('ending');
    if (route === 'aid') {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(2100);
      assert.equal((await state()).modal, false, 'ending dialogue must wait while paused');
      await page.keyboard.press('Escape');
    }
    await button('继续').click(); await button('继续').click();
    await page.getByRole('button', { name: /^留在牛家村/ }).click();
    assert.equal((await state()).stage, 'complete');
    checks.push(`${route}: keyboard route choice, correct enemy count, evidence, return, boss and free-roam ending complete`);
  }
  if (!regressionsOnly) {
  await page.setViewportSize({ width: 844, height: 390 });
  await load('&touch=1'); await begin();
  await page.screenshot({ path: '../previews/七星剑境-横屏触控.png' });
  assert.ok(await page.locator('.wx.touch').count());
  assert.equal(await page.locator('.csword').isVisible(), false, 'touch play must leave the scene clear');
  assert.equal(await page.locator('#condor>.csword').count(), 0);
  await button('设置').click();
  await page.getByRole('dialog', { name: '江湖设置' }).waitFor();
  assert.equal(await page.locator('.cssettings .csword').isVisible(), true);
  assert.equal(await button('剑境选择').getAttribute('aria-pressed'), 'true');
  for (const path of ['guard', 'flow', 'pierce']) {
    await page.locator(`button[data-path="${path}"]`).click();
    assert.equal(await page.locator(`button[data-path="${path}"]`).getAttribute('aria-pressed'), 'true');
  }
  await page.screenshot({ path: '../previews/七星剑境-触控设置.png' });
  await button('声音设置').click();
  assert.equal(await page.getByRole('slider', { name: '总音量', exact: true }).isVisible(), true);
  await button('剑境选择').click();
  await button('返回江湖').click();
  assert.equal((await state()).modal, false);
  assert.equal(await page.locator('.csword').isVisible(), false);
  checks.push('touch play hides sword panel; settings switch all paths and audio tabs, then restore play');
  }
  }
  assert.deepEqual(errors, []);
  writeFileSync(`../previews/experience-${polishOnly ? 'polish' : regressionsOnly ? 'regressions' : 'verification'}.json`, JSON.stringify({ checks, errors }, null, 2));
  console.log(JSON.stringify({ checks, errors }, null, 2));
} catch (error) {
  await page.screenshot({ path: '../previews/experience-failure.png' }).catch(() => {});
  console.error(error);
  console.error(JSON.stringify(await state().catch(() => ({}))));
  console.error(errors);
  process.exitCode = 1;
} finally { await browser.close(); }
