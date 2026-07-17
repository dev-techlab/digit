import { NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';
import { getAgentFromRequest } from '@/lib/agent-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const optStr = (v: unknown) => {
  const t = str(v);
  return t === '' ? null : t;
};

/** GET /api/agent/platforms — full catalog (active + inactive) for management. */
export async function GET(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const platforms = await db
    .select()
    .from(s.gamePlatforms)
    .orderBy(asc(s.gamePlatforms.sort), asc(s.gamePlatforms.name));
  return NextResponse.json({ platforms });
}

/** POST /api/agent/platforms — create a new platform in the catalog. */
export async function POST(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const name = str(body.name);
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });
  const slug = str(body.slug) || slugify(name);
  if (!slug) return NextResponse.json({ error: 'invalid name/slug' }, { status: 400 });

  try {
    const [row] = await db
      .insert(s.gamePlatforms)
      .values({
        name,
        slug,
        iconUrl: optStr(body.iconUrl),
        providerCode: optStr(body.providerCode),
        providerType: optStr(body.providerType),
        launchUrl: optStr(body.launchUrl),
        sort: Number.isFinite(Number(body.sort)) ? Number(body.sort) : 0,
        isActive: typeof body.isActive === 'boolean' ? body.isActive : true,
      })
      .returning();
    return NextResponse.json({ platform: row }, { status: 201 });
  } catch {
    // Unique violation on name/slug, etc.
    return NextResponse.json({ error: 'A platform with that name or slug already exists' }, { status: 409 });
  }
}

/** PUT /api/agent/platforms — update an existing platform ({ id, ...fields }). */
export async function PUT(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const id = str(body.id);
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const set: Partial<typeof s.gamePlatforms.$inferInsert> = {};
  if (str(body.name)) set.name = str(body.name);
  if (str(body.slug)) set.slug = slugify(str(body.slug));
  if ('iconUrl' in body) set.iconUrl = optStr(body.iconUrl);
  if ('providerCode' in body) set.providerCode = optStr(body.providerCode);
  if ('providerType' in body) set.providerType = optStr(body.providerType);
  if ('launchUrl' in body) set.launchUrl = optStr(body.launchUrl);
  if (body.sort != null && Number.isFinite(Number(body.sort))) set.sort = Number(body.sort);
  if (typeof body.isActive === 'boolean') set.isActive = body.isActive;

  if (Object.keys(set).length === 0) {
    return NextResponse.json({ error: 'no fields to update' }, { status: 400 });
  }

  try {
    const [row] = await db
      .update(s.gamePlatforms)
      .set(set)
      .where(eq(s.gamePlatforms.id, id))
      .returning();
    if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json({ platform: row });
  } catch {
    return NextResponse.json({ error: 'A platform with that name or slug already exists' }, { status: 409 });
  }
}

/**
 * DELETE /api/agent/platforms?id=... — deactivate a platform (soft delete).
 * Kept soft so existing store_platform_accounts / transactions stay intact.
 */
export async function DELETE(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = new URL(req.url).searchParams.get('id') ?? '';
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const [row] = await db
    .update(s.gamePlatforms)
    .set({ isActive: false })
    .where(eq(s.gamePlatforms.id, id))
    .returning();
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
