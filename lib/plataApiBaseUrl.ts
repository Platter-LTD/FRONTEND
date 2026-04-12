/**
 * Single backend origin for Plata (account-ms + product APIs behind the same host).
 * Set `NEXT_PUBLIC_API_URL` in `.env` (no trailing slash required).
 */
export const PLATA_API_BASE_FALLBACK = "https://account-ms-plata.fly.dev"

export function getPlataApiBaseUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL || PLATA_API_BASE_FALLBACK).trim()
  return raw.replace(/\/+$/, "")
}
