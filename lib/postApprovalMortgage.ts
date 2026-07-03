/**
 * Post-approval mortgage fulfillment state (mirrors product-ms postApprovalFulfillment).
 */

export type PostApprovalMortgageStatus =
  | "offer_pending"
  | "offer_accepted"
  | "appointment_scheduled"
  | "inspection_in_progress"
  | "down_payment_pending"
  | "down_payment_paid"
  | "down_payment_confirmed"
  | "contract_issued"
  | "contract_signed"
  | "disbursed"
  | "offer_declined"
  | "inspection_declined"

export type PostApprovalFulfillment = {
  status?: PostApprovalMortgageStatus
  updatedAt?: string
  offerAcceptedAt?: string
  appointmentScheduledAt?: string
  inspectionStartedAt?: string
  inspectionCompletedAt?: string
  downPaymentPaidAt?: string
  downPaymentConfirmedAt?: string
  contractIssuedAt?: string
  contractSignedAt?: string
  disbursedAt?: string
  bankDetails?: {
    merchantReference?: string
    accountNumber?: string
    bankName?: string
    amount?: number
    currency?: string
  }
}

export function extractPostApprovalFulfillment(raw: Record<string, unknown>): PostApprovalFulfillment | null {
  const paf = raw.postApprovalFulfillment
  if (!paf || typeof paf !== "object") return null
  return paf as PostApprovalFulfillment
}

export function postApprovalStatus(
  raw: Record<string, unknown>,
): PostApprovalMortgageStatus | undefined {
  return extractPostApprovalFulfillment(raw)?.status
}

export function isTerminalPostApproval(status?: string): boolean {
  const s = String(status || "").toLowerCase()
  return s === "offer_declined" || s === "inspection_declined"
}

export function isPostApprovalComplete(status?: string): boolean {
  return String(status || "").toLowerCase() === "disbursed"
}
