"use client"

import { useQuery } from "@tanstack/react-query"
import { billingService } from "@/lib/services/billing-service"

type ListParams = Record<string, unknown> | undefined

/** Billing transactions (GET /billing/transactions). */
export function useBillingTransactions(params?: ListParams) {
  return useQuery({
    queryKey: ["billing", "transactions", params ?? {}],
    queryFn: () => billingService.getTransactions(params as Parameters<typeof billingService.getTransactions>[0]),
  })
}

/** Invoices (GET /billing/invoices). */
export function useBillingInvoices(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ["billing", "invoices", params ?? {}],
    queryFn: () => billingService.getInvoices(params),
  })
}

/** One-time billings (GET /billing/one-time-billings). */
export function useOneTimeBillings(params?: ListParams) {
  return useQuery({
    queryKey: ["billing", "one-time", params ?? {}],
    queryFn: () => billingService.getOneTimeBillings(params as Parameters<typeof billingService.getOneTimeBillings>[0]),
  })
}
