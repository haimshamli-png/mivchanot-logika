const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const { analyzeAll, checkMonotonicity } = require('../scripts/difficulty.js');

const root = path.resolve(__dirname, '..');

function loadScript(file, suffix = '') {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const context = { window: {} };
  vm.createContext(context);
  return vm.runInContext(source + suffix, context, { filename: file });
}

const worlds = loadScript('levels.js', '; WORLDS;');
const rows = analyzeAll(worlds);
const violations = checkMonotonicity(rows);

assert.deepStrictEqual(
  violations,
  [],
  `visible worlds should not dip in back-half cognitive difficulty: ${JSON.stringify(violations)}`
);

console.log('difficulty monotonicity tests passed');
