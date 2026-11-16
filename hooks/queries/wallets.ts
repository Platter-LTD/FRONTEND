"use client"

import { useCallback, useEffect, useMemo } from "react"
import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query"
import { toastApiError } from "@/lib/apiToast"
import { resolveCanonicalMerchantWallets } from "@/lib/merchantWalletBundle"
import { getQueryClient } from "@/lib/query/queryClient"
import {
  billingApi,
  merchantWalletApi,
  transactionApi,
  type MerchantWalletsBundle,
  type Transaction,
} from "@/lib/services/walletService"

export type WalletTxKind = "treasury" | "billing" | "settlement"

export const walletKeys = {
  all: ["wallets"] as QueryKey,
  merchantWallets: (merchantId: string, appId: string) => ["wallets", "merchant", merchantId, appId] as QueryKey,
  transactions: (kind: WalletTxKind, merchantId: string, appId: string) =>
    ["wallets", "transactions", kind, merchantId, appId] as QueryKey,
}

async function loadMerchantWallets(merchantId: string, appId: string): Promise<MerchantWalletsBundle> {
  const res = await merchantWalletApi.getAllMerchantWallets(merchantId, appId)
  if (!res.success || !res.data) {
    const r = res as { error?: string; message?: string }
    throw new Error(r.error || r.message || "Failed to load merchant wallets")
  }
  return res.data as MerchantWalletsBundle
}

function merchantWalletsQuery(merchantId: string, appId: string) {
  return {
    queryKey: walletKeys.merchantWallets(merchantId, appId),
    queryFn: () => loadMerchantWallets(merchantId, appId),
  }
}

/** Transactions for one of the app's wallets, limited to that wallet when its id is known. */
async function loadWalletTransactions(kind: WalletTxKind, merchantId: string, appId: string): Promise<Transaction[]> {
  const params = { appId }
  const res =
    kind === "treasury"
      ? await transactionApi.getTreasuryTransactions(merchantId, params)
      : kind === "settlement"
        ? await transactionApi.getRepaymentTransactions(merchantId, params)
        : await transactionApi.getBillingTransactions(merchantId, params)
  const list = Array.isArray(res.data) ? res.data : []
  try {
    // Shares the cached wallet bundle instead of fetching it again.
    const bundle = await getQueryClient().fetchQuery(merchantWalletsQuery(merchantId, appId))
    const canonical = resolveCanonicalMerchantWallets(bundle)
    const wallet = kind === "treasury" ? canonical.treasury : kind === "settlement" ? canonical.settlement : canonical.billing
    if (wallet?.id) return list.filter((tx) => !tx.walletId || tx.walletId === wallet.id)
  } catch {
    /* merchant + appId scoped list is sufficient */
  }
  return list
}

const TX_ERROR: Record<WalletTxKind, { message: string; id: string }> = {
  treasury: { message: "Failed to load treasury transactions", id: "wallet-ms-treasury-tx-err" },
  billing: { message: "Failed to load operation transactions", id: "wallet-ms-op-tx-err" },
  settlement: { message: "Failed to load KYC transactions", id: "wallet-ms-kyc-tx-err" },
}

/** The app's merchant wallets (billing / settlement(repayment) / treasury). */
export function useAppMerchantWallets(merchantId: string | null | undefined, appId: string | null | undefined) {
  const query = useQuery({
    ...merchantWalletsQuery(merchantId ?? "", appId ?? ""),
    enabled: Boolean(merchantId && appId),
    select: resolveCanonicalMerchantWallets,
  })
  useEffect(() => {
    if (query.error) toastApiError(query.error.message || "Failed to load merchant wallets", { id: "wallet-ms-wallets-err" })
  }, [query.error])
  return query
}

