// BFS verification for World 6 (מבחנות שיפט): every declared optimalMoves must
// be the true shortest solution under the real shift rules — forward shift
// (R→G→B→Y→R) and reverse shift (R→Y→B→G→R), joker immune to both. This is the
// independent check guarding the W6 engine + level data.
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
const shiftWorld = worlds.find(w => w.id === 6);
assert(shiftWorld, 'shift world (id 6) should exist');

const SHIFT_CYCLE = { R: 'G', G: 'B', B: 'Y', Y: 'R' };
const SHIFT_CYCLE_BACK = { R: 'Y', Y: 'B', B: 'G', G: 'R' };

function key(tubes) { return JSON.stringify(tubes); }
function isWin(tubes, target) { return key(tubes) === key(target); }
function cloneTubes(tubes) { return tubes.map(t => [...t]); }

function shifted(level, ball, to) {
  if (ball === 'J') return ball;
  if ((level.shifts || []).includes(to)) return SHIFT_CYCLE[ball] || ball;
  if ((level.shiftsBack || []).includes(to)) return SHIFT_CYCLE_BACK[ball] || ball;
  return ball;
}

function nextStates(level, tubes) {
  const states = [];
  for (let from = 0; from < tubes.length; from++) {
    if (tubes[from].length === 0) continue;
    const moving = tubes[from][tubes[from].length - 1];
    for (let to = 0; to < tubes.length; to++) {
      if (from === to) continue;
      const effective = shifted(level, moving, to);
      const dest = tubes[to];
      const destTop = dest.length ? dest[dest.length - 1] : null;
      const wouldStack = destTop === null || destTop === effective
        || destTop === 'J' || effective === 'J';
      if (dest.length < level.capacities[to] && wouldStack) {
        const next = cloneTubes(tubes);
        next[from].pop();
        next[to].push(effective);
        states.push(next);
      }
    }
  }
  return states;
}

function shortest(level) {
  const seen = new Set([key(level.initial)]);
  const queue = [{ tubes: cloneTubes(level.initial), moves: 0 }];
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i];
    if (isWin(current.tubes, level.target)) return current.moves;
    for (const next of nextStates(level, current.tubes)) {
      const k = key(next);
      if (seen.has(k)) continue;
      seen.add(k);
      queue.push({ tubes: next, moves: current.moves + 1 });
    }
  }
  return null;
}

// Sanity-check the reverse cycle is the exact inverse of the forward cycle.
for (const c of ['R', 'G', 'B', 'Y']) {
  assert.strictEqual(SHIFT_CYCLE_BACK[SHIFT_CYCLE[c]], c,
    `reverse shift must invert forward shift for ${c}`);
}

const actuals = [];
shiftWorld.levels.forEach((level, index) => {
  const actual = shortest(level);
  actuals.push(actual);
  assert.strictEqual(
    actual,
    level.optimalMoves,
    `world 6 level ${index + 1} should have BFS-verified optimalMoves; actuals=${actuals.join(',')}`
  );
});

console.log('world 6 (shift) BFS tests passed');
