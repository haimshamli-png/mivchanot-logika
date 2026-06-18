(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.PORTALS = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  function normalizePair(portal) {
    if (Array.isArray(portal)) return portal;
    return portal && portal.pair ? portal.pair : [];
  }

  function getPortalExit(level, tubeIndex) {
    const portals = level.portals || [];
    for (const portal of portals) {
      const pair = normalizePair(portal);
      if (pair.length !== 2) continue;
      if (pair[0] === tubeIndex) return pair[1];
      if (pair[1] === tubeIndex) return pair[0];
    }
    return null;
  }

  function isPortalTube(level, tubeIndex) {
    return getPortalExit(level, tubeIndex) !== null;
  }

  function resolvePortalDestination(level, requestedTubeIndex) {
    const exit = getPortalExit(level, requestedTubeIndex);
    return exit === null ? requestedTubeIndex : exit;
  }

  function portalLabel(level, tubeIndex) {
    const portals = level.portals || [];
    const index = portals.findIndex((portal) => normalizePair(portal).includes(tubeIndex));
    return index === -1 ? '' : String(index + 1);
  }

  return {
    getPortalExit,
    isPortalTube,
    portalLabel,
    resolvePortalDestination
  };
});
