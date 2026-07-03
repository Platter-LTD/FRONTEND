/**
 * Plata Product Creator mortgage workflow (9 steps).
 * @see Mortgage Workflow Specification — Plata Product Creator Flow
 */

import {
  extractPostApprovalFulfillment,
  type PostApprovalMortgageStatus,
} from "@/lib/postApprovalMortgage"

export type PlataMortgageStepId =
  | "application_submission"
  | "review_approval"
  | "offer_letter"
  | "inspection_booking"
  | "inspection_outcome"
  | "down_payment"
  | "contract_issued"
  | "contract_signed"
  | "loan_disbursement"

export type MortgageWorkflowProgress = {
  offerAcceptedAt?: string
  inspectionBookedAt?: string
  inspectionCompletedAt?: string
  inspectionDeclined?: boolean
  downPaymentMadeAt?: string
  downPaymentConfirmedAt?: string
  contractIssuedAt?: string
  contractSignedAt?: string
  contractApprovedAt?: string
  disbursedAt?: string
}

export type MortgageThreadStatus = "done" | "current" | "upcoming"

export type MortgageThreadItem = {
  id: PlataMortgageStepId
  stepNumber: number
  title: string
  creatorAction: string
  status: MortgageThreadStatus
}

export const PLATA_MORTGAGE_STEPS: Array<{
  id: PlataMortgageStepId
  stepNumber: number
  title: string
  creatorAction: string
}> = [
  {
    id: "application_submission",
    stepNumber: 1,
    title: "Application Submission",
    creatorAction: "Receives & reviews application",
  },
  {
    id: "review_approval",
    stepNumber: 2,
    title: "Review & Approval",
    creatorAction: "Approves or rejects",
  },
  {
    id: "offer_letter",
    stepNumber: 3,
    title: "Offer Letter",
    creatorAction: "Sees acceptance in thread",
  },
  {
    id: "inspection_booking",
    stepNumber: 4,
    title: "Inspection Booking",
    creatorAction: "Sees booking in thread",
  },
  {
    id: "inspection_outcome",
    stepNumber: 5,
    title: "Inspection Outcome",
    creatorAction: "Sees outcome in thread",
  },
  {
    id: "down_payment",
    stepNumber: 6,
    title: "Down Payment",
    creatorAction: "Sees & confirms payment",
  },
  {
    id: "contract_issued",
    stepNumber: 7,
    title: "Contract Issued",
    creatorAction: "System sends contract",
  },
  {
    id: "contract_signed",
    stepNumber: 8,
    title: "Contract Signed",
    creatorAction: "Sees acceptance in thread",
  },
  {
    id: "loan_disbursement",
    stepNumber: 9,
    title: "Loan Disbursement",
    creatorAction: "Manually triggers disbursement",
  },
]

function pickString(...vals: unknown[]): string | undefined {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v.trim()
  }
  return undefined
}

export function extractMortgageProgress(raw: Record<string, unknown>): MortgageWorkflowProgress {
  const disbursement = (raw.loanDisbursement ?? {}) as Record<string, unknown>
  const nested = (disbursement.mortgageWorkflow ?? disbursement) as Record<string, unknown>
  const snapshot = (raw.contractSnapshot ?? {}) as Record<string, unknown>

  return {
    offerAcceptedAt: pickString(nested.offerAcceptedAt, snapshot.offerAcceptedAt),
    inspectionBookedAt: pickString(nested.inspectionBookedAt, snapshot.inspectionBookedAt),
    inspectionCompletedAt: pickString(nested.inspectionCompletedAt, snapshot.inspectionCompletedAt),
    inspectionDeclined: Boolean(nested.inspectionDeclined ?? snapshot.inspectionDeclined),
    downPaymentMadeAt: pickString(nested.downPaymentMadeAt, snapshot.downPaymentMadeAt),
    downPaymentConfirmedAt: pickString(
      nested.downPaymentConfirmedAt,
      snapshot.downPaymentConfirmedAt,
      disbursement.downPaymentConfirmedAt,
    ),
    contractIssuedAt: pickString(nested.contractIssuedAt, snapshot.contractIssuedAt),
    contractSignedAt: pickString(nested.contractSignedAt, snapshot.contractSignedAt, raw.signedAt),
    contractApprovedAt: pickString(nested.contractApprovedAt, snapshot.contractApprovedAt),
    disbursedAt: pickString(nested.disbursedAt, disbursement.disbursedAt, snapshot.disbursedAt),
  }
}

