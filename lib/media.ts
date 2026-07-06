import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';
import * as storage from '@/lib/storage';

type MediaKind = (typeof s.mediaKindEnum.enumValues)[number];

// Note: image/svg+xml is intentionally excluded — SVG can carry executable
// script and would be a stored-XSS vector when served same-origin.
const EXT_BY_TYPE: Record<string, string> = {
  'image/webp': 'webp',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
};

/** Content types accepted for upload/replace. Enforced by the media routes. */
export const ALLOWED_UPLOAD_TYPES = new Set(Object.keys(EXT_BY_TYPE));

// Derive the stored extension ONLY from the (route-validated) content type —
// never from the client filename — so a crafted name can't set the extension.
function extFor(contentType: string): string {
  return EXT_BY_TYPE[contentType] ?? 'bin';
}

const BUCKET = process.env.R2_BUCKET ?? 'digitlink-media';

export interface UploadMediaInput {
  buffer: Buffer;
  contentType: string;
  kind: MediaKind;
  filename?: string;
  uploadedByAdminId?: string | null;
  uploadedByUserId?: string | null;
  isPrivate?: boolean;
  width?: number | null;
  height?: number | null;
}

export interface MediaResult {
  id: string;
  r2Key: string;
  url: string;
  kind: MediaKind;
  contentType: string;
  sizeBytes: number;
}

/** Upload bytes to storage and register the object in media_assets. */
export async function uploadMedia(input: UploadMediaInput): Promise<MediaResult> {
  const id = randomUUID();
  const r2Key = storage.buildKey(input.kind, id, extFor(input.contentType));

  await storage.put(r2Key, input.buffer, input.contentType);

  const [row] = await db
    .insert(s.mediaAssets)
    .values({
      id,
      r2Key,
      bucket: BUCKET,
      kind: input.kind,
      contentType: input.contentType,
      sizeBytes: input.buffer.length,
      width: input.width ?? null,
      height: input.height ?? null,
      originalName: input.filename ?? null,
      uploadedByAdminId: input.uploadedByAdminId ?? null,
      uploadedByUserId: input.uploadedByUserId ?? null,
      isPrivate: input.isPrivate ?? false,
    })
    .returning();

  return {
    id: row.id,
    r2Key: row.r2Key,
    url: await storage.readUrl(row.r2Key, { private: row.isPrivate }),
    kind: row.kind,
    contentType: row.contentType,
    sizeBytes: row.sizeBytes,
  };
}

/** Replace the bytes of an existing asset (update). Old object is removed. */
export async function replaceMedia(
  id: string,
  input: { buffer: Buffer; contentType: string; filename?: string }
): Promise<MediaResult> {
  const existing = await db.query.mediaAssets.findFirst({ where: (t, { eq }) => eq(t.id, id) });
  if (!existing) throw new MediaNotFoundError(id);

  const newKey = storage.buildKey(existing.kind, id, extFor(input.contentType));
  await storage.put(newKey, input.buffer, input.contentType);
  if (newKey !== existing.r2Key) await storage.remove(existing.r2Key);

  const [row] = await db
    .update(s.mediaAssets)
    .set({
      r2Key: newKey,
      contentType: input.contentType,
      sizeBytes: input.buffer.length,
      originalName: input.filename ?? existing.originalName,
    })
    .where(eq(s.mediaAssets.id, id))
    .returning();

  return {
    id: row.id,
    r2Key: row.r2Key,
    url: await storage.readUrl(row.r2Key, { private: row.isPrivate }),
    kind: row.kind,
    contentType: row.contentType,
    sizeBytes: row.sizeBytes,
  };
}

/** Delete an asset from both storage and the registry. */
export async function deleteMedia(id: string): Promise<void> {
  const existing = await db.query.mediaAssets.findFirst({ where: (t, { eq }) => eq(t.id, id) });
  if (!existing) throw new MediaNotFoundError(id);
  await storage.remove(existing.r2Key);
  await db.delete(s.mediaAssets).where(eq(s.mediaAssets.id, id));
}

/**
 * Resolve a readable URL for an asset (presigned GET when private on R2).
 * Returns `isPrivate` so the caller can enforce access control before exposing
 * the URL — private assets must never be handed to an unauthenticated request.
 */
export async function getMediaUrl(id: string): Promise<{ url: string; isPrivate: boolean } | null> {
  const row = await db.query.mediaAssets.findFirst({ where: (t, { eq }) => eq(t.id, id) });
  if (!row) return null;
  return {
    url: await storage.readUrl(row.r2Key, { private: row.isPrivate }),
    isPrivate: row.isPrivate,
  };
}

export class MediaNotFoundError extends Error {
  status = 404;
  constructor(public id: string) {
    super(`Media asset not found: ${id}`);
    this.name = 'MediaNotFoundError';
  }
}
