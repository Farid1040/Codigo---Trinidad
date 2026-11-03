const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const javascriptFiles = [
  'app.js',
  'sw.js',
  'api/_db.js',
  'api/products.js',
  'api/product-image.js',
  'api/orders.js',
  'scripts/check.js'
];

for (const file of javascriptFiles) {
  execFileSync(process.execPath, ['--check', path.join(root, file)], { stdio: 'inherit' });
}

for (const file of ['package.json', 'manifest.webmanifest', 'vercel.json']) {
  JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
}

new vm.Script(fs.readFileSync(path.join(root, 'app.js'), 'utf8'));
console.log(`Verificación correcta: ${javascriptFiles.length} archivos JavaScript y configuración JSON válida.`);
