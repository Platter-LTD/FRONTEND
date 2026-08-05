/**
 * Plata Product Creator mortgage workflow (10 steps).
 * Drive UI from postApprovalFulfillment.currentWorkflowStepId + completedWorkflowSteps + status.
 */

import {
  extractPostApprovalFulfillment,
  isVirtualInspectionComplete,
  normalizeWorkflowStepId,
  virtualInspectionCompletedAt,
  type PostApprovalFulfillment,
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

function mapBackendStepToPlata(stepId: string | undefined | null): PlataMortgageStepId | null {
  const s = normalizeWorkflowStepId(stepId)
  if (!s) return null
  const map: Record<string, PlataMortgageStepId> = {
    application_submission: "application_submission",
    application: "application_submission",
    review_approval: "review_approval",
    review: "review_approval",
    approval: "review_approval",
    virtual_inspection: "virtual_inspection",
    virtual_tour: "virtual_inspection",
    offer_letter: "offer_letter",
    offer: "offer_letter",
    inspection_booking: "inspection_booking",
    appointment: "inspection_booking",
    appointment_scheduled: "inspection_booking",
    inspection_outcome: "inspection_outcome",
    inspection: "inspection_outcome",
    physical_inspection: "inspection_outcome",
    down_payment: "down_payment",
    equity_payment: "down_payment",
    contract_issued: "contract_issued",
    contract_signed: "contract_signed",
    loan_disbursement: "loan_disbursement",
    disbursement: "loan_disbursement",
    disburse: "loan_disbursement",
  }
  return map[s] ?? null
}

/** Virtual inspection done when completedAt is set, or backend already moved past that step. */
export function isVirtualTourDone(
  _progress: MortgageWorkflowProgress,
  paf: PostApprovalFulfillment | null | undefined,
): boolean {
  if (isVirtualInspectionComplete(paf)) return true
  const step = normalizeWorkflowStepId(paf?.currentWorkflowStepId)
  if (!step || step === "virtual_tour" || step === "virtual_inspection") return false
  if (step === "application_submission" || step === "review_approval") return false
  return true
}

/**
 * Prefer backend currentWorkflowStepId. Only hold on virtual_inspection when that is the
 * current step (or missing completedAt while still on virtual_inspection).
 */
function clampUntilVirtualTourDone(
  step: PlataMortgageStepId,
  progress: MortgageWorkflowProgress,
  paf: PostApprovalFulfillment | null,
): PlataMortgageStepId {
  const backendStep = mapBackendStepToPlata(paf?.currentWorkflowStepId)
  if (backendStep) return backendStep
  if (isVirtualTourDone(progress, paf)) return step
  const stepIndex = PLATA_MORTGAGE_STEPS.findIndex((s) => s.id === step)
  const virtualIndex = PLATA_MORTGAGE_STEPS.findIndex((s) => s.id === "virtual_inspection")
  if (stepIndex > virtualIndex) return "virtual_inspection"
  return step
}

export function extractMortgageProgress(raw: Record<string, unknown>): MortgageWorkflowProgress {
  const disbursement = (raw.loanDisbursement ?? {}) as Record<string, unknown>
  const nested = (disbursement.mortgageWorkflow ?? disbursement) as Record<string, unknown>
  const snapshot = (raw.contractSnapshot ?? {}) as Record<string, unknown>
  const metadata = (raw.metadata ?? {}) as Record<string, unknown>
  const metaWorkflow = (metadata.mortgageWorkflow ?? metadata.loanWorkflow ?? {}) as Record<
    string,
    unknown
  >
  const fulfillment = extractPostApprovalFulfillment(raw)
  const tourCompletedAt = virtualInspectionCompletedAt(fulfillment)

  return {
    // Canonical: postApprovalFulfillment.virtualInspection.completedAt
    virtualTourCompletedAt: tourCompletedAt,
    offerAcceptedAt: pickString(
      nested.offerAcceptedAt,
      snapshot.offerAcceptedAt,
      metaWorkflow.offerAcceptedAt,
      fulfillment?.offerAcceptedAt,
      fulfillment?.offer?.acceptedAt,
    ),
    inspectionBookedAt: pickString(
      nested.inspectionBookedAt,
      snapshot.inspectionBookedAt,
      metaWorkflow.inspectionBookedAt,
      fulfillment?.appointmentScheduledAt,
    ),
    inspectionCompletedAt: pickString(
      nested.inspectionCompletedAt,
      snapshot.inspectionCompletedAt,
      metaWorkflow.inspectionCompletedAt,
      fulfillment?.inspectionCompletedAt,
    ),
    inspectionDeclined: Boolean(
      nested.inspectionDeclined ??
        snapshot.inspectionDeclined ??
        metaWorkflow.inspectionDeclined ??
        fulfillment?.status === "inspection_declined",
    ),
    downPaymentMadeAt: pickString(
      nested.downPaymentMadeAt,
      snapshot.downPaymentMadeAt,
      fulfillment?.downPaymentPaidAt,
    ),
    downPaymentConfirmedAt: pickString(
      nested.downPaymentConfirmedAt,
      snapshot.downPaymentConfirmedAt,
      disbursement.downPaymentConfirmedAt,
      fulfillment?.downPaymentConfirmedAt,
    ),
    contractIssuedAt: pickString(
      nested.contractIssuedAt,
      snapshot.contractIssuedAt,
      fulfillment?.contractIssuedAt,
      fulfillment?.contract?.issuedAt,
    ),
    contractSignedAt: pickString(
      nested.contractSignedAt,
      snapshot.contractSignedAt,
      raw.signedAt,
      fulfillment?.contractSignedAt,
    ),
    contractApprovedAt: pickString(nested.contractApprovedAt, snapshot.contractApprovedAt),
    disbursedAt: pickString(
      nested.disbursedAt,
      disbursement.disbursedAt,
      snapshot.disbursedAt,
      fulfillment?.disbursedAt,
    ),
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

function resolveOfferPendingStep(
  progress: MortgageWorkflowProgress,
  paf: PostApprovalFulfillment | null,
): PlataMortgageStepId {
  const mapped = mapBackendStepToPlata(paf?.currentWorkflowStepId)
  if (mapped) return mapped
  if (!isVirtualTourDone(progress, paf)) return "virtual_inspection"
  return "offer_letter"
}

function stepFromPostApprovalStatus(
  status: PostApprovalMortgageStatus,
  progress: MortgageWorkflowProgress,
  paf: PostApprovalFulfillment | null,
): PlataMortgageStepId {
  switch (status) {
    case "offer_pending":
      return resolveOfferPendingStep(progress, paf)
    case "offer_accepted":
    case "appointment_scheduled":
      return clampUntilVirtualTourDone("inspection_booking", progress, paf)
    case "inspection_in_progress":
      return clampUntilVirtualTourDone("inspection_outcome", progress, paf)
    case "down_payment_pending":
    case "down_payment_paid":
      return clampUntilVirtualTourDone("down_payment", progress, paf)
    case "down_payment_confirmed":
      return clampUntilVirtualTourDone("contract_issued", progress, paf)
    case "contract_issued":
      return clampUntilVirtualTourDone("contract_signed", progress, paf)
    case "contract_signed":
    case "disbursed":
      return clampUntilVirtualTourDone("loan_disbursement", progress, paf)
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

  // Primary: trust backend currentWorkflowStepId.
  const mappedCurrent = mapBackendStepToPlata(paf?.currentWorkflowStepId)
  if (mappedCurrent) {
    return mappedCurrent
  }

  if (paf?.status) {
    if (paf.status === "disbursed") {
      return clampUntilVirtualTourDone("loan_disbursement", progress, paf)
    }
    return stepFromPostApprovalStatus(paf.status, progress, paf)
  }

  const status = String(loanWorkflowStatus || "requested").toLowerCase()

  if (isTerminalWorkflowStatus(status)) return "review_approval"
  if (progress.disbursedAt) return clampUntilVirtualTourDone("loan_disbursement", progress, paf)
  if (progress.contractApprovedAt) return clampUntilVirtualTourDone("loan_disbursement", progress, paf)
  if (progress.contractSignedAt) return clampUntilVirtualTourDone("contract_signed", progress, paf)
  if (progress.downPaymentConfirmedAt) {
    return clampUntilVirtualTourDone("contract_issued", progress, paf)
  }
  if (progress.downPaymentMadeAt) return clampUntilVirtualTourDone("down_payment", progress, paf)
  if (progress.inspectionCompletedAt || progress.inspectionDeclined) {
    return clampUntilVirtualTourDone("inspection_outcome", progress, paf)
  }
  if (progress.inspectionBookedAt) {
    return clampUntilVirtualTourDone("inspection_outcome", progress, paf)
  }
  if (progress.offerAcceptedAt) return clampUntilVirtualTourDone("inspection_booking", progress, paf)
  if (isApprovedWorkflowStatus(status)) {
    return isVirtualTourDone(progress, paf) ? "offer_letter" : "virtual_inspection"
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

  return PLATA_MORTGAGE_STEPS.map((step, index) => {
    let threadStatus: MortgageThreadStatus =
      index < currentIndex ? "done" : index === currentIndex ? "current" : "upcoming"

    // When backend is past virtual inspection, mark that row done even without completedAt.
    if (step.id === "virtual_inspection" && index < currentIndex) {
      threadStatus = "done"
    }

    return { ...step, status: threadStatus }
  })
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
