(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.CONTRACTS = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const CONTRACT_DEFS = [
    {
      id: 'optimal',
      icon: '◎',
      label: 'אופטימום',
      description: 'פתרת במספר המהלכים האופטימלי.'
    },
    {
      id: 'noUndo',
      icon: '↯',
      label: 'בלי חזרה',
      description: 'פתרת בלי להשתמש ב-Undo.'
    },
    {
      id: 'clean',
      icon: '✓',
      label: 'יד נקייה',
      description: 'פתרת בלי מהלך לא חוקי.'
    }
  ];

  // A hint reveals the opening of an optimal solution, so a hinted run cannot
  // claim the "optimal" stamp; the other two stamps are still earnable.
  function evaluateContracts(run, level) {
    return {
      optimal: run.moves <= level.optimalMoves && !run.hintUsed,
      noUndo: run.undoCount === 0,
      clean: run.violationCount === 0
    };
  }

  function mergeContracts(existing, earned) {
    const merged = {};
    CONTRACT_DEFS.forEach((contract) => {
      merged[contract.id] = !!(existing && existing[contract.id]) || !!(earned && earned[contract.id]);
    });
    return merged;
  }

  function countContracts(contracts) {
    return CONTRACT_DEFS.reduce((sum, contract) => sum + (contracts && contracts[contract.id] ? 1 : 0), 0);
  }

  // Stamp milestones: every 25 challenge stamps earns a lab rank and one
  // free hint (a hint that does not forfeit the "optimal" stamp). The ranks
  // are cosmetic titles shown on the home screen; the free hint is the
  // tangible perk. 318 stamps exist on the visible route, so 12 ranks.
  const STAMP_MILESTONE = 25;
  const STAMP_RANKS = [
    'עוזר מעבדה',
    'טכנאי מעבדה',
    'חוקר זוטר',
    'חוקר',
    'חוקר בכיר',
    'ראש צוות',
    'ראש מעבדה',
    'מנהל מחקר',
    'פרופסור',
    'פרופסור מן המניין',
    'חבר האקדמיה',
    'ד"ר יוריקה'
  ];

  function milestonesReached(count) {
    return Math.max(0, Math.floor((count || 0) / STAMP_MILESTONE));
  }

  function rankFor(count) {
    const reached = milestonesReached(count);
    const index = Math.min(reached, STAMP_RANKS.length) - 1;
    const nextAt = (reached + 1) * STAMP_MILESTONE;
    return {
      reached,
      title: index >= 0 ? STAMP_RANKS[index] : null,
      nextAt,
      remaining: Math.max(0, nextAt - (count || 0)),
      maxed: reached >= STAMP_RANKS.length
    };
  }

  // Milestones newly crossed when the count moves from `before` to `after`.
  function milestonesCrossed(before, after) {
    return Math.max(0, milestonesReached(after) - milestonesReached(before));
  }

  return {
    CONTRACT_DEFS, STAMP_MILESTONE, STAMP_RANKS,
    evaluateContracts, mergeContracts, countContracts,
    milestonesReached, milestonesCrossed, rankFor
  };
});
