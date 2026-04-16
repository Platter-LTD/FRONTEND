"use client"

import { useState, useEffect, useMemo } from "react"
import { format } from "date-fns"
import { Package, MoreVertical } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { productApi } from "@/lib/services/product-api"
import { countMergedForAppType } from "@/lib/mergeAppCatalogProducts"
import { ProductDebugPanel } from "@/components/product-debug-panel"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type OverviewHeadline = {
  requestedAmount?: number
  approvedAmount?: number
  totalTransactions?: number
  totalSavings?: number
  totalInterest?: number
}

type OverviewCategory = {
  type?: string
  configuredProductCount?: number
  customerCount?: number
  capitalAmount?: number
  issuedAmount?: number
  repaymentAmount?: number
  inventoryAmount?: number
  salesAmount?: number
}

type CustomerRow = {
  id: string
  name: string
  email: string
  sourceMerchant: string
  phone: string
  submittedAt: Date
  status: "Successful" | "Failed" | "Pending"
}

type NewSubmissionRow = {
  id: string
  applicationId: string
  name: string
  email: string
  phone: string
  submittedAt: Date
  status: "Successful" | "Failed" | "Pending"
  sourceMerchant?: string
  amount?: number
  paymentMethod?: string
  transactionId?: string
}

type MerchantRow = {
  id: string
  name: string
  email: string
  productsLabel: string
  phone: string
  submittedAt: Date
  status: "Successful" | "Failed" | "Pending"
}

type TransactionRow = {
  id: string
  date: Date
  amount: number
  status: "Successful" | "Failed" | "Pending"
  paymentMethod: string
  transactionId: string
  receiptAvailable: boolean
}

const formatMoney = (value: number | undefined) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? Number(value) : 0)

const findCategory = (categories: OverviewCategory[], type: string) =>
  categories.find((x) => String(x.type || "").toUpperCase() === type.toUpperCase())

const formatCustomerDate = (d: Date) => format(d, "MMM d, yyyy | hh:mma")

const formatTxDate = (d: Date) => format(d, "MM/dd/yyyy")

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {}

const pickString = (obj: Record<string, unknown>, keys: string[], fallback = "N/A") => {
  for (const key of keys) {
    const value = obj[key]
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return fallback
}

const pickNumber = (obj: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = obj[key]
    if (typeof value === "number" && Number.isFinite(value)) return value
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value)
  }
  return 0
}

const pickDate = (obj: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = obj[key]
    const date = value ? new Date(String(value)) : null
    if (date && !Number.isNaN(date.getTime())) return date
  }
  return new Date()
}

const mapStatus = (raw: string): "Successful" | "Failed" | "Pending" => {
  const status = raw.toLowerCase()
  if (["declined", "cancelled", "withdrawn", "failed", "rejected"].includes(status)) return "Failed"
  if (["submitted", "signed", "approved", "success", "successful", "complete"].includes(status)) return "Successful"
  return "Pending"
}