function isTerminalWorkflowStatus(status: string): boolean {
  const s = status.toLowerCase()
  return s === "declined" || s === "blacklisted" || s === "rejected"
}

function isApprovedWorkflowStatus(status: string): boolean {
  const s = status.toLowerCase()
  return s === "approved" || s === "offer_sent" || s === "completed" || s === "active"
}

function stepFromPostApprovalStatus(status: PostApprovalMortgageStatus): PlataMortgageStepId {
  switch (status) {
    case "offer_pending":
      return "offer_letter"
    case "offer_accepted":
    case "appointment_scheduled":
      return "inspection_booking"
    case "inspection_in_progress":
      return "inspection_outcome"
    case "down_payment_pending":
    case "down_payment_paid":
      return "down_payment"
    case "down_payment_confirmed":
      return "contract_issued"
    case "contract_issued":
      return "contract_signed"
    case "contract_signed":
    case "disbursed":
      return "loan_disbursement"
    case "offer_declined":
    case "inspection_declined":
      return "review_approval"
    default:
      return "application_submission"
  }
}

export function resolvePlataMortgageStep(
  loanWorkflowStatus: string | undefined,
  progress: MortgageWorkflowProgress,
  raw?: Record<string, unknown>,
): PlataMortgageStepId {
  const paf = raw ? extractPostApprovalFulfillment(raw) : null
  if (paf?.status) {
    if (paf.status === "disbursed") return "loan_disbursement"
    return stepFromPostApprovalStatus(paf.status)
  }

  const status = String(loanWorkflowStatus || "requested").toLowerCase()

  if (isTerminalWorkflowStatus(status)) return "review_approval"
  if (progress.disbursedAt) return "loan_disbursement"
  if (progress.contractApprovedAt) return "loan_disbursement"
  if (progress.contractSignedAt) return "contract_signed"
  if (progress.downPaymentConfirmedAt) return "contract_issued"
  if (progress.downPaymentMadeAt) return "down_payment"
  if (progress.inspectionCompletedAt || progress.inspectionDeclined) return "inspection_outcome"
  if (progress.inspectionBookedAt) return "inspection_outcome"
  if (progress.offerAcceptedAt) return "inspection_booking"
  if (isApprovedWorkflowStatus(status)) return "offer_letter"
  if (status === "under_review") return "review_approval"
  return "application_submission"
}

export function buildPlataMortgageThread(
  loanWorkflowStatus: string | undefined,
  progress: MortgageWorkflowProgress,
  raw?: Record<string, unknown>,
): MortgageThreadItem[] {
  const status = String(loanWorkflowStatus || "requested").toLowerCase()
  if (isTerminalWorkflowStatus(status)) {
    return PLATA_MORTGAGE_STEPS.map((step) => ({
      ...step,
      status: step.id === "review_approval" ? "current" : step.stepNumber < 2 ? "done" : "upcoming",
    }))
  }

  if (progress.disbursedAt) {
    return PLATA_MORTGAGE_STEPS.map((step) => ({ ...step, status: "done" as const }))
  }

  const current = resolvePlataMortgageStep(loanWorkflowStatus, progress, raw)
  const currentIndex = PLATA_MORTGAGE_STEPS.findIndex((s) => s.id === current)

  return PLATA_MORTGAGE_STEPS.map((step, index) => ({
    ...step,
    status: index < currentIndex ? "done" : index === currentIndex ? "current" : "upcoming",
  }))
}

export function plataMortgageActionForStep(
  step: PlataMortgageStepId,
  raw?: Record<string, unknown>,
): "approve_offer" | "approve_contract" | "approve_disbursement" | "confirm_payment" | null {
  const paf = raw ? extractPostApprovalFulfillment(raw) : null
  if (paf?.status === "down_payment_paid" && step === "down_payment") return "confirm_payment"
  if (paf?.status === "contract_signed" && step === "loan_disbursement") return "approve_disbursement"

  if (step === "review_approval" || step === "application_submission") return "approve_offer"
  if (step === "contract_signed" && !paf?.status) return "approve_contract"
  if (step === "loan_disbursement" && !paf?.status) return "approve_disbursement"
  if (step === "down_payment" && !paf?.status) return "confirm_payment"
  return null
}
