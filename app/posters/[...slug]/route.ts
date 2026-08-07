import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// This route handles any /posters/... requests that didn't match a real file in public/posters/
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string[] } }
) {
  const missingPath = `/posters/${params.slug.join('/')}`;
  
  // 1. Log the missing poster image
  try {
    const logFile = path.join(process.cwd(), 'missing-images.json');
    let missingImages: string[] = [];
    
    // Read existing
    try {
      const existing = await fs.readFile(logFile, 'utf8');
      missingImages = JSON.parse(existing);
    } catch (e) {
      // File doesn't exist or is invalid JSON
    }
    
    // Add if not already present
    if (!missingImages.includes(missingPath)) {
      missingImages.push(missingPath);
      await fs.writeFile(logFile, JSON.stringify(missingImages, null, 2));
      // console.log(`[Poster Fallback] Logged missing poster: ${missingPath}`);
    }
  } catch (e) {
    console.error('Failed to log missing poster:', e);
  }

  // 2. Return the local fallback image (logo)
  try {
    const fallbackPath = path.join(process.cwd(), 'public', 'logo.png');
    const fallbackBuffer = await fs.readFile(fallbackPath);
    
    return new NextResponse(fallbackBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (e) {
    return new NextResponse('Not found and no fallback available', { status: 404 });
  }
}
