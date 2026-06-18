const assert = require('assert');

const {
  canUseValveAsDestination,
  canUseValveAsSource,
  initialValveStates,
  toggleValveAfterUse,
  toggleValvesAfterMove,
  valveModeForTube
} = require('../valves.js');

const level = {
  capacities: [4, 4, 4],
  valves: [
    { tubeIndex: 0, mode: 'in' },
    { tubeIndex: 1, mode: 'out' },
    { tubeIndex: 2, mode: 'flip', starts: 'in' }
  ]
};

let states = initialValveStates(level);

assert.deepStrictEqual(
  states,
  { 2: 'in' },
  'only flipping valves need mutable state'
);

assert.strictEqual(canUseValveAsSource(level, states, 0), false, 'in valve cannot be a source');
assert.strictEqual(canUseValveAsDestination(level, states, 0), true, 'in valve can be a destination');

assert.strictEqual(canUseValveAsSource(level, states, 1), true, 'out valve can be a source');
assert.strictEqual(canUseValveAsDestination(level, states, 1), false, 'out valve cannot be a destination');

assert.strictEqual(canUseValveAsSource(level, states, 2), false, 'flip valve starts as in-only');
assert.strictEqual(canUseValveAsDestination(level, states, 2), true, 'flip valve starts accepting');
assert.strictEqual(valveModeForTube(level, states, 2), 'in', 'current flip mode should be reported');

states = toggleValveAfterUse(level, states, 2);

assert.strictEqual(canUseValveAsSource(level, states, 2), true, 'flip valve toggles to out-only after use');
assert.strictEqual(canUseValveAsDestination(level, states, 2), false, 'flipped out valve stops accepting');

assert.deepStrictEqual(
  toggleValveAfterUse(level, states, 0),
  states,
  'static valves should not mutate state'
);

assert.deepStrictEqual(
  toggleValvesAfterMove(level, { 2: 'out' }, 2, 0),
  { 2: 'in' },
  'a move touching a flip valve should toggle it through the move helper'
);

console.log('valve tests passed');
