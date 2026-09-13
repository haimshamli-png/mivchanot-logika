const assert = require('assert');
const { makeRng, bandFor, generateLevel, nextLevel, solve, boardScore, runScore } = require('../ta-generator.js');

// Solver sanity: a known World 1 board.
assert.strictEqual(
  solve([['R','G'],['G','R'],['B','B'],[]], [['R','R'],['G','G'],['B','B'],[]], [4,4,4,4], 10000),
  3,
  'plain-rule solver should find the 3-move solution'
);
assert.strictEqual(
  solve([['R','R'],['G','G'],[]], [['R','R'],['G','G'],[]], [4,4,4], 100),
  0,
  'a solved board costs zero moves'
);

// Generation is deterministic per seed and always verified.
const rngA = makeRng(1234);
const rngB = makeRng(1234);
for (let round = 0; round < 16; round++) {
  const band = bandFor(round);
  const a = generateLevel(rngA, band);
  const b = generateLevel(rngB, band);
  assert(a, `round ${round} should generate a board`);
  assert.deepStrictEqual(a, b, 'same seed should give the same board');
  assert(a.optimalMoves >= band.minOpt && a.optimalMoves <= band.maxOpt,
    `round ${round}: optimalMoves ${a.optimalMoves} should be within [${band.minOpt}, ${band.maxOpt}]`);
  assert.strictEqual(a.capacities.length, a.initial.length, 'capacities match tube count');
  assert.strictEqual(a.initial.length, a.target.length, 'initial and target have the same tube count');
  const ballsIn = a.initial.flat().sort().join('');
  const ballsOut = a.target.flat().sort().join('');
  assert.strictEqual(ballsIn, ballsOut, 'balls are conserved between initial and target');
  assert.notStrictEqual(JSON.stringify(a.initial), JSON.stringify(a.target), 'board must not start solved');
  assert.strictEqual(
    solve(a.initial, a.target, a.capacities, 60000),
    a.optimalMoves,
    'declared optimalMoves must match the solver'
  );
}

// Bands escalate with the round.
assert(bandFor(0).colors < bandFor(14).colors, 'later rounds use more colours');
assert(nextLevel(makeRng(7), 0), 'nextLevel always returns a board');

// Accuracy scoring: up to 100 per board, scaled by optimal / moves.
assert.strictEqual(boardScore(6, 6), 100, 'an optimal solve is worth 100');
assert.strictEqual(boardScore(8, 6), 75, 'two extra moves on a 6-move board is 75');
assert.strictEqual(boardScore(4, 6), 100, 'beating the declared optimum cannot exceed 100');
assert.strictEqual(boardScore(0, 6), 0, 'no moves means no points');
assert.deepStrictEqual(runScore([]), { solved: 0, score: 0, precision: 0 }, 'an empty run scores zero');
const run = runScore([{ moves: 6, optimalMoves: 6 }, { moves: 8, optimalMoves: 6 }, { moves: 5, optimalMoves: 4 }]);
assert.strictEqual(run.solved, 3, 'runScore counts boards');
assert.strictEqual(run.score, 100 + 75 + 80, 'runScore sums board points');
assert.strictEqual(run.precision, run.score / 300, 'precision is points over the maximum');
assert(runScore([{ moves: 6, optimalMoves: 6 }, { moves: 6, optimalMoves: 6 }]).score
  > runScore([{ moves: 12, optimalMoves: 6 }, { moves: 12, optimalMoves: 6 }]).score,
  'sloppy pouring costs points at the same board count');

console.log('time attack generator tests passed');
