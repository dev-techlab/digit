import { NextResponse } from 'next/server';
import { getAdminIdFromRequest } from '@/lib/admin-auth';
import { requirePermission, PermissionError } from '@/lib/rbac';
import { uploadMedia, ALLOWED_UPLOAD_TYPES } from '@/lib/media';
import { mediaKindEnum } from '@/lib/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const KINDS = new Set(mediaKindEnum.enumValues);

/** POST /api/media — multipart upload (field `file`, `kind`, optional `private`). */
export async function POST(req: Request) {
  const adminId = await getAdminIdFromRequest(req);
  if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await requirePermission(adminId, 'media.upload');

    // Reject oversized bodies before buffering the whole multipart into memory.
    const declaredLen = Number(req.headers.get('content-length') ?? 0);
    if (declaredLen > MAX_BYTES + 8192) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 413 });
    }

    const form = await req.formData();
    const file = form.get('file');
    const kind = String(form.get('kind') ?? 'other');
    const isPrivate = form.get('private') === 'true';

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }
    if (!KINDS.has(kind as never)) {
      return NextResponse.json({ error: `Invalid kind "${kind}"` }, { status: 400 });
    }
    if (!ALLOWED_UPLOAD_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `Unsupported content type "${file.type}"` },
        { status: 415 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadMedia({
      buffer,
      contentType: file.type || 'application/octet-stream',
      kind: kind as never,
      filename: file.name,
      uploadedByAdminId: adminId,
      isPrivate,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof PermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error('POST /api/media', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
