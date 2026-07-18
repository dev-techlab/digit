import { NextResponse } from 'next/server';
import { getAdminIdFromRequest } from '@/lib/admin-auth';
import { requirePermission, PermissionError } from '@/lib/rbac';
import {
  replaceMedia,
  deleteMedia,
  getMediaUrl,
  ALLOWED_UPLOAD_TYPES,
  MediaNotFoundError,
} from '@/lib/media';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 10 * 1024 * 1024; // 10MB — matches POST /api/media

type Ctx = { params: { id: string } };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const notFound = () => NextResponse.json({ error: 'Not found' }, { status: 404 });

/** GET /api/media/:id — resolve a readable URL. Public assets are open;
 *  private assets require an authenticated admin (no anon presigning). */
export async function GET(req: Request, { params }: Ctx) {
  if (!UUID_RE.test(params.id)) return notFound();
  const media = await getMediaUrl(params.id);
  if (!media) return notFound();
  if (media.isPrivate && !(await getAdminIdFromRequest(req))) {
    // Don't confirm the asset exists to an unauthenticated caller.
    return notFound();
  }
  return NextResponse.json({ url: media.url });
}

/** PUT /api/media/:id — replace the bytes of an existing asset (field `file`). */
export async function PUT(req: Request, { params }: Ctx) {
  const adminId = await getAdminIdFromRequest(req);
  if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!UUID_RE.test(params.id)) return notFound();
  try {
    await requirePermission(adminId, 'media.upload');

    // Reject oversized bodies before buffering the whole multipart into memory.
    const declaredLen = Number(req.headers.get('content-length') ?? 0);
    if (declaredLen > MAX_BYTES + 8192) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 413 });
    }

    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
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
    const result = await replaceMedia(params.id, {
      buffer,
      contentType: file.type || 'application/octet-stream',
      filename: file.name,
    });
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err, 'PUT /api/media/:id');
  }
}

/** DELETE /api/media/:id — remove from storage + registry. */
export async function DELETE(req: Request, { params }: Ctx) {
  const adminId = await getAdminIdFromRequest(req);
  if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!UUID_RE.test(params.id)) return notFound();
  try {
    await requirePermission(adminId, 'media.delete');
    await deleteMedia(params.id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return errorResponse(err, 'DELETE /api/media/:id');
  }
}

function errorResponse(err: unknown, where: string) {
  if (err instanceof PermissionError) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
  if (err instanceof MediaNotFoundError) {
    return NextResponse.json({ error: err.message }, { status: 404 });
  }
  console.error(where, err);
  return NextResponse.json({ error: 'Request failed' }, { status: 500 });
}
