"use client"

import { useCallback } from "react"
import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query"
import {
  treasuryConsoleApi,
  type SettlementMode,
  type SettlementType,
  type TreasuryPayoutRow,
  type WithdrawalHistoryStatus,
} from "@/lib/services/treasuryConsoleService"

export const treasuryKeys = {
  app: (appId: string) => ["treasury", appId] as QueryKey,
  console: (appId: string) => ["treasury", appId, "console"] as QueryKey,
  withdrawalsHistory: (appId: string, status: WithdrawalHistoryStatus) =>
    ["treasury", appId, "withdrawals-history", status] as QueryKey,
  settlementsHistory: (appId: string, type: SettlementType, status: WithdrawalHistoryStatus) =>
    ["treasury", appId, "settlements-history", type, status] as QueryKey,
}

const TYPES: SettlementType[] = ["investments", "commodities", "savings"]

export type TreasuryConsoleData = {
  withdrawals: TreasuryPayoutRow[]
  settlements: Record<SettlementType, TreasuryPayoutRow[]>
  modes: Record<SettlementType, SettlementMode>
  reverted: Record<SettlementType, boolean>
  /** First list error, if any (the console still renders whatever loaded). */
  error: string | null
}

async function loadConsole(appId: string): Promise<TreasuryConsoleData> {
  const [wd, inv, com, sav, invMode, comMode, savMode] = await Promise.all([
    treasuryConsoleApi.listWithdrawals(appId),
    treasuryConsoleApi.listSettlements(appId, "investments"),
    treasuryConsoleApi.listSettlements(appId, "commodities"),
    treasuryConsoleApi.listSettlements(appId, "savings"),
    treasuryConsoleApi.getSettlementMode(appId, "investments"),
    treasuryConsoleApi.getSettlementMode(appId, "commodities"),
    treasuryConsoleApi.getSettlementMode(appId, "savings"),
  ])
  const lists = { investments: inv, commodities: com, savings: sav }
  const modes = { investments: invMode, commodities: comMode, savings: savMode }
  const err = (r: { success: boolean; error?: string }) => (!r.success ? r.error ?? null : null)
  return {
    withdrawals: wd.success ? (wd.data?.items ?? []) : [],
    settlements: Object.fromEntries(
      TYPES.map((t) => [t, lists[t].success ? (lists[t].data?.items ?? []) : []]),
    ) as TreasuryConsoleData["settlements"],
    modes: Object.fromEntries(
      TYPES.map((t) => [t, modes[t].success ? (modes[t].data?.mode ?? "manual") : "manual"]),
    ) as TreasuryConsoleData["modes"],
    reverted: Object.fromEntries(
      TYPES.map((t) => [t, Boolean(modes[t].success && modes[t].data?.revertedToManual)]),
    ) as TreasuryConsoleData["reverted"],
    error: err(wd) || err(inv) || err(com) || err(sav),
  }
}

/** Pending withdrawals, settlement queues and auto-settle modes for an app. */
export function useTreasuryConsole(appId: string) {
  return useQuery({ queryKey: treasuryKeys.console(appId), queryFn: () => loadConsole(appId), enabled: Boolean(appId) })
}

async function unwrapHistory(
  promise: ReturnType<typeof treasuryConsoleApi.listWithdrawalsHistory>,
): Promise<{ rows: TreasuryPayoutRow[]; total: number }> {
  const res = await promise
  if (!res.success) throw new Error(res.error)
  return { rows: res.data?.items ?? [], total: res.data?.pagination.total ?? res.data?.items.length ?? 0 }
}

export function useWithdrawalsHistory(appId: string, status: WithdrawalHistoryStatus) {
  return useQuery({
    queryKey: treasuryKeys.withdrawalsHistory(appId, status),
    queryFn: () => unwrapHistory(treasuryConsoleApi.listWithdrawalsHistory(appId, { status, limit: 50, skip: 0 })),
    enabled: Boolean(appId),
  })
}

export function useSettlementsHistory(
  appId: string,
  type: SettlementType,
  status: WithdrawalHistoryStatus,
  enabled = true,
) {
  return useQuery({
    queryKey: treasuryKeys.settlementsHistory(appId, type, status),
    queryFn: () =>
      unwrapHistory(treasuryConsoleApi.listSettlementsHistory(appId, type, { status, limit: 50, skip: 0 })),
    enabled: enabled && Boolean(appId),
  })
}

/**
 * Run a treasury write (approve / reject / set mode) as a mutation; on success every treasury query
 * for the app is refreshed. Resolves to the service's `{ success, data | error }` result unchanged.
 */
export function useTreasuryAction(appId: string) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (run: () => Promise<{ success: boolean }>) => run(),
    onSuccess: (res) => {
      if (res.success) void queryClient.invalidateQueries({ queryKey: treasuryKeys.app(appId) })
    },
  })
  return useCallback(
    <T extends { success: boolean }>(run: () => Promise<T>) => mutation.mutateAsync(run) as Promise<T>,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mutation.mutateAsync],
  )
}
