"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { FiEyeOff, FiEye } from "react-icons/fi"
import { Skeleton } from "@/components/ui/skeleton"
import { getMerchantIdFromAccessToken } from "@/lib/merchantIdFromToken"
import { merchantWalletMainBalance } from "@/lib/services/walletService"
import {
  formatPlataWalletBalanceParts,
  plataWalletCurrencyPrefix,
  plataWalletDisplayCurrency,
} from "@/lib/walletDisplay"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  fetchAppMerchantWalletsThunk,
  fetchOperationTransactionsThunk,
} from "@/store/walletSlice"
import { MerchantTransactionsTable } from "@/components/wallets/merchant-transactions-table"

export default function RepaymentWalletPage() {
  const params = useParams()
  const appId = params.id as string
  const dispatch = useAppDispatch()
  const walletState = useAppSelector((s) => s.wallet)

  const [merchantId, setMerchantId] = useState<string | null>(null)
  const [showBalance, setShowBalance] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    setMerchantId(getMerchantIdFromAccessToken())
  }, [])

  useEffect(() => {
    if (!merchantId || !appId) return
    void dispatch(fetchAppMerchantWalletsThunk({ merchantId, appId }))
    void dispatch(fetchOperationTransactionsThunk({ merchantId, appId }))
  }, [dispatch, merchantId, appId])

  const inScope = walletState.merchantId === merchantId && walletState.appId === appId

  const operation = inScope ? walletState.operation : null
  const txs = inScope ? walletState.operationTransactions : []
  const walletsLoading = inScope && walletState.walletsLoading
  const txsLoading = inScope && walletState.operationTxLoading
  const walletsError = inScope ? walletState.walletsError : null
  const txsError = inScope ? walletState.operationTxError : null

  const mainBal = merchantWalletMainBalance(operation)
  const balance = formatPlataWalletBalanceParts(mainBal)
  const currency = plataWalletDisplayCurrency(operation?.currency)
  const currencyPrefix = plataWalletCurrencyPrefix()

  const bannerError = useMemo(() => {
    if (!merchantId) return "No merchant ID found. Please sign in again."
    return walletsError || txsError
  }, [merchantId, walletsError, txsError])

  return (
    <div className="flex-1 bg-white p-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Repayment Wallet</h1>

      {bannerError && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-6">
          <p className="text-sm">{bannerError}</p>
        </div>
      )}

      <div className="bg-black rounded-lg p-8 mb-8 relative overflow-hidden">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-gray-400 text-sm mb-2">Operation wallet — main balance</p>
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
                      {currencyPrefix}
                      {balance.major}
                    </span>
                    <span className="text-white text-2xl">.{balance.minor}</span>
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
                className="text-gray-400 hover:text-white transition-colors"
              >
                {showBalance ? <FiEyeOff size={24} /> : <FiEye size={24} />}
              </button>
            )}
            <Button className="bg-[#8B7355] hover:bg-[#7A6449] text-white" disabled={walletsLoading}>
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
    </div>
  )
}
