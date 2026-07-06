import { describe, it, expect, beforeAll } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { db } from '@/lib/db';
import { uploadMedia, replaceMedia, deleteMedia, getMediaUrl } from '@/lib/media';
import * as storage from '@/lib/storage';
import { requireSeed } from './helpers';

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(64, 7), Buffer.from('WEBP')]);

const onDisk = (key: string) =>
  fs
    .access(path.join(process.cwd(), 'public', 'media', key))
    .then(() => true)
    .catch(() => false);

let adminId: string;

beforeAll(async () => {
  await requireSeed();
  const admin = await db.query.admins.findFirst();
  adminId = admin!.id;
});

describe('media upload → update → delete', () => {
  it('uploadMedia stores bytes + registers the asset', async () => {
    const up = await uploadMedia({
      buffer: PNG,
      contentType: 'image/png',
      kind: 'banner',
      filename: 'promo.png',
      uploadedByAdminId: adminId,
    });
    expect(up.r2Key).toMatch(/^banners\/.+\.png$/);
    expect(await onDisk(up.r2Key)).toBe(true);
    expect(up.url).toContain(`/media/${up.r2Key}`);
    expect(up.sizeBytes).toBe(PNG.length);
    expect(await getMediaUrl(up.id)).toBe(up.url);

    // stash for later assertions
    (globalThis as any).__mediaId = up.id;
    (globalThis as any).__oldKey = up.r2Key;
  });

  it('replaceMedia swaps bytes and removes the old object', async () => {
    const id = (globalThis as any).__mediaId as string;
    const oldKey = (globalThis as any).__oldKey as string;
    const rep = await replaceMedia(id, {
      buffer: WEBP,
      contentType: 'image/webp',
      filename: 'promo.webp',
    });
    expect(rep.id).toBe(id);
    expect(rep.r2Key).toMatch(/\.webp$/);
    expect(await onDisk(rep.r2Key)).toBe(true);
    expect(await onDisk(oldKey)).toBe(false);
    expect(rep.sizeBytes).toBe(WEBP.length);
    (globalThis as any).__newKey = rep.r2Key;
  });

  it('deleteMedia removes registry row + object', async () => {
    const id = (globalThis as any).__mediaId as string;
    const key = (globalThis as any).__newKey as string;
    await deleteMedia(id);
    expect(await getMediaUrl(id)).toBeNull();
    expect(await onDisk(key)).toBe(false);
  });

  it('operating on a missing asset throws', async () => {
    await expect(deleteMedia('00000000-0000-0000-0000-000000000000')).rejects.toThrow();
    await expect(
      replaceMedia('00000000-0000-0000-0000-000000000000', {
        buffer: PNG,
        contentType: 'image/png',
      })
    ).rejects.toThrow();
  });
});