function StatusBadge({ status }: { status: "Successful" | "Failed" | "Pending" }) {
  const map = {
    Successful: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    Failed: "bg-red-50 text-red-700 ring-1 ring-red-200",
    Pending: "bg-orange-50 text-orange-800 ring-1 ring-orange-200",
  } as const
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${map[status]}`}>{status}</span>
  )
}

function ViewUploadButton({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md px-3 py-1.5 text-xs font-medium text-gray-900 transition hover:opacity-90"
      style={{ backgroundColor: "#E5D5C0" }}
    >
      View upload
    </button>
  )
}

function CustomersTable({ rows, loading }: { rows: CustomerRow[]; loading: boolean }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="px-4 py-3 font-semibold text-gray-700">Name</th>
            <th className="px-4 py-3 font-semibold text-gray-700">Email</th>
            <th className="px-4 py-3 font-semibold text-gray-700">Source Merchant</th>
            <th className="px-4 py-3 font-semibold text-gray-700">Phone</th>
            <th className="px-4 py-3 font-semibold text-gray-700">Date/time</th>
            <th className="px-4 py-3 font-semibold text-gray-700">Uploads</th>
            <th className="px-4 py-3 font-semibold text-gray-700">Status</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 5 }).map((_, idx) => (
              <tr key={`customers-skeleton-${idx}`} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                <td className="px-4 py-3"><Skeleton className="h-8 w-24" /></td>
                <td className="px-4 py-3"><Skeleton className="h-6 w-20 rounded-full" /></td>
              </tr>
            ))
          ) : rows.length ? (
            rows.map((row) => (
              <tr key={row.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-3 font-semibold text-gray-900">{row.name}</td>
                <td className="px-4 py-3 text-gray-700">{row.email}</td>
                <td className="px-4 py-3 text-gray-700">{row.sourceMerchant}</td>
                <td className="px-4 py-3 text-gray-700">{row.phone}</td>
                <td className="px-4 py-3 text-gray-600">{formatCustomerDate(row.submittedAt)}</td>
                <td className="px-4 py-3">
                  <ViewUploadButton />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={row.status} />
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={7}>
                No customer records found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function NewSubmissionsTable({ rows, loading }: { rows: NewSubmissionRow[]; loading: boolean }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="px-4 py-3 font-semibold text-gray-700">Name</th>
            <th className="px-4 py-3 font-semibold text-gray-700">Email</th>
            <th className="px-4 py-3 font-semibold text-gray-700">Phone</th>
            <th className="px-4 py-3 font-semibold text-gray-700">Date/time</th>
            <th className="px-4 py-3 font-semibold text-gray-700">Upload</th>
            <th className="px-4 py-3 font-semibold text-gray-700">Status</th>
            <th className="w-12 px-2 py-3 text-right font-semibold text-gray-700" aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 5 }).map((_, idx) => (
              <tr key={`submissions-skeleton-${idx}`} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                <td className="px-4 py-3"><Skeleton className="h-8 w-24" /></td>
                <td className="px-4 py-3"><Skeleton className="h-6 w-20 rounded-full" /></td>
                <td className="px-2 py-3 text-right"><Skeleton className="ml-auto h-8 w-8 rounded-md" /></td>
              </tr>
            ))
          ) : rows.length ? rows.map((row) => (
            <tr key={row.id} className="border-b border-gray-100 last:border-0">
              <td className="px-4 py-3 font-semibold text-gray-900">{row.name}</td>
              <td className="px-4 py-3 text-gray-700">{row.email}</td>
              <td className="px-4 py-3 text-gray-700">{row.phone}</td>
              <td className="px-4 py-3 text-gray-600">{formatCustomerDate(row.submittedAt)}</td>
              <td className="px-4 py-3">
                <ViewUploadButton />
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={row.status} />
              </td>
              <td className="px-2 py-3 text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100"
                      aria-label="Row actions"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Edit</DropdownMenuItem>
                    <DropdownMenuItem>Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          )) : (
            <tr>
              <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={7}>
                No submissions found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function MerchantsTable({ rows, loading }: { rows: MerchantRow[]; loading: boolean }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="px-4 py-3 font-semibold text-gray-700">Name</th>
            <th className="px-4 py-3 font-semibold text-gray-700">Email</th>
            <th className="px-4 py-3 font-semibold text-gray-700">Products</th>
            <th className="px-4 py-3 font-semibold text-gray-700">Phone</th>
            <th className="px-4 py-3 font-semibold text-gray-700">Date/time</th>
            <th className="px-4 py-3 font-semibold text-gray-700">Uploads</th>
            <th className="px-4 py-3 font-semibold text-gray-700">Status</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 5 }).map((_, idx) => (
              <tr key={`merchants-skeleton-${idx}`} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                <td className="px-4 py-3"><Skeleton className="h-8 w-24" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                <td className="px-4 py-3"><Skeleton className="h-8 w-24" /></td>
                <td className="px-4 py-3"><Skeleton className="h-6 w-20 rounded-full" /></td>
              </tr>
            ))
          ) : rows.length ? rows.map((row) => (
            <tr key={row.id} className="border-b border-gray-100 last:border-0">
              <td className="px-4 py-3 font-semibold text-gray-900">{row.name}</td>
              <td className="px-4 py-3 text-gray-700">{row.email}</td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  {row.productsLabel}
                </button>
              </td>
              <td className="px-4 py-3 text-gray-700">{row.phone}</td>
              <td className="px-4 py-3 text-gray-600">{formatCustomerDate(row.submittedAt)}</td>
              <td className="px-4 py-3">
                <ViewUploadButton />
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={row.status} />
              </td>
            </tr>
          )) : (
            <tr>
              <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={7}>
                No merchant records found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

type TxSortKey = "date" | "amount" | "status"

function TransactionsTable({ rows, loading }: { rows: TransactionRow[]; loading: boolean }) {
  const [sortBy, setSortBy] = useState<TxSortKey>("date")

  const sorted = useMemo(() => {
    const next = [...rows]
    next.sort((a, b) => {
      if (sortBy === "date") return b.date.getTime() - a.date.getTime()
      if (sortBy === "amount") return b.amount - a.amount
      return a.status.localeCompare(b.status)
    })
    return next
  }, [rows, sortBy])

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Sort by</span>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as TxSortKey)}>
            <SelectTrigger className="h-9 w-[160px] border-gray-300 bg-white text-sm">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="amount">Amount</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 font-semibold text-gray-700">Date</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Amount</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Status</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Payment Method</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Transaction ID</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Payment link</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={`transactions-skeleton-${idx}`} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-6 w-20 rounded-full" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-24" /></td>
                </tr>
              ))
            ) : sorted.length ? sorted.map((row) => (
              <tr key={row.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-3 text-gray-700">{formatTxDate(row.date)}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{formatMoney(row.amount)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-4 py-3 text-gray-700">{row.paymentMethod}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-800">{row.transactionId}</td>
                <td className="px-4 py-3">
                  {row.receiptAvailable ? (
                    <button
                      type="button"
                      className="rounded-md border border-gray-900 bg-white px-3 py-1.5 text-xs font-medium text-gray-900 hover:bg-gray-50"
                    >
                      Download
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="cursor-not-allowed rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-400"
                    >
                      Unavailable
                    </button>
                  )}
                </td>
              </tr>
            )) : (
              <tr>
                <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={6}>
                  No transaction records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function ProductsPage() {
  const [activeTab, setActiveTab] = useState("general")
  const params = useParams()
  const router = useRouter()
  const appId = params.id as string
  const [headline, setHeadline] = useState<OverviewHeadline | null>(null)
  const [categories, setCategories] = useState<OverviewCategory[]>([])
  const [appProductRows, setAppProductRows] = useState<unknown[]>([])
  const [catalogProductRows, setCatalogProductRows] = useState<unknown[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [applicationRows, setApplicationRows] = useState<NewSubmissionRow[]>([])

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        setLoading(true)
        setError(null)

        const [ovSettled, appSettled, catSettled, applicationsSettled] = await Promise.allSettled([
          productApi.getProductOverview(appId),
          productApi.getProductsByAppId(appId),
          productApi.getAllProducts(),
          productApi.getProductApplications({ appId }),
        ])

        if (appSettled.status === "fulfilled") {
          const appJson = appSettled.value as { data?: unknown }
          setAppProductRows(Array.isArray(appJson?.data) ? appJson.data : [])
        } else {
          setAppProductRows([])
        }

        if (catSettled.status === "fulfilled") {
          const c = catSettled.value as { success?: boolean; data?: unknown } | unknown[]
          const body = c as { success?: boolean; data?: unknown }
          if (body && typeof body === "object" && !Array.isArray(body) && body.success === false) {
            setCatalogProductRows(null)
          } else {
            const rows = Array.isArray((c as { data?: unknown }).data)
              ? (c as { data: unknown[] }).data
              : Array.isArray(c)
                ? (c as unknown[])
                : []
            setCatalogProductRows(rows.length ? rows : null)
          }
        } else {
          setCatalogProductRows(null)
        }

        if (ovSettled.status === "fulfilled") {
          const data = ovSettled.value as { data?: { headline?: OverviewHeadline; byCategory?: OverviewCategory[] } }
          const payload = data?.data
          setHeadline(payload?.headline || {})
          setCategories(Array.isArray(payload?.byCategory) ? payload.byCategory : [])
          setError(null)
        } else {
          setHeadline(null)
          setCategories([])
          const reason = ovSettled.status === "rejected" ? ovSettled.reason : "Unknown error"
          setError(reason instanceof Error ? reason.message : "Failed to load product overview")
        }

        if (applicationsSettled.status === "fulfilled") {
          const raw = applicationsSettled.value as { data?: unknown }
          const list = Array.isArray(raw?.data) ? raw.data : []
          const mapped = list.map((entry, index) => {
            const row = asRecord(entry)
            const user = asRecord(row.user)
            const extUser = asRecord(row.externalUser)
            const merchant = asRecord(row.offeringMerchant)

            const name = pickString(row, ["userName", "applicantName", "name"], "")
              || pickString(user, ["name", "fullName"], "")
              || pickString(extUser, ["name", "fullName"], "")
              || "N/A"

            const email = pickString(row, ["userEmail", "email"], "")
              || pickString(user, ["email"], "")
              || pickString(extUser, ["email"], "")
              || "N/A"

            const phone = pickString(row, ["userPhone", "phone"], "")
              || pickString(user, ["phone"], "")
              || pickString(extUser, ["phone"], "")
              || "N/A"

            const mergedStatus = mapStatus(
              pickString(row, ["status", "loanWorkflowStatus"], "pending"),
            )

            const merchantName = pickString(row, ["offeringMerchantName", "merchantName"], "")
              || pickString(merchant, ["name"], "N/A")

            return {
              id: pickString(row, ["_id", "id", "applicationId"], `application-${index}`),
              applicationId: pickString(row, ["_id", "id", "applicationId"], `application-${index}`),
              name,
              email,
              phone,
              submittedAt: pickDate(row, ["createdAt", "submittedAt", "startedAt"]),
              status: mergedStatus,
              sourceMerchant: merchantName,
              amount: pickNumber(row, ["amount", "principalAmount", "requestedAmount"]),
              paymentMethod: pickString(row, ["paymentMethod"], "N/A"),
              transactionId: pickString(row, ["transactionId", "referenceNumber"], "N/A"),
            }
          })
          setApplicationRows(mapped)
        } else {
          setApplicationRows([])
        }
      } catch (error) {
        console.error("Error fetching product overview:", error)
        setHeadline(null)
        setCategories([])
        setAppProductRows([])
        setCatalogProductRows(null)
        setApplicationRows([])
        setError(error instanceof Error ? error.message : "Failed to load product overview")
      } finally {
        setLoading(false)
      }
    }

    if (appId) void fetchOverview()
  }, [appId])

  const customerRows = useMemo<CustomerRow[]>(
    () =>
      applicationRows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        sourceMerchant: row.sourceMerchant || "N/A",
        phone: row.phone,
        submittedAt: row.submittedAt,
        status: row.status,
      })),
    [applicationRows],
  )

  const transactionRows = useMemo<TransactionRow[]>(
    () =>
      applicationRows.map((row) => ({
        id: row.id,
        date: row.submittedAt,
        amount: row.amount || 0,
        status: row.status,
        paymentMethod: row.paymentMethod || "N/A",
        transactionId: row.transactionId || row.applicationId,
        receiptAvailable: false,
      })),
    [applicationRows],
  )

  const merchantRows = useMemo<MerchantRow[]>(() => {
    const map = new Map<string, MerchantRow>()
    applicationRows.forEach((row, idx) => {
      const sourceMerchant = row.sourceMerchant || "N/A"
      const key = `${sourceMerchant}-${row.email}`
      if (map.has(key)) return
      map.set(key, {
        id: `merchant-${idx}`,
        name: sourceMerchant,
        email: row.email,
        productsLabel: "View products",
        phone: row.phone,
        submittedAt: row.submittedAt,
        status: row.status,
      })
    })
    return Array.from(map.values())
  }, [applicationRows])

  const handleProductClick = (type: string) => {
    router.push(`/dashboard/create-app/all-apps/${appId}/products/${type}`)
  }

  const productCards = useMemo(
    () => [
    {
      title: "Mortgage Products",
      count: countMergedForAppType(appProductRows, catalogProductRows, appId, "MORTGAGE"),
      customers: findCategory(categories, "MORTGAGE")?.customerCount || 0,
      capital: formatMoney(findCategory(categories, "MORTGAGE")?.capitalAmount),
      issued: formatMoney(findCategory(categories, "MORTGAGE")?.issuedAmount),
      repayment: formatMoney(findCategory(categories, "MORTGAGE")?.repaymentAmount),
      type: "mortgage",
    },
    {
      title: "Loan Products",
      count: countMergedForAppType(appProductRows, catalogProductRows, appId, "LOAN"),
      customers: findCategory(categories, "LOAN")?.customerCount || 0,
      capital: formatMoney(findCategory(categories, "LOAN")?.capitalAmount),
      issued: formatMoney(findCategory(categories, "LOAN")?.issuedAmount),
      repayment: formatMoney(findCategory(categories, "LOAN")?.repaymentAmount),
      type: "loan",
    },
    {
      title: "Saving Products",
      count: countMergedForAppType(appProductRows, catalogProductRows, appId, "SAVINGS"),
      customers: findCategory(categories, "SAVINGS")?.customerCount || 0,
      capital: formatMoney(findCategory(categories, "SAVINGS")?.capitalAmount),
      issued: formatMoney(findCategory(categories, "SAVINGS")?.issuedAmount),
      repayment: formatMoney(findCategory(categories, "SAVINGS")?.repaymentAmount),
      type: "savings",
    },
    {
      title: "Investment Products",
      count: countMergedForAppType(appProductRows, catalogProductRows, appId, "INVESTMENT"),
      customers: findCategory(categories, "INVESTMENT")?.customerCount || 0,
      capital: formatMoney(findCategory(categories, "INVESTMENT")?.capitalAmount),
      issued: formatMoney(findCategory(categories, "INVESTMENT")?.issuedAmount),
      repayment: formatMoney(findCategory(categories, "INVESTMENT")?.repaymentAmount),
      type: "investment",
    },
    {
      title: "Commodity Products",
      count: countMergedForAppType(appProductRows, catalogProductRows, appId, "COMMODITY"),
      customers: findCategory(categories, "COMMODITY")?.customerCount || 0,
      inventory: formatMoney(findCategory(categories, "COMMODITY")?.inventoryAmount),
      sales: formatMoney(findCategory(categories, "COMMODITY")?.salesAmount),
      repayment: formatMoney(findCategory(categories, "COMMODITY")?.repaymentAmount),
      type: "commodity",
    },
  ],
    [appId, appProductRows, catalogProductRows, categories],
  )

  const tabBtn = (id: string, label: string) => (
    <button
      type="button"
      onClick={() => setActiveTab(id)}
      className={`relative pb-3 text-sm font-medium transition-colors ${
        activeTab === id ? "text-[#8B7355]" : "text-gray-500 hover:text-gray-700"
      }`}
    >
      {label}
      {activeTab === id ? <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#8B7355]" /> : null}
    </button>
  )

  return (
    <div className="flex-1 bg-white p-8">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Product Overview</h1>
      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

      {/* Summary bar — five KPIs in one row (scroll horizontally on narrow viewports) */}
      <div className="mb-8 rounded-lg bg-[#2C2C3E] p-6 sm:p-8">
        <div className="overflow-x-auto [-webkit-overflow-scrolling:touch]">
          <div className="flex min-w-[52rem] flex-nowrap items-start justify-between gap-4 sm:min-w-0 sm:gap-6 lg:gap-8">
            <div className="min-w-0 flex-1">
              {loading ? (
                <Skeleton className="mb-2 h-8 w-full max-w-[9rem] bg-gray-600/70" />
              ) : (
                <p className="truncate text-lg font-semibold text-white tabular-nums sm:text-xl lg:text-2xl">
                  {formatMoney(headline?.requestedAmount)}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-400 sm:text-sm">Requested</p>
            </div>
            <div className="min-w-0 flex-1">
              {loading ? (
                <Skeleton className="mb-2 h-8 w-full max-w-[9rem] bg-gray-600/70" />
              ) : (
                <p className="truncate text-lg font-semibold text-white tabular-nums sm:text-xl lg:text-2xl">
                  {formatMoney(headline?.approvedAmount)}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-400 sm:text-sm">Approved</p>
            </div>
            <div className="min-w-0 flex-1">
              {loading ? (
                <Skeleton className="mb-2 h-8 w-full max-w-[9rem] bg-gray-600/70" />
              ) : (
                <p className="truncate text-lg font-semibold text-white tabular-nums sm:text-xl lg:text-2xl">
                  {formatMoney(headline?.totalInterest)}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-400 sm:text-sm">Total interest</p>
            </div>
            <div className="min-w-0 flex-1">
              {loading ? (
                <Skeleton className="mb-2 h-8 w-full max-w-[9rem] bg-gray-600/70" />
              ) : (
                <p className="truncate text-lg font-semibold text-white tabular-nums sm:text-xl lg:text-2xl">
                  {formatMoney(headline?.totalTransactions)}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-400 sm:text-sm">Total transactions</p>
            </div>
            <div className="min-w-0 flex-1">
              {loading ? (
                <Skeleton className="mb-2 h-8 w-full max-w-[9rem] bg-gray-600/70" />
              ) : (
                <p className="truncate text-lg font-semibold text-white tabular-nums sm:text-xl lg:text-2xl">
                  {formatMoney(headline?.totalSavings)}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-400 sm:text-sm">Total savings</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8 border-b border-gray-200">
        <div className="flex flex-wrap gap-8">
          {tabBtn("general", "General Info")}
          {tabBtn("customers", "Customers")}
          {tabBtn("merchant", "Merchant")}
          {tabBtn("new-submissions", "New Submission")}
          {tabBtn("transactions", "Transactions")}
        </div>
      </div>

      {activeTab === "general" ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-5">
          {productCards.map((card, index) => (
            <div key={card.type} className="flex flex-col gap-4">
              <button
                type="button"
                onClick={() => handleProductClick(card.type)}
                className="flex cursor-pointer items-center justify-between rounded-lg bg-[#8B7355] p-6 transition-colors hover:bg-[#7A6449]"
              >
                <div className="flex items-center gap-4">
                  <Package className="text-white" size={24} />
                  <div>
                    <p className="text-sm font-medium text-white">{card.title}</p>
                  </div>
                </div>
                {loading ? (
                  <Skeleton className="h-10 w-10 bg-white/30" />
                ) : (
                  <div className="text-4xl font-bold text-white">{card.count}</div>
                )}
              </button>

              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg bg-gray-100 px-4 py-3">
                  <span className="text-sm text-gray-600">Customers</span>
                  {loading ? <Skeleton className="h-4 w-10" /> : <span className="text-sm font-medium text-gray-900">{card.customers}</span>}
                </div>
                <div className="flex items-center justify-between rounded-lg bg-gray-100 px-4 py-3">
                  <span className="text-sm text-gray-600">{index === 3 ? "Inventory" : "Capital"}</span>
                  {loading ? (
                    <Skeleton className="h-4 w-24" />
                  ) : (
                    <span className="text-sm font-medium text-gray-900">{index === 3 ? card.inventory : card.capital}</span>
                  )}
                </div>
                <div className="flex items-center justify-between rounded-lg bg-gray-100 px-4 py-3">
                  <span className="text-sm text-gray-600">{index === 3 ? "Sales" : "Issued"}</span>
                  {loading ? (
                    <Skeleton className="h-4 w-24" />
                  ) : (
                    <span className="text-sm font-medium text-gray-900">{index === 3 ? card.sales : card.issued}</span>
                  )}
                </div>
                <div className="flex items-center justify-between rounded-lg bg-gray-100 px-4 py-3">
                  <span className="text-sm text-gray-600">Repayment</span>
                  {loading ? (
                    <Skeleton className="h-4 w-24" />
                  ) : (
                    <span className="text-sm font-medium text-gray-900">{card.repayment}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {activeTab === "customers" ? <CustomersTable rows={customerRows} loading={loading} /> : null}
      {activeTab === "merchant" ? <MerchantsTable rows={merchantRows} loading={loading} /> : null}
      {activeTab === "new-submissions" ? <NewSubmissionsTable rows={applicationRows} loading={loading} /> : null}
      {activeTab === "transactions" ? <TransactionsTable rows={transactionRows} loading={loading} /> : null}

      <ProductDebugPanel appId={appId} location="platter" />
    </div>
  )
}
