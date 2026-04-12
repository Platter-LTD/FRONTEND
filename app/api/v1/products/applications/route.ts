import { NextRequest, NextResponse } from "next/server"

import { getPlataApiBaseUrl } from "@/lib/plataApiBaseUrl"
export const dynamic = "force-dynamic"

const BASE_URL = (getPlataApiBaseUrl()).replace(/\/+$/, "")

// GET /api/v1/products/applications?appId=...&userId=...
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ success: false, error: "Authorization required" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const qs = searchParams.toString()
    const target = `${BASE_URL}/api/v1/products/applications${qs ? `?${qs}` : ""}`

    const response = await fetch(target, {
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || data.message || "Failed to fetch product applications" },
        { status: response.status || 502 },
      )
    }

    return NextResponse.json(data)
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: (error as Error)?.message || "Failed to fetch product applications" }, { status: 500 })
  }
}

// POST /api/v1/products/applications
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ success: false, error: "Authorization required" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))

    const response = await fetch(`${BASE_URL}/api/v1/products/applications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(body),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || data.message || "Failed to create product application snapshot" },
        { status: response.status || 502 },
      )
    }

    return NextResponse.json(data)
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: (error as Error)?.message || "Failed to create product application snapshot" }, { status: 500 })
  }
}

