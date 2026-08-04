import { apiClient } from "@/lib/api"
import { isPdfFile } from "@/lib/isPdfFile"
import type { ApiResponse, LoanWorkflowApplication } from "@/lib/services/accountService"

const MAX_OFFER_LETTER_BYTES = 10 * 1024 * 1024

export type OfferLetterInfo = {
  pdfUrl?: string
  pdfFileName?: string
  html?: string
  text?: string
  reference?: string
  offerValidUntil?: string
  signedPdfUrl?: string
  signedPdfFileName?: string
}

export type PostApprovalFulfillmentView = {
  status?: string
  offerSentAt?: string
  documentSource?: string
  documentUrl?: string
  currentWorkflowStepId?: string
}

export function extractOfferLetter(raw: Record<string, unknown> | null | undefined): OfferLetterInfo | null {
  if (!raw || typeof raw !== "object") return null
  const offerLetter = raw.offerLetter
  const paf = raw.postApprovalFulfillment
  const contract =
    paf && typeof paf === "object" ? (paf as Record<string, unknown>).contract : undefined

  const fromOffer =
    offerLetter && typeof offerLetter === "object" ? (offerLetter as Record<string, unknown>) : null
  const fromContract =
    contract && typeof contract === "object" ? (contract as Record<string, unknown>) : null

  const pdfUrl = String(fromOffer?.pdfUrl || fromContract?.documentUrl || "").trim()
  const pdfFileName = String(fromOffer?.pdfFileName || fromContract?.documentFileName || "").trim()
  if (!pdfUrl && !pdfFileName && !fromOffer) return null

  return {
    pdfUrl: pdfUrl || undefined,
    pdfFileName: pdfFileName || undefined,
    html: typeof fromOffer?.html === "string" ? fromOffer.html : undefined,
    text: typeof fromOffer?.text === "string" ? fromOffer.text : undefined,
    reference: typeof fromOffer?.reference === "string" ? fromOffer.reference : undefined,
    offerValidUntil:
      typeof fromOffer?.offerValidUntil === "string" ? fromOffer.offerValidUntil : undefined,
    signedPdfUrl: typeof fromOffer?.signedPdfUrl === "string" ? fromOffer.signedPdfUrl : undefined,
    signedPdfFileName:
      typeof fromOffer?.signedPdfFileName === "string" ? fromOffer.signedPdfFileName : undefined,
  }
}

export function extractPostApprovalFulfillment(
  raw: Record<string, unknown> | null | undefined,
): PostApprovalFulfillmentView | null {
  if (!raw || typeof raw !== "object") return null
  const paf = raw.postApprovalFulfillment
  if (!paf || typeof paf !== "object") return null
  const pafObj = paf as Record<string, unknown>
  const offer = pafObj.offer && typeof pafObj.offer === "object" ? (pafObj.offer as Record<string, unknown>) : null
  const contract =
    pafObj.contract && typeof pafObj.contract === "object"
      ? (pafObj.contract as Record<string, unknown>)
      : null

  return {
    status: typeof pafObj.status === "string" ? pafObj.status : undefined,
    offerSentAt: typeof offer?.sentAt === "string" ? offer.sentAt : undefined,
    documentSource: typeof contract?.documentSource === "string" ? contract.documentSource : undefined,
    documentUrl: typeof contract?.documentUrl === "string" ? contract.documentUrl : undefined,
    currentWorkflowStepId:
      typeof pafObj.currentWorkflowStepId === "string" ? pafObj.currentWorkflowStepId : undefined,
  }
}

/**
 * Show letter choice (generate / upload) when approved and no letter has been sent yet.
 * Mortgages: available after approve while on virtual inspection or offer letter
 * (virtual tour completion is tracked separately and does not hide these actions).
 */
export function isAwaitingOfferLetterChoice(raw: Record<string, unknown> | null | undefined): boolean {
  if (!raw) return false
  const workflowStatus = String(raw.loanWorkflowStatus || "").trim().toLowerCase()
  const productType = String(raw.productType || "").trim().toUpperCase()
  const fulfillment = extractPostApprovalFulfillment(raw)
  if (!fulfillment) return false

  // Loan workflow sheet may omit productType; only reject unrelated product types.
  if (productType && productType !== "LOAN" && productType !== "MORTGAGE") return false

  const awaiting =
    workflowStatus === "approved" &&
    String(fulfillment.status || "").toLowerCase() === "offer_pending" &&
    !fulfillment.offerSentAt

  if (!awaiting) return false

  if (productType === "MORTGAGE") {
    const stepId = String(fulfillment.currentWorkflowStepId || "")
      .trim()
      .toLowerCase()
    // Allow prepare/send while applicant completes virtual tour, or on the offer letter step.
    // Backend may leave stepId empty or still on virtual_* after approve.
    if (
      stepId &&
      stepId !== "offer_letter" &&
      stepId !== "virtual_tour" &&
      stepId !== "virtual_inspection"
    ) {
      return false
    }
  }

  return true
}

