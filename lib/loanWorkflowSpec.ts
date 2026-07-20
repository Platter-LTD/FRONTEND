/**
 * Plata Product Creator loan workflow (5 steps).
 * Pending approval → Approved → Accept offer → Awaiting Disbursements → Loan disbursed
 */

export type PlataLoanStepId =
  | "pending_approval"
  | "approved"
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
    id: "approved",
    stepNumber: 2,
    title: "Approved",
    creatorAction: "Offer letter sent — waits for applicant acknowledgment",
  },
  {
    id: "accept_offer",
    stepNumber: 3,
    title: "Accept offer",
    creatorAction: "Sees applicant accept or decline the offer",
  },
  {
    id: "awaiting_disbursement",
    stepNumber: 4,
    title: "Awaiting Disbursements",
    creatorAction: "Triggers loan disbursement to applicant wallet",
  },
  {
    id: "loan_disbursed",
    stepNumber: 5,
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

function isApproved(workflow: string, status: string): boolean {
  return (
    workflow === "approved" ||
    workflow === "offer_sent" ||
    workflow === "awaiting_disbursement" ||
    workflow.includes("disburs") ||
    workflow.includes("offer") ||
    status === "approved" ||
    status === "active" ||
    status === "completed" ||
    status === "disbursed"
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

  if (
    progress.offerAcceptedAt ||
    wf === "awaiting_disbursement" ||
    wf.includes("awaiting_disburs") ||
    pafStatus === "offer_accepted" ||
    pafStatus.includes("disburs")
  ) {
    return "awaiting_disbursement"
  }

  if (isApproved(wf, status) || pafStatus === "offer_pending") {
    if (wf === "offer_sent" || wf.includes("offer") || pafStatus === "offer_pending") {
      return "accept_offer"
    }
    return "approved"
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

  if (isTerminal(wf)) {
    return PLATA_LOAN_STEPS.map((step) => ({
      ...step,
      status: step.id === "pending_approval" ? "current" : "upcoming",
    }))
  }

  if (isDisbursed(status, wf, progress)) {
    return PLATA_LOAN_STEPS.map((step) => ({ ...step, status: "done" as const }))
  }

  const current = resolvePlataLoanStep(loanWorkflowStatus, progress, raw)
  const currentIndex = PLATA_LOAN_STEPS.findIndex((step) => step.id === current)

  return PLATA_LOAN_STEPS.map((step, index) => ({
    ...step,
    status: index < currentIndex ? "done" : index === currentIndex ? "current" : "upcoming",
  }))
}

export function plataLoanActionForStep(
  step: PlataLoanStepId,
  raw?: Record<string, unknown>,
): "approve_offer" | "approve_disbursement" | null {
  const progress = raw ? extractLoanProgress(raw) : {}
  const wf = normalize(typeof raw?.loanWorkflowStatus === "string" ? raw.loanWorkflowStatus : "")

  if (step === "pending_approval" && ["requested", "under_review", ""].includes(wf)) {
    return "approve_offer"
  }
  if (step === "awaiting_disbursement" && !progress.disbursedAt) {
    return "approve_disbursement"
  }
  return null
}
