// Real UI interactions with visible local QA travel controls; evaluation only reads game state.
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? ['C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/chromium'].find(existsSync),
  headless: true, args: ['--enable-gpu', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(30000);
const errors = [], checks = [];
page.on('pageerror', e => errors.push(e.stack));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
mkdirSync('../previews', { recursive: true });
const button = name => page.getByRole('button', { name: new RegExp(`^${name}`) });
const state = () => page.evaluate(() => {
  const g = window.__full.game, m = g.chapter.mystery;
  return { stage: g.chapter.quest.stage, modal: g.chapter.modal, clues: [...m.discoveries], rings: m.bellRings,
    complete: m.complete, stars: g.swordArts.intent.stars, focus: g.player.focus };
});
const revealedStars = () => page.evaluate(() => window.__app.scene.getObjectByName('雨夜遗痕').children.filter(o => o.isMesh && o.visible && o.material.transparent).length);
async function inspect(travel) { await button(travel).click(); await page.keyboard.press('x'); await page.locator('.cdialog:not([hidden])').waitFor(); }
async function ringTwice() { await button('轻叩铜铃').click(); await button('再叩一下').click(); }
async function finishPages() {
  while (await page.locator('.cdialog:not([hidden])').count()) {
    const next = page.locator('.cdchoices button');
    assert.equal(await next.count(), 1, 'finishPages cannot choose a branch'); await next.click();
  }
}
async function clearTo(stage) {
  await page.waitForFunction(() => window.__full.game.director.pending.length === 0);
  await button('清除当前敌人').click();
  await page.waitForFunction(s => window.__full.game.chapter.quest.stage === s, stage);
}
try {
  await page.goto(`${process.env.GAME_URL ?? 'http://127.0.0.1:4173/'}?q=low&verify=1&harness=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__ready && window.__full?.game, null, { timeout: 180000 });
  await page.locator('#load').waitFor({ state: 'detached' });
  assert.deepEqual(await page.evaluate(() => window.__integration.failed), []);
  await page.locator('.title .go').click();
  assert.match(await page.locator('.cdtext').innerText(), /七日前/);
  await finishPages();
  await page.waitForFunction(() => window.__full.game.camera.mode === 'follow' && window.__full.game.camera.modeT > 2.8);
  assert.equal(await page.locator('#condor>.csword').count(), 0);
  await page.screenshot({ path: '../previews/七星剑境-清爽战场.png' });
  await inspect('到铜铃附近'); await ringTwice(); await button('收手听雨').click();
  assert.deepEqual((await state()).clues, []);
  checks.push('two blind rings cannot collect an unread clue or reward');
  await inspect('到旧剑痕附近');
  assert.match(await page.locator('.cdtext').innerText(), /右偏了半寸/);
  await page.screenshot({ path: '../previews/七星剑境-村门旧痕.png' });
  await finishPages();
  await inspect('到碑阴附近');
  assert.match(await page.locator('.cdtext').innerText(), /二叩问来路，三叩莫回头/);
  await page.screenshot({ path: '../previews/七星剑境-碑阴残句.png' });
  await finishPages();
  await inspect('到铜铃附近'); await ringTwice(); await button('再叩一下').click();
  assert.match(await page.locator('.cdtext').innerText(), /第三声/);
  assert.equal((await state()).rings, 0);
  await button('收手听雨').click();
  assert.equal((await state()).clues.includes('bell'), false);
  checks.push('nearby physical clues update the book; a third bell resets without solving');
  await inspect('到铜铃附近'); await ringTwice(); await button('收手听雨').click();
  assert.equal((await state()).complete, true);
  assert.equal(await revealedStars(), 0, 'the reveal must wait until the discovery dialogue is finished');
  await page.screenshot({ path: '../previews/七星剑境-铜铃藏纸.png' });
  await finishPages();
  await page.waitForFunction(() => window.__app.scene.getObjectByName('雨夜遗痕').children.filter(o => o.isMesh && o.visible && o.material.transparent).length === 7);
  const reward = await state(); assert.equal(reward.stars, 2); assert.equal(reward.focus, 35);
  await inspect('到铜铃附近'); await finishPages();
  await page.waitForFunction(() => window.__app.scene.getObjectByName('雨夜遗痕').children.filter(o => o.isMesh && o.visible && o.material.transparent).length === 7);
  assert.equal((await state()).stars, reward.stars); assert.equal((await state()).focus, reward.focus);
  await page.keyboard.press('z'); await page.locator('.cmanual:not([hidden])').waitFor();
  assert.equal(await page.locator('.cmysteryentries article.found').count(), 3);
  await button('雨夜异闻').click();
  await page.screenshot({ path: '../previews/七星剑境-雨夜异闻.png' });
  await page.setViewportSize({ width: 844, height: 390 });
  // The local QA toolbar overlaps this short viewport; the real navigation click was checked above.
  await page.locator('.cmysterybook h2').scrollIntoViewIfNeeded();
  await page.screenshot({ path: '../previews/七星剑境-横屏异闻.png' });
  await page.keyboard.press('Escape'); await page.setViewportSize({ width: 1440, height: 900 });
  checks.push('two rings plus the stele solve the puzzle; reward occurs once and book records all clues');
  await inspect('到目标附近');
  await button('继续').click(); await button('继续').click();
  await page.getByRole('button', { name: /^先安顿伤者/ }).click();
  await clearTo('evidence');
  await inspect('到目标附近');
  assert.match(await page.locator('.cdtext').innerText(), /昨日/);
  await finishPages(); await clearTo('return');
  await inspect('到目标附近'); await finishPages(); await clearTo('ending');
  await button('继续').waitFor(); await button('继续').click();
  assert.match(await page.locator('.cdtext').innerText(), /门槛旧痕、碑上空星、铃中蜡纸/);
  await button('继续').click();
  assert.match(await page.locator('.cdspeaker').innerText(), /第七处留白/);
  await page.screenshot({ path: '../previews/七星剑境-异闻结尾.png' });
  await page.getByRole('button', { name: /^留在牛家村/ }).click();
  assert.equal((await state()).stage, 'complete');
  checks.push('all three clues survive the story and produce the hidden ending recognition');
  assert.deepEqual(errors, []);
  writeFileSync('../previews/mystery-verification.json', JSON.stringify({ checks, errors }, null, 2));
  console.log(JSON.stringify({ checks, errors }, null, 2));
} catch (error) {
  await page.screenshot({ path: '../previews/mystery-failure.png' }).catch(() => {});
  console.error(error); console.error(await state().catch(() => ({}))); console.error(errors); process.exitCode = 1;
} finally { await browser.close(); }