export function useWalletTransactions(
  kind: WalletTxKind,
  merchantId: string | null | undefined,
  appId: string | null | undefined,
  enabled = true,
) {
  const query = useQuery({
    queryKey: walletKeys.transactions(kind, merchantId ?? "", appId ?? ""),
    queryFn: () => loadWalletTransactions(kind, merchantId as string, appId as string),
    enabled: enabled && Boolean(merchantId && appId),
  })
  useEffect(() => {
    if (query.error) toastApiError(query.error.message || TX_ERROR[kind].message, { id: TX_ERROR[kind].id })
  }, [query.error, kind])
  return query
}

const NO_TX: Transaction[] = []

/**
 * Wallet data for one app in the shape the wallet pages used to read from the Redux wallet slice,
 * backed by React Query. Only the transaction lists named in `tx` are fetched.
 */
export function useAppWalletState(
  merchantId: string | null | undefined,
  appId: string | null | undefined,
  tx: Partial<Record<WalletTxKind, boolean>>,
) {
  const queryClient = useQueryClient()
  const wallets = useAppMerchantWallets(merchantId, appId)
  const treasuryTx = useWalletTransactions("treasury", merchantId, appId, Boolean(tx.treasury))
  const billingTx = useWalletTransactions("billing", merchantId, appId, Boolean(tx.billing))
  const settlementTx = useWalletTransactions("settlement", merchantId, appId, Boolean(tx.settlement))

  /** Refetch this app's wallets and transactions (after fund / withdraw / transfer). */
  const refresh = useCallback(async () => {
    if (!merchantId || !appId) return
    await queryClient.invalidateQueries({
      predicate: (q) => {
        const [root, , a, b, c] = q.queryKey as unknown[]
        return root === "wallets" && [a, b, c].includes(merchantId) && [a, b, c].includes(appId)
      },
    })
  }, [queryClient, merchantId, appId])

  return useMemo(() => {
    const canonical = wallets.data
    return {
      merchantId: merchantId ?? null,
      appId: appId ?? null,
      billing: canonical?.billing ?? null,
      settlement: canonical?.settlement ?? null,
      treasury: canonical?.treasury ?? null,
      /** @deprecated Use billing */
      operation: canonical?.billing ?? null,
      /** @deprecated Use settlement */
      kyc: canonical?.settlement ?? null,
      treasuryTransactions: treasuryTx.data ?? NO_TX,
      operationTransactions: billingTx.data ?? NO_TX,
      kycTransactions: settlementTx.data ?? NO_TX,
      walletsLoading: wallets.isLoading,
      walletsError: wallets.error?.message ?? null,
      treasuryTxLoading: treasuryTx.isLoading,
      treasuryTxError: treasuryTx.error?.message ?? null,
      operationTxLoading: billingTx.isLoading,
      operationTxError: billingTx.error?.message ?? null,
      kycTxLoading: settlementTx.isLoading,
      kycTxError: settlementTx.error?.message ?? null,
      refresh,
    }
  }, [merchantId, appId, wallets.data, wallets.isLoading, wallets.error, treasuryTx, billingTx, settlementTx, refresh])
}

/** One merchant wallet by type (GET /wallets/merchant/:merchantId/type/:type?appId=); null when missing. */
export function useMerchantWallet(
  merchantId: string | null | undefined,
  walletType: "TREASURY" | "BILLING" | "REPAYMENT",
  appId: string | null | undefined,
) {
  return useQuery({
    queryKey: ["wallets", "detail", merchantId ?? "", walletType, appId ?? ""] as QueryKey,
    queryFn: async () => (await merchantWalletApi.getMerchantWallet(merchantId as string, walletType, appId as string)).data ?? null,
    enabled: Boolean(merchantId && appId),
  })
}

/** Repayment-wallet payout (withdrawal); refreshes all wallet balances and transactions afterwards. */
export function useRepaymentPayout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ payload, appId }: { payload: Parameters<typeof billingApi.repaymentPayout>[0]; appId?: string }) =>
      billingApi.repaymentPayout(payload, appId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: walletKeys.all }),
  })
}
