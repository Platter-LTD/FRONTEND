import { NextRequest, NextResponse } from 'next/server';
import https from 'node:https';
import axios, { type AxiosRequestConfig, type Method } from 'axios';
import { getPlataApiBaseUrl } from '@/lib/plataApiBaseUrl';

export const dynamic = 'force-dynamic';

/** Prefer IPv4 — avoids Node `fetch` ETIMEDOUT / AggregateError to Fly.io (same as auth proxy). */
const httpsAgent = new https.Agent({
  family: 4,
  keepAlive: true,
});

function getComplianceOrigin(): string {
  const url = getPlataApiBaseUrl().replace(/\/+$/, '').trim();
  try {
    const withProtocol = url.startsWith('http') ? url : `https://${url}`;
    return new URL(withProtocol).origin;
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
      let forwardBody: string | Buffer | undefined;

      if (method !== 'GET' && method !== 'HEAD') {
        if (isMultipart) {
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
          forwardBody = Buffer.from(rawBody);
        } else {
          try {
            const body = await request.text();
            if (body) {
              forwardBody = body;
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

      const timeoutMs = isMultipart ? 120_000 : 30_000;

      const axiosConfig: AxiosRequestConfig = {
        method: method as Method,
        url,
        headers,
        httpsAgent,
        timeout: timeoutMs,
        validateStatus: () => true,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      };
      if (forwardBody !== undefined) {
        axiosConfig.data = forwardBody;
      }

      console.log('[Compliance] calling compliance service:', url, '(timeout', timeoutMs / 1000, 's)');
      const res = await axios(axiosConfig);
      console.log('[Compliance] response:', res.status, res.statusText, 'ok:', res.status >= 200 && res.status < 300);

      const data =
        res.data !== undefined && res.data !== null && typeof res.data === 'object'
          ? res.data
          : { success: false, error: 'Invalid or empty JSON from compliance service' };
      const upstreamError = res.status < 200 || res.status >= 300;
      if (pathKey === 'business/submit' && upstreamError) {
        console.log('[Compliance] business/submit error response:', data);
      }
      if (pathKey === 'business/beneficial-owners' && upstreamError) {
        console.log('[Compliance] business/beneficial-owners error response:', JSON.stringify(data));
      }
      return NextResponse.json(data, { status: res.status });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Compliance request failed';
      const errCause = err instanceof Error && (err as Error & { cause?: unknown }).cause;
      const errName = err instanceof Error ? err.name : undefined;
      const axiosCode = axios.isAxiosError(err) ? err.code : undefined;
      console.error('[Compliance] proxy FAILED:', {
        path: pathKey,
        url,
        message: msg,
        name: errName,
        axiosCode,
        cause: errCause,
        causeString: errCause != null ? String(errCause) : undefined,
        fullError: err,
      });
      const timedOut =
        axiosCode === 'ETIMEDOUT' ||
        axiosCode === 'ECONNABORTED' ||
        (errCause != null &&
          typeof errCause === 'object' &&
          'code' in errCause &&
          (errCause as { code?: string }).code === 'ETIMEDOUT');
      if (timedOut) {
        return NextResponse.json(
          {
            success: false,
            error: 'Compliance service timed out. Check your network or try again in a moment.',
          },
          { status: 504 },
        );
      }
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
