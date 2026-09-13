// BFS verification for the phase-D worlds: pipes (12) and centrifuge (13),
// plus structural guards that each world actually uses its mechanic.
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

function verifyWorld(world, label) {
  const actuals = [];
  world.levels.forEach((level, index) => {
    const result = bfs(level);
    const actual = result && result.optimalMoves;
    actuals.push(actual);
    assert.strictEqual(actual, level.optimalMoves,
      `${label} level ${index + 1} should have BFS-verified optimalMoves; actuals=${actuals.join(',')}`);
  });
}

const pipes = worlds.find(w => w.id === 12);
if (pipes) {
  assert.strictEqual(pipes.levels.length, 10, 'pipes world should have 10 levels');
  assert(pipes.levels.every(l => (l.pipes || []).length || (l.oneWay || []).length), 'every pipes level declares pipes');
  pipes.levels.forEach((l, i) => {
    const n = l.capacities.length;
    const edges = (l.pipes || []).length + (l.oneWay || []).length;
    assert(edges < n * (n - 1) / 2, `pipes level ${i + 1} must not be a complete graph`);
    assert.strictEqual(l.optimalMoves >= 1, true);
  });
  assert.strictEqual(pipes.levels[0].optimalMoves, 2, 'pipes intro is the two-move hop');
  verifyWorld(pipes, 'world 12 (pipes)');
}

const centrifuge = worlds.find(w => w.id === 13);
if (centrifuge) {
  assert.strictEqual(centrifuge.levels.length, 10, 'centrifuge world should have 10 levels');
  assert(centrifuge.levels.every(l => (l.centrifuges || []).length), 'every centrifuge level declares a centrifuge');
  assert.strictEqual(centrifuge.levels[0].optimalMoves, 2, 'centrifuge intro is the two-move flip');
  verifyWorld(centrifuge, 'world 13 (centrifuge)');
}

const expert = worlds.find(w => w.id === 11);
assert(expert, 'expert world exists');
verifyWorld(expert, 'world 11 (expert)');

console.log(`new worlds BFS tests passed (${[pipes && 'pipes', centrifuge && 'centrifuge', 'expert'].filter(Boolean).join(', ')})`);
