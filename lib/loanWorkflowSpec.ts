/**
 * Plata Product Creator loan workflow (4 steps).
 * Pending approval → Accept offer → Awaiting Disbursements → Loan disbursed
 * Approval is shown as a status on the pending step (no separate Approved step).
 */

export type PlataLoanStepId =
  | "pending_approval"
  | "accept_offer"
  | "awaiting_disbursement"
  | "loan_disbursed"

export type LoanWorkflowProgress = {
  offerAcceptedAt?: string
  disbursedAt?: string
}

export type LoanThreadStatus = "done" | "current" | "upcoming"

export type LoanThreadItem = {
  id: PlataLoanStepId
  stepNumber: number
  title: string
  creatorAction: string
  status: LoanThreadStatus
  /** Shown instead of Done/In progress when set (e.g. "Approved" on pending step). */
  statusLabel?: string
}

export const PLATA_LOAN_STEPS: Array<{
  id: PlataLoanStepId
  stepNumber: number
  title: string
  creatorAction: string
}> = [
  {
    id: "pending_approval",
    stepNumber: 1,
    title: "Pending approval",
    creatorAction: "Reviews and approves or declines the application",
  },
  {
    id: "accept_offer",
    stepNumber: 2,
    title: "Accept offer",
    creatorAction:
      "Choose system-generated or custom offer letter; waits for applicant accept or decline",
  },
  {
    id: "awaiting_disbursement",
    stepNumber: 3,
    title: "Awaiting Disbursements",
    creatorAction: "Triggers loan disbursement to applicant wallet",
  },
  {
    id: "loan_disbursed",
    stepNumber: 4,
    title: "Loan disbursed — check loan wallet",
    creatorAction: "Confirms funds credited to loan wallet",
  },
]

function pickString(...vals: unknown[]): string | undefined {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v.trim()
  }
  return undefined
}

export function extractLoanProgress(raw: Record<string, unknown>): LoanWorkflowProgress {
  const disbursement = (raw.loanDisbursement ?? {}) as Record<string, unknown>
  const nested = (disbursement.loanWorkflow ?? disbursement.mortgageWorkflow ?? disbursement) as Record<
    string,
    unknown
  >
  const snapshot = (raw.contractSnapshot ?? {}) as Record<string, unknown>
  const paf = (raw.postApprovalFulfillment ?? {}) as Record<string, unknown>
  const offer = (paf.offer ?? {}) as Record<string, unknown>

  return {
    offerAcceptedAt: pickString(
      nested.offerAcceptedAt,
      snapshot.offerAcceptedAt,
      offer.acceptedAt,
      paf.offerAcceptedAt,
    ),
    disbursedAt: pickString(
      nested.disbursedAt,
      disbursement.disbursedAt,
      snapshot.disbursedAt,
      paf.disbursedAt,
    ),
  }
}

function normalize(value?: string | null): string {
  return String(value || "").trim().toLowerCase()
}

function isTerminal(workflow: string): boolean {
  return ["declined", "rejected", "blacklisted", "cancelled", "canceled"].includes(workflow)
}

function isDisbursed(status: string, workflow: string, progress: LoanWorkflowProgress): boolean {
  if (progress.disbursedAt) return true
  return ["disbursed", "active", "completed", "successful"].some(
    (token) => status.includes(token) || workflow.includes(token),
  )
}

function isPastApproval(workflow: string, status: string, pafStatus: string): boolean {
  return (
    workflow === "approved" ||
    workflow === "offer_sent" ||
    workflow === "awaiting_disbursement" ||
    workflow.includes("disburs") ||
    workflow.includes("offer") ||
    status === "approved" ||
    status === "active" ||
    status === "completed" ||
    status === "disbursed" ||
    pafStatus === "offer_pending" ||
    pafStatus === "offer_accepted" ||
    pafStatus.includes("disburs")
  )
}

