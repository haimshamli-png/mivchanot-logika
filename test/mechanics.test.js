// Unit tests for the solver's model of the phase-D mechanics: pipes,
// centrifuges and hardening balls. game.js mirrors these rules.
const assert = require('assert');
const { bfs, nextStates, pipeAllows, colorOf, budgetOf, sameColorStack } = require('../scripts/difficulty.js');

// ---- pipes ----------------------------------------------------------
const line = { capacities: [4,4,4], initial: [['R'],[],['R']], target: [[],[],['R','R']], pipes: [[0,1],[1,2]] };
assert.strictEqual(pipeAllows(line, 0, 1), true, 'undirected pipe works forward');
assert.strictEqual(pipeAllows(line, 1, 0), true, 'undirected pipe works backward');
assert.strictEqual(pipeAllows(line, 0, 2), false, 'no pipe = no pour');
assert.strictEqual(pipeAllows({ capacities: [4,4] }, 0, 1), true, 'levels without pipes allow every pair');
const r1 = bfs(line);
assert.strictEqual(r1.optimalMoves, 2, 'the ball must hop through the middle tube');
const oneWay = { capacities: [4,4], initial: [['R'],[]], target: [[],['R']], oneWay: [[1,0]] };
assert.strictEqual(bfs(oneWay), null, 'a one-way pipe in the wrong direction makes the level unsolvable');

// ---- centrifuge -----------------------------------------------------
const spin = { capacities: [3,4,4], initial: [['G','R'],['R'],['G']], target: [['R','R'],[],['G','G']], centrifuges: [0] };
const r2 = bfs(spin);
assert.strictEqual(r2.optimalMoves, 2, 'fill to dig: adding a red flips the tube and surfaces the green');
const afterFill = nextStates(spin, spin.initial, 0).find(s => s.move.from === 1 && s.move.to === 0);
assert.deepStrictEqual(afterFill.tubes[0], ['R','R','G'], 'a full centrifuge reverses its contents');

// ---- hardening balls ------------------------------------------------
assert.strictEqual(colorOf('R2'), 'R');
assert.strictEqual(budgetOf('R2'), 2);
assert.strictEqual(budgetOf('R'), Infinity);
assert.strictEqual(sameColorStack(['R0','G'], ['R','G']), true, 'a hardened ball still counts for its colour');
const hard = { capacities: [4,4,4], initial: [['G','R1'],['R','G'],[]], target: [['G','G'],['R','R'],[]] };
const r3 = bfs(hard);
assert.strictEqual(r3.optimalMoves, 3, 'the budget-1 red can only move once, straight home');
const spent = nextStates(hard, hard.initial, 0).find(s => s.move.from === 0 && s.move.to === 2);
assert.deepStrictEqual(spent.tubes[2], ['R0'], 'moving spends one budget point');
assert.strictEqual(
  nextStates(hard, spent.tubes, 1).some(s => s.move.from === 2),
  false,
  'a hardened ball can never be moved again'
);

console.log('mechanics tests passed');
