const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'www');
const files = [
  'index.html',
  'style.css',
  'levels.js',
  'pigment-mixing.js',
  'game.js',
  'manifest.webmanifest',
  'service-worker.js',
  'icon-180.png',
  'icon-192.png',
  'icon-512.png',
  'icon-1024.png'
];

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

for (const file of files) {
  fs.copyFileSync(path.join(rootDir, file), path.join(outDir, file));
}

console.log(`Copied ${files.length} files to ${path.relative(rootDir, outDir)}`);
