const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.ts')) results.push(file);
    }
  });
  return results;
}
const files = walk('app/api');
for (const f of files) {
  let content = fs.readFileSync(f, 'utf8');
  if (content.includes('{ message:  }')) {
    content = content.replace(/\{ message:  \}/g, '{ message: "Invalid input" }');
    fs.writeFileSync(f, content);
    console.log('Fixed ' + f);
  }
}
