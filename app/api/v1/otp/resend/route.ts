import { NextRequest, NextResponse } from 'next/server';
import { BACKEND } from '@/lib/endpoints';

import { getPlataApiBaseUrl } from "@/lib/plataApiBaseUrl"
export const dynamic = 'force-dynamic';

const BASE_URL = (getPlataApiBaseUrl())
  .replace(/\/+$/, '')
  .replace(/\/(api\/v1?)?\/?$/, '');

/**
 * POST /api/v1/otp/resend — Public (no auth).
 * Accepts:
 * - { email }
 * - { identifier }
 * - { identifier, channel, purpose }
 * Proxies to backend POST /api/v1/otp/resend.
 */
export async function POST(request: NextRequest) {
  const url = `${BASE_URL}${BACKEND.otp.resend}`;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const payload: Record<string, unknown> = {};

    const identifier = (body.identifier as string) ?? (body.email as string);
    if (identifier) {
      payload.identifier = identifier;
    }
    if (body.channel) {
      payload.channel = body.channel;
    }
    if (body.purpose) {
      payload.purpose = body.purpose;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({ success: false, error: 'Invalid JSON from backend' }));
    return NextResponse.json(data, { status: res.status });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to resend OTP';
    console.error('[otp/resend] send code: FAILED', msg, 'URL:', url);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
