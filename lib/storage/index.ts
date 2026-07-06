import * as r2 from './r2';
import * as local from './local';

export { buildKey, publicUrl, PREFIX, isR2Configured } from './r2';

/** Which backend is active — 'r2' when configured, else the local-disk dev driver. */
export function driver(): 'r2' | 'local' {
  return r2.isR2Configured() ? 'r2' : 'local';
}

/** Upload bytes to the active backend. */
export async function put(key: string, body: Buffer, contentType: string): Promise<void> {
  if (driver() === 'r2') return r2.putObject(key, body, contentType);
  return local.putObject(key, body);
}

/** Delete an object from the active backend. */
export async function remove(key: string): Promise<void> {
  if (driver() === 'r2') return r2.deleteObject(key);
  return local.deleteObject(key);
}

/**
 * URL to read an object. Public assets → CDN/static URL. Private assets on R2 →
 * a short-lived presigned GET; on the local driver there's no signing, so the
 * static path is returned (dev only).
 */
export async function readUrl(key: string, opts: { private?: boolean } = {}): Promise<string> {
  if (opts.private && driver() === 'r2') return r2.presignDownload(key);
  return r2.publicUrl(key);
}

/** Presigned PUT for direct-to-R2 browser uploads (R2 only). */
export async function presignPut(key: string, contentType: string): Promise<string> {
  if (driver() !== 'r2') {
    throw new Error('Presigned uploads require R2 — the local driver uploads through POST /api/media');
  }
  return r2.presignUpload(key, contentType);
}
