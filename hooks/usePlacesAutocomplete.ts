"use client"

import { useEffect, useState } from "react"

/**
 * Google Places Autocomplete (New), biased to Nigeria. Ported from Filop station-admin.
 * Needs NEXT_PUBLIC_GOOGLE_PLACES_KEY with "Places API (New)" enabled.
 */

export interface PlaceSuggestion {
  placeId: string
  mainText: string
  secondaryText: string
  /** Full address text from Google, saved as the shareholder's `address`. */
  description: string
}

interface RawPrediction {
  placePrediction?: {
    placeId: string
    text?: { text: string }
    structuredFormat?: { mainText?: { text: string }; secondaryText?: { text: string } }
  }
}

const PLACES_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY ?? ""

export const placesConfigured = PLACES_KEY !== ""

/** @param enabled `false` pauses lookups, e.g. once the user has picked a suggestion. */
export function usePlacesAutocomplete(query: string, enabled = true) {
  const [debounced, setDebounced] = useState(query.trim())
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 350)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    if (!enabled || debounced.length < 3 || !PLACES_KEY) {
      setSuggestions([])
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    ;(async () => {
      setIsLoading(true)
      setError(null)
      try {
        const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json", "X-Goog-Api-Key": PLACES_KEY },
          body: JSON.stringify({ input: debounced, regionCode: "NG", languageCode: "en" }),
        })
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
          throw new Error(body?.error?.message ?? `Places API error ${res.status}`)
        }
        const data = (await res.json()) as { suggestions?: RawPrediction[] }
        setSuggestions(
          (data.suggestions ?? [])
            .map((s): PlaceSuggestion | null => {
              const p = s.placePrediction
              if (!p) return null
              return {
                placeId: p.placeId,
                mainText: p.structuredFormat?.mainText?.text ?? p.text?.text ?? "",
                secondaryText: p.structuredFormat?.secondaryText?.text ?? "",
                description: p.text?.text ?? "",
              }
            })
            .filter((x): x is PlaceSuggestion => x !== null),
        )
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return
        setError(err instanceof Error ? err.message : "Failed to fetch suggestions")
        setSuggestions([])
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    })()

    return () => controller.abort()
  }, [debounced, enabled])

  return { suggestions, isLoading, error }
}
