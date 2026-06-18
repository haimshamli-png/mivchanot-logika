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
assert.strictEqual(portalWorld.levels.length, 10, 'portal world should have a 10-level first arc');
assert(
  portalWorld.levels.every(level => (level.portals || []).length > 0),
  'every portal-world level should use at least one portal pair'
);
assert(
  portalWorld.levels.some(level => (level.portals || []).length >= 2),
  'portal world should introduce routing across two portal pairs'
);
assert(
  portalWorld.levels.slice(5).some(level => (level.shifts || []).length || (level.shiftsBack || []).length),
  'portal world back half should combine portals with shift routing'
);
assert(
  portalWorld.levels.slice(5).some(level => (level.blenders || []).length),
  'portal world back half should combine portals with pigment recipes'
);

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

console.log('world 10 (portals) BFS tests passed');
