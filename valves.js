(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.VALVES = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  function getValve(level, tubeIndex) {
    return (level.valves || []).find((valve) => valve.tubeIndex === tubeIndex) || null;
  }

  function initialValveStates(level) {
    const states = {};
    (level.valves || []).forEach((valve) => {
      if (valve.mode === 'flip') states[valve.tubeIndex] = valve.starts || 'in';
    });
    return states;
  }

  function valveModeForTube(level, states, tubeIndex) {
    const valve = getValve(level, tubeIndex);
    if (!valve) return null;
    if (valve.mode === 'flip') return (states && states[tubeIndex]) || valve.starts || 'in';
    return valve.mode;
  }

  function canUseValveAsSource(level, states, tubeIndex) {
    const mode = valveModeForTube(level, states, tubeIndex);
    return mode !== 'in';
  }

  function canUseValveAsDestination(level, states, tubeIndex) {
    const mode = valveModeForTube(level, states, tubeIndex);
    return mode !== 'out';
  }

  function toggleValveAfterUse(level, states, tubeIndex) {
    const valve = getValve(level, tubeIndex);
    if (!valve || valve.mode !== 'flip') return states;
    const next = { ...(states || {}) };
    next[tubeIndex] = valveModeForTube(level, states, tubeIndex) === 'in' ? 'out' : 'in';
    return next;
  }

  function toggleValvesAfterMove(level, states, from, to) {
    let next = toggleValveAfterUse(level, states, from);
    next = toggleValveAfterUse(level, next, to);
    return next;
  }

  return {
    canUseValveAsDestination,
    canUseValveAsSource,
    initialValveStates,
    toggleValveAfterUse,
    toggleValvesAfterMove,
    valveModeForTube
  };
});
