"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Check, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { applicationApi } from "@/lib/services/accountService"
import {
  buildPlataMortgageThread,
  extractMortgageProgress,
  plataMortgageActionForStep,
  resolvePlataMortgageStep,
  type MortgageThreadItem,
} from "@/lib/mortgageWorkflowSpec"
import { cn } from "@/lib/utils"

const PLATA_ACCENT = "#9A813F"

type MortgageWorkflowDetailSheetProps = {
  applicationId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated?: () => void
}

function formatRef(ref: string) {
  if (ref.length <= 20) return ref
  return `${ref.slice(0, 10)}…${ref.slice(-6)}`
}

function ThreadRow({ item, isLast }: { item: MortgageThreadItem; isLast: boolean }) {
  return (
    <div className="flex gap-4">
      <div className="flex w-9 shrink-0 flex-col items-center">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full border-2 text-[11px] font-bold shadow-sm",
            item.status === "done"
              ? "border-green-600 bg-green-600 text-white"
              : item.status === "current"
                ? "border-[#8B7355] bg-[#8B7355] text-white ring-4 ring-[#F5F0E8]"
                : "border-gray-200 bg-white text-gray-400",
          )}
        >
          {item.status === "done" ? <Check className="h-4 w-4" /> : item.stepNumber}
        </div>
        {!isLast ? <div className="mt-2 w-0.5 flex-1 min-h-[28px] bg-gray-200" /> : null}
      </div>
      <div
        className={cn(
          "min-w-0 flex-1 rounded-xl border px-4 py-3",
          item.status === "current"
            ? "border-[#E8DFCF] bg-[#FFFBF5]"
            : item.status === "done"
              ? "border-gray-100 bg-gray-50/80"
              : "border-transparent bg-transparent",
          item.status === "upcoming" && "opacity-55",
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p
            className={cn(
              "text-sm font-semibold leading-snug",
              item.status === "current" ? "text-[#8B7355]" : "text-gray-900",
            )}
          >
            {item.title}
          </p>
          {item.status === "current" ? (
            <span className="shrink-0 rounded-full bg-[#F5F0E8] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#8B7355]">
              Current
            </span>
          ) : item.status === "done" ? (
            <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-green-700">
              Done
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-gray-500">{item.creatorAction}</p>
      </div>
    </div>
  )
}

export function MortgageWorkflowDetailSheet({
  applicationId,
  open,
  onOpenChange,
  onUpdated,
}: MortgageWorkflowDetailSheetProps) {
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null)

  const load = useCallback(async () => {
    if (!applicationId) return
    setLoading(true)
    try {
      const res = await applicationApi.getWorkflowApplication(applicationId)
      if (!res.success) throw new Error(res.error || "Failed to load application")
      const application = res.data
      if (!application) throw new Error("Failed to load application")
      setDetail(application as unknown as Record<string, unknown>)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load application")
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }, [applicationId])

  useEffect(() => {
    if (open && applicationId) void load()
  }, [open, applicationId, load])

  const loanWorkflowStatus = String(detail?.loanWorkflowStatus ?? "requested")
  const progress = detail ? extractMortgageProgress(detail) : {}
  const currentStep = resolvePlataMortgageStep(loanWorkflowStatus, progress)
  const thread = buildPlataMortgageThread(loanWorkflowStatus, progress)
  const action = plataMortgageActionForStep(currentStep)
  const currentThreadItem = thread.find((t) => t.id === currentStep)

  const canApprove =
    action === "approve" &&
    !["approved", "declined", "blacklisted"].includes(loanWorkflowStatus.toLowerCase())
  const canConfirmPayment =
    action === "confirm_payment" && Boolean(progress.downPaymentMadeAt) && !progress.downPaymentConfirmedAt
  const canDisburse =
    action === "disburse" && Boolean(progress.contractSignedAt) && !progress.disbursedAt

  const completedCount = useMemo(
    () => thread.filter((t) => t.status === "done").length,
    [thread],
  )

  const handleApprove = async () => {
    if (!applicationId) return
    setBusy(true)
    try {
      const res = await applicationApi.approve(applicationId)
      if (!res.success) throw new Error(res.error || "Approve failed")
      toast.success("Application approved — offer letter sent to applicant")
      await load()
      onUpdated?.()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Approve failed")
    } finally {
      setBusy(false)
    }
  }

  const handleConfirmPayment = async () => {
    if (!applicationId) return
    setBusy(true)
    try {
      const res = await applicationApi.confirmMortgageDownPayment(applicationId)
      if (!res.success) throw new Error(res.error || "Confirm payment failed")
      toast.success("Down payment confirmed — contract issued to applicant")
      await load()
      onUpdated?.()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Confirm payment failed")
    } finally {
      setBusy(false)
    }
  }

  const handleDisburse = async () => {
    if (!applicationId) return
    setBusy(true)
    try {
      const res = await applicationApi.triggerMortgageDisbursement(applicationId)
      if (!res.success) throw new Error(res.error || "Disbursement failed")
      toast.success("Loan disbursement triggered")
      await load()
      onUpdated?.()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Disbursement failed")
    } finally {
      setBusy(false)
    }
  }

  const name = String(
    detail?.userName ?? detail?.fullName ?? detail?.customerName ?? detail?.userId ?? "Applicant",
  )
  const ref = String(detail?.reference ?? detail?.id ?? applicationId ?? "—")

  const hasActions = canApprove || canConfirmPayment || canDisburse

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <SheetHeader className="shrink-0 space-y-1 border-b border-gray-100 px-6 py-5 text-left">
          <SheetTitle className="text-lg">Mortgage application</SheetTitle>
          <SheetDescription className="text-sm leading-relaxed">
            Product Creator flow — review the lifecycle and take action when a step requires you.
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex flex-1 items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : detail ? (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-5 px-6 py-5">
                <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                  <div className="border-b border-gray-100 bg-gray-50/80 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      Applicant
                    </p>
                  </div>
                  <div className="grid gap-4 p-4 sm:grid-cols-2">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                        Name
                      </p>
                      <p className="mt-1 text-sm font-semibold text-gray-900">{name}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                        Workflow status
                      </p>
                      <Badge className="mt-1 bg-[#F5F0E8] text-[#8B7355] hover:bg-[#F5F0E8]">
                        {loanWorkflowStatus.replaceAll("_", " ")}
                      </Badge>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                        Reference
                      </p>
                      <p className="mt-1 break-all font-mono text-xs text-gray-700" title={ref}>
                        {formatRef(ref)}
                      </p>
                    </div>
                    {currentThreadItem ? (
                      <div className="sm:col-span-2 rounded-lg border border-[#E8DFCF] bg-[#FFFBF5] px-3 py-2.5">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-[#8B7355]">
                          Current step
                        </p>
                        <p className="mt-0.5 text-sm font-medium text-gray-900">
                          {currentThreadItem.title}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </section>

                <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      Workflow thread
                    </p>
                    <p className="text-xs text-gray-500">
                      {completedCount} of {thread.length} complete
                    </p>
                  </div>
                  <div className="space-y-1 px-4 py-5">
                    {thread.map((item, index) => (
                      <ThreadRow key={item.id} item={item} isLast={index === thread.length - 1} />
                    ))}
                  </div>
                </section>

                {progress.disbursedAt ? (
                  <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                    <p className="font-medium">Disbursement completed</p>
                    <p className="mt-0.5 text-xs text-green-700">
                      {new Date(progress.disbursedAt).toLocaleString("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>

            {(hasActions ||
              (action === "confirm_payment" && !progress.downPaymentMadeAt) ||
              (action === "disburse" && !progress.contractSignedAt)) && (
              <div className="shrink-0 space-y-3 border-t border-gray-100 bg-gray-50/90 px-6 py-4">
                {action === "confirm_payment" && !progress.downPaymentMadeAt ? (
                  <p className="text-xs leading-relaxed text-amber-800">
                    Waiting for the applicant to make their down payment before you can confirm.
                  </p>
                ) : null}

                {action === "disburse" && !progress.contractSignedAt ? (
                  <p className="text-xs leading-relaxed text-amber-800">
                    Waiting for the applicant to sign the contract before disbursement.
                  </p>
                ) : null}

                {canApprove ? (
                  <Button
                    disabled={busy}
                    onClick={() => void handleApprove()}
                    className="w-full text-white hover:opacity-90"
                    style={{ backgroundColor: PLATA_ACCENT }}
                  >
                    {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Approve application
                  </Button>
                ) : null}

                {canConfirmPayment ? (
                  <Button
                    disabled={busy}
                    onClick={() => void handleConfirmPayment()}
                    className="w-full text-white hover:opacity-90"
                    style={{ backgroundColor: PLATA_ACCENT }}
                  >
                    {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Confirm down payment
                  </Button>
                ) : null}

                {canDisburse ? (
                  <Button
                    disabled={busy}
                    onClick={() => void handleDisburse()}
                    className="w-full text-white hover:opacity-90"
                    style={{ backgroundColor: PLATA_ACCENT }}
                  >
                    {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Trigger loan disbursement
                  </Button>
                ) : null}
              </div>
            )}
          </div>
        ) : (
          <p className="px-6 py-12 text-center text-sm text-gray-500">Application not found.</p>
        )}
      </SheetContent>
    </Sheet>
  )
}
