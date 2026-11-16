"use client"

import { useQuery } from "@tanstack/react-query"
import paymentService from "@/lib/services/paymentService"
import { useServiceMutations } from "@/lib/query/useServiceMutations"

export const paymentKeys = {
  all: ["payments"] as const,
  methods: ["payments", "methods"] as const,
}

/** Saved payment methods (cards / bank accounts). */
export function usePaymentMethods(enabled = true) {
  return useQuery({
    queryKey: paymentKeys.methods,
    queryFn: () => paymentService.methods.getPaymentMethods(),
    enabled,
  })
}

/** Payment writes as mutations (same signatures as paymentService); refreshes payment queries after success. */
export function usePaymentActions() {
  return useServiceMutations(
    {
      addPaymentMethod: paymentService.methods.addPaymentMethod.bind(paymentService.methods),
      deletePaymentMethod: paymentService.methods.deletePaymentMethod.bind(paymentService.methods),
      setDefaultPaymentMethod: paymentService.methods.setDefaultPaymentMethod.bind(paymentService.methods),
      initiateCardPayment: paymentService.initiation.initiateCardPayment.bind(paymentService.initiation),
      initiateBankTransfer: paymentService.initiation.initiateBankTransfer.bind(paymentService.initiation),
      verifyPayment: paymentService.verification.verifyPayment.bind(paymentService.verification),
    },
    [[...paymentKeys.all], ["billing"]],
  )
}
