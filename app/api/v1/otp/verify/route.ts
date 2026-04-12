import { NextRequest, NextResponse } from 'next/server';
import { BACKEND } from '@/lib/endpoints';

import { getPlataApiBaseUrl } from "@/lib/plataApiBaseUrl"
export const dynamic = 'force-dynamic';

const BASE_URL = (getPlataApiBaseUrl())
  .replace(/\/+$/, '')
  .replace(/\/(api\/v1?)?\/?$/, '');

/**
 * POST /api/v1/otp/verify — Bearer (usually).
 * Proxies to backend POST /api/v1/otp/verify, forwarding body and Authorization header.
 */
export async function POST(request: NextRequest) {
  const url = `${BASE_URL}${BACKEND.otp.verify}`;
  try {
    const authHeader = request.headers.get('Authorization');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authHeader) headers['Authorization'] = authHeader;

    const body = await request.json().catch(() => ({}));

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({ success: false, error: 'Invalid JSON from backend' }));
    return NextResponse.json(data, { status: res.status });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to verify OTP';
    console.error('[otp/verify]', msg, 'URL:', url);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

