import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAudioSession } from './session.js';
import { createDirector } from './audio.js';

function context() {
  return { state: 'suspended', resumes: 0, closes: 0,
    async resume() { this.resumes++; this.state = 'running'; },
    async suspend() { this.state = 'suspended'; },
    async close() { this.closes++; this.state = 'closed'; },
  };
}
test('unlocks inside the gesture before building the graph', async () => {
  const c = context(), order = [];
  c.resume = async () => { order.push('resume'); c.state = 'running'; };
  const s = createAudioSession({ createContext: () => c, build: () => { order.push('build'); return {}; }, isHidden: () => false });
  assert.equal(await s.start(), true); assert.deepEqual(order, ['resume', 'build']);
});
test('a failed graph is closed and the next gesture can retry', async () => {
  const contexts = []; let builds = 0;
  const s = createAudioSession({ createContext: () => { const c = context(); contexts.push(c); return c; },
    build: () => { if (++builds === 1) throw Error('device failed'); return {}; }, isHidden: () => false });
  assert.equal(await s.start(), false); assert.equal(contexts[0].closes, 1);
  assert.equal(await s.start(), true); assert.equal(contexts.length, 2); assert.ok(s.graph);
});
test('interrupted contexts resume without building another graph', async () => {
  const c = context(); let builds = 0;
  const s = createAudioSession({ createContext: () => c, build: () => { builds++; return {}; }, isHidden: () => false });
  await s.start(); c.state = 'interrupted'; await s.start();
  assert.equal(c.state, 'running'); assert.equal(c.resumes, 2); assert.equal(builds, 1);
});
test('a late suspend cannot leave a newly visible tab silent', async () => {
  const c = context(); let hidden = false, finishSuspend;
  const s = createAudioSession({ createContext: () => c, build: () => ({}), isHidden: () => hidden });
  await s.start();
  c.suspend = () => new Promise(resolve => { finishSuspend = () => { c.state = 'suspended'; resolve(); }; });
  hidden = true; const hiding = s.sync(); hidden = false; await s.sync();
  finishSuspend(); await hiding;
  assert.equal(c.state, 'running'); assert.equal(c.resumes, 2);
});
test('resume rejection preserves a usable graph and a later gesture recovers', async () => {
  const c = context(); let denied = true;
  c.resume = async () => { if (denied) throw Error('activation required'); c.state = 'running'; };
  const s = createAudioSession({ createContext: () => c, build: () => ({}), isHidden: () => false });
  assert.equal(await s.start(), false); assert.ok(s.graph); assert.match(s.error, /activation/);
  denied = false; assert.equal(await s.start(), true); assert.equal(s.error, null);
});
test('a closed context is replaced and disposal prevents recreation', async () => {
  let builds = 0;
  const s = createAudioSession({ createContext: () => context(), build: () => ({ id: ++builds }), isHidden: () => false });
  await s.start(); await s.ctx.close(); await s.start(); assert.equal(s.graph.id, 2);
  s.dispose(); assert.equal(await s.start(), false); assert.equal(builds, 2);
});
test('dialogue and pause suppress combat transients; restoring a wave never plays its old sting', () => {
  const calls = [];
  const E = { ctx: { currentTime: 0 }, rng: () => .5, setMuffle() {} };
  const music = { setState: name => calls.push(name), sting: name => calls.push(`sting:${name}`) };
  const d = createDirector(E, { setLevel() {} }, music, {}, { voices: false });
  d.handle('wave:start', { boss: true, silent: true });
  assert.equal(calls.includes('sting:boss'), false);
  d.handle('chapter:modal', { open: true });
  d.handle('special'); d.handle('enemy:hit', { kill: true }); d.handle('player:hurt');
  assert.equal(calls.at(-1), 'calm');
  d.handle('chapter:modal', { open: false });
  assert.equal(calls.at(-1), 'boss');
  d.handle('game:state', { state: 'paused' });
  d.handle('sword:whoosh'); // Would require real WebAudio nodes if the guard were missing.
});
test('synthetic crowd calls are opt-in and never build an unwanted voice choir', () => {
  const E = { ctx: { currentTime: 0 }, rng: () => .5 };
  const d = createDirector(E, {}, {}, {}, { voices: false });
  d.handle('crowd', { calm: 1, panic: 1, scream: 1 });
  assert.equal(d.crowd.built, false);
});
