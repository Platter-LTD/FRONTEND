import { NextRequest, NextResponse } from 'next/server';

import { getPlataApiBaseUrl } from "@/lib/plataApiBaseUrl"
export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');

        if (!authHeader) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const appId = request.nextUrl.searchParams.get("appId")?.trim();
        if (!appId) {
            return NextResponse.json(
                { success: false, error: "appId is required" },
                { status: 400 },
            );
        }

        const PRODUCT_BUILDER_URL = getPlataApiBaseUrl().replace(/\/$/, "");
        const qs = new URLSearchParams({ appId, page: "1", limit: "100" });
        const type = request.nextUrl.searchParams.get("type")?.trim();
        if (type) qs.set("type", type.toUpperCase());

        const response = await fetch(`${PRODUCT_BUILDER_URL}/api/v1/products?${qs.toString()}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                { success: false, error: data.error || 'Failed to fetch products from PLATA' },
                { status: response.status }
            );
        }

        return NextResponse.json({
            success: true,
            data: data.data || data,
        });
    } catch (error) {
        console.error('Error fetching products from PLATA:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
