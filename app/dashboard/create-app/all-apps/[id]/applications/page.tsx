"use client"

import type { ReactNode } from "react"
import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Search, RefreshCw, Clock, CheckCircle2, XCircle, FileText, MoreVertical, DollarSign, Building2, Calendar, Loader2, ExternalLink, X } from "lucide-react"
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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function pickString(source: Record<string, unknown>, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === "string" && value.trim()) return value.trim()
    if (typeof value === "number" && Number.isFinite(value)) return String(value)
  }
  return fallback
}

function pickNumber(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key]
    const numeric = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN
    if (Number.isFinite(numeric) && numeric > 0) return numeric
  }
  return 0
}

function pickProductNameFromSnapshot(snapshot: Record<string, unknown>) {
  const about = asRecord(snapshot.about)
  const loanTypes = Array.isArray(about.loanTypes) ? about.loanTypes : []
  const mortgageTypes = Array.isArray(about.mortgageTypes) ? about.mortgageTypes : []
  const productTypes = [...loanTypes, ...mortgageTypes]

  for (const productType of productTypes) {
    const name = pickString(asRecord(productType), ["name", "title"])
    if (name) return name
  }

  return ""
}

function getProductName(application: LoanWorkflowApplication) {
  const row = application as LoanWorkflowApplication & Record<string, unknown>
  const snapshot = asRecord(application.contractSnapshot)
  const product = asRecord(row.product)
  const globalProduct = asRecord(row.globalProduct)

  return (
    pickString(row, ["productName", "globalProductName", "merchantProductName", "loanName", "mortgageName"]) ||
    pickString(product, ["name", "title", "productName"]) ||
    pickString(globalProduct, ["name", "title", "productName"]) ||
    pickString(snapshot, ["productName", "product_name", "name", "title", "loanName", "mortgageName", "purpose"]) ||
    pickProductNameFromSnapshot(snapshot) ||
    application.productName ||
    application.globalProductReferenceNumber ||
    application.merchantProductId ||
    `${application.productType} Application`
  )
}

function getProductType(application: LoanWorkflowApplication) {
  const type = String(application.productType || "APPLICATION").toUpperCase()
  return type === "MORTGAGE" ? "Mortgage" : type === "LOAN" ? "Loan" : type.replace(/_/g, " ")
}

