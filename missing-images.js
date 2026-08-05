const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
      file = dir + '/' + file;
      const stat = fs.statSync(file);
      if (stat && stat.isDirectory()) { 
        results = results.concat(walk(file));
      } else { 
        results.push(file);
      }
    });
  } catch (e) {}
  return results;
}

const allFiles = walk('app').concat(walk('components')).concat(walk('lib'));
const imgPaths = new Set();
const regex = /['"`](\/img\/.*?\.(png|jpe?g|gif|svg|webp))['"`]/gi;

for (const f of allFiles) {
  if (f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.css') || f.endsWith('.js')) {
    const content = fs.readFileSync(f, 'utf8');
    let match;
    while ((match = regex.exec(content)) !== null) {
      imgPaths.add(match[1]);
    }
  }
}

const missing = [];
for (const img of imgPaths) {
  const fullPath = path.join('public', img.replace(/\//g, path.sep));
  if (!fs.existsSync(fullPath)) {
    missing.push(img);
  }
}

console.log('Missing Images:');
missing.forEach(m => console.log(m));
