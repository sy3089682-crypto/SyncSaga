import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_DOMAINS = [
  's4.anilist.co',
  'img.anili.st',
  'cdn.myanimelist.net',
  'api.anilist.co',
  'cdn.discordapp.com',
  'avatars.githubusercontent.com',
  'lh3.googleusercontent.com',
  'i.giphy.com',
  'media.tenor.com',
];

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');

  if (!url) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  try {
    const parsed = new URL(url);

    const isAllowed = ALLOWED_DOMAINS.some(d => parsed.hostname === d || parsed.hostname.endsWith('.' + d));
    if (!isAllowed) {
      return new NextResponse('Domain not allowed', { status: 403 });
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'SyncSaga/1.0',
        'Accept': 'image/webp,image/avif,image/*,*/*',
      },
    });

    if (!response.ok) {
      return new NextResponse('Failed to fetch image', { status: response.status });
    }

    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'public, max-age=86400');
    headers.set('CDN-Cache-Control', 'public, max-age=86400');
    headers.set('Access-Control-Allow-Origin', '*');

    return new NextResponse(response.body, {
      status: response.status,
      headers,
    });
  } catch {
    return new NextResponse('Invalid URL', { status: 400 });
  }
}
