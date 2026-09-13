// Structural quality gates for the level data. These are the cheap checks
// (no BFS): route order, star gates, duplicate boards, data shape.
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
const gameSource = fs.readFileSync(path.join(root, 'game.js'), 'utf8');
const hiddenWorldMatch = gameSource.match(/const HIDDEN_WORLD_IDS = \[([^\]]*)\]/);
const hiddenWorldIds = hiddenWorldMatch
  ? hiddenWorldMatch[1].split(',').map(id => Number(id.trim())).filter(Number.isFinite)
  : [];

const visible = worlds
  .filter(w => !hiddenWorldIds.includes(w.id))
  .sort((a, b) => (a.order || a.id) - (b.order || b.id));

// ---- route shape ----------------------------------------------------
// (spread into a main-realm array: vm-realm arrays fail deepStrictEqual on prototype)
const ROUTE = [1, 3, 6, 4, 8, 10, 12, 13, 11];
const present = ROUTE.filter(id => worlds.some(w => w.id === id));
assert.deepStrictEqual(
  [...visible.map(w => w.id)],
  present,
  'visible route should be basics → joker → shift → locks → pigments → chutes → pipes → centrifuge → expert'
);
assert(worlds.every(w => Number.isInteger(w.order)), 'every world declares an explicit order');
assert(!worlds.some(w => w.id === 7), 'the retired mixer world (7) is gone from the data');
const expert = visible[visible.length - 1];
assert(expert.expert && expert.unlockContracts > 0, 'the expert route unlocks by challenge stamps');

// ---- data shape -----------------------------------------------------
for (const w of worlds) {
  w.levels.forEach((level, i) => {
    const where = `W${w.id} L${i + 1}`;
    assert(Number.isInteger(level.optimalMoves) && level.optimalMoves > 0, `${where}: optimalMoves must be a positive integer`);
    assert.strictEqual(level.capacities.length, level.initial.length, `${where}: capacities/initial length mismatch`);
    assert.strictEqual(level.capacities.length, level.target.length, `${where}: capacities/target length mismatch`);
    level.initial.forEach((t, k) => assert(t.length <= level.capacities[k], `${where}: tube ${k} overfilled initially`));
    level.target.forEach((t, k) => assert(t.length <= level.capacities[k], `${where}: tube ${k} overfilled in target`));
    assert.notStrictEqual(JSON.stringify(level.initial), JSON.stringify(level.target), `${where}: starts solved`);
    for (const p of (level.portals || [])) {
      assert(Array.isArray(p.pair) && p.pair.length === 2, `${where}: portal pair malformed`);
      assert(p.mode === 'redirect' || level.initial[p.pair[0]].length === 0, `${where}: a chute must start empty`);
      assert(p.mode === 'redirect' || level.target[p.pair[0]].length === 0, `${where}: a chute must end empty`);
    }
    for (const L of (level.locks || [])) {
      assert(L.until || Number.isInteger(L.unlockAt), `${where}: lock needs unlockAt or until`);
      if (L.until) assert(Number.isInteger(L.until.tube) && L.until.tube !== L.tubeIndex, `${where}: conditional lock needs a different key tube`);
    }
  });
}

// ---- no repeated boards on the visible route ------------------------
// Signature = the multiset of non-empty starting stacks plus the non-empty
// target stacks, so "same board plus one extra empty tube" or "same board with
// a different lock timing" counts as a repeat, while a monochrome source that
// must be converted into a different target (shift world) does not.
// A different mechanic set on the same board (e.g. the same conversion with a
// reverse shift tube and a starved buffer added) is a deliberate escalation,
// not a repeat — so capacities and mechanics are part of the fingerprint.
// Lock timings are NOT: the same board with a different lock is a repeat.
function signature(level) {
  const stacks = tubes => tubes.filter(t => t.length).map(t => t.join('')).sort().join('|');
  const mech = JSON.stringify({
    caps: level.capacities.slice().sort(),
    shifts: level.shifts || [], shiftsBack: level.shiftsBack || [],
    blenders: level.blenders || [], portals: level.portals || [],
    tubeColors: level.tubeColors || [], valves: level.valves || []
  });
  return stacks(level.initial) + ' → ' + stacks(level.target) + ' ' + mech;
}
const seen = new Map();
for (const w of visible) {
  w.levels.forEach((level, i) => {
    const sig = signature(level);
    const where = `W${w.id} L${i + 1}`;
    assert(!seen.has(sig), `${where} repeats the starting board of ${seen.get(sig)}`);
    seen.set(sig, where);
  });
}

// ---- star gates: never more than 55% of the stars available before ----
let starsBefore = 0;
for (const w of visible) {
  if (!w.expert) {
    if (starsBefore > 0) {
      const ratio = w.unlockStars / starsBefore;
      assert(ratio <= 0.55, `W${w.id} gate ${w.unlockStars} is ${(ratio * 100).toFixed(0)}% of the ${starsBefore} stars before it (max 55%)`);
      assert(ratio >= 0.30, `W${w.id} gate ${w.unlockStars} is too loose (${(ratio * 100).toFixed(0)}% of ${starsBefore})`);
    } else {
      assert.strictEqual(w.unlockStars, 0, 'the first world is open');
    }
  }
  starsBefore += w.levels.length * 3;
}

// ---- world-specific guards ------------------------------------------
const lockedWorld = worlds.find(w => w.id === 4);
const pigmentWorld = worlds.find(w => w.id === 8);
const emptyLockedLevels = lockedWorld.levels
  .map((level, index) => ({ level, index }))
  .filter(({ level }) => (level.locks || []).some((lock) =>
    !lock.until &&
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
assert(worlds.find(w => w.id === 9), 'valve world data stays available as expert-route material');

console.log('level quality tests passed');
