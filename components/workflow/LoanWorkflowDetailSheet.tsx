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
import { pendingApprovedLoanApi } from "@/lib/pendingApprovedLoanApi"
import {
  buildPlataLoanThread,
  extractLoanProgress,
  plataLoanActionForStep,
  resolvePlataLoanStep,
  type LoanThreadItem,
  type PlataLoanStepId,
} from "@/lib/loanWorkflowSpec"
import type { SpringApplicantProfileResponse } from "@/lib/springApplicantProfile"
import { SpringApplicantReviewPanel } from "@/components/workflow/SpringApplicantReviewPanel"
import { OfferLetterUploadControl } from "@/components/workflow/OfferLetterUploadControl"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const PLATA_ACCENT = "#9A813F"

type LoanWorkflowDetailSheetProps = {
  applicationId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated?: () => void
}

type StepActionKind = "mark_under_review" | "approve_offer" | "approve_disbursement"

function asPositiveNumber(value: unknown): number | undefined {
  const n = typeof value === "number" ? value : Number(value)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

function isEquityGateError(message: string): boolean {
  return /equity/i.test(message) && /not been received|cannot approve/i.test(message)
}

function ThreadRow({
  item,
  isLast,
  action,
}: {
  item: LoanThreadItem
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
          {item.statusLabel ? (
            <span className="shrink-0 rounded-full bg-green-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-700">
              {item.statusLabel}
            </span>
          ) : item.status === "current" ? (
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

export function LoanWorkflowDetailSheet({
  applicationId,
  open,
  onOpenChange,
  onUpdated,
}: LoanWorkflowDetailSheetProps) {
  const [loading, setLoading] = useState(false)
  const [busyAction, setBusyAction] = useState<StepActionKind | null>(null)
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null)
  const [profilePayload, setProfilePayload] = useState<SpringApplicantProfileResponse | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [approvedAmountInput, setApprovedAmountInput] = useState("")
  const [equityReceived, setEquityReceived] = useState(false)
  const [equityProviderReference, setEquityProviderReference] = useState("")
  const [showEquityAttest, setShowEquityAttest] = useState(false)

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
        setProfileError(
          profileRes.data.springApplicantProfileError && !profileRes.data.springApplicantProfile
            ? profileRes.data.springApplicantProfileError
            : profileRes.error || null,
        )
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

  useEffect(() => {
    if (!detail) return
    const amount =
      asPositiveNumber(detail.approvedLoanAmount) ??
      asPositiveNumber(detail.approvedAmount) ??
      asPositiveNumber(detail.amount) ??
      asPositiveNumber(detail.loanAmount)
    if (amount != null) setApprovedAmountInput(String(amount))
    setShowEquityAttest(false)
    setEquityReceived(false)
    setEquityProviderReference("")
  }, [detail, open, applicationId])

  const loanWorkflowStatus = String(
    detail?.loanWorkflowStatus ??
      profilePayload?.application?.loanWorkflowStatus ??
      profilePayload?.springApplicantProfile?.application?.loanWorkflowStatus ??
      "requested",
  )
  const progress = detail ? extractLoanProgress(detail) : {}
  const currentStep = resolvePlataLoanStep(loanWorkflowStatus, progress, detail ?? undefined)
  const thread = buildPlataLoanThread(loanWorkflowStatus, progress, detail ?? undefined)
  const currentThreadItem = thread.find((t) => t.id === currentStep)

  const statusLower = loanWorkflowStatus.toLowerCase()
  const pafStatus = String(
    detail?.postApprovalFulfillment &&
      typeof detail.postApprovalFulfillment === "object"
      ? (detail.postApprovalFulfillment as Record<string, unknown>).status || ""
      : "",
  )
    .trim()
    .toLowerCase()
  const isTerminal = ["declined", "blacklisted", "rejected"].includes(statusLower)
  const workflowReason = String(
    detail?.loanWorkflowReason ?? detail?.rejectionReason ?? detail?.reason ?? "",
  ).trim()

  const canMarkUnderReview = !isTerminal && statusLower === "requested"

  const canApproveOffer =
    !isTerminal && ["requested", "under_review"].includes(statusLower) && !progress.offerAcceptedAt

  const canApproveDisbursement =
    !isTerminal &&
    currentStep === "awaiting_disbursement" &&
    !progress.disbursedAt &&
    pafStatus !== "disbursed" &&
    (pafStatus === "offer_accepted" || Boolean(progress.offerAcceptedAt))

  const completedCount = useMemo(
    () => thread.filter((t) => t.status === "done").length,
    [thread],
  )

  const runAction = async (
    action: StepActionKind,
    fn: () => Promise<{ success: boolean; error?: string }>,
  ) => {
    if (!applicationId) return
    setBusyAction(action)
    try {
      const res = await fn()
      if (!res.success) throw new Error(res.error || "Action failed")
      await load()
      onUpdated?.()
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Action failed"
      if (action === "approve_offer" && isEquityGateError(message)) {
        setShowEquityAttest(true)
      }
      toast.error(message)
    } finally {
      setBusyAction(null)
    }
  }

  const handleMarkUnderReview = () =>
    void runAction("mark_under_review", async () => {
      const res = await applicationApi.updateLoanWorkflowStatus(applicationId!, {
        loanWorkflowStatus: "under_review",
      })
      if (res.success) toast.success("Moved to under review")
      return res
    })

  const handleApproveOffer = () =>
    void runAction("approve_offer", async () => {
      const approvedAmount = asPositiveNumber(approvedAmountInput)
      const res = await applicationApi.approve(applicationId!, {
        ...(approvedAmount != null ? { approvedAmount } : {}),
        ...(equityReceived
          ? {
              equityReceived: true,
              ...(equityProviderReference.trim()
                ? { equityProviderReference: equityProviderReference.trim() }
                : {}),
            }
          : {}),
      })
      if (res.success) {
        setShowEquityAttest(false)
        toast.success("Loan approved — choose an offer letter on Accept offer")
      }
      return res
    })

  const handleApproveDisbursement = () =>
    void runAction("approve_disbursement", async () => {
      const res = await pendingApprovedLoanApi.disburse(applicationId!)
      if (res.success) toast.success("Loan disbursed from Treasury to borrower wallet")
      return res
    })

  const renderStepAction = (stepId: PlataLoanStepId) => {
    const actionKind = plataLoanActionForStep(stepId, detail ?? undefined)

    if (stepId === "accept_offer") {
      const letterChoice = applicationId ? (
        <OfferLetterUploadControl
          applicationId={applicationId}
          detail={detail}
          onUploaded={() => {
            void load()
            onUpdated?.()
          }}
        />
      ) : null
      if (!actionKind) return letterChoice
    }

    if (stepId === "pending_approval" && (canMarkUnderReview || canApproveOffer)) {
      return (
        <div className="space-y-3">
          {canApproveOffer ? (
            <div className="space-y-2">
              <div className="space-y-1">
                <Label htmlFor="approved-amount" className="text-[11px] text-gray-500">
                  Approved amount (optional)
                </Label>
                <Input
                  id="approved-amount"
                  type="number"
                  min={0}
                  step="any"
                  value={approvedAmountInput}
                  onChange={(e) => setApprovedAmountInput(e.target.value)}
                  className="h-8 text-sm"
                  placeholder="e.g. 50000"
                />
              </div>
              {(showEquityAttest || equityReceived) && (
                <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                  <p className="text-[11px] leading-relaxed text-amber-900">
                    Equity payment is required before approval. Attest an offline payment if it was
                    received outside Plata.
                  </p>
                  <label className="flex items-center gap-2 text-xs text-gray-700">
                    <input
                      type="checkbox"
                      checked={equityReceived}
                      onChange={(e) => setEquityReceived(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    Equity received offline
                  </label>
                  {equityReceived ? (
                    <Input
                      value={equityProviderReference}
                      onChange={(e) => setEquityProviderReference(e.target.value)}
                      className="h-8 text-sm"
                      placeholder="Bank / provider reference"
                    />
                  ) : null}
                </div>
              )}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {canMarkUnderReview ? (
              <Button
                size="sm"
                variant="outline"
                disabled={busyAction !== null}
                onClick={handleMarkUnderReview}
                className="h-8 border-[#E8DFCF] text-[#8B7355] hover:bg-[#FFFBF5]"
              >
                {busyAction === "mark_under_review" ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : null}
                Mark under review
              </Button>
            ) : null}
            {canApproveOffer ? (
              <Button
                size="sm"
                disabled={busyAction !== null}
                onClick={handleApproveOffer}
                className="h-8 text-white hover:opacity-90"
                style={{ backgroundColor: PLATA_ACCENT }}
              >
                {busyAction === "approve_offer" ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : null}
                Approve loan
              </Button>
            ) : null}
          </div>
          {canApproveOffer ? (
            <p className="text-[11px] leading-relaxed text-gray-400">
              Approval does not send an offer letter. Zero-down loans skip the equity gate.
            </p>
          ) : null}
        </div>
      )
    }

    if (
      actionKind === "approve_disbursement" &&
      canApproveDisbursement &&
      stepId === "awaiting_disbursement"
    ) {
      return (
        <div className="space-y-2">
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
            Disburse loan
          </Button>
          <p className="text-[11px] leading-relaxed text-gray-400">
            Debits Treasury and credits the borrower wallet. Acceptance alone does not disburse.
          </p>
        </div>
      )
    }

    if (stepId === "awaiting_disbursement" && !canApproveDisbursement && pafStatus !== "disbursed") {
      return (
        <p className="text-xs text-gray-500">
          Waiting for the borrower to accept the offer before disbursement.
        </p>
      )
    }

    if (stepId === "loan_disbursed" && (progress.disbursedAt || pafStatus === "disbursed")) {
      return (
        <p className="text-xs font-medium text-green-700">
          Disbursed
          {progress.disbursedAt
            ? ` ${new Date(progress.disbursedAt).toLocaleString("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              })}`
            : ""}
          . Repayments collect into the merchant Repayment wallet.
        </p>
      )
    }

    return null
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <SheetHeader className="shrink-0 space-y-1 border-b border-gray-100 px-6 py-5 text-left">
          <SheetTitle className="text-lg">Loan application</SheetTitle>
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
                {profileError && !profilePayload && !detail ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    Applicant profile could not be loaded: {profileError}
                  </div>
                ) : null}

                {isTerminal && workflowReason ? (
                  <div
                    className={`rounded-lg border px-4 py-3 text-sm ${
                      statusLower === "blacklisted"
                        ? "border-gray-300 bg-gray-50 text-gray-800"
                        : "border-red-200 bg-red-50 text-red-900"
                    }`}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">
                      {statusLower === "blacklisted" ? "Blacklist reason" : "Decline reason"}
                    </p>
                    <p className="mt-1 leading-relaxed">{workflowReason}</p>
                  </div>
                ) : null}

                <SpringApplicantReviewPanel
                  payload={profilePayload}
                  plataApplication={detail}
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
