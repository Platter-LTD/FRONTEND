/** sessionStorage keys for forgot-password → OTP → reset flow */
export const FORGOT_PASSWORD_EMAIL_KEY = "plata_forgot_password_email"
export const PASSWORD_RESET_TOKEN_KEY = "plata_password_reset_token"

/**
 * OTP purpose sent to `/api/v1/otp/verify` and resend; must match account-ms / client-auth-ms.
 * Override with `NEXT_PUBLIC_PASSWORD_RESET_OTP_PURPOSE` if your backend uses a different value.
 */
export function getPasswordResetOtpPurpose(): string {
  return (process.env.NEXT_PUBLIC_PASSWORD_RESET_OTP_PURPOSE || "password_reset").trim() || "password_reset"
}

export function pickPasswordResetToken(payload: unknown): string | null {
  if (payload == null || typeof payload !== "object") return null
  const root = payload as Record<string, unknown>
  const data = (root.data ?? root) as Record<string, unknown>
  const nested = data && typeof data === "object" && data !== null ? (data.data as Record<string, unknown> | undefined) : undefined

  const candidates = [
    data?.resetToken,
    data?.reset_token,
    data?.token,
    data?.verificationToken,
    nested?.resetToken,
    nested?.reset_token,
    nested?.token,
    root.resetToken,
    root.reset_token,
    root.token,
  ]
  for (const c of candidates) {
    if (typeof c === "string" && c.trim().length > 0) return c.trim()
  }
  return null
}
