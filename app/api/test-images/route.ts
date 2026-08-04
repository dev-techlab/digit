import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const providers = await db.game_providers.findMany({
    select: { name: true, icon_url: true }
  });
  return NextResponse.json(providers);
}
