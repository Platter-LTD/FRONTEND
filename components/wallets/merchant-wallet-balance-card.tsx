"use client"

import { FiEye, FiEyeOff } from "react-icons/fi"
import { Skeleton } from "@/components/ui/skeleton"
import type { MerchantWallet } from "@/lib/services/walletService"
import {
  merchantWalletLedgerBalance,
  merchantWalletMainBalance,
} from "@/lib/services/walletService"
import { walletTypeLabel } from "@/lib/merchantWalletBundle"
import {
  formatPlataWalletBalanceParts,
  plataWalletCurrencyPrefix,
  plataWalletDisplayCurrency,
} from "@/lib/walletDisplay"

type MerchantWalletBalanceCardProps = {
  wallet: MerchantWallet | null
  loading?: boolean
  showBalance: boolean
  onToggleBalance: () => void
  title?: string
  subtitle?: string
  actions?: React.ReactNode
  className?: string
}

export function MerchantWalletBalanceCard({
  wallet,
  loading = false,
  showBalance,
  onToggleBalance,
  title,
  subtitle,
  actions,
  className = "",
}: MerchantWalletBalanceCardProps) {
  const mainBal = merchantWalletMainBalance(wallet)
  const ledgerBal = merchantWalletLedgerBalance(wallet)
  const balance = formatPlataWalletBalanceParts(mainBal)
  const currency = plataWalletDisplayCurrency(wallet?.currency)
  const currencyPrefix = plataWalletCurrencyPrefix()
  const typeLabel = walletTypeLabel(wallet?.merchantWalletType)
  const heading = title || wallet?.name || `${typeLabel} wallet`
  const nuban = wallet?.virtualNuban

  return (
    <div className={`relative overflow-hidden rounded-lg bg-black p-8 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-1 text-sm text-gray-400">{heading}</p>
          {subtitle ? <p className="mb-2 text-xs text-gray-500">{subtitle}</p> : null}
          {loading ? (
            <div className="flex items-baseline gap-1">
              <Skeleton className="h-12 w-32 bg-gray-600" />
              <Skeleton className="ml-1 h-8 w-8 bg-gray-600" />
            </div>
          ) : (
            <div className="flex items-baseline gap-1">
              {showBalance ? (
                <>
                  <span className="text-5xl font-semibold text-white">
                    {currencyPrefix}
                    {balance.major}
                  </span>
                  <span className="text-2xl text-white">.{balance.minor}</span>
                </>
              ) : (
                <span className="text-5xl font-semibold text-white">••••</span>
              )}
            </div>
          )}
          {!loading && wallet ? (
            <div className="mt-4 space-y-1 text-xs text-gray-400">
              <p>
                Main balance · {currency}{" "}
                {showBalance ? `${currencyPrefix}${mainBal.toFixed(2)}` : "••••"}
                {ledgerBal !== mainBal ? (
                  <span className="ml-2">
                    · Ledger {showBalance ? `${currencyPrefix}${ledgerBal.toFixed(2)}` : "••••"}
                  </span>
                ) : null}
              </p>
              {nuban?.accountNumber ? (
                <p>
                  {nuban.bankName || "Bank"} · {nuban.accountNumber}
                  {nuban.provisionStatus ? ` · ${String(nuban.provisionStatus)}` : ""}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-4">
          {!loading ? (
            <button
              type="button"
              onClick={onToggleBalance}
              className="text-gray-400 transition-colors hover:text-white"
              aria-label={showBalance ? "Hide balance" : "Show balance"}
            >
              {showBalance ? <FiEyeOff size={24} /> : <FiEye size={24} />}
            </button>
          ) : null}
          {actions}
        </div>
      </div>
    </div>
  )
}
