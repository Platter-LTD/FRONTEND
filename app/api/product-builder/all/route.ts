import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');

        if (!authHeader) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const PRODUCT_BUILDER_URL = process.env.NEXT_PUBLIC_API_URL || 'https://account-ms.fly.dev';

        const response = await fetch(`${PRODUCT_BUILDER_URL}/api/products/all`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                { success: false, error: data.error || 'Failed to fetch products from Product Builder' },
                { status: response.status }
            );
        }

        return NextResponse.json({
            success: true,
            data: data.data || data,
        });
    } catch (error) {
        console.error('Error fetching products from Product Builder:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
