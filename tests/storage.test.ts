import { describe, it, expect } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import * as storage from '@/lib/storage';

const KEY = 'misc/vitest-storage-probe.txt';
const abs = path.join(process.cwd(), 'public', 'media', KEY);

describe('storage facade', () => {
  it('selects the local driver when R2 is not configured', () => {
    // Tests run without R2 credentials → local disk driver.
    expect(storage.driver()).toBe('local');
    expect(storage.isR2Configured()).toBe(false);
  });

  it('buildKey namespaces by media kind', () => {
    expect(storage.buildKey('banner', 'abc', 'png')).toBe('banners/abc.png');
    expect(storage.buildKey('avatar', 'xyz', '.webp')).toBe('avatars/xyz.webp');
    expect(storage.buildKey('kyc_doc', '1', 'pdf')).toBe('kyc/1.pdf');
  });

  it('publicUrl builds a URL from the configured base', async () => {
    expect(await storage.readUrl(KEY)).toContain(`/media/${KEY}`);
  });

  it('put writes bytes and remove deletes them', async () => {
    await storage.put(KEY, Buffer.from('hello vitest'), 'text/plain');
    expect(await fs.readFile(abs, 'utf-8')).toBe('hello vitest');
    await storage.remove(KEY);
    await expect(fs.access(abs)).rejects.toThrow();
  });
});
