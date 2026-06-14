const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');

function loadScript(file, suffix = '') {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const context = { window: {} };
  vm.createContext(context);
  return vm.runInContext(source + suffix, context, { filename: file });
}

const worlds = loadScript('levels.js', '; WORLDS;');
const lockedWorld = worlds.find(w => w.id === 4);
const pigmentWorld = worlds.find(w => w.id === 8);

assert(lockedWorld, 'locked tube world should exist');
assert(pigmentWorld, 'pigment world should exist');

const emptyLockedLevels = lockedWorld.levels
  .map((level, index) => ({ level, index }))
  .filter(({ level }) => (level.locks || []).some((lock) =>
    level.initial[lock.tubeIndex].length === 0 &&
    level.target[lock.tubeIndex].length === 0
  ));

assert(
  emptyLockedLevels.length <= 3,
  `locked world should use empty locked buffer levels at most 3 times; found levels ${emptyLockedLevels.map(({ index }) => index + 1).join(', ')}`
);

assert(
  pigmentWorld.levels[5].optimalMoves >= 11,
  `pigment world level 6 should not be a quick intro puzzle; found ${pigmentWorld.levels[5].optimalMoves} optimal moves`
);

console.log('level quality tests passed');
