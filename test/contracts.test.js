const assert = require('assert');

const {
  CONTRACT_DEFS,
  evaluateContracts,
  mergeContracts,
  countContracts
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

console.log('contract tests passed');
