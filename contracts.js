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

  return { CONTRACT_DEFS, evaluateContracts, mergeContracts, countContracts };
});
