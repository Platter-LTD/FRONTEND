"use client"

import { useQuery, type QueryKey } from "@tanstack/react-query"
import { applicationApi, commodityApi, loanApi, mortgageApi, savingsApi } from "@/lib/services/accountService"
import { pendingApprovedLoanApi } from "@/lib/pendingApprovedLoanApi"
import { pendingApprovedMortgageApi } from "@/lib/pendingApprovedMortgageApi"
import { useServiceMutations } from "@/lib/query/useServiceMutations"
import { getQueryClient } from "@/lib/query/queryClient"

export const applicationKeys = {
  all: ["applications"] as QueryKey,
  workflow: (appId: string, status: string) => ["applications", "workflow", appId, status] as QueryKey,
  detail: (id: string) => ["applications", "detail", id] as QueryKey,
  applicantProfile: (id: string) => ["applications", "applicant-profile", id] as QueryKey,
}

type WorkflowListResult = Awaited<ReturnType<typeof applicationApi.getLoanWorkflowApplications>>

/**
 * Loan-workflow applications for an app and status tab. "under_review" also includes "requested"
 * (de-duplicated), as the workflow table has always shown. Resolves to the raw API results.
 */
export function useLoanWorkflowApplications(appId: string, status: string, enabled = true) {
  return useQuery({
    queryKey: applicationKeys.workflow(appId, status),
    queryFn: async (): Promise<WorkflowListResult[]> => {
      if (status === "under_review") {
        const [requested, underReview] = await Promise.all([
          applicationApi.getLoanWorkflowApplications({ appId, loanWorkflowStatus: "requested", limit: 100 }),
          applicationApi.getLoanWorkflowApplications({ appId, loanWorkflowStatus: "under_review", limit: 100 }),
        ])
        if (!requested.success && !underReview.success) {
          throw new Error(requested.error || underReview.error || "Failed to load")
        }
        return [requested, underReview]
      }
      const res = await applicationApi.getLoanWorkflowApplications({ appId, loanWorkflowStatus: status as never, limit: 100 })
      if (!res.success) throw new Error(res.error || "Failed to load")
      return [res]
    },
    enabled: enabled && Boolean(appId),
  })
}

/**
 * Application writes (workflow decisions, disbursement, new applications) as React Query mutations
 * with the services' own signatures; a successful write refreshes application and wallet queries.
 */
export function useApplicationActions() {
  return useServiceMutations(
    {
      approve: applicationApi.approve.bind(applicationApi),
      reject: applicationApi.reject.bind(applicationApi),
      blacklist: applicationApi.blacklist.bind(applicationApi),
      updateLoanWorkflowStatus: applicationApi.updateLoanWorkflowStatus.bind(applicationApi),
      disburseLoan: pendingApprovedLoanApi.disburse.bind(pendingApprovedLoanApi),
      confirmMortgageDownPayment: pendingApprovedMortgageApi.confirmDownPayment.bind(pendingApprovedMortgageApi),
      disburseMortgage: pendingApprovedMortgageApi.disburse.bind(pendingApprovedMortgageApi),
      applyLoan: loanApi.apply.bind(loanApi),
      applyMortgage: mortgageApi.apply.bind(mortgageApi),
      createSavings: savingsApi.create.bind(savingsApi),
      buyCommodity: commodityApi.buy.bind(commodityApi),
    },
    [applicationKeys.all, ["wallets"]],
  )
}

/** Cached reads of one application + its applicant profile (for the workflow detail sheets). */
export function fetchApplicationWithProfile(applicationId: string) {
  const client = getQueryClient()
  return Promise.all([
    client.fetchQuery({
      queryKey: applicationKeys.detail(applicationId),
      queryFn: () => applicationApi.getWorkflowApplication(applicationId),
    }),
    client.fetchQuery({
      queryKey: applicationKeys.applicantProfile(applicationId),
      queryFn: () => applicationApi.getSpringApplicantProfile(applicationId),
    }),
  ] as const)
}
