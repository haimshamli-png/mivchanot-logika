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

const mixing = loadScript('pigment-mixing.js', '; window.PIGMENT_MIXING;');
const worlds = loadScript('levels.js', '; WORLDS;');
const pigmentWorld = worlds.find(w => w.id === 8);

function key(tubes) {
  return JSON.stringify(tubes);
}

function isWin(tubes, target) {
  return key(tubes) === key(target);
}

function cloneTubes(tubes) {
  return tubes.map(t => [...t]);
}

function accepts(level, tubeIndex, ball) {
  const color = level.tubeColors && level.tubeColors[tubeIndex];
  return !color || ball === color || ball === 'J';
}

function isLocked(level, tubeIndex, moves) {
  return (level.locks || []).some(lock => lock.tubeIndex === tubeIndex && moves < lock.unlockAt);
}

function nextStates(level, tubes, moves) {
  const states = [];
  for (let from = 0; from < tubes.length; from++) {
    if (tubes[from].length === 0) continue;
    if (isLocked(level, from, moves)) continue;
    const moving = tubes[from][tubes[from].length - 1];
    for (let to = 0; to < tubes.length; to++) {
      if (from === to) continue;
      if (isLocked(level, to, moves)) continue;
      if (!accepts(level, to, moving)) continue;
      const dest = tubes[to];
      const destTop = dest.length ? dest[dest.length - 1] : null;
      const isBlender = (level.blenders || []).includes(to);
      const blend = isBlender && destTop ? mixing.mixPair(destTop, moving) : null;
      if (blend) {
        const next = cloneTubes(tubes);
        next[from].pop();
        next[to].pop();
        next[to].push(blend);
        states.push(next);
        continue;
      }
      const wouldStack = destTop === null || destTop === moving || destTop === 'J' || moving === 'J';
      if (dest.length < level.capacities[to] && wouldStack) {
        const next = cloneTubes(tubes);
        next[from].pop();
        next[to].push(moving);
        states.push(next);
      }
    }
  }
  return states;
}

function shortest(level) {
  // Lock status is time-dependent, so the same tube configuration at a
  // different moveCount is a DIFFERENT state. Key on (tubes, clampedMoves),
  // clamping moveCount to the last unlock (beyond it locks never change).
  // Without this, solutions that spend a move to advance the lock counter are
  // wrongly pruned and a solvable locked level can look unsolvable.
  const maxUnlock = (level.locks || []).reduce((m, L) => Math.max(m, L.unlockAt), 0);
  const stateKey = (tubes, moves) => key(tubes) + '|' + Math.min(moves, maxUnlock);
  const seen = new Set([stateKey(level.initial, 0)]);
  const queue = [{ tubes: cloneTubes(level.initial), moves: 0 }];
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i];
    if (isWin(current.tubes, level.target)) return current.moves;
    for (const next of nextStates(level, current.tubes, current.moves)) {
      const k = stateKey(next, current.moves + 1);
      if (seen.has(k)) continue;
      seen.add(k);
      queue.push({ tubes: next, moves: current.moves + 1 });
    }
  }
  return null;
}

assert(pigmentWorld, 'pigment world should exist');
const actuals = [];
pigmentWorld.levels.forEach((level, index) => {
  const actual = shortest(level);
  actuals.push(actual);
  assert.strictEqual(
    actual,
    level.optimalMoves,
    `world 8 level ${index + 1} should have BFS-verified optimalMoves; actuals=${actuals.join(',')}`
  );
});

console.log('pigment world BFS tests passed');
