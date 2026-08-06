/**
 * Country list for Plata dropdowns.
 * Served from a bundled ISO dataset (lib/countriesData.ts) via same-origin `/api/countries`.
 * Do not call restcountries.com from the browser — that API is unreliable / often blocked.
 */

import { COUNTRIES_DATA, type CountryOption } from "@/lib/countriesData"

export type { CountryOption }

let cached: CountryOption[] | null = null
let fetchPromise: Promise<CountryOption[]> | null = null

function normalizeCountryRows(data: unknown): CountryOption[] {
  if (!Array.isArray(data)) return []
  return data
    .map((row) => {
      if (!row || typeof row !== "object") return null
      const r = row as Record<string, unknown>
      const code = String(r.code || "").trim().toLowerCase()
      const name = String(r.name || "").trim()
      const dialCode = String(r.dialCode || "").trim()
      if (!code || !name) return null
      return { code, name, dialCode }
    })
    .filter((c): c is CountryOption => c !== null)
    .sort((a, b) => a.name.localeCompare(b.name))
}

function bundledCountries(): CountryOption[] {
  return normalizeCountryRows(COUNTRIES_DATA)
}

export async function fetchCountries(): Promise<CountryOption[]> {
  if (cached?.length) return cached
  if (!fetchPromise) {
    fetchPromise = (async () => {
      try {
        // Prefer same-origin BFF (works in browser without CSP/CORS issues).
        const res = await fetch("/api/countries", { cache: "force-cache" })
        if (res.ok) {
          const mapped = normalizeCountryRows(await res.json())
          if (mapped.length) {
            cached = mapped
            return mapped
          }
        }
      } catch {
        // Fall through to bundled dataset.
      }

      const fallback = bundledCountries()
      if (!fallback.length) throw new Error("No countries available")
      cached = fallback
      return fallback
    })()
  }
  return fetchPromise
}

/** Call early (e.g. in root layout) to start loading countries before user opens a dropdown. */
export function preloadCountries(): void {
  if (!cached?.length) void fetchCountries().catch(() => undefined)
}
