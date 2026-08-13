"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { NIGERIAN_BANKS } from "@/lib/ngBanks"
import { WALLET_BRAND } from "@/lib/walletBrand"
import { formatPlataWalletAmount, plataWalletDisplayCurrency } from "@/lib/walletDisplay"
import { billingApi } from "@/lib/services/walletService"

export type WithdrawWalletMode = "user" | "merchant-settlement"

const MAX_PAYOUT_AMOUNT = 1_000_000

interface WithdrawWalletDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: WithdrawWalletMode
  maxAmount: number
  currency?: string
  appId?: string
  /** Require active repayment virtual NUBAN before payout. */
  nubanActive?: boolean
  onSuccess?: () => void | Promise<void>
}

function newPayoutReference() {
  return `wd-${Date.now()}`
}

export function WithdrawWalletDialog({
  open,
  onOpenChange,
  mode,
  maxAmount,
  currency: currencyProp,
  appId,
  nubanActive = true,
  onSuccess,
}: WithdrawWalletDialogProps) {
  const currency = plataWalletDisplayCurrency(currencyProp)
  const [accountNumber, setAccountNumber] = useState("")
  const [bankCode, setBankCode] = useState("")
  const [accountName, setAccountName] = useState("")
  const [amount, setAmount] = useState("")
  const [narration, setNarration] = useState("Wallet withdrawal")
  const [submitting, setSubmitting] = useState(false)
  const payoutReferenceRef = useRef(newPayoutReference())

  useEffect(() => {
    if (open) {
      payoutReferenceRef.current = newPayoutReference()
    }
  }, [open])

  const reset = () => {
    setAccountNumber("")
    setBankCode("")
    setAccountName("")
    setAmount("")
    setNarration("Wallet withdrawal")
  }

  const handleClose = (next: boolean) => {
    onOpenChange(next)
    if (!next) setTimeout(reset, 200)
  }

  const selectedBank = NIGERIAN_BANKS.find((b) => b.code === bankCode)

  const handleSubmit = async () => {
    if (!nubanActive) {
      toast.error("Repayment virtual account is not active yet")
      return
    }
    const numAmount = Number(amount)
    if (!/^\d{10}$/.test(accountNumber)) {
      toast.error("Account number must be 10 digits")
      return
    }
    if (!bankCode) {
      toast.error("Select a bank")
      return
    }
    if (!accountName.trim() || accountName.trim().length > 120) {
      toast.error("Enter account name (1–120 characters)")
      return
    }
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      toast.error("Enter a valid amount")
      return
    }
    if (numAmount > maxAmount) {
      toast.error(`Amount exceeds available balance (${formatPlataWalletAmount(maxAmount)})`)
      return
    }
    if (numAmount > MAX_PAYOUT_AMOUNT) {
      toast.error(`Maximum payout is ${formatPlataWalletAmount(MAX_PAYOUT_AMOUNT)}`)
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        accountNumber,
        bankCode,
        accountName: accountName.trim(),
        bankName: selectedBank?.name,
        amount: numAmount,
        currency,
        narration: (narration.trim() || "Wallet withdrawal").slice(0, 500),
        // Reuse for retries within this open session (idempotency)
        reference: payoutReferenceRef.current,
        ...(appId ? { appId } : {}),
      }

      if (mode === "user") {
        toast.error("User bank withdrawal is not available on this dashboard")
        return
      }

      const res = await billingApi.repaymentPayout(payload, appId)
      const duplicate = Boolean(res.duplicate)
      if (duplicate) toast.message("Duplicate payout — already processed")
      else toast.success(res.message || "Repayment payout initiated")

      await onSuccess?.()
      handleClose(false)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Withdrawal failed")
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass = "border-[#E8DFD0] focus-visible:ring-[#9A813F]"
  const canSubmit = nubanActive && maxAmount > 0 && !submitting

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className="flex flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Withdraw to bank</SheetTitle>
          <SheetDescription>
            Available: {formatPlataWalletAmount(maxAmount)}
            {!nubanActive
              ? " · Virtual account must be active before payout"
              : null}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {!nubanActive ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Payout is disabled until the repayment wallet virtual NUBAN is active.
            </div>
          ) : null}

          <div className="space-y-2">
            <Label>Bank</Label>
            <Select value={bankCode} onValueChange={setBankCode} disabled={!nubanActive}>
              <SelectTrigger className={inputClass}>
                <SelectValue placeholder="Select bank" />
              </SelectTrigger>
              <SelectContent>
                {NIGERIAN_BANKS.map((bank) => (
                  <SelectItem key={bank.code} value={bank.code}>
                    {bank.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="wd-acct">Account number</Label>
            <Input
              id="wd-acct"
              inputMode="numeric"
              maxLength={10}
              placeholder="0123456789"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
              className={inputClass}
              disabled={!nubanActive}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wd-name">Account name</Label>
            <Input
              id="wd-name"
              placeholder="Account holder name"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value.slice(0, 120))}
              className={inputClass}
              disabled={!nubanActive}
            />
            <p className="text-xs text-gray-500">
              No name enquiry on wallet-ms — enter the exact account name.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="wd-amt">Amount ({currency})</Label>
            <Input
              id="wd-amt"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputClass}
              disabled={!nubanActive}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wd-narr">Narration</Label>
            <Input
              id="wd-narr"
              value={narration}
              onChange={(e) => setNarration(e.target.value.slice(0, 500))}
              className={inputClass}
              disabled={!nubanActive}
            />
          </div>
        </div>

        <div className="flex gap-2 border-t border-[#E8DFD0] px-6 py-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1 border-[#E8DFD0] hover:bg-[#FFF9EB]"
            onClick={() => handleClose(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canSubmit}
            className="flex-1 text-white hover:opacity-90"
            style={{ backgroundColor: WALLET_BRAND.primary }}
            onClick={() => void handleSubmit()}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Withdraw
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
