"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useAppMerchantId } from "@/hooks/useAppMerchantId"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  fetchAppMerchantWalletsThunk,
  fetchTreasuryTransactionsThunk,
} from "@/store/walletSlice"
import { MerchantTransactionsTable } from "@/components/wallets/merchant-transactions-table"
import { FundWalletDrawer } from "@/components/wallets/fund-wallet-drawer"
import { MerchantWalletBalanceCard } from "@/components/wallets/merchant-wallet-balance-card"
import { plataWalletDisplayCurrency } from "@/lib/walletDisplay"
import {
  isVirtualNubanActive,
  merchantWalletApi,
  merchantWalletMainBalance,
  type MerchantWallet,
} from "@/lib/services/walletService"

export default function TreasuryWalletPage() {
  const params = useParams()
  const appId = params.id as string
  const dispatch = useAppDispatch()
  const walletState = useAppSelector((s) => s.wallet)

  const { merchantId, loading: merchantLoading, error: merchantError } = useAppMerchantId(appId)

  const [showBalance, setShowBalance] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [fundOpen, setFundOpen] = useState(false)
  const [treasuryWallet, setTreasuryWallet] = useState<MerchantWallet | null>(null)
  const [walletDetailLoading, setWalletDetailLoading] = useState(false)

  const inScope = walletState.merchantId === merchantId && walletState.appId === appId
  const bundleTreasury = inScope ? walletState.treasury : null
  const treasury = treasuryWallet ?? bundleTreasury

  const refreshTreasuryWallet = useCallback(async () => {
    if (!merchantId || !appId) return null
    setWalletDetailLoading(true)
    try {
      const res = await merchantWalletApi.getMerchantWallet(merchantId, "TREASURY", appId)
      const wallet = res.data ?? null
      setTreasuryWallet(wallet)
      return wallet
    } catch {
      return null
    } finally {
      setWalletDetailLoading(false)
    }
  }, [merchantId, appId])

  const refresh = useCallback(() => {
    if (!merchantId || !appId) return
    void dispatch(fetchAppMerchantWalletsThunk({ merchantId, appId }))
    void dispatch(fetchTreasuryTransactionsThunk({ merchantId, appId }))
    void refreshTreasuryWallet()
  }, [dispatch, merchantId, appId, refreshTreasuryWallet])

  useEffect(() => {
    refresh()
  }, [refresh])

  const txs = inScope ? walletState.treasuryTransactions : []
  const walletsLoading =
    merchantLoading || walletDetailLoading || (inScope && walletState.walletsLoading && !treasury)
  const txsLoading = merchantLoading || (inScope && walletState.treasuryTxLoading)
  const walletsError = inScope ? walletState.walletsError : null
  const txsError = inScope ? walletState.treasuryTxError : null
  const currency = plataWalletDisplayCurrency(treasury?.currency)
  const mainBal = merchantWalletMainBalance(treasury)
  const nubanActive = isVirtualNubanActive(treasury?.virtualNuban)
  const canOpenFund = Boolean(treasury) && !walletsLoading

  const bannerError = useMemo(() => {
    if (merchantError) return merchantError
    if (!merchantLoading && !merchantId) return "No merchant ID found for this app."
    return walletsError || txsError
  }, [merchantError, merchantLoading, merchantId, walletsError, txsError])

  return (
    <div className="flex-1 bg-white p-8">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Treasury wallet</h1>

      {bannerError ? (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          {bannerError}
        </div>
      ) : null}

      <MerchantWalletBalanceCard
        wallet={treasury}
        loading={!!walletsLoading}
        showBalance={showBalance}
        onToggleBalance={() => setShowBalance((value) => !value)}
        title="Treasury wallet"
        subtitle={
          nubanActive
            ? `Disbursements · ${treasury?.virtualNuban?.bankName || "Bank"} · ${treasury?.virtualNuban?.accountNumber}`
            : "Disbursements and treasury operations · fund via NUBAN"
        }
        className="mb-8"
        actions={
          <Button
            className="bg-[#8B7355] text-white hover:bg-[#7A6449] disabled:opacity-50"
            disabled={!canOpenFund}
            onClick={() => setFundOpen(true)}
          >
            Fund
          </Button>
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
          accountNumber: treasury?.virtualNuban?.accountNumber,
          bankName: treasury?.virtualNuban?.bankName,
          bankCode: treasury?.virtualNuban?.bankCode,
          accountHolder:
            treasury?.contactName || treasury?.name || "Treasury wallet",
          provisionStatus: treasury?.virtualNuban?.provisionStatus,
        }}
        onRefreshBalance={async () => {
          await refreshTreasuryWallet()
          refresh()
        }}
      />
    </div>
  )
}
