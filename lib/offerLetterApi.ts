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

/** Merchant may upload while borrower acceptance is pending. */
export function canMerchantUploadOfferLetter(raw: Record<string, unknown> | null | undefined): boolean {
  if (!raw) return false
  const workflowStatus = String(raw.loanWorkflowStatus || "").trim().toLowerCase()
  const productType = String(raw.productType || "").trim().toUpperCase()
  const paf = raw.postApprovalFulfillment
  const pafObj = paf && typeof paf === "object" ? (paf as Record<string, unknown>) : null
  const pafStatus = String(pafObj?.status || "").trim().toLowerCase()

  if (workflowStatus !== "approved" && workflowStatus !== "offer_sent") return false
  if (pafStatus !== "offer_pending") return false
  if (productType !== "LOAN" && productType !== "MORTGAGE") return false

  if (productType === "MORTGAGE") {
    const stepId = String(pafObj?.currentWorkflowStepId || "").trim().toLowerCase()
    if (stepId === "virtual_tour" || stepId === "virtual_inspection") return false
    if (stepId && stepId !== "offer_letter") return false

    // Before offer letter: require virtual tour completion when step id is unset
    if (!stepId || stepId === "offer_letter") {
      const disbursement = raw.loanDisbursement
      const nested =
        disbursement && typeof disbursement === "object"
          ? ((disbursement as Record<string, unknown>).mortgageWorkflow ?? disbursement)
          : null
      const nestedObj = nested && typeof nested === "object" ? (nested as Record<string, unknown>) : null
      const tourDone = Boolean(
        nestedObj?.virtualTourCompletedAt ||
          pafObj?.virtualTourCompletedAt ||
          (raw.offerLetter &&
            typeof raw.offerLetter === "object" &&
            (raw.offerLetter as Record<string, unknown>).pdfUrl),
      )
      if (!stepId && !tourDone) return false
    }
  }

  return true
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
