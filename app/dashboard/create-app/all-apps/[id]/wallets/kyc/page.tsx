"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { FiEyeOff, FiEye } from "react-icons/fi"
import { Skeleton } from "@/components/ui/skeleton"
import { getMerchantIdFromAccessToken } from "@/lib/merchantIdFromToken"
import {
  formatPlataWalletBalanceParts,
  plataWalletCurrencyPrefix,
  plataWalletDisplayCurrency,
} from "@/lib/walletDisplay"
import { merchantWalletMainBalance } from "@/lib/services/walletService"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  fetchAppMerchantWalletsThunk,
  fetchKycTransactionsThunk,
} from "@/store/walletSlice"
import { MerchantTransactionsTable } from "@/components/wallets/merchant-transactions-table"
import { FundWalletDrawer } from "@/components/wallets/fund-wallet-drawer"
import { WithdrawWalletDialog } from "@/components/wallets/withdraw-wallet-dialog"

export default function KycWalletPage() {
  const params = useParams()
  const appId = params.id as string
  const dispatch = useAppDispatch()
  const walletState = useAppSelector((s) => s.wallet)

  const [merchantId, setMerchantId] = useState<string | null>(null)
  const [showBalance, setShowBalance] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [fundOpen, setFundOpen] = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)

  useEffect(() => {
    setMerchantId(getMerchantIdFromAccessToken())
  }, [])

  const refresh = useCallback(() => {
    if (!merchantId || !appId) return
    void dispatch(fetchAppMerchantWalletsThunk({ merchantId, appId }))
    void dispatch(fetchKycTransactionsThunk({ merchantId, appId }))
  }, [dispatch, merchantId, appId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const inScope = walletState.merchantId === merchantId && walletState.appId === appId

  const kyc = inScope ? walletState.kyc : null
  const txs = inScope ? walletState.kycTransactions : []
  const walletsLoading = inScope && walletState.walletsLoading
  const txsLoading = inScope && walletState.kycTxLoading
  const walletsError = inScope ? walletState.walletsError : null
  const txsError = inScope ? walletState.kycTxError : null

  const mainBal = merchantWalletMainBalance(kyc)
  const balance = formatPlataWalletBalanceParts(mainBal)
  const currency = plataWalletDisplayCurrency(kyc?.currency)
  const currencyPrefix = plataWalletCurrencyPrefix()

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

      <div className="relative mb-8 overflow-hidden rounded-lg bg-black p-8">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-gray-400 text-sm mb-2">Settlement wallet — main balance</p>
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
            <Button
              className="bg-[#9A813F] text-white hover:bg-[#7A642F] font-semibold"
              disabled={walletsLoading || !kyc}
              onClick={() => setFundOpen(true)}
            >
              Fund
            </Button>
            <Button
              variant="outline"
              className="border-[#9A813F] bg-transparent text-[#9A813F] hover:bg-[#9A813F]/10 font-semibold"
              disabled={walletsLoading || !kyc || mainBal <= 0}
              onClick={() => setWithdrawOpen(true)}
            >
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

      <FundWalletDrawer
        open={fundOpen}
        onOpenChange={setFundOpen}
        currency={currency}
        virtualNuban={{
          accountNumber: kyc?.virtualNuban?.accountNumber,
          bankName: kyc?.virtualNuban?.bankName,
          bankCode: kyc?.virtualNuban?.bankCode,
          accountHolder: kyc?.name || "Settlement wallet",
          provisionStatus: kyc?.virtualNuban?.provisionStatus,
        }}
        onRefreshBalance={refresh}
      />
      <WithdrawWalletDialog
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        mode="merchant-settlement"
        maxAmount={mainBal}
        currency={currency}
        appId={appId}
        onSuccess={refresh}
      />
    </div>
  )
}
