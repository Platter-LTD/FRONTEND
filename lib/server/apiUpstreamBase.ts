/**
 * Backend base URL for Next.js API route proxies.
 * Use the same `.env` value as the rest of the app (`NEXT_PUBLIC_API_URL`), e.g. app/api/apps/route.ts and product routes.
 */
export function getApiUpstreamBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL || "https://account-ms-plata.fly.dev").replace(/\/$/, "")
}
