const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const mixingSource = fs.readFileSync(path.join(root, 'pigment-mixing.js'), 'utf8');
const mixingContext = { window: {} };
vm.createContext(mixingContext);
vm.runInContext(mixingSource, mixingContext, { filename: 'pigment-mixing.js' });

const api = mixingContext.window.PIGMENT_MIXING;

assert(api, 'PIGMENT_MIXING API should be exposed on window');
assert.strictEqual(api.mixPair('B', 'Y'), 'G', 'blue + yellow should make green');
assert.strictEqual(api.mixPair('Y', 'B'), 'G', 'mixing recipes should be order-insensitive');
assert.strictEqual(api.mixPair('R', 'B'), 'P', 'red + blue should make purple');
assert.strictEqual(api.mixPair('G', 'R'), 'K', 'green + red should make the advanced target color');
assert.strictEqual(api.mixPair('J', 'R'), null, 'jokers should not be pigment ingredients');
assert.strictEqual(api.mixPair('R', 'R'), null, 'matching colors should not mix');

const levelsSource = fs.readFileSync(path.join(root, 'levels.js'), 'utf8');
assert(levelsSource.includes('מעבדת הפיגמנטים'), 'levels should include the pigment lab world');
assert(levelsSource.includes('blenders'), 'levels should declare blender tubes');

console.log('pigment mixing tests passed');
