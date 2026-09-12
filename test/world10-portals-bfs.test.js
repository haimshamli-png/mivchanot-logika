// BFS verification for World 10 ("מסלולי פורטל") under the chute semantics:
// pouring into a chute inserts the ball at the BOTTOM of the paired tube.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const { bfs } = require('../scripts/difficulty.js');

const root = path.resolve(__dirname, '..');

function loadScript(file, suffix = '') {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const context = { window: {} };
  vm.createContext(context);
  return vm.runInContext(source + suffix, context, { filename: file });
}

const worlds = loadScript('levels.js', '; WORLDS;');
const portalWorld = worlds.find(w => w.id === 10);

assert(portalWorld, 'portal world (id 10) should exist');
assert.strictEqual(portalWorld.levels.length, 10, 'portal world should have 10 levels');
assert(
  portalWorld.levels.every(level => (level.portals || []).some(p => (p.mode || 'bottom') === 'bottom')),
  'every portal-world level should use at least one chute'
);
assert(
  portalWorld.levels.some(level => (level.portals || []).length >= 2),
  'portal world should include a level with two chutes'
);
assert(
  portalWorld.levels.slice(5).some(level => (level.locks || []).some(L => L.until)),
  'portal world back half should combine chutes with a conditional lock'
);
assert(
  portalWorld.levels.slice(5).some(level => (level.blenders || []).length),
  'portal world back half should combine chutes with pigment recipes'
);
// The first level teaches the chute alone: one move, nothing else.
const intro = portalWorld.levels[0];
assert.strictEqual(intro.optimalMoves, 1, 'level 1 is a one-move intro');
assert(!intro.locks && !intro.blenders && !intro.shifts, 'level 1 uses the chute alone');
// Every chute starts and ends empty.
portalWorld.levels.forEach((level, index) => {
  (level.portals || []).forEach(p => {
    assert.strictEqual(level.initial[p.pair[0]].length, 0, `level ${index + 1}: chute must start empty`);
    assert.strictEqual(level.target[p.pair[0]].length, 0, `level ${index + 1}: chute must end empty`);
  });
});

const actuals = [];
portalWorld.levels.forEach((level, index) => {
  const result = bfs(level);
  const actual = result && result.optimalMoves;
  actuals.push(actual);
  assert.strictEqual(
    actual,
    level.optimalMoves,
    `world 10 level ${index + 1} should have BFS-verified optimalMoves; actuals=${actuals.join(',')}`
  );
});

console.log('world 10 (chutes) BFS tests passed');
