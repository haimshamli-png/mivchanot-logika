const assert = require('assert');

const {
  CONTRACT_DEFS,
  evaluateContracts,
  mergeContracts,
  countContracts,
  STAMP_MILESTONE,
  STAMP_RANKS,
  milestonesReached,
  milestonesCrossed,
  rankFor
} = require('../contracts.js');

assert.deepStrictEqual(
  CONTRACT_DEFS.map((c) => c.id),
  ['optimal', 'noUndo', 'clean'],
  'contracts should stay in stable display order'
);

assert.deepStrictEqual(
  evaluateContracts(
    { moves: 12, undoCount: 0, violationCount: 0 },
    { optimalMoves: 12 }
  ),
  { optimal: true, noUndo: true, clean: true },
  'perfect run should earn every contract'
);

assert.deepStrictEqual(
  evaluateContracts(
    { moves: 13, undoCount: 1, violationCount: 2 },
    { optimalMoves: 12 }
  ),
  { optimal: false, noUndo: false, clean: false },
  'non-optimal run with undo and rule breaks should miss every contract'
);

assert.deepStrictEqual(
  evaluateContracts(
    { moves: 12, undoCount: 0, violationCount: 0, hintUsed: true },
    { optimalMoves: 12 }
  ),
  { optimal: false, noUndo: true, clean: true },
  'a hinted run keeps clean/no-undo stamps but forfeits optimal'
);

assert.deepStrictEqual(
  mergeContracts(
    { optimal: true, noUndo: false },
    { optimal: false, noUndo: true, clean: true }
  ),
  { optimal: true, noUndo: true, clean: true },
  'new solve should add contracts without removing previous achievements'
);

assert.strictEqual(
  countContracts({ optimal: true, noUndo: false, clean: true }),
  2,
  'countContracts should count only earned contracts'
);

// Stamp milestones: a reward every 25 stamps.
assert.strictEqual(STAMP_MILESTONE, 25, 'reward every 25 stamps');
assert.strictEqual(STAMP_RANKS.length * STAMP_MILESTONE, 300, 'ranks cover the 318 stamps on the visible route');
assert.strictEqual(milestonesReached(0), 0, 'no stamps, no milestone');
assert.strictEqual(milestonesReached(24), 0, '24 stamps is still short of the first reward');
assert.strictEqual(milestonesReached(25), 1, '25 stamps reaches the first reward');
assert.strictEqual(milestonesReached(74), 2, '74 stamps has reached two rewards');
assert.strictEqual(milestonesCrossed(24, 26), 1, 'crossing 25 grants one reward');
assert.strictEqual(milestonesCrossed(26, 27), 0, 'a step inside a band grants nothing');
assert.strictEqual(milestonesCrossed(49, 75), 2, 'a jump over two lines grants two');
assert.strictEqual(milestonesCrossed(30, 20), 0, 'losing stamps never yields a negative reward');
assert.deepStrictEqual(rankFor(0), { reached: 0, title: null, nextAt: 25, remaining: 25, maxed: false }, 'rank before the first reward');
assert.deepStrictEqual(rankFor(27), { reached: 1, title: STAMP_RANKS[0], nextAt: 50, remaining: 23, maxed: false }, 'rank after the first reward');
assert.strictEqual(rankFor(318).title, STAMP_RANKS[STAMP_RANKS.length - 1], 'the final rank caps at the last title');
assert.strictEqual(rankFor(318).maxed, true, 'all rewards collected at the route maximum');

console.log('contract tests passed');
