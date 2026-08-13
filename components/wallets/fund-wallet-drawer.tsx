"use client"

import { useCallback, useEffect, useState } from "react"
import { Copy, CreditCard, Landmark, Loader2, Check } from "lucide-react"
import { toast } from "sonner"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { WALLET_BRAND } from "@/lib/walletBrand"
import {
  formatPlataWalletAmount,
  plataWalletDisplayCurrency,
} from "@/lib/walletDisplay"
import { isVirtualNubanActive } from "@/lib/services/walletService"

export interface WalletVirtualNuban {
  accountNumber?: string
  bankName?: string
  bankCode?: string
  accountHolder?: string
  provisionStatus?: string
}

interface FundWalletDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  virtualNuban?: WalletVirtualNuban | null
  /** Spendable balance shown in instructions (from wallet GET). */
  mainBalance?: number
  currency?: string
  onRefreshBalance?: () => void | Promise<void>
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      toast.success(`${label} copied`)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Could not copy")
    }
  }

  return (
    <div className="space-y-1 rounded-lg border border-[#E8DFD0] bg-[#FFF9EB]/50 px-4 py-3">
      <Label className="text-xs font-normal text-gray-500">{label}</Label>
      <div className="flex items-center justify-between gap-3">
        <p className="text-base font-semibold text-gray-900 break-all">{value || "—"}</p>
        <button
          type="button"
          onClick={() => void copy()}
          disabled={!value}
          className="shrink-0 rounded-lg p-2 text-[#9A813F] transition-colors hover:bg-[#FFF9EB] disabled:opacity-40"
          aria-label={`Copy ${label}`}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}

export function FundWalletDrawer({
  open,
  onOpenChange,
  virtualNuban,
  mainBalance,
  currency: currencyProp,
  onRefreshBalance,
}: FundWalletDrawerProps) {
  const currency = plataWalletDisplayCurrency(currencyProp)
  const [step, setStep] = useState<"method" | "bank-details">("method")
  const [refreshing, setRefreshing] = useState(false)

  const canFund = isVirtualNubanActive(virtualNuban)

  useEffect(() => {
    if (open && canFund) setStep("bank-details")
  }, [open, canFund])

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next)
    if (!next) {
      setTimeout(() => {
        setStep("method")
      }, 300)
    }
  }

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await onRefreshBalance?.()
      toast.success("Balance refreshed")
    } catch {
      toast.error("Could not refresh balance")
    } finally {
      setRefreshing(false)
    }
  }, [onRefreshBalance])

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="flex flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{step === "method" ? "Fund wallet" : "Bank transfer"}</SheetTitle>
          <SheetDescription>
            {step === "method"
              ? "Transfer into this wallet’s virtual account. Funding is not submitted from the dashboard."
              : `Send ${currency} to the account below. Credits arrive via PayOnUs webhook.`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === "method" ? (
            <div className="space-y-3">
              {typeof mainBalance === "number" && Number.isFinite(mainBalance) ? (
                <p className="rounded-lg border border-[#E8DFD0] bg-[#FFF9EB] px-4 py-3 text-sm text-gray-700">
                  Current balance:{" "}
                  <span className="font-semibold text-gray-900">
                    {formatPlataWalletAmount(mainBalance)} {currency}
                  </span>
                </p>
              ) : null}

              <button
                type="button"
                disabled={!canFund}
                className="flex w-full items-center gap-4 rounded-xl border border-[#E8DFD0] bg-[#FFF9EB] p-4 text-left transition-colors hover:border-[#9A813F]/40 hover:bg-[#FFF3CF]/60 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => setStep("bank-details")}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#9A813F]/15 text-[#9A813F]">
                  <Landmark className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Bank transfer</h3>
                  <p className="text-sm text-gray-600">
                    {canFund
                      ? `Send ${currency} to your virtual NUBAN`
                      : "Virtual account not active yet"}
                  </p>
                </div>
              </button>

              <button
                type="button"
                disabled
                className="flex w-full cursor-not-allowed items-center gap-4 rounded-xl border border-gray-100 p-4 text-left opacity-50"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Card</h3>
                  <p className="text-sm text-gray-500">Coming soon</p>
                </div>
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {!canFund ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  No active virtual account is provisioned yet (`provisionStatus` must be{" "}
                  <strong>active</strong> with an account number). Try again after wallet
                  onboarding completes.
                </div>
              ) : (
                <div className="space-y-3">
                  <CopyRow
                    label="Account holder"
                    value={virtualNuban?.accountHolder || "Wallet account"}
                  />
                  <CopyRow label="Account number" value={virtualNuban?.accountNumber || ""} />
                  <CopyRow label="Bank name" value={virtualNuban?.bankName || ""} />
                  {virtualNuban?.bankCode ? (
                    <CopyRow label="Bank code" value={virtualNuban.bankCode} />
                  ) : null}
                </div>
              )}

              <div className="rounded-lg border border-[#E8DFD0] bg-[#FFF9EB] p-4">
                <h4 className="text-sm font-semibold text-[#9A813F]">Before you send</h4>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-gray-700">
                  <li>Only send {currency} to this account</li>
                  <li>Deposits usually reflect within a few minutes</li>
                  <li>After you transfer, tap refresh to update the balance</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-[#E8DFD0] px-6 py-4 space-y-2">
          {step === "bank-details" ? (
            <>
              <Button
                type="button"
                className="w-full text-white hover:opacity-90"
                style={{ backgroundColor: WALLET_BRAND.primary }}
                onClick={() => void handleRefresh()}
                disabled={refreshing || !canFund}
              >
                {refreshing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                I&apos;ve sent money — refresh
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full border-[#E8DFD0] text-gray-700 hover:bg-[#FFF9EB]"
                onClick={() => setStep("method")}
              >
                Back
              </Button>
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
