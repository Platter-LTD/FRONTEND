"use client"

import { useMemo } from "react"
import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AsyncFn = (...args: any[]) => Promise<any>

/** A service result that reports failure in its body rather than by throwing. */
function reportsFailure(result: unknown): boolean {
  return Boolean(result && typeof result === "object" && (result as { success?: unknown }).success === false)
}

/**
 * Run existing service write functions as React Query mutations without changing their signatures:
 * each returned function behaves exactly like the original, and after a successful call the queries
 * under `invalidate` are refreshed (or the `invalidate` callback runs). `isPending` is true while any of them is running.
 *
 *   const actions = useServiceMutations({ deletePaymentMethod: paymentService.methods.deletePaymentMethod }, [["payments"]])
 *   await actions.deletePaymentMethod(id)
 */
export function useServiceMutations<T extends Record<string, AsyncFn>>(
  fns: T,
  invalidate: QueryKey[] | (() => void),
): T & { isPending: boolean } {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: ({ run }: { run: () => Promise<unknown> }) => run(),
    onSuccess: (result) => {
      if (reportsFailure(result)) return
      if (typeof invalidate === "function") invalidate()
      else for (const queryKey of invalidate) void queryClient.invalidateQueries({ queryKey })
    },
  })

  const { mutateAsync, isPending } = mutation
  return useMemo(() => {
    const wrapped = {} as Record<string, AsyncFn>
    for (const [name, fn] of Object.entries(fns)) {
      wrapped[name] = (...args: unknown[]) => mutateAsync({ run: () => fn(...args) })
    }
    return Object.assign(wrapped, { isPending }) as T & { isPending: boolean }
    // `fns` / `invalidate` are expected to be static per call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mutateAsync, isPending])
}
