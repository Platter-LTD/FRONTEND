import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getComplianceOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_API_URL ||
    'https://account-ms.fly.dev';
  const url = raw.replace(/\/+$/, '').trim();
  try {
    const withProtocol = url.startsWith('http') ? url : `https://${url}`;
    const u = new URL(withProtocol);
    return u.origin;
  } catch {
    const withoutPath = url.replace(/\/(api(\/v1)?)?\/?.*$/i, '').replace(/\/+$/, '');
    return withoutPath || url;
  }
}

/** Build full URL: {origin}/api/v1/kyc/{...pathSegments} — v1 is never omitted. */
function buildComplianceUrl(pathSegments: string[]): string {
  const origin = getComplianceOrigin().replace(/\/+$/, '');
  const pathParts = ['api', 'v1', 'kyc', ...pathSegments];
  const path = '/' + pathParts.join('/');
  const full = `${origin}${path}`;
  if (process.env.NODE_ENV === 'development') {
    console.log('[Compliance] outgoing URL:', full);
  }
  return full;
}

/**
 * Compliance class: proxies all KYC/compliance requests to the compliance microservice.
 * Forwards method, Authorization header, and body. Call Compliance.proxy(request, pathSegments).
 */
export class Compliance {
  /**
   * Proxy the request to the compliance service at /api/v1/kyc/{pathSegments.join('/')}.
   * Handles JSON body or multipart/form-data (e.g. for /upload).
   */
  static async proxy(request: NextRequest, pathSegments: string[]) {
    const pathKey = pathSegments.join('/');
    const url = buildComplianceUrl(pathSegments);
    const method = request.method;
    const contentType = request.headers.get('Content-Type') ?? '';
    const isMultipart = contentType.includes('multipart/form-data');

    console.log('[Compliance] proxy start:', { method, path: pathKey, contentType: contentType.slice(0, 50), isMultipart });

    const headers: Record<string, string> = {};
    if (!isMultipart) headers['Content-Type'] = 'application/json';
    const authHeader = request.headers.get('Authorization');
    if (authHeader) headers['Authorization'] = authHeader;

    try {
      const init: RequestInit = { method, headers };
      if (method !== 'GET' && method !== 'HEAD') {
        if (isMultipart) {
          // Forward raw body and Content-Type (with boundary) so the backend receives the file as-is.
          if (contentType) headers['Content-Type'] = contentType;
          console.log('[Compliance] reading multipart body...');
          const rawBody = await request.arrayBuffer();
          console.log('[Compliance] body size:', rawBody.byteLength, 'bytes');
          if (rawBody.byteLength === 0) {
            console.log('[Compliance] body empty, returning 400');
            return NextResponse.json(
              { success: false, error: 'No file uploaded. Send a single file in the "file" field.' },
              { status: 400 }
            );
          }
          init.body = rawBody;
        } else {
          try {
            const body = await request.text();
            if (body) {
              init.body = body;
              if (pathKey === 'business/submit') {
                try {
                  const parsed = JSON.parse(body) as { businessDocuments?: Array<{ type?: string }> };
                  const bd = parsed?.businessDocuments;
                  console.log('[Compliance] proxy received business/submit body length:', body.length);
                  console.log('[Compliance] proxy parsed businessDocuments:', Array.isArray(bd) ? bd.length : 'not array', 'types:', Array.isArray(bd) ? bd.map((d) => d?.type) : bd);
                } catch {
                  console.log('[Compliance] proxy business/submit body parse failed (non-JSON or invalid)');
                }
              }
              if (pathKey === 'business/beneficial-owners' && method === 'PUT') {
                try {
                  const parsed = JSON.parse(body) as unknown;
                  const arr = Array.isArray(parsed) ? parsed : (parsed as { shareholders?: unknown[] })?.shareholders;
                  const count = Array.isArray(arr) ? arr.length : 'not array';
                  const first = Array.isArray(arr) && arr.length > 0 ? arr[0] : null;
                  const firstKeys = first && typeof first === 'object' && first !== null ? Object.keys(first as object).filter((k) => k !== 'documents' && k !== 'fileData') : [];
                  const docKeys = first && typeof first === 'object' && first !== null && 'documents' in first ? (() => {
                    const docs = (first as { documents?: unknown[] }).documents;
                    return Array.isArray(docs) && docs.length > 0 && typeof docs[0] === 'object' && docs[0] !== null ? Object.keys(docs[0] as object) : [];
                  })() : [];
                  console.log('[Compliance] PUT beneficial-owners body: payload is array?', Array.isArray(parsed), 'length/count:', count, 'first item keys:', firstKeys, 'documents[0] keys:', docKeys);
                } catch (e) {
                  console.log('[Compliance] PUT beneficial-owners body parse failed:', e);
                }
              }
            }
          } catch {
            // no body
          }
        }
      }

      // Use a longer timeout for uploads (large body); compliance-ms can be slow or cold-start
      const timeoutMs = isMultipart ? 120_000 : 30_000;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      init.signal = controller.signal;

      console.log('[Compliance] calling compliance service:', url, '(timeout', timeoutMs / 1000, 's)');
      let res: Response;
      try {
        res = await fetch(url, init);
      } finally {
        clearTimeout(timeoutId);
      }
      console.log('[Compliance] response:', res.status, res.statusText, 'ok:', res.ok);

      const data = await res.json().catch(() => ({ success: false, error: 'Invalid JSON from compliance service' }));
      if (pathKey === 'business/submit' && !res.ok) {
        console.log('[Compliance] business/submit error response:', data);
      }
      if (pathKey === 'business/beneficial-owners' && !res.ok) {
        console.log('[Compliance] business/beneficial-owners error response:', JSON.stringify(data));
      }
      return NextResponse.json(data, { status: res.status });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Compliance request failed';
      const errCause = err instanceof Error && (err as Error & { cause?: unknown }).cause;
      const errName = err instanceof Error ? err.name : undefined;
      console.error('[Compliance] proxy FAILED:', {
        path: pathKey,
        url,
        message: msg,
        name: errName,
        cause: errCause,
        causeString: errCause != null ? String(errCause) : undefined,
        fullError: err,
      });
      return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
  }
}

type RouteParams = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const path = await params.then((p) => p.path);
  return Compliance.proxy(request, path);
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const path = await params.then((p) => p.path);
  return Compliance.proxy(request, path);
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const path = await params.then((p) => p.path);
  return Compliance.proxy(request, path);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const path = await params.then((p) => p.path);
  return Compliance.proxy(request, path);
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const path = await params.then((p) => p.path);
  return Compliance.proxy(request, path);
}
