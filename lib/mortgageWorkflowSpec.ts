/**
 * Plata Product Creator mortgage workflow (10 steps).
 * Virtual Inspection sits after approval and before Offer Letter (aligned with User-App).
 */

import {
  extractPostApprovalFulfillment,
  type PostApprovalMortgageStatus,
} from "@/lib/postApprovalMortgage"

export type PlataMortgageStepId =
  | "application_submission"
  | "review_approval"
  | "virtual_inspection"
  | "offer_letter"
  | "inspection_booking"
  | "inspection_outcome"
  | "down_payment"
  | "contract_issued"
  | "contract_signed"
  | "loan_disbursement"

export type MortgageWorkflowProgress = {
  virtualTourCompletedAt?: string
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
    id: "virtual_inspection",
    stepNumber: 3,
    title: "Virtual Inspection",
    creatorAction: "Waits for applicant to complete virtual tour",
  },
  {
    id: "offer_letter",
    stepNumber: 4,
    title: "Offer Letter",
    creatorAction: "Upload custom offer letter PDF (optional) and waits for acceptance",
  },
  {
    id: "inspection_booking",
    stepNumber: 5,
    title: "Inspection Booking",
    creatorAction: "Sees booking in thread",
  },
  {
    id: "inspection_outcome",
    stepNumber: 6,
    title: "Inspection Outcome",
    creatorAction: "Sees outcome in thread",
  },
  {
    id: "down_payment",
    stepNumber: 7,
    title: "Down Payment",
    creatorAction: "Sees & confirms payment",
  },
  {
    id: "contract_issued",
    stepNumber: 8,
    title: "Contract Issued",
    creatorAction: "System sends contract",
  },
  {
    id: "contract_signed",
    stepNumber: 9,
    title: "Contract Signed",
    creatorAction: "Sees acceptance in thread",
  },
  {
    id: "loan_disbursement",
    stepNumber: 10,
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

/** ISO timestamp, epoch ms, or boolean/string true → treat as completed. */
function pickCompletedAt(...vals: unknown[]): string | undefined {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) {
      const s = v.trim().toLowerCase()
      if (s === "true" || s === "1" || s === "yes" || s === "completed") {
        return "completed"
      }
      return v.trim()
    }
    if (typeof v === "number" && Number.isFinite(v) && v > 0) {
      return new Date(v).toISOString()
    }
    if (v === true) return "completed"
  }
  return undefined
}

export function extractMortgageProgress(raw: Record<string, unknown>): MortgageWorkflowProgress {
  const disbursement = (raw.loanDisbursement ?? {}) as Record<string, unknown>
  const nested = (disbursement.mortgageWorkflow ?? disbursement) as Record<string, unknown>
  const snapshot = (raw.contractSnapshot ?? {}) as Record<string, unknown>
  const paf = (raw.postApprovalFulfillment ?? {}) as Record<string, unknown>
  const pafWorkflow = (paf.mortgageWorkflow ?? paf.loanWorkflow ?? {}) as Record<string, unknown>
  const metadata = (raw.metadata ?? {}) as Record<string, unknown>
  const metaWorkflow = (metadata.mortgageWorkflow ?? metadata.loanWorkflow ?? {}) as Record<
    string,
    unknown
  >
  const topWorkflow = (raw.mortgageWorkflow ?? {}) as Record<string, unknown>

  return {
    virtualTourCompletedAt: pickCompletedAt(
      nested.virtualTourCompletedAt,
      nested.virtualTourCompleted,
      snapshot.virtualTourCompletedAt,
      snapshot.virtualTourCompleted,
      paf.virtualTourCompletedAt,
      paf.virtualTourCompleted,
      pafWorkflow.virtualTourCompletedAt,
      pafWorkflow.virtualTourCompleted,
      metaWorkflow.virtualTourCompletedAt,
      metaWorkflow.virtualTourCompleted,
      disbursement.virtualTourCompletedAt,
      disbursement.virtualTourCompleted,
      topWorkflow.virtualTourCompletedAt,
      topWorkflow.virtualTourCompleted,
      raw.virtualTourCompletedAt,
      raw.virtualTourCompleted,
    ),
    offerAcceptedAt: pickString(
      nested.offerAcceptedAt,
      snapshot.offerAcceptedAt,
      metaWorkflow.offerAcceptedAt,
    ),
    inspectionBookedAt: pickString(
      nested.inspectionBookedAt,
      snapshot.inspectionBookedAt,
      metaWorkflow.inspectionBookedAt,
    ),
    inspectionCompletedAt: pickString(
      nested.inspectionCompletedAt,
      snapshot.inspectionCompletedAt,
      metaWorkflow.inspectionCompletedAt,
    ),
    inspectionDeclined: Boolean(
      nested.inspectionDeclined ?? snapshot.inspectionDeclined ?? metaWorkflow.inspectionDeclined,
    ),
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

export function isApprovedWorkflowStatus(status: string): boolean {
  const s = status.toLowerCase()
  return s === "approved" || s === "offer_sent" || s === "completed" || s === "active"
}

function resolveOfferPendingStep(progress: MortgageWorkflowProgress): PlataMortgageStepId {
  // Virtual inspection stays in progress until the applicant completes the tour in User-App.
  // Do not advance because an offer PDF exists or currentWorkflowStepId is already offer_letter.
  if (!progress.virtualTourCompletedAt) return "virtual_inspection"
  return "offer_letter"
}

function stepFromPostApprovalStatus(
  status: PostApprovalMortgageStatus,
  progress: MortgageWorkflowProgress,
): PlataMortgageStepId {
  switch (status) {
    case "offer_pending":
      return resolveOfferPendingStep(progress)
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
    return stepFromPostApprovalStatus(paf.status, progress)
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
  if (isApprovedWorkflowStatus(status)) {
    // After approve: virtual inspection is current/in-progress until User-App completes the tour.
    if (!progress.virtualTourCompletedAt) return "virtual_inspection"
    return "offer_letter"
  }
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
