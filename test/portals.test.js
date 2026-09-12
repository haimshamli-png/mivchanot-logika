const assert = require('assert');

const {
  getPortal,
  getPortalExit,
  isPortalEntry,
  isPortalExit,
  isPortalTube,
  portalLabel,
  resolvePortalDestination,
  resolvePortalMove
} = require('../portals.js');

// Bottom-feed chutes ("צינור תחתי") — the default mode.
const chutes = {
  portals: [
    { pair: [1, 4], mode: 'bottom' },
    { pair: [2, 5] }                      // mode omitted → bottom
  ]
};

assert.strictEqual(isPortalTube(chutes, 1), true, 'chute entry is a portal tube');
assert.strictEqual(isPortalTube(chutes, 4), true, 'chute exit is a portal tube');
assert.strictEqual(isPortalTube(chutes, 0), false, 'plain tube is not a portal');
assert.strictEqual(isPortalEntry(chutes, 1), true, 'first of the pair is the chute');
assert.strictEqual(isPortalEntry(chutes, 4), false, 'exit tube is not an entry');
assert.strictEqual(isPortalExit(chutes, 4), true, 'second of the pair receives from below');
assert.strictEqual(isPortalExit(chutes, 1), false, 'chute never receives');

assert.deepStrictEqual(
  resolvePortalMove(chutes, 2),
  { to: 5, viaBottom: true },
  'pouring into a chute lands at the bottom of its exit tube'
);
assert.deepStrictEqual(
  resolvePortalMove(chutes, 5),
  { to: 5, viaBottom: false },
  'pouring directly into the exit tube is a normal top placement'
);
assert.deepStrictEqual(
  resolvePortalMove(chutes, 3),
  { to: 3, viaBottom: false },
  'plain tubes are unaffected'
);
assert.strictEqual(getPortalExit(chutes, 1), 4, 'chute routes to its exit');
assert.strictEqual(getPortalExit(chutes, 4), null, 'exit tube has no onward route');
assert.strictEqual(portalLabel(chutes, 5), '2', 'labels are 1-based pair indices');
assert.deepStrictEqual(getPortal(chutes, 4), { pair: [1, 4], mode: 'bottom', index: 0 });

// Legacy symmetric redirect doorways stay supported for side content.
const doors = { portals: [{ pair: [1, 4], mode: 'redirect' }] };
assert.strictEqual(getPortalExit(doors, 1), 4, 'redirect routes forward');
assert.strictEqual(getPortalExit(doors, 4), 1, 'redirect routes backward');
assert.strictEqual(resolvePortalDestination(doors, 4), 1, 'redirect keeps the old resolver contract');
assert.deepStrictEqual(resolvePortalMove(doors, 1), { to: 4, viaBottom: false });
assert.strictEqual(isPortalEntry(doors, 4), true, 'both doors of a redirect pair are entries');

console.log('portal tests passed');
