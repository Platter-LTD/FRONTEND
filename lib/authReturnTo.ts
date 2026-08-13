"use client"

type SearchParamsLike = {
  get(name: string): string | null
}

const DEFAULT_SIGNIN_PATH = "/signin"

export function isSafeReturnTo(value: string | null | undefined): value is string {
  const next = String(value || "").trim()
  if (!next) return false
  if (!next.startsWith("/")) return false
  if (next.startsWith("//")) return false
  if (next.startsWith("/signin")) return false
  return true
}

export function getCurrentReturnTo(): string | null {
  if (typeof window === "undefined") return null
  const next = `${window.location.pathname}${window.location.search}${window.location.hash}`.trim()
  return isSafeReturnTo(next) ? next : null
}

export function buildSigninUrl(returnTo?: string | null): string {
  const safe = isSafeReturnTo(returnTo) ? returnTo : null
  if (!safe) return DEFAULT_SIGNIN_PATH
  const qs = new URLSearchParams({ returnTo: safe })
  return `${DEFAULT_SIGNIN_PATH}?${qs.toString()}`
}

export function readReturnTo(searchParams?: SearchParamsLike | null): string | null {
  const next = searchParams?.get("returnTo")
  return isSafeReturnTo(next) ? next : null
}
