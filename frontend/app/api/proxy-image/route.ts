import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Proxies an image URL server-side to avoid browser CORS restrictions.
// S3-hosted images have no CORS headers allowing browser blob fetch.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const urlParam = request.nextUrl.searchParams.get('url');
  if (!urlParam) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  let targetUrl: string;
  try {
    // Resolve relative URLs against the API gateway
    if (urlParam.startsWith('/')) {
      const apiGateway = (
        process.env.API_GATEWAY_INTERNAL_URL ??
        process.env.API_GATEWAY_URL ??
        'http://localhost:3000'
      ).replace(/\/$/, '');
      targetUrl = `${apiGateway}${urlParam}`;
    } else {
      // Validate it's an http(s) URL
      const parsed = new URL(urlParam);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return NextResponse.json({ error: 'Invalid URL protocol' }, { status: 400 });
      }
      targetUrl = urlParam;
    }
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  try {
    const resp = await fetch(targetUrl);
    if (!resp.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: resp.status });
    }

    const contentType = resp.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'Not an image' }, { status: 400 });
    }

    const buffer = await resp.arrayBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Proxy fetch failed' }, { status: 502 });
  }
}
