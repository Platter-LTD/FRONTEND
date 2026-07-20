"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertCircle, Check, Loader2, MoreVertical, RefreshCw, X } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TableSkeleton } from "@/components/ui/table-skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { applicationApi, type LoanWorkflowStatus } from "@/lib/services/accountService"
import { resolveApplicationCustomerName } from "@/lib/applicationCustomer"
import { MortgageWorkflowDetailSheet } from "@/components/workflow/MortgageWorkflowDetailSheet"
import { LoanWorkflowDetailSheet } from "@/components/workflow/LoanWorkflowDetailSheet"
import { handleSessionExpired, isSessionExpiredError } from "@/lib/plataAuthFetch"

const PLATA_ACCENT_DARK = "#9A813F"

export type PlataWorkflowTabId =
  | "requested"
  | "under_review"
  | "approved"
  | "declined"
  | "blacklisted"

export interface PlataWorkflowTab {
  id: PlataWorkflowTabId
  label: string
}

export interface PlataWorkflowRow {
  id: string
  requestLabel: string
  name: string
  ref: string
  date: string
  status: LoanWorkflowStatus
}

interface WorkflowTableProps {
  title: string
  appId: string
  productType: "LOAN" | "MORTGAGE"
  requestColumnLabel: string
  tabs: PlataWorkflowTab[]
}

function statusBadge(status: string): string {
  const styles: Record<string, string> = {
    requested: "bg-[#E9D5FF] text-[#7C3AED] hover:bg-[#E9D5FF]",
    under_review: "bg-[#DBEAFE] text-[#2563EB] hover:bg-[#DBEAFE]",
    approved: "bg-[#DCFCE7] text-[#166534] hover:bg-[#DCFCE7]",
    declined: "bg-[#FEE2E2] text-[#EF4444] hover:bg-[#FEE2E2]",
    blacklisted: "bg-[#E5E7EB] text-[#374151] hover:bg-[#E5E7EB]",
  }
  return styles[status] || styles.requested
}

function formatDate(value: string): string {
  if (!value || value === "—") return "—"
  try {
    return new Date(value).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  } catch {
    return value
  }
}

function mapRecord(
  x: Record<string, unknown>,
  productType: "LOAN" | "MORTGAGE",
  appId: string,
  requestFallback: string,
): PlataWorkflowRow | null {
  if (String(x.productType || "").toUpperCase() !== productType) return null
  if (appId && String(x.appId || x.createAppId || "") !== appId) return null
  const id = String(x.id ?? x.applicationId ?? "")
  if (!id) return null
  return {
    id,
    requestLabel: String(x.productName ?? x.globalProductName ?? x.reference ?? requestFallback),
    name: resolveApplicationCustomerName({
      customerName: typeof x.customerName === "string" ? x.customerName : undefined,
      userName: typeof x.userName === "string" ? x.userName : undefined,
      fullName: typeof x.fullName === "string" ? x.fullName : undefined,
      userId: typeof x.userId === "string" ? x.userId : undefined,
      contractSnapshot:
        x.contractSnapshot && typeof x.contractSnapshot === "object"
          ? (x.contractSnapshot as Record<string, unknown>)
          : undefined,
    }),
    ref: String(x.reference ?? x.applicationReference ?? id),
    date: String(x.createdAt ?? x.applicationDate ?? "—"),
    status: String(x.loanWorkflowStatus ?? "requested") as LoanWorkflowStatus,
  }
}

function extractList(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw.map((x) => x as Record<string, unknown>)
  if (raw && typeof raw === "object") {
    const data = (raw as { data?: unknown }).data
    if (Array.isArray(data)) return data.map((x) => x as Record<string, unknown>)
    if (data && typeof data === "object" && Array.isArray((data as { items?: unknown[] }).items)) {
      return (data as { items: unknown[] }).items.map((x) => x as Record<string, unknown>)
    }
  }
  return []
}

