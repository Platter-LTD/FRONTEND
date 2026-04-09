"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { FiEyeOff, FiEye } from "react-icons/fi"
import { Skeleton } from "@/components/ui/skeleton"
import { getMerchantIdFromAccessToken } from "@/lib/merchantIdFromToken"
import { merchantWalletMainBalance } from "@/lib/services/walletService"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  fetchAppMerchantWalletsThunk,
  fetchKycTransactionsThunk,
} from "@/store/walletSlice"
import { MerchantTransactionsTable } from "@/components/wallets/merchant-transactions-table"

export default function KycWalletPage() {
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
    void dispatch(fetchKycTransactionsThunk({ merchantId, appId }))
  }, [dispatch, merchantId, appId])

  const inScope = walletState.merchantId === merchantId && walletState.appId === appId

  const kyc = inScope ? walletState.kyc : null
  const txs = inScope ? walletState.kycTransactions : []
  const walletsLoading = inScope && walletState.walletsLoading
  const txsLoading = inScope && walletState.kycTxLoading
  const walletsError = inScope ? walletState.walletsError : null
  const txsError = inScope ? walletState.kycTxError : null

  const formatBalance = (balance: number) => {
    const formatted = balance.toFixed(2)
    const [dollars, cents] = formatted.split(".")
    return { dollars: Number(dollars).toLocaleString(), cents }
  }

  const mainBal = merchantWalletMainBalance(kyc)
  const balance = formatBalance(mainBal)
  const currency = kyc?.currency || "NGN"

  const bannerError = useMemo(() => {
    if (!merchantId) return "No merchant ID found. Please sign in again."
    return walletsError || txsError
  }, [merchantId, walletsError, txsError])

  return (
    <div className="flex-1 bg-white p-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">KYC Wallet</h1>

      {bannerError && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-6">
          <p className="text-sm">{bannerError}</p>
        </div>
      )}

      <div className="bg-black rounded-lg p-8 mb-8 relative overflow-hidden">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-gray-400 text-sm mb-2">KYC wallet — main balance</p>
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
                      {balance.dollars}
                    </span>
                    <span className="text-white text-2xl">.{balance.cents}</span>
                    {currency !== "NGN" && (
                      <span className="text-white/70 text-lg ml-2">{currency}</span>
                    )}
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
