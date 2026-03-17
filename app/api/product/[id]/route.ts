import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Product Builder: base URL for all APIs (account-ms).
// Endpoints per Product API doc: GET/PUT/DELETE /api/v1/products/:id
const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://account-ms-plata.fly.dev').replace(/\/$/, '');

// GET - Get product by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Authorization required' },
        { status: 401 }
      );
    }

    const response = await fetch(
      `${BASE_URL}/api/v1/products/${id}`,
      {
        headers: {
          'Authorization': authHeader,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || data.message || 'Failed to fetch product' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching product:', error.message);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch product',
      },
      { status: 500 }
    );
  }
}

// PUT - Update product
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Authorization required' },
        { status: 401 }
      );
    }

    const response = await fetch(
      `${BASE_URL}/api/v1/products/${id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || data.message || 'Failed to update product' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error updating product:', error.message);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update product',
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete product
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Authorization required' },
        { status: 401 }
      );
    }

    const response = await fetch(
      `${BASE_URL}/api/v1/products/${id}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': authHeader,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || data.message || 'Failed to delete product' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error deleting product:', error.message);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete product',
      },
      { status: 500 }
    );
  }
}
