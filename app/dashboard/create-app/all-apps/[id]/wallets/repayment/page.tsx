"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useAppMerchantId } from "@/hooks/useAppMerchantId"
import { merchantWalletMainBalance } from "@/lib/services/walletService"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  fetchAppMerchantWalletsThunk,
  fetchKycTransactionsThunk,
} from "@/store/walletSlice"
import { MerchantTransactionsTable } from "@/components/wallets/merchant-transactions-table"
import { FundWalletDrawer } from "@/components/wallets/fund-wallet-drawer"
import { WithdrawWalletDialog } from "@/components/wallets/withdraw-wallet-dialog"
import { MerchantWalletBalanceCard } from "@/components/wallets/merchant-wallet-balance-card"
import { plataWalletDisplayCurrency } from "@/lib/walletDisplay"

export default function RepaymentWalletPage() {
  const params = useParams()
  const appId = params.id as string
  const dispatch = useAppDispatch()
  const walletState = useAppSelector((s) => s.wallet)

  const { merchantId, loading: merchantLoading, error: merchantError } = useAppMerchantId(appId)

  const [showBalance, setShowBalance] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [fundOpen, setFundOpen] = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)

  const refresh = useCallback(() => {
    if (!merchantId || !appId) return
    void dispatch(fetchAppMerchantWalletsThunk({ merchantId, appId }))
    void dispatch(fetchKycTransactionsThunk({ merchantId, appId }))
  }, [dispatch, merchantId, appId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const inScope = walletState.merchantId === merchantId && walletState.appId === appId

  const repayment = inScope ? walletState.settlement ?? walletState.kyc : null
  const txs = inScope ? walletState.kycTransactions : []
  const walletsLoading = merchantLoading || (inScope && walletState.walletsLoading)
  const txsLoading = merchantLoading || (inScope && walletState.kycTxLoading)
  const walletsError = inScope ? walletState.walletsError : null
  const txsError = inScope ? walletState.kycTxError : null
  const mainBal = merchantWalletMainBalance(repayment)
  const currency = plataWalletDisplayCurrency(repayment?.currency)

  const bannerError = useMemo(() => {
    if (merchantError) return merchantError
    if (!merchantLoading && !merchantId) return "No merchant ID found for this app."
    return walletsError || txsError
  }, [merchantError, merchantLoading, merchantId, walletsError, txsError])

  return (
    <div className="flex-1 bg-white p-8">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Repayment wallet</h1>

      {bannerError ? (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          {bannerError}
        </div>
      ) : null}

      <MerchantWalletBalanceCard
        wallet={repayment}
        loading={!!walletsLoading}
        showBalance={showBalance}
        onToggleBalance={() => setShowBalance((value) => !value)}
        title="Repayment wallet"
        subtitle="Loan repayments collect here · fund via bank transfer · withdraw to your bank (API: REPAYMENT)"
        className="mb-8"
        actions={
          <>
            <Button
              className="bg-[#9A813F] font-semibold text-white hover:bg-[#7A642F]"
              disabled={walletsLoading || !repayment}
              onClick={() => setFundOpen(true)}
            >
              Fund
            </Button>
            <Button
              variant="outline"
              className="border-[#9A813F] bg-transparent font-semibold text-[#9A813F] hover:bg-[#9A813F]/10"
              disabled={walletsLoading || !repayment || mainBal <= 0}
              onClick={() => setWithdrawOpen(true)}
            >
              Withdraw
            </Button>
          </>
        }
      />

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
          accountNumber: repayment?.virtualNuban?.accountNumber,
          bankName: repayment?.virtualNuban?.bankName,
          bankCode: repayment?.virtualNuban?.bankCode,
          accountHolder: repayment?.name || "Repayment wallet",
          provisionStatus: repayment?.virtualNuban?.provisionStatus,
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
