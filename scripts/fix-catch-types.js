const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function processRoutes() {
  const rootDir = process.cwd();
  const apiDirs = [
    path.join(rootDir, 'app/api')
  ];

  let totalFiles = 0;
  let modifiedFiles = 0;

  apiDirs.forEach(dir => {
    if (!fs.existsSync(dir)) return;
    
    walkDir(dir, (filePath) => {
      if (!filePath.endsWith('route.ts')) return;
      totalFiles++;
      
      let content = fs.readFileSync(filePath, 'utf8');
      let originalContent = content;

      content = content.replace(/catch\s*\(\s*err\s*\)\s*\{/g, 'catch (err: any) {');
      content = content.replace(/catch\s*\(\s*e\s*\)\s*\{/g, 'catch (e: any) {');
      content = content.replace(/catch\s*\(\s*error\s*\)\s*\{/g, 'catch (error: any) {');

      if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        modifiedFiles++;
        console.log(`Modified: ${path.relative(rootDir, filePath)}`);
      }
    });
  });

  console.log(`Processed ${totalFiles} route files, modified ${modifiedFiles}`);
}

processRoutes();
