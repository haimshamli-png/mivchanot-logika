// level-meta.js is generated (npm run annotate). This guards against a stale
// file shipping after levels.js changed.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');

function loadScript(file, suffix = '') {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const context = { window: {}, module: { exports: {} } };
  vm.createContext(context);
  return vm.runInContext(source + suffix, context, { filename: file });
}

const worlds = loadScript('levels.js', '; WORLDS;');
const meta = loadScript('level-meta.js', '; LEVEL_META;');
const TIER_IDS = ['intro', 'practice', 'puzzle', 'lab', 'expert', 'master'];

for (const w of worlds) {
  w.levels.forEach((level, i) => {
    const m = meta[String(w.id)] && meta[String(w.id)][String(i)];
    const where = `W${w.id} L${i + 1}`;
    assert(m, `${where}: missing level-meta entry (run npm run annotate)`);
    assert.strictEqual(m.opt, level.optimalMoves, `${where}: level-meta is stale (opt ${m.opt} vs ${level.optimalMoves})`);
    assert(TIER_IDS.includes(m.tier), `${where}: unknown tier ${m.tier}`);
    assert(typeof m.score === 'number' && m.score >= 0 && m.score <= 100, `${where}: score out of range`);
    assert(Array.isArray(m.hint) && m.hint.length <= 3, `${where}: hint must be up to three moves`);
    m.hint.forEach(([from, to]) => {
      assert(Number.isInteger(from) && Number.isInteger(to) && from !== to, `${where}: malformed hint move`);
      assert(from < level.capacities.length && to < level.capacities.length, `${where}: hint move out of range`);
    });
  });
}

console.log('level meta tests passed');
