"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, RefreshCw, CheckCircle2, XCircle, Clock, FileText, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CardListSkeleton } from "@/components/ui/app-loading-skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  accountService,
  type LoanWorkflowApplication,
  type LoanWorkflowStatus,
} from "@/lib/services/accountService"
import { resolveApplicationCustomerName } from "@/lib/applicationCustomer"
import { toast } from "sonner"

function workflowStatus(application: LoanWorkflowApplication): LoanWorkflowStatus {
  return application.loanWorkflowStatus ?? "requested"
}

function getProductName(application: LoanWorkflowApplication) {
  return (
    application.productName ||
    application.globalProductReferenceNumber ||
    application.merchantProductId ||
    application.localApplicationId ||
    `${application.productType} Application`
  )
}

function getAmount(application: LoanWorkflowApplication) {
  const snapshot = application.contractSnapshot ?? {}
  const amount = Number(
    snapshot.approvedAmount ??
      snapshot.approvedPrincipal ??
      snapshot.principal ??
      snapshot.amount ??
      snapshot.loanAmount ??
      snapshot.propertyValue ??
      0,
  )
  const currency = String(snapshot.currency ?? application.loanDisbursement?.currency ?? "NGN")
  if (!Number.isFinite(amount) || amount <= 0) return "N/A"
  return `${currency}${amount.toLocaleString("en-NG")}`
}

function getTimeAgo(dateString: string) {
  const parsed = new Date(dateString).getTime()
  if (!Number.isFinite(parsed)) return "recently"
  const diffMs = Date.now() - parsed
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`
  if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`
  return "Just now"
}

export default function PlataPendingApplicationsPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const appId = params.id
  const [applications, setApplications] = useState<LoanWorkflowApplication[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processing, setProcessing] = useState<{ id: string; action: "approve" | "reject" } | null>(null)
  const [confirm, setConfirm] = useState<{ action: "approve" | "reject"; application: LoanWorkflowApplication } | null>(
    null,
  )

  const fetchApplications = async () => {
    setIsLoading(true)
    try {
      const requested = await accountService.applications.getLoanWorkflowApplications({
        appId,
        loanWorkflowStatus: "requested",
        limit: 100,
      })
      const underReview = await accountService.applications.getLoanWorkflowApplications({
        appId,
        loanWorkflowStatus: "under_review",
        limit: 100,
      })

      if (!requested.success && !underReview.success) {
        toast.error(requested.error || underReview.error || "Failed to load pending applications")
        setApplications([])
        return
      }

      const rows = [
        ...(Array.isArray(requested.data) ? requested.data : []),
        ...(Array.isArray(underReview.data) ? underReview.data : []),
      ]
      const unique = Array.from(new Map(rows.map((application) => [application.id, application])).values())
      setApplications(unique.filter((application) => ["requested", "under_review"].includes(workflowStatus(application))))
    } catch (error) {
      console.error("Failed to load Plata pending workflow applications:", error)
      toast.error("Failed to load pending applications")
      setApplications([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchApplications()
  }, [appId])

  const handleApprove = async (application: LoanWorkflowApplication) => {
    setProcessing({ id: application.id, action: "approve" })
    try {
      const result = await accountService.applications.updateLoanWorkflowStatus(application.id, {
        loanWorkflowStatus: "approved",
      })
      if (!result.success) {
        toast.error(result.error || "Failed to approve application")
        return
      }
      toast.success("Application approved")
      await fetchApplications()
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (application: LoanWorkflowApplication) => {
    setProcessing({ id: application.id, action: "reject" })
    try {
      const result = await accountService.applications.updateLoanWorkflowStatus(application.id, {
        loanWorkflowStatus: "declined",
      })
      if (!result.success) {
        toast.error(result.error || "Failed to reject application")
        return
      }
      toast.success("Application rejected")
      await fetchApplications()
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/dashboard/create-app/all-apps/${appId}/applications`)}
            className="mb-2 -ml-2 gap-2 text-gray-600 hover:bg-[#FFF9EB] hover:text-[#9A813F]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to All Applications
          </Button>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
            <Clock className="h-8 w-8 text-[#9A813F]" />
            Pending Applications
          </h1>
          <p className="text-sm text-gray-500">Requested and under-review loan/mortgage applications</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void fetchApplications()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {applications.length > 0 ? (
        <div className="mb-8 flex items-start gap-3 rounded-xl border border-[#E8DFD0] bg-[#FFF9EB] p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 text-[#9A813F]" />
          <div>
            <h3 className="font-medium text-[#7A642F]">
              {applications.length} application{applications.length > 1 ? "s" : ""} pending review
            </h3>
            <p className="mt-1 text-sm text-[#7A642F]">Approve or reject these applications from Plata.</p>
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        {isLoading ? (
          <CardListSkeleton rows={4} />
        ) : applications.length === 0 ? (
          <div className="rounded-xl border border-[#E8DFD0] bg-white p-12 text-center">
            <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-green-500" />
            <h3 className="mb-2 text-xl font-semibold text-gray-900">All caught up</h3>
            <p className="text-gray-500">There are no pending applications to review.</p>
          </div>
        ) : (
          applications.map((application) => {
            const isApproving = processing?.id === application.id && processing.action === "approve"
            const isRejecting = processing?.id === application.id && processing.action === "reject"
            return (
              <div key={application.id} className="rounded-xl border border-[#E8DFD0] bg-white p-6 transition-all hover:border-[#9A813F]/40 hover:shadow-md">
                <div className="flex items-start justify-between gap-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#FFF9EB] text-[#9A813F]">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="mb-1 font-semibold text-gray-900">{getProductName(application)}</h3>
                      <p className="mb-1 text-sm font-medium text-gray-800">
                        {resolveApplicationCustomerName(application)}
                      </p>
                      <p className="mb-2 text-sm text-gray-500">
                        Reference: <span className="font-mono">{application.id.slice(0, 8).toUpperCase()}</span>
                      </p>
                      <p className="text-sm text-gray-600">
                        Amount: <span className="font-semibold text-gray-900">{getAmount(application)}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="mb-2 text-sm text-gray-500">Submitted {getTimeAgo(application.submittedAt || application.createdAt)}</p>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setConfirm({ action: "reject", application })}
                        disabled={isApproving || isRejecting}
                        className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-600"
                      >
                        <XCircle className="mr-1 h-4 w-4" />
                        {isRejecting ? "Processing..." : "Reject"}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setConfirm({ action: "approve", application })}
                        disabled={isApproving || isRejecting}
                        className="bg-[#9A813F] text-white hover:bg-[#7A642F]"
                      >
                        <CheckCircle2 className="mr-1 h-4 w-4" />
                        {isApproving ? "Processing..." : "Approve"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <AlertDialog open={!!confirm} onOpenChange={(open) => (!open ? setConfirm(null) : null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.action === "approve" ? "Approve application?" : "Reject application?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.application
                ? `This will ${confirm.action === "approve" ? "approve" : "reject"} the ${getProductName(confirm.application)} application for ${resolveApplicationCustomerName(confirm.application)}.`
                : "Confirm action."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!!processing || !confirm?.application}
              onClick={async () => {
                if (!confirm?.application) return
                const app = confirm.application
                const action = confirm.action
                setConfirm(null)
                if (action === "approve") await handleApprove(app)
                else await handleReject(app)
              }}
            >
              {confirm?.action === "approve" ? "Approve" : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
