import { NextResponse } from "next/server"

import { COUNTRIES_DATA } from "@/lib/countriesData"

export const runtime = "nodejs"
export const dynamic = "force-static"

/**
 * Same-origin country list for signup / settings dropdowns.
 * Bundled ISO data — no dependency on restcountries.com (often fails in production).
 */
export async function GET() {
  return NextResponse.json(COUNTRIES_DATA, {
    headers: {
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  })
}
