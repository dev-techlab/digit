import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAdminIdFromRequest } from '@/lib/admin-auth';
import { requirePermission } from '@/lib/rbac-core';
import { sanitizeHtml } from '@/lib/sanitize-html';
import { revalidatePath } from 'next/cache';

async function authorize(req: Request, permKey: string) {
  const adminId = await getAdminIdFromRequest(req);
  if (!adminId) {
    return { adminId: undefined, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  try {
    await requirePermission(adminId, permKey);
  } catch {
    return { adminId, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { adminId, error: undefined };
}

export async function GET(req: Request) {
  const { error } = await authorize(req, 'content_pages.read');
  if (error) return error;

  try {
    const pages = await db.content_pages.findMany({
      orderBy: { slug: 'asc' },
    });
    return NextResponse.json(pages);
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    console.error('Failed to fetch content pages:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const { error } = await authorize(req, 'content_pages.write');
  if (error) return error;

  try {
    const { slug, body } = await req.json();
    if (!slug || typeof body !== 'string') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const sanitizedBody = sanitizeHtml(body);

    const updated = await db.content_pages.update({
      where: { slug },
      data: { body: sanitizedBody },
    });

    revalidatePath(`/${slug}`);

    return NextResponse.json(updated);
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    console.error('Failed to update content page:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
