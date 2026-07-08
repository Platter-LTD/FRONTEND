"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Search, RefreshCw, Clock, CheckCircle2, XCircle, FileText, MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TableSkeleton } from "@/components/ui/table-skeleton"
import {
  accountService,
  type LoanWorkflowApplication,
  type LoanWorkflowStatus,
} from "@/lib/services/accountService"
import { toast } from "sonner"
import {
  applicationCustomerInitials,
  resolveApplicationCustomerName,
} from "@/lib/applicationCustomer"

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

function getApplicant(application: LoanWorkflowApplication) {
  const label = resolveApplicationCustomerName(application)
  return {
    label,
    subtitle:
      application.offeringMerchantName ||
      application.merchantName ||
      application.offeringMerchantId ||
      application.userId ||
      "No merchant",
    initials: applicationCustomerInitials(label),
  }
}

function numericSnapshotValue(snapshot: Record<string, unknown> | undefined, keys: string[]) {
  for (const key of keys) {
    const value = snapshot?.[key]
    const numeric = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN
    if (Number.isFinite(numeric) && numeric > 0) return numeric
  }
  return 0
}

function getAmount(application: LoanWorkflowApplication) {
  const amount = numericSnapshotValue(application.contractSnapshot, [
    "approvedAmount",
    "approvedPrincipal",
    "principal",
    "amount",
    "loanAmount",
    "propertyValue",
  ])
  const currency = String(application.contractSnapshot?.currency ?? application.loanDisbursement?.currency ?? "NGN")
  if (!amount) return "N/A"
  return `${currency}${amount.toLocaleString("en-NG")}`
}

function getStatusBadge(status: LoanWorkflowStatus) {
  const styles: Record<LoanWorkflowStatus, string> = {
    requested: "bg-[#FFF3CF] text-[#9A813F]",
    under_review: "bg-blue-100 text-blue-700",
    approved: "bg-green-100 text-green-700",
    declined: "bg-red-100 text-red-700",
    blacklisted: "bg-gray-100 text-gray-700",
  }
  const label = status === "declined" ? "rejected" : status.replace("_", " ")
  return <span className={`rounded-full px-2 py-1 text-xs font-medium ${styles[status]}`}>{label}</span>
}

