import { getAccessToken } from "@/lib/cookieAuth"
import { plataAuthFetch } from "@/lib/plataAuthFetch"
import type { ApiResponse, LoanWorkflowApplication } from "@/lib/services/accountService"

function authHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? getAccessToken() : null
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function parseResult(data: unknown, response: Response): { success: boolean; error?: string } {
  const body = data as { success?: boolean; error?: string; message?: string }
  if (!response.ok) {
    return { success: false, error: body.error || body.message || "Request failed" }
  }
  if (body.success === false) {
    return { success: false, error: body.error || body.message || "Request failed" }
  }
  return { success: true }
}

async function postPendingApprovedMortgage(
  applicationId: string,
  subPath: string,
  body: Record<string, unknown> = {},
): Promise<ApiResponse<LoanWorkflowApplication>> {
  try {
    const response = await plataAuthFetch(
      `/api/v1/products/applications/${encodeURIComponent(applicationId)}/pending-approved-mortgage/${subPath}`,
      {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(body),
      },
    )
    const result = await response.json()
    const parsed = parseResult(result, response)
    if (!parsed.success) {
      return { success: false, error: parsed.error }
    }
    return result as ApiResponse<LoanWorkflowApplication>
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Request failed",
    }
  }
}

/** Plata creator: confirm down payment received (status must be down_payment_paid). */
export async function confirmMortgageDownPaymentReceived(
  applicationId: string,
): Promise<ApiResponse<LoanWorkflowApplication>> {
  return postPendingApprovedMortgage(applicationId, "down-payment/confirm")
}

/** Plata creator: disburse after contract signed. */
export async function disburseApprovedMortgage(
  applicationId: string,
): Promise<ApiResponse<LoanWorkflowApplication>> {
  return postPendingApprovedMortgage(applicationId, "disburse")
}

export const pendingApprovedMortgageApi = {
  confirmDownPayment: confirmMortgageDownPaymentReceived,
  disburse: disburseApprovedMortgage,
}
