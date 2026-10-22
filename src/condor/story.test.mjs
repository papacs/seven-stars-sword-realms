import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CondorQuest } from './story.js';

for (const route of ['aid', 'pursue']) test(`${route}: chapter reaches its ending in order`, () => {
  const q = new CondorQuest();
  assert.equal(q.choose(route), true);
  assert.equal(q.route, route);
  assert.equal(q.clear(1), true);
  assert.equal(q.inspect(), true);
  assert.equal(q.clear(2), true);
  assert.equal(q.confront(), true);
  assert.equal(q.clear(3), true);
  assert.equal(q.finish(), true);
  assert.equal(q.stage, 'complete');
});
test('out-of-order actions and duplicate wave events cannot skip story beats', () => {
  const q = new CondorQuest();
  assert.equal(q.clear(1), false);
  assert.equal(q.inspect(), false);
  assert.equal(q.choose('invalid'), false);
  q.choose('aid');
  assert.equal(q.choose('pursue'), false);
  assert.equal(q.clear(2), false);
  q.clear(1);
  assert.equal(q.clear(1), false);
  assert.equal(q.confront(), false);
  assert.equal(q.stage, 'evidence');
});
