const assert = require('assert');

const {
  DAILY_MODIFIERS,
  buildDailyPool,
  getDateKey,
  pickDailyChallenge
} = require('../daily-challenge.js');

const worlds = [
  {
    id: 1,
    levels: [
      { optimalMoves: 2 },
      { optimalMoves: 8 },
      { optimalMoves: 12 }
    ]
  },
  {
    id: 2,
    levels: [
      { optimalMoves: 20 }
    ]
  },
  {
    id: 3,
    levels: [
      { optimalMoves: 7 },
      { optimalMoves: 18 }
    ]
  }
];

assert.strictEqual(
  getDateKey(new Date('2026-06-16T10:30:00')),
  '2026-06-16',
  'date key should use the calendar day'
);

assert.deepStrictEqual(
  buildDailyPool(worlds, { hiddenWorldIds: [2], minOptimalMoves: 8 }).map((entry) => ({
    worldId: entry.worldId,
    levelIndex: entry.levelIndex,
    optimalMoves: entry.level.optimalMoves
  })),
  [
    { worldId: 1, levelIndex: 1, optimalMoves: 8 },
    { worldId: 1, levelIndex: 2, optimalMoves: 12 },
    { worldId: 3, levelIndex: 1, optimalMoves: 18 }
  ],
  'daily pool should skip hidden worlds and gentle intro levels'
);

const firstPick = pickDailyChallenge(worlds, new Date('2026-06-16T10:30:00'), {
  hiddenWorldIds: [2],
  minOptimalMoves: 8
});
const secondPick = pickDailyChallenge(worlds, new Date('2026-06-16T22:00:00'), {
  hiddenWorldIds: [2],
  minOptimalMoves: 8
});

assert.deepStrictEqual(
  firstPick,
  secondPick,
  'same date should always select the same challenge'
);

assert(
  DAILY_MODIFIERS.some((modifier) => modifier.id === firstPick.modifier.id),
  'selected modifier should come from the known modifier list'
);

console.log('daily challenge tests passed');
