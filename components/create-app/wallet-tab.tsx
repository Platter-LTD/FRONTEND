"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { FiEyeOff, FiEye } from "react-icons/fi"
import { Skeleton } from "@/components/ui/skeleton"
import { getMerchantIdFromAccessToken } from "@/lib/merchantIdFromToken"
import { merchantWalletMainBalance } from "@/lib/services/walletService"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { fetchMerchantAppsThunk } from "@/store/merchantAppsSlice"
import {
  fetchAppMerchantWalletsThunk,
  fetchTreasuryTransactionsThunk,
} from "@/store/walletSlice"
import { MerchantTransactionsTable } from "@/components/wallets/merchant-transactions-table"

export function WalletTab() {
  const dispatch = useAppDispatch()
  const { selectedAppId, selectedAppName, loading: appsLoading, fetchAttempted } = useAppSelector(
    (s) => s.merchantApps,
  )
  const walletState = useAppSelector((s) => s.wallet)

  const [merchantId, setMerchantId] = useState<string | null>(null)
  const [showBalance, setShowBalance] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    setMerchantId(getMerchantIdFromAccessToken())
  }, [])

  useEffect(() => {
    if (!fetchAttempted && !appsLoading) {
      void dispatch(fetchMerchantAppsThunk())
    }
  }, [dispatch, fetchAttempted, appsLoading])

  const appId = selectedAppId

  useEffect(() => {
    if (!merchantId || !appId) return
    void dispatch(fetchAppMerchantWalletsThunk({ merchantId, appId }))
    void dispatch(fetchTreasuryTransactionsThunk({ merchantId, appId }))
  }, [dispatch, merchantId, appId])

  const inScope = walletState.merchantId === merchantId && walletState.appId === appId
  const treasury = inScope ? walletState.treasury : null
  const txs = inScope ? walletState.treasuryTransactions : []
  const walletsLoading = inScope && walletState.walletsLoading
  const txsLoading = inScope && walletState.treasuryTxLoading
  const walletsError = inScope ? walletState.walletsError : null
  const txsError = inScope ? walletState.treasuryTxError : null

  const mainBal = merchantWalletMainBalance(treasury)
  const formatted = mainBal.toFixed(2).split(".")
  const dollars = Number(formatted[0]).toLocaleString()
  const cents = formatted[1] || "00"
  const currency = treasury?.currency || "NGN"

  if (!merchantId) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Sign in to load wallet data.
      </div>
    )
  }

  if (!appId) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
        {appsLoading
          ? "Loading apps…"
          : "Select an app from the sidebar (or create one) to view this app’s treasury wallet and transactions."}
      </div>
    )
  }

  return (
    <>
      <p className="text-sm text-gray-600 mb-4">
        Showing treasury wallet for{" "}
        <span className="font-medium text-gray-900">{selectedAppName || appId}</span>
        .
      </p>

      {(walletsError || txsError) && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-6 text-sm">
          {walletsError || txsError}
        </div>
      )}

      <div className="bg-black rounded-lg p-8 mb-8 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/70 text-sm mb-2">Treasury — main balance</p>
            {walletsLoading ? (
              <div className="flex items-baseline gap-1">
                <Skeleton className="h-12 w-32 bg-gray-600" />
                <Skeleton className="h-8 w-8 bg-gray-600 ml-1" />
              </div>
            ) : (
              <div className="flex items-baseline gap-1">
                {showBalance ? (
                  <>
                    <span className="text-white text-5xl font-semibold">
                      {currency === "NGN" ? "NGN " : ""}
                      {dollars}
                    </span>
                    <span className="text-white text-2xl">.{cents}</span>
                  </>
                ) : (
                  <span className="text-white text-5xl font-semibold">••••</span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {!walletsLoading && (
              <button
                type="button"
                onClick={() => setShowBalance(!showBalance)}
                className="text-white/50 hover:text-white/70 transition-colors"
              >
                {showBalance ? <FiEyeOff size={24} /> : <FiEye size={24} />}
              </button>
            )}
            <Button className="bg-[#9A813F] hover:bg-[#8A7335] text-white px-8" disabled={walletsLoading}>
              Withdraw
            </Button>
          </div>
        </div>
      </div>

      <MerchantTransactionsTable
        transactions={txs}
        loading={!!txsLoading}
        currency={currency}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />
    </>
  )
}
