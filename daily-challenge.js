(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.DAILY_CHALLENGE = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const DAILY_MODIFIERS = [
    {
      id: 'noUndo',
      icon: '↯',
      label: 'בלי חזרה',
      description: 'Undo מושבת. כל מהלך הוא התחייבות.'
    },
    {
      id: 'clean',
      icon: '✓',
      label: 'יד נקייה',
      description: 'סיים בלי מהלך לא חוקי.'
    },
    {
      id: 'tight',
      icon: '◎',
      label: 'דיוק מעבדתי',
      description: 'סיים קרוב מאוד לאופטימום.'
    }
  ];

  // Three difficulty tiers. The filtered pool (worlds the player has reached)
  // is ranked by composite difficulty score and cut into thirds; each tier
  // draws its own puzzle for the day, so a player can warm up on the easy
  // one and still have a real fight waiting in the hard one.
  const DAILY_TIERS = [
    { id: 'easy', icon: '🟢', label: 'קל' },
    { id: 'medium', icon: '🟡', label: 'בינוני' },
    { id: 'hard', icon: '🔴', label: 'קשה' }
  ];

  function getDateKey(date = new Date()) {
    const d = date instanceof Date ? date : new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function hashString(value) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  // The pool is every level of every world the player has actually reached
  // (`allowedWorldIds`), minus hidden worlds and gentle intro levels. The
  // pool therefore grows with progress — a day-one player never gets thrown
  // into a late-world boss with four mechanics they have not met.
  function buildDailyPool(worlds, options = {}) {
    const hidden = new Set(options.hiddenWorldIds || []);
    const allowed = options.allowedWorldIds ? new Set(options.allowedWorldIds) : null;
    const min = options.minOptimalMoves === undefined ? 8 : options.minOptimalMoves;
    const max = options.maxOptimalMoves === undefined ? 24 : options.maxOptimalMoves;
    const pool = [];
    worlds.forEach((world) => {
      if (hidden.has(world.id)) return;
      if (allowed && !allowed.has(world.id)) return;
      world.levels.forEach((level, levelIndex) => {
        if (level.optimalMoves < min || level.optimalMoves > max) return;
        pool.push({ worldId: world.id, levelIndex, level });
      });
    });
    return pool;
  }

  // Rank the pool by score (ties broken by route position so the split is
  // stable) and cut it into three buckets. A tiny pool degrades gracefully:
  // an empty bucket falls back to the whole pool.
  function splitPoolByTier(pool, scoreOf) {
    const score = (entry) => {
      const s = scoreOf ? scoreOf(entry.worldId, entry.levelIndex, entry.level) : null;
      return Number.isFinite(s) ? s : entry.level.optimalMoves;
    };
    const ranked = pool
      .map((entry, i) => ({ entry, score: score(entry), i }))
      .sort((a, b) => a.score - b.score || a.i - b.i);
    const third = Math.ceil(ranked.length / 3);
    const buckets = {};
    DAILY_TIERS.forEach((tier, t) => {
      const slice = ranked.slice(t * third, (t + 1) * third);
      buckets[tier.id] = (slice.length ? slice : ranked).map(r => ({ ...r.entry, score: r.score }));
    });
    return buckets;
  }

  // Today's bundle: one shared lab rule (modifier) and one puzzle per tier.
  function pickDailyChallenges(worlds, date = new Date(), options = {}) {
    const key = getDateKey(date);
    const pool = buildDailyPool(worlds, options);
    if (pool.length === 0) return null;
    const buckets = splitPoolByTier(pool, options.scoreOf);
    const modifier = DAILY_MODIFIERS[hashString(`${key}:modifier`) % DAILY_MODIFIERS.length];
    const tiers = DAILY_TIERS.map((tier) => {
      const bucket = buckets[tier.id];
      const pick = bucket[hashString(`${key}:${tier.id}`) % bucket.length];
      return { key, modifier, tier: tier.id, tierIcon: tier.icon, tierLabel: tier.label, ...pick };
    });
    return { key, modifier, tiers };
  }

  // Single-tier convenience (defaults to the middle tier).
  function pickDailyChallenge(worlds, date = new Date(), options = {}) {
    const bundle = pickDailyChallenges(worlds, date, options);
    if (!bundle) return null;
    const want = options.tier || 'medium';
    return bundle.tiers.find(t => t.tier === want) || bundle.tiers[1];
  }

  // Stored day entries: { modifierId, tiers: { easy: {...}, medium: {...}, hard: {...} } }.
  // Entries written before tiers existed hold a single result at the top
  // level; treat them as the middle tier so streak history survives.
  function normalizeDayResult(entry) {
    if (!entry) return null;
    if (entry.tiers) return entry;
    if (entry.worldId === undefined) return entry;
    const { modifierId, ...rest } = entry;
    return { modifierId, tiers: { medium: rest } };
  }

  function tierResult(entry, tierId) {
    const day = normalizeDayResult(entry);
    return (day && day.tiers && day.tiers[tierId]) || null;
  }

  function getTightMoveLimit(level) {
    return level.optimalMoves + Math.max(1, Math.ceil(level.optimalMoves / 8));
  }

  function evaluateDailyModifier(challenge, run) {
    if (!challenge || !challenge.modifier) return true;
    if (challenge.modifier.id === 'noUndo') return run.undoCount === 0;
    if (challenge.modifier.id === 'clean') return run.violationCount === 0;
    if (challenge.modifier.id === 'tight') return run.moves <= getTightMoveLimit(challenge.level);
    return true;
  }

  function shiftDateKey(key, days) {
    const [y, m, d] = key.split('-').map(Number);
    const date = new Date(y, m - 1, d + days);
    return getDateKey(date);
  }

  // Streak = consecutive days with a recorded daily result, ending today or
  // yesterday (a streak is still alive until today's day is over). `best` is
  // the longest run anywhere in the history.
  function computeStreak(results, todayKey) {
    const keys = Object.keys(results || {}).filter((k) => results[k]).sort();
    if (!keys.length) return { current: 0, best: 0 };
    const set = new Set(keys);
    let start = set.has(todayKey) ? todayKey : shiftDateKey(todayKey, -1);
    let current = 0;
    while (set.has(start)) { current++; start = shiftDateKey(start, -1); }
    let best = 0, run = 0, prev = null;
    for (const k of keys) {
      run = prev && shiftDateKey(prev, 1) === k ? run + 1 : 1;
      best = Math.max(best, run);
      prev = k;
    }
    return { current, best: Math.max(best, current) };
  }

  // Wordle-style plain-text result the player can paste anywhere.
  function buildShareText(challenge, result, streak, dayEntry) {
    const full = Math.floor(result.stars);
    const half = result.stars % 1 >= 0.5 ? 1 : 0;
    const stars = '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(Math.max(0, 3 - full - half));
    const tierTag = challenge.tierLabel ? ` · ${challenge.tierIcon} ${challenge.tierLabel}` : '';
    const lines = [
      `🧪 מבחנות הלוגיקה · ניסוי יומי ${challenge.key}${tierTag}`,
      `${stars} · ${result.bestMoves} מהלכים (יעד ${challenge.level.optimalMoves})`,
      `${challenge.modifier.icon} ${challenge.modifier.label}: ${result.modifierPassed ? 'הושלם' : 'לא הפעם'}`
    ];
    if (dayEntry) {
      const row = DAILY_TIERS.map((tier) => {
        const r = tierResult(dayEntry, tier.id);
        return `${tier.icon}${r ? (r.modifierPassed ? '✓' : '○') : '·'}`;
      }).join(' ');
      lines.push(`דרגות: ${row}`);
    }
    if (streak && streak.current > 1) lines.push(`🔥 רצף ${streak.current} ימים`);
    return lines.join('\n');
  }

  return {
    DAILY_MODIFIERS,
    DAILY_TIERS,
    buildDailyPool,
    buildShareText,
    computeStreak,
    evaluateDailyModifier,
    getDateKey,
    getTightMoveLimit,
    normalizeDayResult,
    pickDailyChallenge,
    pickDailyChallenges,
    shiftDateKey,
    splitPoolByTier,
    tierResult
  };
});
