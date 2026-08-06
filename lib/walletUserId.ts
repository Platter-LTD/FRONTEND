import { getAccessToken } from "@/lib/cookieAuth"

export function getUserIdFromAccessToken(): string | null {
  if (typeof window === "undefined") return null
  const token = getAccessToken()
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split(".")[1]))
    return payload.userId || payload.id || payload.sub || null
  } catch {
    return null
  }
}
