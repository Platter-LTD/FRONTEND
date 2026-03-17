import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Base URL for all APIs (account-ms). Doc: GET /api/v1/products, GET /api/v1/products/active
const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://account-ms-plata.fly.dev').replace(/\/$/, '');

// GET - Fetch products for mobile app display (optionally filtered by type)
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');

        const response = await fetch(`${BASE_URL}/api/v1/products`, {
            headers: {
                'Content-Type': 'application/json',
            },
            next: { revalidate: 30 } // cache for 30s to reduce cold starts
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                { success: false, error: data.error || data.message || 'Failed to fetch products' },
                { status: response.status }
            );
        }

        // Filter by type if provided
        let products = data.data || [];
        if (type) {
            products = products.filter((p: any) => p.type === type);
        }

        return NextResponse.json({ success: true, data: products });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to fetch products' },
            { status: 500 }
        );
    }
}
