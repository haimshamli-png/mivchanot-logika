(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SERIAL = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  // =====================================================================
  // "ניסוי השבוע" — the weekly serial.
  //
  // A season is seven chained episodes: the target of episode k is the
  // starting board of episode k+1 (new tubes may be appended, and one new
  // element arrives each day). One episode unlocks per calendar day from the
  // day the player starts the season, so the week has a cliffhanger every
  // evening. "Previously on" replays the optimal solution of the episode
  // before, on the real board.
  //
  // Season data lives in SERIAL_SEASONS below; solutions for the replay are
  // generated into level-meta.js by scripts/annotate-levels.js.
  // =====================================================================

  const SERIAL_SEASONS = [];

  function getDateKey(date = new Date()) {
    const d = date instanceof Date ? date : new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function daysBetween(fromKey, toKey) {
    const [y1, m1, d1] = fromKey.split('-').map(Number);
    const [y2, m2, d2] = toKey.split('-').map(Number);
    const a = Date.UTC(y1, m1 - 1, d1), b = Date.UTC(y2, m2 - 1, d2);
    return Math.round((b - a) / 86400000);
  }

  // Continuity check used by tests and by the level designer: episode k+1
  // must start where episode k ended on every shared tube.
  function checkContinuity(season) {
    const problems = [];
    for (let i = 0; i + 1 < season.episodes.length; i++) {
      const prev = season.episodes[i].level, next = season.episodes[i + 1].level;
      if (next.initial.length < prev.target.length) {
        problems.push({ episode: i + 2, problem: 'fewer tubes than the previous target' });
        continue;
      }
      prev.target.forEach((stack, t) => {
        const a = stack.map(b => b[0]).join(''), b = next.initial[t].map(x => x[0]).join('');
        if (a !== b) problems.push({ episode: i + 2, tube: t, problem: `expected ${a || '∅'} from the previous target, got ${b || '∅'}` });
      });
    }
    return problems;
  }

  // Progress record: { seasonId, startKey, solved: { '0': { moves, stars }, ... } }
  function seasonProgress(season, record, todayKey) {
    const rec = record && record.seasonId === season.id ? record : null;
    const solved = (rec && rec.solved) || {};
    const started = !!(rec && rec.startKey);
    const dayIndex = started ? Math.max(0, daysBetween(rec.startKey, todayKey)) : 0;
    const total = season.episodes.length;
    let firstUnsolved = 0;
    while (firstUnsolved < total && solved[String(firstUnsolved)]) firstUnsolved++;
    // Episode i is playable when every earlier episode is solved and its day has come.
    const availableIndex = Math.min(firstUnsolved, dayIndex, total - 1);
    const complete = firstUnsolved >= total;
    const waitingForTomorrow = !complete && firstUnsolved > dayIndex;
    return {
      started, dayIndex, solvedCount: Object.keys(solved).length, total, complete,
      currentIndex: complete ? total - 1 : availableIndex,
      waitingForTomorrow,
      isPlayable: (i) => i < total && (i <= dayIndex) && (i === 0 || !!solved[String(i - 1)]),
      isSolved: (i) => !!solved[String(i)]
    };
  }

  return { SERIAL_SEASONS, checkContinuity, daysBetween, getDateKey, seasonProgress };
});