export function WorkflowTable({
  title,
  appId,
  productType,
  requestColumnLabel,
  tabs,
}: WorkflowTableProps) {
  const [activeTab, setActiveTab] = useState<PlataWorkflowTabId>(tabs[0]?.id || "requested")
  const [rows, setRows] = useState<PlataWorkflowRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<
    | { kind: "reject" | "blacklist"; row: PlataWorkflowRow; reason: string }
    | null
  >(null)
  const [detailId, setDetailId] = useState<string | null>(null)

  const requestFallback = productType === "LOAN" ? "Loan Application" : "Mortgage Application"

  const fetchRows = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true)
      else setRefreshing(true)
      setError(null)

      try {
        let list: Record<string, unknown>[] = []

        if (activeTab === "under_review") {
          const [requestedRes, underReviewRes] = await Promise.all([
            applicationApi.getLoanWorkflowApplications({ appId, loanWorkflowStatus: "requested", limit: 100 }),
            applicationApi.getLoanWorkflowApplications({ appId, loanWorkflowStatus: "under_review", limit: 100 }),
          ])
          if (!requestedRes.success && !underReviewRes.success) {
            throw new Error(requestedRes.error || underReviewRes.error || "Failed to load")
          }
          list = [
            ...extractList(requestedRes),
            ...extractList(underReviewRes),
          ]
          list = Array.from(
            new Map(
              list.map((row) => [String(row.id ?? row.applicationId ?? JSON.stringify(row)), row]),
            ).values(),
          )
        } else {
          const res = await applicationApi.getLoanWorkflowApplications({
            appId,
            loanWorkflowStatus: activeTab,
            limit: 100,
          })
          if (!res.success) {
            throw new Error(res.error || "Failed to load")
          }
          list = extractList(res)
        }

        const mapped = list
          .map((x) => mapRecord(x, productType, appId, requestFallback))
          .filter((x): x is PlataWorkflowRow => x !== null)

        setRows(mapped)
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to load"
        if (isSessionExpiredError(0, msg)) {
          await handleSessionExpired()
          return
        }
        setError(msg)
        setRows([])
        if (silent) toast.error(msg)
      } finally {
        if (!silent) setLoading(false)
        else setRefreshing(false)
      }
    },
    [activeTab, appId, productType, requestFallback],
  )

  useEffect(() => {
    void fetchRows(false)
  }, [fetchRows])

  const handleApprove = async (row: PlataWorkflowRow) => {
    setBusyId(row.id)
    try {
      const res = await applicationApi.approve(row.id)
      if (!res.success) throw new Error(res.error || "Approve failed")
      toast.success(`Approved ${row.ref}`)
      void fetchRows(true)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Approve failed")
    } finally {
      setBusyId(null)
    }
  }

  const handleConfirm = async () => {
    if (!confirm) return
    const { kind, row, reason } = confirm
    setBusyId(row.id)
    try {
      const res =
        kind === "reject"
          ? await applicationApi.reject(row.id, reason || "Not approved")
          : await applicationApi.blacklist(row.id, reason || "Blacklisted")
      if (!res.success) throw new Error(res.error || `${kind} failed`)
      toast.success(
        kind === "reject" ? `Rejected ${row.ref}` : `Blacklisted ${row.ref}`,
      )
      setConfirm(null)
      void fetchRows(true)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : `${kind} failed`)
    } finally {
      setBusyId(null)
    }
  }

  const displayRows = useMemo(
    () => rows.map((r) => ({ ...r, date: formatDate(r.date) })),
    [rows],
  )

  return (
    <div className="flex-1 bg-white p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void fetchRows(true)}
          disabled={refreshing || loading}
          className="gap-2"
        >
          {refreshing || loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-8 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative pb-3 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id ? "text-[#8B7355]" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#8B7355]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

      {loading ? (
        <TableSkeleton columnCount={6} rowCount={6} />
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="w-full">
            <thead className="bg-[#F5F5F5]">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                  {requestColumnLabel}
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Name</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Ref</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Date</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {displayRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                    No applications found.
                  </td>
                </tr>
              ) : (
                displayRows.map((row) => {
                  const canAct =
                    row.status !== "approved" &&
                    row.status !== "declined" &&
                    row.status !== "blacklisted"
                  const canApprove = canAct
                  const canReject = canAct
                  const canBlacklist = row.status !== "blacklisted"

                  return (
                    <tr
                      key={row.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setDetailId(row.id)}
                    >
                      <td className="px-6 py-4 text-sm text-gray-900">{row.requestLabel}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{row.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{row.ref}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{row.date}</td>
                      <td className="px-6 py-4">
                        <Badge className={statusBadge(row.status)}>
                          {row.status.replaceAll("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              disabled={busyId === row.id}
                              className="rounded p-1 hover:bg-gray-100 disabled:opacity-50"
                              aria-label="Actions"
                            >
                              {busyId === row.id ? (
                                <Loader2 size={16} className="animate-spin text-gray-400" />
                              ) : (
                                <MoreVertical size={18} className="text-gray-400" />
                              )}
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canApprove && (
                              <DropdownMenuItem onSelect={() => void handleApprove(row)}>
                                <Check className="mr-2 h-4 w-4 text-green-600" />
                                Approve
                              </DropdownMenuItem>
                            )}
                            {canReject && (
                              <DropdownMenuItem
                                onSelect={() => setConfirm({ kind: "reject", row, reason: "" })}
                              >
                                <X className="mr-2 h-4 w-4 text-red-600" />
                                Reject
                              </DropdownMenuItem>
                            )}
                            {canBlacklist && (
                              <DropdownMenuItem
                                onSelect={() => setConfirm({ kind: "blacklist", row, reason: "" })}
                              >
                                <AlertCircle className="mr-2 h-4 w-4 text-gray-600" />
                                Blacklist
                              </DropdownMenuItem>
                            )}
                            {!canApprove && !canReject && !canBlacklist && (
                              <DropdownMenuItem disabled>No actions</DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.kind === "reject" ? "Reject application?" : "Blacklist application?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === "reject"
                ? "The applicant will be notified that their application has been rejected."
                : "This application will be moved to the Blacklisted list and excluded from active workflows."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Reason</label>
            <textarea
              value={confirm?.reason || ""}
              onChange={(e) =>
                setConfirm((c) => (c ? { ...c, reason: e.target.value } : c))
              }
              className="min-h-[96px] w-full rounded-md border border-gray-300 p-3 text-sm outline-none focus:border-[#8B7355] focus:ring-1 focus:ring-[#8B7355]"
              placeholder={
                confirm?.kind === "reject"
                  ? "Insufficient documentation"
                  : "Repeated default on repayments"
              }
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void handleConfirm()
              }}
              className="text-white hover:opacity-90"
              style={{ backgroundColor: PLATA_ACCENT_DARK }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {productType === "MORTGAGE" ? (
        <MortgageWorkflowDetailSheet
          applicationId={detailId}
          open={detailId !== null}
          onOpenChange={(open) => !open && setDetailId(null)}
          onUpdated={() => void fetchRows(true)}
        />
      ) : (
        <LoanWorkflowDetailSheet
          applicationId={detailId}
          open={detailId !== null}
          onOpenChange={(open) => !open && setDetailId(null)}
          onUpdated={() => void fetchRows(true)}
        />
      )}
    </div>
  )
}
