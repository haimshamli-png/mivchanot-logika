const assert = require('assert');
const { SERIAL_SEASONS, checkContinuity, daysBetween, seasonProgress } = require('../serial.js');

assert.strictEqual(daysBetween('2026-09-13', '2026-09-15'), 2, 'daysBetween counts calendar days');
assert.strictEqual(daysBetween('2026-12-31', '2027-01-01'), 1, 'daysBetween crosses years');

const season = {
  id: 's',
  episodes: [
    { level: { initial: [['R'],['G']], target: [['R','G'],[]] } },
    { level: { initial: [['R','G'],[],[]], target: [[],['R'],['G']] } },
    { level: { initial: [[],['R'],['G']], target: [['R','G'],[],[]] } }
  ]
};
assert.deepStrictEqual(checkContinuity(season), [], 'a valid chain has no continuity problems');
const broken = { id: 'b', episodes: [season.episodes[0], { level: { initial: [['G','R'],[],[]], target: [[],[],[]] } }] };
assert.strictEqual(checkContinuity(broken).length, 1, 'a mismatched tube is reported');

// Progress rules: one episode per day, in order.
const p0 = seasonProgress(season, null, '2026-09-13');
assert.strictEqual(p0.currentIndex, 0, 'a fresh season starts at episode 1');
assert.strictEqual(p0.isPlayable(1), false, 'episode 2 is locked on day one');
const p1 = seasonProgress(season, { seasonId: 's', startKey: '2026-09-13', solved: { '0': { moves: 1, stars: 3 } } }, '2026-09-13');
assert.strictEqual(p1.waitingForTomorrow, true, 'after solving today, the next episode waits for tomorrow');
assert.strictEqual(p1.isPlayable(1), false);
const p2 = seasonProgress(season, { seasonId: 's', startKey: '2026-09-13', solved: { '0': { moves: 1, stars: 3 } } }, '2026-09-14');
assert.strictEqual(p2.isPlayable(1), true, 'the next day unlocks episode 2');
assert.strictEqual(p2.currentIndex, 1);
const p3 = seasonProgress(season, { seasonId: 's', startKey: '2026-09-13', solved: { '0': {}, '1': {}, '2': {} } }, '2026-09-20');
assert.strictEqual(p3.complete, true, 'all episodes solved = season complete');

// Shipped seasons must be valid chains.
SERIAL_SEASONS.forEach(s => {
  assert.strictEqual(s.episodes.length, 7, `${s.id}: a season has seven episodes`);
  assert.deepStrictEqual(checkContinuity(s), [], `${s.id}: continuity problems ${JSON.stringify(checkContinuity(s))}`);
});

console.log('serial tests passed');