function getApplicant(application: LoanWorkflowApplication) {
  const row = application as LoanWorkflowApplication & Record<string, unknown>
  const snapshot = asRecord(application.contractSnapshot)
  const user = asRecord(row.user)
  const externalUser = asRecord(row.externalUser)
  const applicant = asRecord(row.applicant)
  const snapshotApplicant = asRecord(snapshot.applicant)
  const snapshotCustomer = asRecord(snapshot.customer)
  const snapshotBorrower = asRecord(snapshot.borrower)

  const name =
    pickString(row, ["userName", "applicantName", "customerName", "fullName", "name"]) ||
    pickString(user, ["name", "fullName", "firstName", "email"]) ||
    pickString(externalUser, ["name", "fullName", "firstName", "email"]) ||
    pickString(applicant, ["name", "fullName", "firstName", "email"]) ||
    pickString(snapshot, ["applicantName", "customerName", "fullName", "name", "email", "userEmail"]) ||
    pickString(snapshotApplicant, ["name", "fullName", "firstName", "email"]) ||
    pickString(snapshotCustomer, ["name", "fullName", "firstName", "email"]) ||
    pickString(snapshotBorrower, ["name", "fullName", "firstName", "email"]) ||
    resolveApplicationCustomerName(application)

  const email =
    pickString(row, ["userEmail", "applicantEmail", "customerEmail", "email"]) ||
    pickString(user, ["email"]) ||
    pickString(externalUser, ["email"]) ||
    pickString(applicant, ["email"]) ||
    pickString(snapshot, ["email", "userEmail", "applicantEmail", "customerEmail"]) ||
    pickString(snapshotApplicant, ["email"]) ||
    pickString(snapshotCustomer, ["email"]) ||
    pickString(snapshotBorrower, ["email"])

  const label = name || email || application.userId || "Unknown customer"
  const subtitle =
    email && name
      ? email
      : application.offeringMerchantName ||
        application.merchantName ||
        application.userId ||
        "No customer id"

  return {
    label,
    subtitle,
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
  const row = application as LoanWorkflowApplication & Record<string, unknown>
  const amount = pickNumber(row, ["approvedAmount", "amount", "principalAmount", "requestedAmount", "loanAmount", "propertyValue"]) || numericSnapshotValue(application.contractSnapshot, [
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

function getReference(application: LoanWorkflowApplication) {
  return application.id.slice(0, 8).toUpperCase()
}

function formatSubmittedDate(application: LoanWorkflowApplication) {
  const value = application.submittedAt || application.createdAt
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "N/A"
  return (
    <span className="inline-flex flex-col leading-tight">
      <span>{date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
      <span className="text-[10px] text-gray-400">{date.getFullYear()}</span>
    </span>
  )
}

function getStatusBadge(status: LoanWorkflowStatus) {
  const styles: Record<LoanWorkflowStatus, string> = {
    requested: "bg-[#FFF3CF] text-[#9A813F]",
    under_review: "bg-blue-100 text-blue-700",
    approved: "bg-green-100 text-green-700",
    declined: "bg-red-100 text-red-700",
    blacklisted: "bg-gray-100 text-gray-700",
    completed: "bg-green-200 text-green-800",
    offer_sent: "bg-purple-100 text-purple-700",
  }
  const label =
    status === "requested"
      ? "Pending"
      : status === "declined"
        ? "Rejected"
        : status.replace("_", " ")
  return <span className={`rounded-full px-2 py-1 text-xs font-medium ${styles[status]}`}>{label}</span>
}

function DetailField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <div className="text-sm font-medium text-gray-900">{value || "N/A"}</div>
    </div>
  )
}

function formatFullDate(value?: string | null) {
  if (!value) return "N/A"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "N/A"
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function WorkflowApplicationDrawer({
  application,
  isOpen,
  isLoading,
  onClose,
}: {
  application: LoanWorkflowApplication | null
  isOpen: boolean
  isLoading: boolean
  onClose: () => void
}) {
  if (!isOpen) return null

  const snapshot = asRecord(application?.contractSnapshot)
  const structure = asRecord(snapshot.structure)
  const about = asRecord(snapshot.about)
  const finalSubmission = asRecord(snapshot.finalSubmission)
  const applicationRecord = asRecord(application)
  const guarantors = Array.isArray(applicationRecord.guarantorKyc)
    ? (applicationRecord.guarantorKyc as Record<string, unknown>[])
    : []
  const documents = Array.isArray(application?.submittedRequirements) ? application.submittedRequirements : []
  const customer = application ? getApplicant(application) : { label: "Loading...", subtitle: "", initials: "..." }
  const status = application ? workflowStatus(application) : "requested"

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" aria-label="Close details" className="absolute inset-0 bg-black/30" onClick={onClose} />
      <aside className="relative z-10 flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-[#9A813F]">Overview</p>
            <h2 className="text-2xl font-bold text-gray-900">Application & Customer Details</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-9 w-9 p-0">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#9A813F]" />
          </div>
        ) : !application ? (
          <div className="flex flex-1 items-center justify-center text-gray-500">No application selected</div>
        ) : (
          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
            <div className="flex items-start justify-between rounded-xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#111827] text-lg font-bold text-white">
                  {customer.initials}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{customer.label}</h3>
                  <p className="mt-1 text-sm text-gray-500">{customer.subtitle}</p>
                </div>
              </div>
              {getStatusBadge(status)}
            </div>

            <div className="rounded-xl bg-gradient-to-r from-gray-900 to-black p-6 text-white">
              <div className="mb-4 flex items-center gap-3">
                {String(application.productType).toUpperCase() === "MORTGAGE" ? <Building2 className="h-5 w-5" /> : <DollarSign className="h-5 w-5" />}
                <div>
                  <p className="text-lg font-semibold">{getProductName(application)}</p>
                  <p className="text-xs uppercase tracking-wide text-gray-300">{getProductType(application)}</p>
                </div>
              </div>
              <p className="text-3xl font-bold">{getAmount(application)}</p>
              <p className="mt-2 flex items-center gap-2 text-sm text-gray-300">
                Reference: <span className="rounded bg-white/10 px-2 py-0.5 font-mono">{getReference(application)}</span>
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 border-b border-gray-100 pb-2 font-semibold text-gray-900">Application Details</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <DetailField label="Product Name" value={getProductName(application)} />
                <DetailField label="Product Type" value={getProductType(application)} />
                <DetailField label="Application ID" value={<span className="font-mono">{application.id}</span>} />
                <DetailField label="Local Application ID" value={<span className="font-mono">{application.localApplicationId || "N/A"}</span>} />
                <DetailField label="Global Product Reference" value={<span className="font-mono">{application.globalProductReferenceNumber || "N/A"}</span>} />
                <DetailField label="Submitted Date" value={<span className="flex items-center gap-2"><Calendar className="h-4 w-4 text-gray-400" />{formatFullDate(application.submittedAt || application.createdAt)}</span>} />
                <DetailField label="Creator Merchant" value={application.merchantName || application.merchantId} />
                <DetailField label="Offering Merchant" value={application.offeringMerchantName || application.offeringMerchantId || "N/A"} />
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 border-b border-gray-100 pb-2 font-semibold text-gray-900">Contract Snapshot</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <DetailField label="Principal" value={getAmount(application)} />
                <DetailField label="Currency" value={String(snapshot.currency ?? "NGN")} />
                <DetailField label="Tenure" value={String(about.tenure ?? "N/A")} />
                <DetailField label="Interest Rate" value={structure.interestRate != null ? `${String(structure.interestRate)}%` : "N/A"} />
                <DetailField label="Repayment Schedule" value={String(structure.repaymentSchedule ?? "N/A").replace(/_/g, " ")} />
                <DetailField label="Repayment Frequency" value={String(structure.repaymentFrequency ?? "N/A")} />
                <DetailField label="Accepted Terms" value={finalSubmission.acceptedTerms === true ? "Yes" : finalSubmission.acceptedTerms === false ? "No" : "N/A"} />
                <DetailField label="Snapshot Version" value={application.snapshotVersion ?? "N/A"} />
              </div>
            </div>

            {guarantors.length > 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <h3 className="mb-4 border-b border-gray-100 pb-2 font-semibold text-gray-900">Guarantor KYC</h3>
                <div className="space-y-3">
                  {guarantors.map((guarantor, index) => (
                    <div key={`${String(guarantor.id ?? index)}`} className="rounded-lg bg-gray-50 p-4">
                      <p className="font-semibold text-gray-900">{pickString(guarantor, ["fullName", "name"], "N/A")}</p>
                      <p className="text-sm text-gray-500">{pickString(guarantor, ["email"], "No email")} · {pickString(guarantor, ["phone"], "No phone")}</p>
                      <p className="mt-1 text-sm capitalize text-gray-600">Status: {pickString(guarantor, ["status"], "N/A")}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 border-b border-gray-100 pb-2 font-semibold text-gray-900">Submitted Documents</h3>
              {documents.length === 0 ? (
                <p className="text-sm text-gray-500">No submitted documents available.</p>
              ) : (
                <div className="space-y-3">
                  {documents.map((document, index) => {
                    const url = pickString(document, ["submittedFileUrl", "templateFileUrl"])
                    return (
                      <div key={`${pickString(document, ["fileName"], "document")}-${index}`} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{pickString(document, ["fileName", "requirementType"], `Document ${index + 1}`)}</p>
                          <p className="text-xs text-gray-500">{pickString(document, ["contentType", "fileType"], "Document")}</p>
                        </div>
                        {url ? (
                          <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-[#9A813F] hover:underline">
                            View <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </aside>
    </div>
  )
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
  const [selectedApplication, setSelectedApplication] = useState<LoanWorkflowApplication | null>(null)
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false)
  const [isDetailLoading, setIsDetailLoading] = useState(false)

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
        getReference(application),
        getProductName(application),
        getProductType(application),
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

  const handleOpenApplication = async (application: LoanWorkflowApplication) => {
    setSelectedApplication(application)
    setIsDetailDrawerOpen(true)
    setIsDetailLoading(true)

    try {
      const response = await accountService.applications.getWorkflowApplication(application.id)
      if (response.success && response.data) {
        setSelectedApplication(response.data)
      } else if (!response.success) {
        toast.error(response.error || "Failed to load application details")
      }
    } catch (error) {
      console.error("Failed to load Plata application details:", error)
      toast.error("Failed to load application details")
    } finally {
      setIsDetailLoading(false)
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
                  {["Customer", "Type", "Reference", "Amount", "Status", "Submitted", "Actions"].map((heading) => (
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
                    <tr
                      key={application.id}
                      onClick={() => void handleOpenApplication(application)}
                      className="cursor-pointer hover:bg-[#FFF9EB]/40"
                    >
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
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FFF9EB] text-[#9A813F]">
                            {String(application.productType).toUpperCase() === "MORTGAGE" ? <Building2 className="h-4 w-4" /> : <DollarSign className="h-4 w-4" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{getProductName(application)}</p>
                            <p className="text-xs uppercase tracking-wide text-gray-400">{getProductType(application)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 font-mono text-sm text-gray-500">{getReference(application)}</td>
                      <td className="px-6 py-5 text-sm font-bold text-gray-900">{getAmount(application)}</td>
                      <td className="px-6 py-5">{getStatusBadge(status)}</td>
                      <td className="px-6 py-5 text-sm text-gray-600">{formatSubmittedDate(application)}</td>
                      <td className="px-6 py-5 text-right" onClick={(event) => event.stopPropagation()}>
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
      <WorkflowApplicationDrawer
        application={selectedApplication}
        isOpen={isDetailDrawerOpen}
        isLoading={isDetailLoading}
        onClose={() => {
          setIsDetailDrawerOpen(false)
          setSelectedApplication(null)
        }}
      />

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
