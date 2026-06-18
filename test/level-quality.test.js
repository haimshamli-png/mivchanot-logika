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
const valveWorld = worlds.find(w => w.id === 9);
const portalWorld = worlds.find(w => w.id === 10);
const gameSource = fs.readFileSync(path.join(root, 'game.js'), 'utf8');
const hiddenWorldMatch = gameSource.match(/const HIDDEN_WORLD_IDS = \[([^\]]+)\]/);
const hiddenWorldIds = hiddenWorldMatch
  ? hiddenWorldMatch[1].split(',').map(id => Number(id.trim())).filter(Number.isFinite)
  : [];

assert(lockedWorld, 'locked tube world should exist');
assert(pigmentWorld, 'pigment world should exist');
assert(valveWorld, 'valve world should remain available as side content and mechanic source material');
assert(portalWorld, 'portal world should exist');

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

assert(
  hiddenWorldIds.includes(9),
  'valve world should be hidden from the main progression route'
);

const visibleBeforePortalsMaxStars = worlds
  .filter(world => !hiddenWorldIds.includes(world.id) && world.id < portalWorld.id)
  .reduce((sum, world) => sum + world.levels.length * 3, 0);

assert(
  visibleBeforePortalsMaxStars >= portalWorld.unlockStars,
  `portal world should be unlockable without valve-world stars; visible pre-portal max ${visibleBeforePortalsMaxStars}, unlock ${portalWorld.unlockStars}`
);

console.log('level quality tests passed');
