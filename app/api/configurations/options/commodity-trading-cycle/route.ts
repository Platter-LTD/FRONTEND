import { NextRequest, NextResponse } from 'next/server';

import { getPlataApiBaseUrl } from "@/lib/plataApiBaseUrl"
export const dynamic = 'force-dynamic';

// Base URL for all APIs (account-ms).
const BASE_URL = (getPlataApiBaseUrl()).replace(/\/+$/, '');

/**
 * GET /api/configurations/options/commodity-trading-cycle
 * Proxies to backend GET /api/v1/configurations/options/commodity-trading-cycle
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const response = await fetch(`${BASE_URL}/api/v1/configurations/options/commodity-trading-cycle`, {
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { Authorization: authHeader }),
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || data.message || 'Failed to fetch commodity trading cycle options' },
        { status: response.status || 502 },
      );
    }
    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('Commodity trading cycle options error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch commodity trading cycle options' },
      { status: 500 },
    );
  }
}