export function canGenerateOfferLetter(raw: Record<string, unknown> | null | undefined): boolean {
  if (!isAwaitingOfferLetterChoice(raw)) return false
  const fulfillment = extractPostApprovalFulfillment(raw)
  return fulfillment?.documentSource !== "merchant_upload"
}

export function canUploadOfferLetterChoice(raw: Record<string, unknown> | null | undefined): boolean {
  if (!isAwaitingOfferLetterChoice(raw)) return false
  const fulfillment = extractPostApprovalFulfillment(raw)
  return !fulfillment?.documentUrl
}

function isTerminalWorkflow(workflowStatus: string, pafStatus: string): boolean {
  const tokens = ["disbursed", "completed", "declined", "cancelled", "canceled", "rejected", "failed"]
  return tokens.some((t) => workflowStatus.includes(t) || pafStatus.includes(t))
}

/**
 * @deprecated Prefer canUploadOfferLetterChoice — letter may only be chosen once (until sentAt).
 * Kept for callers that only need a boolean "letter UI relevant".
 */
export function canMerchantUploadOfferLetter(raw: Record<string, unknown> | null | undefined): boolean {
  return canUploadOfferLetterChoice(raw)
}

/** Why letter actions are blocked — for UI copy when choice is unavailable. */
export function merchantOfferLetterUploadBlockReason(
  raw: Record<string, unknown> | null | undefined,
): string | null {
  if (!raw) return null
  if (isAwaitingOfferLetterChoice(raw)) return null

  const workflowStatus = String(raw.loanWorkflowStatus || "").trim().toLowerCase()
  const fulfillment = extractPostApprovalFulfillment(raw)
  const pafStatus = String(fulfillment?.status || "").trim().toLowerCase()

  if (isTerminalWorkflow(workflowStatus, pafStatus)) {
    return "This application is closed — the offer letter can no longer be changed."
  }
  if (fulfillment?.offerSentAt) {
    return "An offer letter has already been sent for this application."
  }
  if (workflowStatus !== "approved") {
    return "Approve the application before generating or uploading an offer letter."
  }
  const stepId = String(fulfillment?.currentWorkflowStepId || "").trim().toLowerCase()
  if (
    stepId &&
    stepId !== "offer_letter" &&
    stepId !== "virtual_tour" &&
    stepId !== "virtual_inspection" &&
    String(raw.productType || "").toUpperCase() === "MORTGAGE"
  ) {
    return "Offer letter actions are only available after approval, before later workflow steps."
  }
  return "Offer letter actions are not available for this application state."
}

export async function generateOfferLetter(
  applicationId: string,
): Promise<ApiResponse<LoanWorkflowApplication>> {
  try {
    const response = await apiClient.post<ApiResponse<LoanWorkflowApplication> & { message?: string }>(
      `/v1/products/applications/${encodeURIComponent(applicationId)}/loan-workflow/offer-letter/generate`,
      {},
      { timeout: 120_000 },
    )
    const result = response.data
    if (response.status >= 400 || result?.success === false) {
      return {
        success: false,
        error: result?.error || result?.message || "Failed to generate offer letter",
      }
    }
    return result
  } catch (error: unknown) {
    const ax = error as { response?: { data?: { error?: string; message?: string } } }
    return {
      success: false,
      error:
        ax.response?.data?.error ||
        ax.response?.data?.message ||
        (error instanceof Error ? error.message : "Failed to generate offer letter"),
    }
  }
}

export async function uploadOfferLetter(
  applicationId: string,
  file: File,
): Promise<ApiResponse<LoanWorkflowApplication>> {
  if (!isPdfFile(file)) {
    return { success: false, error: "Offer letter must be a PDF file" }
  }
  if (file.size > MAX_OFFER_LETTER_BYTES) {
    return { success: false, error: "Offer letter must be 10 MB or smaller" }
  }

  const form = new FormData()
  form.append("file", file)

  try {
    // Use axios apiClient so FormData strips JSON Content-Type (multipart boundary intact)
    const response = await apiClient.post<ApiResponse<LoanWorkflowApplication> & { message?: string }>(
      `/v1/products/applications/${encodeURIComponent(applicationId)}/loan-workflow/offer-letter`,
      form,
      { timeout: 120_000 },
    )
    const result = response.data
    if (response.status >= 400 || result?.success === false) {
      return {
        success: false,
        error: result?.error || result?.message || "Failed to upload offer letter",
      }
    }
    return result
  } catch (error: unknown) {
    const ax = error as { response?: { data?: { error?: string; message?: string } } }
    return {
      success: false,
      error:
        ax.response?.data?.error ||
        ax.response?.data?.message ||
        (error instanceof Error ? error.message : "Failed to upload offer letter"),
    }
  }
}
