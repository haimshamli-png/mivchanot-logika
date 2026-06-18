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
const valveWorld = worlds.find(w => w.id === 9);

assert(valveWorld, 'valve world (id 9) should exist');
assert.strictEqual(valveWorld.levels.length, 13, 'valve world should have 13 levels');
assert(
  valveWorld.levels.every(level => (level.valves || []).length > 0),
  'every valve-world level should use at least one valve'
);
assert(
  valveWorld.levels.some(level => (level.valves || []).some(valve => valve.mode === 'flip')),
  'valve world should include flipping valves'
);

const actuals = [];
valveWorld.levels.forEach((level, index) => {
  const result = bfs(level);
  const actual = result && result.optimalMoves;
  actuals.push(actual);
  assert.strictEqual(
    actual,
    level.optimalMoves,
    `world 9 level ${index + 1} should have BFS-verified optimalMoves; actuals=${actuals.join(',')}`
  );
});

console.log('world 9 (valves) BFS tests passed');
