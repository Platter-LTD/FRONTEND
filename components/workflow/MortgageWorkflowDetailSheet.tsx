"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Check, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { MortgageWorkflowDetailSkeleton } from "@/components/ui/app-loading-skeleton"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { applicationApi } from "@/lib/services/accountService"
import { pendingApprovedMortgageApi } from "@/lib/pendingApprovedMortgageApi"
import { extractPostApprovalFulfillment } from "@/lib/postApprovalMortgage"
import {
  buildPlataMortgageThread,
  extractMortgageProgress,
  plataMortgageActionForStep,
  resolvePlataMortgageStep,
  type MortgageThreadItem,
  type PlataMortgageStepId,
} from "@/lib/mortgageWorkflowSpec"
import type { SpringApplicantProfileResponse } from "@/lib/springApplicantProfile"
import { SpringApplicantReviewPanel } from "@/components/workflow/SpringApplicantReviewPanel"
import { cn } from "@/lib/utils"

const PLATA_ACCENT = "#9A813F"

type MortgageWorkflowDetailSheetProps = {
  applicationId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated?: () => void
}

type StepActionKind = "approve_offer" | "approve_contract" | "approve_disbursement" | "confirm_payment"

function ThreadRow({
  item,
  isLast,
  action,
}: {
  item: MortgageThreadItem
  isLast: boolean
  action?: React.ReactNode
}) {
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
        {!isLast ? <div className="mt-2 min-h-[28px] w-0.5 flex-1 bg-gray-200" /> : null}
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
              In progress
            </span>
          ) : item.status === "done" ? (
            <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-green-700">
              Done
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-gray-500">{item.creatorAction}</p>
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
    </div>
  )
}

function isApprovedWorkflowStatus(status: string): boolean {
  return ["approved", "offer_sent", "completed", "active"].includes(status.toLowerCase())
}

function stepIdsForAction(action: StepActionKind): PlataMortgageStepId[] {
  if (action === "approve_offer") return ["application_submission", "review_approval"]
  if (action === "approve_contract") return ["contract_signed"]
  if (action === "approve_disbursement") return ["loan_disbursement"]
  return ["down_payment"]
}

