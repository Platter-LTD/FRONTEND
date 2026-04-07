/**
 * Optional dedicated base URL for product APIs when they run on a different host than auth.
 * Otherwise uses NEXT_PUBLIC_API_URL (same as the rest of the Spring account-ms integration).
 *
 * Priority: ACCOUNT_MS_PLATA_URL → NEXT_PUBLIC_ACCOUNT_MS_PLATA_URL → NEXT_PUBLIC_API_URL → default.
 */
export function getAccountMsPlataBaseUrl(): string {
  return (
    process.env.ACCOUNT_MS_PLATA_URL ||
    process.env.NEXT_PUBLIC_ACCOUNT_MS_PLATA_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "https://account-ms.fly.dev"
  ).replace(/\/$/, "")
}
