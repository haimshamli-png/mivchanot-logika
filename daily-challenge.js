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

  function buildDailyPool(worlds, options = {}) {
    const hidden = new Set(options.hiddenWorldIds || []);
    const min = options.minOptimalMoves === undefined ? 8 : options.minOptimalMoves;
    const max = options.maxOptimalMoves === undefined ? 24 : options.maxOptimalMoves;
    const pool = [];
    worlds.forEach((world) => {
      if (hidden.has(world.id)) return;
      world.levels.forEach((level, levelIndex) => {
        if (level.optimalMoves < min || level.optimalMoves > max) return;
        pool.push({ worldId: world.id, levelIndex, level });
      });
    });
    return pool;
  }

  function pickDailyChallenge(worlds, date = new Date(), options = {}) {
    const key = getDateKey(date);
    const pool = buildDailyPool(worlds, options);
    if (pool.length === 0) return null;
    const level = pool[hashString(`${key}:level`) % pool.length];
    const modifier = DAILY_MODIFIERS[hashString(`${key}:modifier`) % DAILY_MODIFIERS.length];
    return { key, ...level, modifier };
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

  return {
    DAILY_MODIFIERS,
    buildDailyPool,
    evaluateDailyModifier,
    getDateKey,
    getTightMoveLimit,
    pickDailyChallenge
  };
});
