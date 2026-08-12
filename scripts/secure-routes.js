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
  const apiDirs = [path.join(rootDir, 'app/api/admin'), path.join(rootDir, 'app/api/agent')];

  let totalFiles = 0;
  let modifiedFiles = 0;

  apiDirs.forEach((dir) => {
    if (!fs.existsSync(dir)) return;

    walkDir(dir, (filePath) => {
      if (!filePath.endsWith('route.ts')) return;
      totalFiles++;

      let content = fs.readFileSync(filePath, 'utf8');
      let originalContent = content;

      const regex = /export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)\s*\([^)]*\)\s*\{/g;

      let match;
      let matches = [];
      while ((match = regex.exec(content)) !== null) {
        matches.push({ index: match.index, length: match[0].length, method: match[1] });
      }

      for (let i = matches.length - 1; i >= 0; i--) {
        const { index, length, method } = matches[i];

        const startIndex = index + length - 1;
        let openBraces = 0;
        let endIndex = -1;

        for (let j = startIndex; j < content.length; j++) {
          if (content[j] === '{') openBraces++;
          if (content[j] === '}') {
            openBraces--;
            if (openBraces === 0) {
              endIndex = j;
              break;
            }
          }
        }

        if (endIndex !== -1) {
          const body = content.substring(startIndex + 1, endIndex);

          if (body.includes('try {') || body.includes('try{') || body.includes('try  {')) {
            console.log(
              `Skipping ${method} in ${path.relative(rootDir, filePath)} (already wrapped)`
            );
            continue;
          }

          const before = content.substring(0, startIndex + 1);
          const after = content.substring(endIndex);

          let indentedBody = body.replace(/\n/g, '\n  ');

          // Compute a clean route path for the error message
          let routePath = filePath.replace(/\\/g, '/').split('/app/')[1] || 'api/unknown';
          routePath = '/' + routePath.replace(/\/route\.ts$/, '');

          const newBody = `\n  try {${indentedBody}} catch (err: any) {\n    console.error('${method} ${routePath}', err);\n    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });\n  }\n`;

          content = before + newBody + after;
        }
      }

      if (content !== originalContent) {
        if (!content.includes('NextResponse')) {
          content = `import { NextResponse } from 'next/server';\n` + content;
        }
        fs.writeFileSync(filePath, content, 'utf8');
        modifiedFiles++;
        console.log(`Modified: ${path.relative(rootDir, filePath)}`);
      }
    });
  });

  console.log(`Processed ${totalFiles} route files, modified ${modifiedFiles}`);
}

processRoutes();
