import { promises as fs } from 'node:fs';
import path from 'node:path';

/**
 * Local-disk storage driver — the dev fallback used when R2 isn't configured.
 * Objects live under `public/media/<key>` so Next serves them statically at
 * `/media/<key>` (matches R2_PUBLIC_BASE_URL=http://localhost:3000/media).
 */
const ROOT = path.join(process.cwd(), 'public', 'media');

function fsPath(key: string): string {
  // Guard against path traversal in the key.
  const safe = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, '');
  return path.join(ROOT, safe);
}

export async function putObject(key: string, body: Buffer): Promise<void> {
  const dest = fsPath(key);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, body);
}

export async function deleteObject(key: string): Promise<void> {
  await fs.rm(fsPath(key), { force: true });
}

export async function objectExists(key: string): Promise<boolean> {
  try {
    await fs.access(fsPath(key));
    return true;
  } catch {
    return false;
  }
}
