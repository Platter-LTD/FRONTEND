/**
 * Plata Product Creator mortgage workflow (9 steps).
 * @see Mortgage Workflow Specification — Plata Product Creator Flow
 */

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

export function resolvePlataMortgageStep(
  loanWorkflowStatus: string | undefined,
  progress: MortgageWorkflowProgress,
): PlataMortgageStepId {
  const status = String(loanWorkflowStatus || "requested").toLowerCase()

  if (isTerminalWorkflowStatus(status)) return "review_approval"
  if (progress.disbursedAt) return "loan_disbursement"
  if (progress.contractSignedAt) return "loan_disbursement"
  if (progress.contractIssuedAt) return "contract_signed"
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

  const current = resolvePlataMortgageStep(loanWorkflowStatus, progress)
  const currentIndex = PLATA_MORTGAGE_STEPS.findIndex((s) => s.id === current)

  return PLATA_MORTGAGE_STEPS.map((step, index) => ({
    ...step,
    status: index < currentIndex ? "done" : index === currentIndex ? "current" : "upcoming",
  }))
}

export function plataMortgageActionForStep(step: PlataMortgageStepId): "approve" | "confirm_payment" | "disburse" | null {
  if (step === "review_approval") return "approve"
  if (step === "down_payment") return "confirm_payment"
  if (step === "loan_disbursement") return "disburse"
  return null
}
