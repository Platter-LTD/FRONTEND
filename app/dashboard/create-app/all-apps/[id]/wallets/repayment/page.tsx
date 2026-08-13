"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useAppMerchantId } from "@/hooks/useAppMerchantId"
import {
  isVirtualNubanActive,
  merchantWalletApi,
  merchantWalletMainBalance,
  type MerchantWallet,
} from "@/lib/services/walletService"
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
  const [repaymentWallet, setRepaymentWallet] = useState<MerchantWallet | null>(null)
  const [walletDetailLoading, setWalletDetailLoading] = useState(false)
  const [walletDetailError, setWalletDetailError] = useState<string | null>(null)

  const inScope = walletState.merchantId === merchantId && walletState.appId === appId
  const bundleRepayment = inScope ? walletState.settlement ?? walletState.kyc : null
  // Prefer dedicated GET .../type/REPAYMENT (includes virtualNuban for Fund UI).
  const repayment = repaymentWallet ?? bundleRepayment

  const refreshRepaymentWallet = useCallback(async () => {
    if (!merchantId || !appId) return null
    setWalletDetailLoading(true)
    setWalletDetailError(null)
    try {
      const res = await merchantWalletApi.getMerchantWallet(merchantId, "REPAYMENT", appId)
      const wallet = res.data ?? null
      setRepaymentWallet(wallet)
      return wallet
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load repayment wallet"
      setWalletDetailError(msg)
      // Keep bundle fallback if type fetch fails
      return null
    } finally {
      setWalletDetailLoading(false)
    }
  }, [merchantId, appId])

  const refresh = useCallback(() => {
    if (!merchantId || !appId) return
    void dispatch(fetchAppMerchantWalletsThunk({ merchantId, appId }))
    void dispatch(fetchKycTransactionsThunk({ merchantId, appId }))
    void refreshRepaymentWallet()
  }, [dispatch, merchantId, appId, refreshRepaymentWallet])

  useEffect(() => {
    refresh()
  }, [refresh])

  const txs = inScope ? walletState.kycTransactions : []
  const walletsLoading =
    merchantLoading || walletDetailLoading || (inScope && walletState.walletsLoading && !repayment)
  const txsLoading = merchantLoading || (inScope && walletState.kycTxLoading)
  const walletsError = inScope ? walletState.walletsError : null
  const txsError = inScope ? walletState.kycTxError : null
  const mainBal = merchantWalletMainBalance(repayment)
  const currency = plataWalletDisplayCurrency(repayment?.currency)
  const nubanActive = isVirtualNubanActive(repayment?.virtualNuban)
  const walletActive = String(repayment?.status || "").toUpperCase() === "ACTIVE"
  // Fund opens NUBAN instructions — allow click whenever wallet exists; drawer gates copy/details.
  const canOpenFund = Boolean(repayment) && !walletsLoading
  const canWithdraw = Boolean(repayment) && walletActive && nubanActive && mainBal > 0 && !walletsLoading

  const bannerError = useMemo(() => {
    if (merchantError) return merchantError
    if (!merchantLoading && !merchantId) return "No merchant ID found for this app."
    if (walletDetailError && !repayment) return walletDetailError
    return walletsError || txsError
  }, [merchantError, merchantLoading, merchantId, walletDetailError, repayment, walletsError, txsError])

  const nubanHint = useMemo(() => {
    if (!repayment) return null
    if (nubanActive) {
      const n = repayment.virtualNuban
      return `${n?.bankName || "Bank"} · ${n?.accountNumber}${n?.bankCode ? ` · code ${n.bankCode}` : ""}`
    }
    const status = repayment.virtualNuban?.provisionStatus
    if (status) {
      return `Virtual account status: ${status}. Fund opens when provisionStatus is active.`
    }
    return "Virtual NUBAN not provisioned yet. Open Fund to check status after refresh."
  }, [repayment, nubanActive])

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
        subtitle={
          nubanHint
            ? `Loan repayments · ${nubanHint}`
            : "Loan repayments collect here · fund via NUBAN · withdraw to bank"
        }
        className="mb-8"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              className="bg-[#8B7355] text-white hover:bg-[#7A6449] disabled:opacity-50"
              disabled={!canOpenFund}
              onClick={() => setFundOpen(true)}
            >
              Fund
            </Button>
            <Button
              variant="outline"
              className="border-[#9A813F] bg-transparent font-semibold text-[#9A813F] hover:bg-[#9A813F]/10 disabled:opacity-50"
              disabled={!canWithdraw}
              onClick={() => setWithdrawOpen(true)}
              title={
                !nubanActive
                  ? "Virtual NUBAN must be active to withdraw"
                  : mainBal <= 0
                    ? "Insufficient balance"
                    : undefined
              }
            >
              Withdraw
            </Button>
          </div>
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
        mainBalance={mainBal}
        virtualNuban={{
          accountNumber: repayment?.virtualNuban?.accountNumber,
          bankName: repayment?.virtualNuban?.bankName,
          bankCode: repayment?.virtualNuban?.bankCode,
          accountHolder:
            repayment?.contactName || repayment?.name || "Repayment wallet",
          provisionStatus: repayment?.virtualNuban?.provisionStatus,
        }}
        onRefreshBalance={async () => {
          await refreshRepaymentWallet()
          refresh()
        }}
      />

      <WithdrawWalletDialog
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        mode="merchant-settlement"
        maxAmount={mainBal}
        currency={currency}
        appId={appId}
        nubanActive={nubanActive && walletActive}
        onSuccess={refresh}
      />
    </div>
  )
}
