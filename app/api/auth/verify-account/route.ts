import { NextRequest, NextResponse } from 'next/server';
import { BACKEND } from '@/lib/endpoints';

export const dynamic = 'force-dynamic';

const AUTH_MS_URL = process.env.NEXT_PUBLIC_API_URL || 'https://account-ms.fly.dev';

// POST - Proxy verify-account request to auth microservice
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        console.log('[Auth Verify Proxy] POST - Forwarding verify-account request');

        const response = await fetch(`${AUTH_MS_URL}${BACKEND.auth.verifyAccount}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
      
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(data, { status: response.status });
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('[Auth Verify Proxy] Error:', error.message);
        return NextResponse.json(
            { success: false, error: error.message || 'Verification failed' },
            { status: 500 }
        );
    }
}
