// Runs `next dev`/`next start` bound to PORT from .env. Next's own CLI loads
// .env for everything else automatically, but the listen-port decision
// happens before that loading step, so it never sees a PORT set only in
// .env — this wrapper loads .env first and passes the port explicitly.
import 'dotenv/config';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const cmd = process.argv[2];
if (cmd !== 'dev' && cmd !== 'start') {
  console.error('Usage: node scripts/next-with-env.mjs <dev|start>');
  process.exit(1);
}

const port = process.env.PORT || '3000';
const nextBin = require.resolve('next/dist/bin/next');
const child = spawn(process.execPath, [nextBin, cmd, '-p', port], { stdio: 'inherit' });
child.on('exit', (code) => process.exit(code ?? 0));
child.on('error', (err) => {
  console.error(err);
  process.exit(1);
});
