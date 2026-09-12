const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const { analyzeAll, checkMonotonicity, checkWorldEscalation, HIDDEN } = require('../scripts/difficulty.js');

const root = path.resolve(__dirname, '..');

function loadScript(file, suffix = '') {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const context = { window: {} };
  vm.createContext(context);
  return vm.runInContext(source + suffix, context, { filename: file });
}

const worlds = loadScript('levels.js', '; WORLDS;');
const rows = analyzeAll(worlds);

// Within a world: from the midpoint on, cognitive load and score never dip.
const violations = checkMonotonicity(rows);
assert.deepStrictEqual(
  violations,
  [],
  `visible worlds should not dip in back-half cognitive difficulty: ${JSON.stringify(violations)}`
);

// Across worlds: each world's peak must not fall below the previous peak.
// The route is the visible worlds in their declared order; the expert route
// is excluded because it is a side ladder, not the next chapter.
const order = worlds
  .filter(w => !HIDDEN.includes(w.id) && !w.expert)
  .sort((a, b) => (a.order || a.id) - (b.order || b.id))
  .map(w => w.id);
const escalation = checkWorldEscalation(rows, order);
assert.deepStrictEqual(
  escalation,
  [],
  `each world's boss should be at least as hard as the previous world's: ${JSON.stringify(escalation)}`
);

console.log('difficulty monotonicity tests passed');
