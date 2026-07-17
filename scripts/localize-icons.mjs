/**
 * Download all provider icons referenced by the committed snapshots
 * (data/providers.{sc,gc}.json) into public/providers/, then rewrite each
 * snapshot's `iconUrl` to a local, host-independent path (`/providers/<file>`).
 *
 * Serves the icons from the app itself (http://localhost:3200/providers/...)
 * instead of hotlinking the third-party CDN. Re-runnable: already-local paths
 * are skipped, so it's safe to run again after `pnpm platforms:sync` re-pulls
 * fresh CDN URLs.
 *
 *   node scripts/localize-icons.mjs      (or: pnpm icons:localize)
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'public', 'providers');
const PUBLIC_PREFIX = '/providers';
const SNAPSHOTS = ['data/providers.sc.json', 'data/providers.gc.json'];

/** Turn a remote icon URL into a safe, unique local filename. */
function localName(url) {
  const base = path.basename(new URL(url).pathname).split('?')[0];
  // Decode %20 etc., then replace anything unsafe (spaces, punctuation) with '_'
  // so filenames stay clean on disk and in URLs.
  return decodeURIComponent(base || 'icon').replace(/[^a-zA-Z0-9._-]+/g, '_');
}

async function download(url, dest) {
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length === 0) throw new Error('empty body');
  await fs.writeFile(dest, buf);
  return buf.length;
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  // Collect every unique remote icon URL across both snapshots first.
  const files = [];
  for (const rel of SNAPSHOTS) {
    const rows = JSON.parse(await fs.readFile(path.join(ROOT, rel), 'utf8'));
    files.push({ rel, rows });
  }
  const remoteUrls = new Set();
  for (const { rows } of files) {
    for (const p of rows) {
      if (typeof p.iconUrl === 'string' && /^https?:\/\//.test(p.iconUrl)) remoteUrls.add(p.iconUrl);
    }
  }

  console.log(`Found ${remoteUrls.size} remote icons to localize → ${OUT_DIR}`);
  const map = new Map(); // remote url -> local path
  const failures = [];
  for (const url of remoteUrls) {
    const name = localName(url);
    const dest = path.join(OUT_DIR, name);
    try {
      const bytes = await download(url, dest);
      map.set(url, `${PUBLIC_PREFIX}/${name}`);
      console.log(`  ✓ ${name} (${bytes} B)`);
    } catch (err) {
      failures.push({ url, reason: err.message });
      console.log(`  ✗ ${url} — ${err.message}`);
    }
  }

  // Rewrite snapshots: only successfully-downloaded URLs get repointed locally;
  // failed ones keep their original URL so nothing silently 404s.
  let rewritten = 0;
  for (const { rel, rows } of files) {
    for (const p of rows) {
      const local = map.get(p.iconUrl);
      if (local) {
        p.iconUrl = local;
        rewritten++;
      }
    }
    await fs.writeFile(path.join(ROOT, rel), JSON.stringify(rows, null, 2) + '\n');
    console.log(`  wrote ${rel}`);
  }

  console.log(
    `\n✓ localized ${map.size}/${remoteUrls.size} icons, rewrote ${rewritten} snapshot entries`
  );
  if (failures.length) {
    console.log(`\n⚠ ${failures.length} download(s) FAILED (kept original URL):`);
    for (const f of failures) console.log(`   - ${f.url}  (${f.reason})`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
