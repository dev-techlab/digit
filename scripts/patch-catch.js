const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach((f) => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function processRoutes() {
  const rootDir = process.cwd();
  const apiDirs = [path.join(rootDir, 'app/api')];

  let totalFiles = 0;
  let modifiedFiles = 0;

  apiDirs.forEach((dir) => {
    if (!fs.existsSync(dir)) return;

    walkDir(dir, (filePath) => {
      if (!filePath.endsWith('route.ts')) return;
      totalFiles++;

      let content = fs.readFileSync(filePath, 'utf8');
      let originalContent = content;

      // Find catch blocks: catch (err) { or catch (err: any) {
      const regex = /catch\s*\(\s*(err|e|error)(?:\s*:\s*any)?\s*\)\s*\{/g;

      let match;
      let matches = [];
      while ((match = regex.exec(content)) !== null) {
        matches.push({ index: match.index, length: match[0].length, varName: match[1] });
      }

      for (let i = matches.length - 1; i >= 0; i--) {
        const { index, length, varName } = matches[i];

        const startIndex = index + length;

        // Check if the check already exists right after the catch
        const checkStr = `if (${varName} && (${varName}.digest === 'DYNAMIC_SERVER_USAGE' || ${varName}.message?.includes('NEXT_'))) throw ${varName};`;

        // Get the next 200 characters to see if it's already there
        const upcoming = content.substring(startIndex, startIndex + 200);
        if (upcoming.includes('DYNAMIC_SERVER_USAGE')) {
          continue; // Already has it
        }

        const before = content.substring(0, startIndex);
        const after = content.substring(startIndex);

        content = before + `\n    ${checkStr}` + after;
      }

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