export function MortgageWorkflowDetailSheet({
  applicationId,
  open,
  onOpenChange,
  onUpdated,
}: MortgageWorkflowDetailSheetProps) {
  const [loading, setLoading] = useState(false)
  const [busyAction, setBusyAction] = useState<StepActionKind | null>(null)
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null)
  const [profilePayload, setProfilePayload] = useState<SpringApplicantProfileResponse | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!applicationId) return
    setLoading(true)
    setProfileError(null)
    try {
      const [appRes, profileRes] = await Promise.all([
        applicationApi.getWorkflowApplication(applicationId),
        applicationApi.getSpringApplicantProfile(applicationId),
      ])

      if (profileRes.success && profileRes.data) {
        setProfilePayload(profileRes.data)
        const plataFromProfile = profileRes.data.application
        if (plataFromProfile && typeof plataFromProfile === "object") {
          setDetail(plataFromProfile as Record<string, unknown>)
        } else if (appRes.success && appRes.data) {
          setDetail(appRes.data as unknown as Record<string, unknown>)
        } else {
          setDetail(null)
        }
      } else if (profileRes.data) {
        setProfilePayload(profileRes.data)
        setProfileError(profileRes.error || profileRes.data.springApplicantProfileError || null)
        const plataFromProfile = profileRes.data.application
        if (plataFromProfile && typeof plataFromProfile === "object") {
          setDetail(plataFromProfile as Record<string, unknown>)
        } else if (appRes.success && appRes.data) {
          setDetail(appRes.data as unknown as Record<string, unknown>)
        } else {
          setDetail(null)
        }
      } else {
        setProfilePayload(null)
        setProfileError(profileRes.error || null)
        if (appRes.success && appRes.data) {
          setDetail(appRes.data as unknown as Record<string, unknown>)
        } else {
          throw new Error(appRes.error || profileRes.error || "Failed to load application")
        }
      }

      if (!appRes.success && profileRes.success) {
        console.warn("[MortgageWorkflow] application detail GET failed; using profile envelope", appRes.error)
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load application")
      setDetail(null)
      setProfilePayload(null)
    } finally {
      setLoading(false)
    }
  }, [applicationId])

  useEffect(() => {
    if (open && applicationId) void load()
  }, [open, applicationId, load])

  const loanWorkflowStatus = String(
    detail?.loanWorkflowStatus ??
      profilePayload?.application?.loanWorkflowStatus ??
      profilePayload?.springApplicantProfile?.application?.loanWorkflowStatus ??
      "requested",
  )
  const progress = detail ? extractMortgageProgress(detail) : {}
  const postApproval = detail ? extractPostApprovalFulfillment(detail) : null
  const pafStatus = postApproval?.status
  const currentStep = resolvePlataMortgageStep(loanWorkflowStatus, progress, detail ?? undefined)
  const thread = buildPlataMortgageThread(loanWorkflowStatus, progress, detail ?? undefined)
  const currentThreadItem = thread.find((t) => t.id === currentStep)

  const statusLower = loanWorkflowStatus.toLowerCase()
  const isTerminal = ["declined", "blacklisted", "rejected"].includes(statusLower)

  const canApproveOffer =
    !isTerminal &&
    ["requested", "under_review"].includes(statusLower) &&
    !progress.offerAcceptedAt

  const canConfirmPayment =
    !isTerminal &&
    (pafStatus === "down_payment_paid" ||
      (Boolean(progress.downPaymentMadeAt) && !progress.downPaymentConfirmedAt))

  const canApproveDisbursement =
    !isTerminal &&
    (pafStatus === "contract_signed" ||
      (Boolean(progress.contractApprovedAt) && !progress.disbursedAt))

  const completedCount = useMemo(
    () => thread.filter((t) => t.status === "done").length,
    [thread],
  )

  const runAction = async (action: StepActionKind, fn: () => Promise<{ success: boolean; error?: string }>) => {
    if (!applicationId) return
    setBusyAction(action)
    try {
      const res = await fn()
      if (!res.success) throw new Error(res.error || "Action failed")
      await load()
      onUpdated?.()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Action failed")
    } finally {
      setBusyAction(null)
    }
  }

  const handleApproveOffer = () =>
    void runAction("approve_offer", async () => {
      const res = await applicationApi.approve(applicationId!)
      if (res.success) toast.success("Offer approved — offer letter sent to applicant")
      return res
    })

  const handleApproveDisbursement = () =>
    void runAction("approve_disbursement", async () => {
      const res = pafStatus
        ? await pendingApprovedMortgageApi.disburse(applicationId!)
        : await applicationApi.triggerMortgageDisbursement(applicationId!)
      if (res.success) toast.success("Loan disbursement triggered")
      return res
    })

  const handleConfirmPayment = () =>
    void runAction("confirm_payment", async () => {
      const res = pafStatus
        ? await pendingApprovedMortgageApi.confirmDownPayment(applicationId!)
        : await applicationApi.confirmMortgageDownPayment(applicationId!)
      if (res.success) toast.success("Down payment confirmed — contract issued")
      return res
    })

  const renderStepAction = (stepId: PlataMortgageStepId) => {
    const actionKind = plataMortgageActionForStep(stepId, detail ?? undefined)
    if (!actionKind || !stepIdsForAction(actionKind as StepActionKind).includes(stepId)) return null

    if (actionKind === "approve_offer" && canApproveOffer && stepId === currentStep) {
      return (
        <Button
          size="sm"
          disabled={busyAction !== null}
          onClick={handleApproveOffer}
          className="h-8 text-white hover:opacity-90"
          style={{ backgroundColor: PLATA_ACCENT }}
        >
          {busyAction === "approve_offer" ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
          Approve Offer
        </Button>
      )
    }

    if (actionKind === "approve_disbursement" && canApproveDisbursement && stepId === "loan_disbursement") {
      return (
        <Button
          size="sm"
          disabled={busyAction !== null}
          onClick={handleApproveDisbursement}
          className="h-8 text-white hover:opacity-90"
          style={{ backgroundColor: PLATA_ACCENT }}
        >
          {busyAction === "approve_disbursement" ? (
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
          ) : null}
          Approve Disbursement
        </Button>
      )
    }

    if (actionKind === "confirm_payment" && canConfirmPayment && stepId === "down_payment") {
      return (
        <Button
          size="sm"
          variant="outline"
          disabled={busyAction !== null}
          onClick={handleConfirmPayment}
          className="h-8 border-[#9A813F] text-[#8B7355] hover:bg-[#F5F0E8]"
        >
          {busyAction === "confirm_payment" ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
          Confirm down payment
        </Button>
      )
    }

    if (actionKind === "approve_offer" && stepId === "application_submission" && isTerminal) return null
    if (actionKind === "approve_disbursement" && stepId === "loan_disbursement" && (progress.disbursedAt || pafStatus === "disbursed")) {
      return (
        <p className="text-xs font-medium text-green-700">
          Disbursed
          {progress.disbursedAt
            ? ` ${new Date(progress.disbursedAt).toLocaleString("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              })}`
            : ""}
        </p>
      )
    }

    if (actionKind === "approve_offer" && !canApproveOffer && isApprovedWorkflowStatus(statusLower)) {
      return <p className="text-xs text-gray-500">Offer already approved</p>
    }

    if (actionKind === "approve_disbursement" && !canApproveDisbursement && !progress.disbursedAt && pafStatus !== "disbursed") {
      return (
        <p className="text-xs text-gray-500">
          {pafStatus === "contract_issued" || pafStatus === "down_payment_confirmed"
            ? "Waiting for applicant to sign contract"
            : "Waiting for signed contract before disbursement"}
        </p>
      )
    }

    return null
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <SheetHeader className="shrink-0 space-y-1 border-b border-gray-100 px-6 py-5 text-left">
          <SheetTitle className="text-lg">Mortgage application</SheetTitle>
          <SheetDescription className="text-sm leading-relaxed">
            Review applicant details below, then use workflow actions when required.
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex-1 overflow-y-auto">
            <MortgageWorkflowDetailSkeleton />
          </div>
        ) : detail || profilePayload ? (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-5 px-6 py-5">
                {profileError && !profilePayload ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    Applicant profile could not be loaded: {profileError}
                  </div>
                ) : null}

                <SpringApplicantReviewPanel
                  payload={profilePayload}
                  loanWorkflowStatus={loanWorkflowStatus}
                  currentStepTitle={currentThreadItem?.title}
                />

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
                      <ThreadRow
                        key={item.id}
                        item={item}
                        isLast={index === thread.length - 1}
                        action={renderStepAction(item.id)}
                      />
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </div>
        ) : (
          <p className="px-6 py-12 text-center text-sm text-gray-500">Application not found.</p>
        )}
      </SheetContent>
    </Sheet>
  )
}