export function resolvePlataLoanStep(
  loanWorkflowStatus: string | undefined,
  progress: LoanWorkflowProgress,
  raw?: Record<string, unknown>,
): PlataLoanStepId {
  const status = normalize(typeof raw?.status === "string" ? raw.status : "")
  const wf = normalize(loanWorkflowStatus || "requested")
  const paf = raw?.postApprovalFulfillment as Record<string, unknown> | undefined
  const pafStatus = normalize(typeof paf?.status === "string" ? paf.status : "")

  if (isTerminal(wf) || pafStatus === "offer_declined") return "pending_approval"

  if (isDisbursed(status, wf, progress) || pafStatus === "disbursed") return "loan_disbursed"

  // Acceptance does not disburse — merchant must call pending-approved-loan/disburse
  if (
    progress.offerAcceptedAt ||
    wf === "awaiting_disbursement" ||
    wf.includes("awaiting_disburs") ||
    pafStatus === "offer_accepted" ||
    (pafStatus.includes("disburs") && pafStatus !== "disbursed")
  ) {
    return "awaiting_disbursement"
  }

  // Approved (with or without letter sent) lives on Accept offer — no separate Approved step
  if (isPastApproval(wf, status, pafStatus)) {
    return "accept_offer"
  }

  if (wf === "under_review") return "pending_approval"
  return "pending_approval"
}

export function buildPlataLoanThread(
  loanWorkflowStatus: string | undefined,
  progress: LoanWorkflowProgress,
  raw?: Record<string, unknown>,
): LoanThreadItem[] {
  const wf = normalize(loanWorkflowStatus || "requested")
  const status = normalize(typeof raw?.status === "string" ? raw.status : "")
  const paf = raw?.postApprovalFulfillment as Record<string, unknown> | undefined
  const pafStatus = normalize(typeof paf?.status === "string" ? paf.status : "")

  if (isTerminal(wf)) {
    return PLATA_LOAN_STEPS.map((step) => ({
      ...step,
      status: step.id === "pending_approval" ? "current" : "upcoming",
      statusLabel: step.id === "pending_approval" ? (wf === "blacklisted" ? "Blacklisted" : "Declined") : undefined,
    }))
  }

  if (pafStatus === "offer_declined") {
    return PLATA_LOAN_STEPS.map((step) => ({
      ...step,
      status: step.id === "pending_approval" ? ("current" as const) : ("upcoming" as const),
      statusLabel: step.id === "pending_approval" ? "Offer declined" : undefined,
    }))
  }

  if (isDisbursed(status, wf, progress)) {
    return PLATA_LOAN_STEPS.map((step) => ({
      ...step,
      status: "done" as const,
      statusLabel: step.id === "pending_approval" ? "Approved" : undefined,
    }))
  }

  const current = resolvePlataLoanStep(loanWorkflowStatus, progress, raw)
  const currentIndex = PLATA_LOAN_STEPS.findIndex((step) => step.id === current)
  const showApprovedOnPending =
    currentIndex > 0 && isPastApproval(wf, status, pafStatus)

  return PLATA_LOAN_STEPS.map((step, index) => {
    const threadStatus: LoanThreadStatus =
      index < currentIndex ? "done" : index === currentIndex ? "current" : "upcoming"
    return {
      ...step,
      status: threadStatus,
      statusLabel:
        step.id === "pending_approval" && threadStatus === "done" && showApprovedOnPending
          ? "Approved"
          : undefined,
    }
  })
}

export function plataLoanActionForStep(
  step: PlataLoanStepId,
  raw?: Record<string, unknown>,
): "approve_offer" | "approve_disbursement" | null {
  const progress = raw ? extractLoanProgress(raw) : {}
  const wf = normalize(typeof raw?.loanWorkflowStatus === "string" ? raw.loanWorkflowStatus : "")
  const paf = raw?.postApprovalFulfillment as Record<string, unknown> | undefined
  const pafStatus = normalize(typeof paf?.status === "string" ? paf.status : "")

  if (step === "pending_approval" && ["requested", "under_review", ""].includes(wf)) {
    return "approve_offer"
  }
  if (
    step === "awaiting_disbursement" &&
    !progress.disbursedAt &&
    pafStatus !== "disbursed" &&
    (pafStatus === "offer_accepted" || Boolean(progress.offerAcceptedAt) || wf === "awaiting_disbursement")
  ) {
    return "approve_disbursement"
  }
  return null
}
