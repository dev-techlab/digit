import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { mediaKindEnum } from '@/lib/db/schema';

type MediaKind = (typeof mediaKindEnum.enumValues)[number];

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET = 'digitlink-media',
  R2_PUBLIC_BASE_URL = '',
} = process.env;

export function isR2Configured(): boolean {
  return Boolean(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);
}

/** Folder prefix per media kind (matches DB_DIAGRAM §8). */
export const PREFIX: Record<MediaKind, string> = {
  avatar: 'avatars',
  provider_icon: 'providers',
  banner: 'banners',
  logo: 'branding',
  social_icon: 'social',
  content: 'content',
  kyc_doc: 'kyc',
  other: 'misc',
};

let _client: S3Client | null = null;

function client(): S3Client {
  if (!isR2Configured()) {
    throw new Error('R2 is not configured — set R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY');
  }
  if (!_client) {
    _client = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID!,
        secretAccessKey: R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return _client;
}

/** Build the object key for a new upload, e.g. `avatars/<uuid>.webp`. */
export function buildKey(kind: MediaKind, id: string, ext: string): string {
  return `${PREFIX[kind]}/${id}.${ext.replace(/^\./, '')}`;
}

/** Public CDN URL for a stored object (only valid for non-private assets). */
export function publicUrl(r2Key: string): string {
  return `${R2_PUBLIC_BASE_URL.replace(/\/$/, '')}/${r2Key}`;
}

/** Server-side upload of a buffer to R2. */
export async function putObject(r2Key: string, body: Buffer, contentType: string): Promise<void> {
  await client().send(
    new PutObjectCommand({ Bucket: R2_BUCKET, Key: r2Key, Body: body, ContentType: contentType })
  );
}

/** Presigned PUT so the browser uploads bytes straight to R2 (never via us). */
export function presignUpload(r2Key: string, contentType: string, expiresIn = 300) {
  return getSignedUrl(
    client(),
    new PutObjectCommand({ Bucket: R2_BUCKET, Key: r2Key, ContentType: contentType }),
    { expiresIn }
  );
}

/** Short-lived presigned GET for private assets (e.g. KYC docs). */
export function presignDownload(r2Key: string, expiresIn = 300) {
  return getSignedUrl(
    client(),
    new GetObjectCommand({ Bucket: R2_BUCKET, Key: r2Key }),
    { expiresIn }
  );
}

export async function deleteObject(r2Key: string): Promise<void> {
  await client().send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: r2Key }));
}
