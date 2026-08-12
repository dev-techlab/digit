const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function (file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (
        !file.includes('node_modules') &&
        !file.includes('.next') &&
        !file.includes('.git') &&
        !file.includes('public')
      ) {
        results = results.concat(walk(file));
      }
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = [...walk('app'), ...walk('components'), ...walk('lib'), ...walk('scripts')];

let changedCount = 0;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  // Match `console.log(` but not `// console.log(`
  // We can use a regex with a negative lookbehind, but JS supports it now.
  const regex = /(?<!\/\/\s*)console\.log\(/g;
  if (regex.test(content)) {
    const newContent = content.replace(regex, '// console.log(');
    fs.writeFileSync(file, newContent, 'utf8');
    changedCount++;
  }
}

console.log(`Updated ${changedCount} files.`);