export default function PlataApplicationsPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const appId = params.id
  const [applications, setApplications] = useState<LoanWorkflowApplication[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | LoanWorkflowStatus>("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [processing, setProcessing] = useState<{ id: string; action: "approve" | "reject" } | null>(null)
  const [confirm, setConfirm] = useState<{ action: "approve" | "reject"; application: LoanWorkflowApplication } | null>(
    null,
  )

  const fetchApplications = async () => {
    setIsLoading(true)
    try {
      const response = await accountService.applications.getLoanWorkflowApplications({ appId, limit: 100 })
      if (!response.success) {
        toast.error(response.error || "Failed to load applications")
        setApplications([])
        return
      }
      setApplications(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      console.error("Failed to fetch Plata workflow applications:", error)
      toast.error("Failed to load applications")
      setApplications([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchApplications()
  }, [appId])

  const visibleApplications = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return applications.filter((application) => {
      const status = workflowStatus(application)
      const searchable = [
        application.id,
        application.userId,
        application.customerName,
        application.productType,
        application.productName,
        application.globalProductReferenceNumber,
        application.localApplicationId,
        application.merchantProductId,
        getProductName(application),
        getApplicant(application).label,
        getApplicant(application).subtitle,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      return (
        (!query || searchable.includes(query)) &&
        (statusFilter === "all" || status === statusFilter) &&
        (typeFilter === "all" || String(application.productType).toUpperCase() === typeFilter)
      )
    })
  }, [applications, searchQuery, statusFilter, typeFilter])

  const stats = {
    total: applications.length,
    pending: applications.filter((a) => ["requested", "under_review"].includes(workflowStatus(a))).length,
    approved: applications.filter((a) => workflowStatus(a) === "approved").length,
    rejected: applications.filter((a) => ["declined", "blacklisted"].includes(workflowStatus(a))).length,
  }

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
          <h1 className="text-3xl font-bold text-gray-900">Applications</h1>
          <p className="text-sm text-gray-500">Review loan and mortgage workflow applications</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/create-app/all-apps/${appId}/applications/pending`)}
            className="gap-2 border-[#E8DFD0] text-[#9A813F] hover:bg-[#FFF9EB]"
          >
            <Clock className="h-4 w-4" />
            Pending ({stats.pending})
          </Button>
          <Button variant="outline" size="sm" onClick={() => void fetchApplications()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
        {[
          ["Total Applications", stats.total, "text-gray-900"],
          ["Pending Review", stats.pending, "text-[#9A813F]"],
          ["Approved", stats.approved, "text-green-600"],
          ["Rejected", stats.rejected, "text-red-600"],
        ].map(([label, value, color]) => (
          <div key={label} className="rounded-xl border border-[#E8DFD0] bg-white p-4">
            <p className="text-sm text-gray-500">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap gap-4">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search by ID, user, or product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as "all" | LoanWorkflowStatus)}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="requested">Requested</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="declined">Rejected</SelectItem>
            <SelectItem value="blacklisted">Blacklisted</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="LOAN">Loan</SelectItem>
            <SelectItem value="MORTGAGE">Mortgage</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#E8DFD0] bg-white">
        {isLoading ? (
          <div className="p-4"><TableSkeleton columnCount={7} rowCount={8} /></div>
        ) : visibleApplications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <FileText className="mb-4 h-12 w-12 text-[#D6C795]" />
            <p className="text-gray-500">No applications found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-[#E8DFD0] bg-[#FFF9EB]">
                <tr>
                  {["Customer", "Product", "Reference", "Amount", "Workflow", "Submitted", "Actions"].map((heading) => (
                    <th key={heading} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#7A642F]">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleApplications.map((application) => {
                  const customer = getApplicant(application)
                  const status = workflowStatus(application)
                  const isActionable = status === "requested" || status === "under_review"
                  const isApproving = processing?.id === application.id && processing.action === "approve"
                  const isRejecting = processing?.id === application.id && processing.action === "reject"
                  return (
                    <tr key={application.id} className="hover:bg-[#FFF9EB]/40">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#9A813F] text-sm font-bold text-white">
                            {customer.initials}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{customer.label}</p>
                            <p className="text-xs text-gray-500">{customer.subtitle}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-sm font-medium text-gray-700">{getProductName(application)}</td>
                      <td className="px-6 py-5 font-mono text-sm text-gray-500">{application.id.slice(0, 8).toUpperCase()}</td>
                      <td className="px-6 py-5 text-sm font-bold text-gray-900">{getAmount(application)}</td>
                      <td className="px-6 py-5">{getStatusBadge(status)}</td>
                      <td className="px-6 py-5 text-sm text-gray-600">{new Date(application.submittedAt || application.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-5 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreVertical className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {isActionable ? (
                              <>
                                <DropdownMenuItem
                                  disabled={isApproving || isRejecting}
                                  onClick={() => setConfirm({ action: "approve", application })}
                                  className="text-green-700 focus:bg-green-50 focus:text-green-700"
                                >
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                  {isApproving ? "Processing..." : "Approve"}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  disabled={isApproving || isRejecting}
                                  onClick={() => setConfirm({ action: "reject", application })}
                                  className="text-red-600 focus:bg-red-50 focus:text-red-600"
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  {isRejecting ? "Processing..." : "Reject"}
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <DropdownMenuItem disabled>No actions available</DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
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
                ? `This will ${confirm.action === "approve" ? "approve" : "reject"} the ${getProductName(confirm.application)} application for ${getApplicant(confirm.application).label}.`
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
