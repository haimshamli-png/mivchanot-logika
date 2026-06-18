const assert = require('assert');

const {
  getPortalExit,
  isPortalTube,
  resolvePortalDestination
} = require('../portals.js');

const level = {
  portals: [
    { pair: [1, 4] },
    { pair: [2, 5] }
  ]
};

assert.strictEqual(isPortalTube(level, 1), true, 'first pair entry should be a portal');
assert.strictEqual(isPortalTube(level, 4), true, 'first pair exit should be a portal');
assert.strictEqual(isPortalTube(level, 0), false, 'plain tube should not be a portal');

assert.strictEqual(getPortalExit(level, 1), 4, 'portal pair should route forward');
assert.strictEqual(getPortalExit(level, 4), 1, 'portal pair should route backward');
assert.strictEqual(getPortalExit(level, 0), null, 'plain tube has no portal exit');

assert.strictEqual(
  resolvePortalDestination(level, 2),
  5,
  'moving into a portal tube should resolve to its paired tube'
);
assert.strictEqual(
  resolvePortalDestination(level, 3),
  3,
  'moving into a plain tube should keep the requested destination'
);

console.log('portal tests passed');
