import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import https from 'https';
import dns from 'dns';

export const dynamic = 'force-dynamic';

const agent = new https.Agent({
  keepAlive: true,
  family: 4,
  // Force IPv4 lookup to avoid intermittent ETIMEDOUT on some hosts
  // @ts-ignore - Node lookup signature compatibility
  lookup: (hostname: string, options: any, cb: any) => dns.lookup(hostname, { family: 4 }, cb),
});

const http = axios.create({
  timeout: 30_000,
  httpsAgent: agent,
  validateStatus: () => true,
});

function readAccessTokenFromCookieHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(';').map((p) => p.trim());
  const kv = parts.find((p) => p.startsWith('accessToken='));
  if (!kv) return null;
  const raw = kv.slice('accessToken='.length);
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function extractRoleFromBearer(authHeader: string | null): string {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return 'MERCHANT';
  try {
    const token = authHeader.replace('Bearer ', '');
    const [, payload] = token.split('.');
    if (!payload) return 'MERCHANT';
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
    const candidates = [
      decoded?.role,
      decoded?.userRole,
      decoded?.user_role,
      decoded?.userType,
      decoded?.user_type,
      Array.isArray(decoded?.roles) ? decoded.roles[0] : undefined,
    ]
      .filter((v: unknown) => typeof v === 'string' && String(v).trim())
      .map((v: unknown) => String(v).toUpperCase().replace(/^ROLE_/, ''));
    return candidates[0] || 'MERCHANT';
  } catch {
    return 'MERCHANT';
  }
}

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
  return `${origin}${path}`;
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

    const headers: Record<string, string> = {};
    if (!isMultipart) headers['Content-Type'] = 'application/json';
    const incomingAuth = request.headers.get('Authorization') || request.headers.get('authorization');
    const cookieHeader = request.headers.get('cookie');
    const tokenFromCookie = readAccessTokenFromCookieHeader(cookieHeader);
    const authHeader = incomingAuth || (tokenFromCookie ? `Bearer ${tokenFromCookie}` : null);
    if (authHeader) {
      headers['Authorization'] = authHeader;
      const role = extractRoleFromBearer(authHeader);
      headers['x-user-role'] = role;
      headers['x-user-type'] = role;
      headers['x-user-roles'] = role;
    }
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    try {
      const init: RequestInit = { method, headers };
      if (method !== 'GET' && method !== 'HEAD') {
        if (isMultipart) {
          // Forward raw body and Content-Type (with boundary) so the backend receives the file as-is.
          if (contentType) headers['Content-Type'] = contentType;
          const rawBody = await request.arrayBuffer();
          if (rawBody.byteLength === 0) {
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
            }
          } catch {
            // no body
          }
        }
      }

      // Use a longer timeout for uploads (large body); compliance-ms can be slow or cold-start
      const timeoutMs = isMultipart ? 120_000 : 30_000;

      const resp = await http.request({
        url,
        method,
        headers,
        data: init.body as any,
        timeout: timeoutMs,
      });

      const data =
        typeof resp.data === 'object' && resp.data !== null
          ? resp.data
          : { success: resp.status >= 200 && resp.status < 300, data: resp.data };

      return NextResponse.json(data, { status: resp.status });
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
