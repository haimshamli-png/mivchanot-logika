const assert = require('assert');

const {
  DAILY_MODIFIERS,
  DAILY_TIERS,
  buildDailyPool,
  normalizeDayResult,
  pickDailyChallenges,
  splitPoolByTier,
  tierResult,
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

// Three tiers by composite score.
const tierWorlds = [{
  id: 1,
  levels: Array.from({ length: 9 }, (_, i) => ({ optimalMoves: 10 + i }))
}];
const scoreOf = (worldId, levelIndex) => [80, 10, 50, 20, 90, 30, 60, 70, 40][levelIndex];
const buckets = splitPoolByTier(buildDailyPool(tierWorlds), scoreOf);
assert.deepStrictEqual(buckets.easy.map(e => e.score), [10, 20, 30], 'easy bucket is the lowest third by score');
assert.deepStrictEqual(buckets.medium.map(e => e.score), [40, 50, 60], 'medium bucket is the middle third');
assert.deepStrictEqual(buckets.hard.map(e => e.score), [70, 80, 90], 'hard bucket is the top third');

const bundle = pickDailyChallenges(tierWorlds, new Date('2026-09-13T09:00:00'), { scoreOf });
assert.strictEqual(bundle.tiers.length, 3, 'a bundle carries one puzzle per tier');
assert.deepStrictEqual(bundle.tiers.map(t => t.tier), DAILY_TIERS.map(t => t.id), 'tiers come in easy → hard order');
assert(bundle.tiers[0].score < bundle.tiers[1].score && bundle.tiers[1].score < bundle.tiers[2].score,
  'the picked puzzles escalate in score across tiers');
assert(bundle.tiers.every(t => t.modifier.id === bundle.modifier.id), 'all tiers share the day\'s rule');
assert.deepStrictEqual(
  pickDailyChallenges(tierWorlds, new Date('2026-09-13T23:00:00'), { scoreOf }),
  bundle,
  'the same day picks the same bundle'
);
const tiny = pickDailyChallenges([{ id: 1, levels: [{ optimalMoves: 10 }] }], new Date('2026-09-13'));
assert.strictEqual(tiny.tiers.length, 3, 'a one-level pool still yields three tiers (falling back to the pool)');

// Stored day entries: legacy single-result entries become the middle tier.
const legacy = { worldId: 1, levelIndex: 2, modifierId: 'clean', stars: 3, bestMoves: 12, modifierPassed: true };
assert.deepStrictEqual(
  normalizeDayResult(legacy),
  { modifierId: 'clean', tiers: { medium: { worldId: 1, levelIndex: 2, stars: 3, bestMoves: 12, modifierPassed: true } } },
  'legacy entries are wrapped as the medium tier'
);
assert.strictEqual(tierResult(legacy, 'medium').bestMoves, 12, 'tierResult reads through a legacy entry');
assert.strictEqual(tierResult(legacy, 'hard'), null, 'missing tiers read as null');

const tieredShare = buildShareText(
  { key: '2026-09-13', tier: 'hard', tierIcon: '🔴', tierLabel: 'קשה', level: { optimalMoves: 12 }, modifier: DAILY_MODIFIERS[1] },
  { stars: 3, bestMoves: 12, modifierPassed: true },
  { current: 1, best: 1 },
  { modifierId: 'clean', tiers: { easy: { modifierPassed: true }, hard: { modifierPassed: false } } }
);
assert(tieredShare.includes('🔴 קשה'), 'share text names the tier');
assert(tieredShare.includes('🟢✓ 🟡· 🔴○'), 'share text shows the three-tier row');

console.log('daily challenge tests passed');
