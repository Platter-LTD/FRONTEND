import { NextRequest, NextResponse } from 'next/server';

import { getPlataApiBaseUrl } from "@/lib/plataApiBaseUrl"
export const dynamic = 'force-dynamic';

// Base URL for all APIs (account-ms).
const BASE_URL = (getPlataApiBaseUrl()).replace(/\/+$/, '');

/**
 * GET /api/configurations/options/savings-deposit-cycle
 * Proxies to backend GET /api/v1/configurations/options/savings-deposit-cycle
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const response = await fetch(`${BASE_URL}/api/v1/configurations/options/savings-deposit-cycle`, {
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { Authorization: authHeader }),
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || data.message || 'Failed to fetch savings deposit cycle options' },
        { status: response.status || 502 },
      );
    }
    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('Savings deposit cycle options error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch savings deposit cycle options' },
      { status: 500 },
    );
  }
}

