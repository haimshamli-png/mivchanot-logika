const assert = require('assert');

const {
  DAILY_MODIFIERS,
  buildDailyPool,
  buildShareText,
  computeStreak,
  getDateKey,
  pickDailyChallenge,
  shiftDateKey
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

assert.deepStrictEqual(
  buildDailyPool(worlds, { hiddenWorldIds: [2], minOptimalMoves: 8, allowedWorldIds: [1] })
    .map((entry) => entry.worldId),
  [1, 1],
  'daily pool should only draw from worlds the player has reached'
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

// Streaks.
assert.strictEqual(shiftDateKey('2026-03-01', -1), '2026-02-28', 'shiftDateKey should cross month boundaries');
assert.deepStrictEqual(
  computeStreak({ '2026-06-14': {}, '2026-06-15': {}, '2026-06-16': {} }, '2026-06-16'),
  { current: 3, best: 3 },
  'three consecutive days ending today is a streak of 3'
);
assert.deepStrictEqual(
  computeStreak({ '2026-06-14': {}, '2026-06-15': {} }, '2026-06-16'),
  { current: 2, best: 2 },
  'a streak ending yesterday is still alive today'
);
assert.deepStrictEqual(
  computeStreak({ '2026-06-10': {}, '2026-06-11': {}, '2026-06-12': {}, '2026-06-15': {} }, '2026-06-16'),
  { current: 1, best: 3 },
  'a gap breaks the current streak but the best run is remembered'
);
assert.deepStrictEqual(computeStreak({}, '2026-06-16'), { current: 0, best: 0 }, 'no history means no streak');

// Share text.
const share = buildShareText(
  { key: '2026-06-16', level: { optimalMoves: 12 }, modifier: DAILY_MODIFIERS[0] },
  { stars: 2.5, bestMoves: 14, modifierPassed: true },
  { current: 4, best: 4 }
);
assert(share.includes('2026-06-16'), 'share text names the day');
assert(share.includes('★★½'), 'share text renders half stars');
assert(share.includes('14 מהלכים'), 'share text includes the move count');
assert(share.includes('רצף 4'), 'share text includes the streak');

console.log('daily challenge tests passed');
