(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.PORTALS = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  // Portal data lives on the level:
  //   portals: [{ pair: [entry, exit], mode: 'bottom' }, ...]
  //
  // mode 'bottom' (default) — "צינור תחתי": the entry tube is a chute. A ball
  //   poured into it slides UNDER the exit tube's stack (inserted at index 0).
  //   The chute bypasses the "only on the same colour" rule (a pipe pushes),
  //   but capacity, locks, colour-locked rims, shift and blend still apply to
  //   the exit tube. The exit tube is otherwise a normal tube: you may also
  //   stack onto its top directly. A ball fed from below is buried under the
  //   whole stack, so every chute move is a commitment.
  //
  // mode 'redirect' — legacy symmetric doorway: entering either tube places
  //   the ball on TOP of the other. Kept for side content / old data.
  function normalize(portal) {
    if (Array.isArray(portal)) return { pair: portal, mode: 'redirect' };
    return { pair: portal && portal.pair ? portal.pair : [], mode: (portal && portal.mode) || 'bottom' };
  }

  function getPortal(level, tubeIndex) {
    const portals = (level && level.portals) || [];
    for (let i = 0; i < portals.length; i++) {
      const p = normalize(portals[i]);
      if (p.pair.length === 2 && p.pair.includes(tubeIndex)) return { pair: p.pair, mode: p.mode, index: i };
    }
    return null;
  }

  function isPortalTube(level, tubeIndex) {
    return getPortal(level, tubeIndex) !== null;
  }

  // The chute (entry) of a bottom portal — it never holds balls. For legacy
  // redirect pairs both tubes are entries.
  function isPortalEntry(level, tubeIndex) {
    const p = getPortal(level, tubeIndex);
    return !!p && (p.mode === 'redirect' || p.pair[0] === tubeIndex);
  }

  // The tube that receives balls from a chute at its bottom.
  function isPortalExit(level, tubeIndex) {
    const p = getPortal(level, tubeIndex);
    return !!p && p.mode === 'bottom' && p.pair[1] === tubeIndex;
  }

  // Where does a ball poured into `tubeIndex` end up? null = nowhere special
  // (a normal placement into tubeIndex itself).
  function getPortalExit(level, tubeIndex) {
    const p = getPortal(level, tubeIndex);
    if (!p) return null;
    if (p.mode === 'redirect') return p.pair[0] === tubeIndex ? p.pair[1] : p.pair[0];
    return p.pair[0] === tubeIndex ? p.pair[1] : null;
  }

  // { to, viaBottom } for a requested destination tube.
  function resolvePortalMove(level, requestedTubeIndex) {
    const p = getPortal(level, requestedTubeIndex);
    if (!p) return { to: requestedTubeIndex, viaBottom: false };
    if (p.mode === 'redirect') {
      return { to: p.pair[0] === requestedTubeIndex ? p.pair[1] : p.pair[0], viaBottom: false };
    }
    if (p.pair[0] === requestedTubeIndex) return { to: p.pair[1], viaBottom: true };
    return { to: requestedTubeIndex, viaBottom: false };
  }

  // Backwards-compatible helper (tube index only).
  function resolvePortalDestination(level, requestedTubeIndex) {
    return resolvePortalMove(level, requestedTubeIndex).to;
  }

  function portalLabel(level, tubeIndex) {
    const p = getPortal(level, tubeIndex);
    return p ? String(p.index + 1) : '';
  }

  return {
    getPortal,
    getPortalExit,
    isPortalEntry,
    isPortalExit,
    isPortalTube,
    portalLabel,
    resolvePortalDestination,
    resolvePortalMove
  };
});
