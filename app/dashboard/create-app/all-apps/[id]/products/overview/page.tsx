"use client"

import { useState, useEffect, useMemo } from "react"
import { format } from "date-fns"
import { Package, MoreVertical } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { productApi } from "@/lib/services/product-api"
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
  name: string
  email: string
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

/** Placeholder rows until overview list endpoints exist */
const DEMO_CUSTOMERS: CustomerRow[] = [
  {
    id: "1",
    name: "Grace Chidi",
    email: "youremail@email.com",
    sourceMerchant: "Shell Coperative",
    phone: "+2347012345678",
    submittedAt: new Date("2025-04-12T09:32:00"),
    status: "Successful",
  },
  {
    id: "2",
    name: "Grace Chidi",
    email: "youremail@email.com",
    sourceMerchant: "Living Church",
    phone: "+2347012345678",
    submittedAt: new Date("2025-04-12T09:32:00"),
    status: "Successful",
  },
  {
    id: "3",
    name: "Grace Chidi",
    email: "youremail@email.com",
    sourceMerchant: "Olokada Association",
    phone: "+2347012345678",
    submittedAt: new Date("2025-04-12T09:32:00"),
    status: "Successful",
  },
  {
    id: "4",
    name: "Grace Chidi",
    email: "youremail@email.com",
    sourceMerchant: "APC Association",
    phone: "+2347012345678",
    submittedAt: new Date("2025-04-12T09:32:00"),
    status: "Successful",
  },
]

const DEMO_NEW_SUBMISSIONS: NewSubmissionRow[] = DEMO_CUSTOMERS.map((c, i) => ({
  id: `ns-${i}`,
  name: c.name,
  email: c.email,
  phone: c.phone,
  submittedAt: c.submittedAt,
  status: c.status,
}))

const DEMO_TRANSACTIONS: TransactionRow[] = [
  {
    id: "t1",
    date: new Date("2025-09-12T12:00:00"),
    amount: 10_000,
    status: "Successful",
    paymentMethod: "Visa 5134",
    transactionId: "3456788944",
    receiptAvailable: true,
  },
  {
    id: "t2",
    date: new Date("2025-09-12T12:00:00"),
    amount: 10_000,
    status: "Failed",
    paymentMethod: "Bank transfer",
    transactionId: "3456788944",
    receiptAvailable: false,
  },
  {
    id: "t3",
    date: new Date("2025-09-12T12:00:00"),
    amount: 10_000,
    status: "Successful",
    paymentMethod: "Bank transfer",
    transactionId: "3456788944",
    receiptAvailable: false,
  },
  {
    id: "t4",
    date: new Date("2025-09-12T12:00:00"),
    amount: 10_000,
    status: "Pending",
    paymentMethod: "Mastercard 5031",
    transactionId: "3456788944",
    receiptAvailable: true,
  },
]

function CustomersTable() {
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
          {DEMO_CUSTOMERS.map((row) => (
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
          ))}
        </tbody>
      </table>
    </div>
  )
}

function NewSubmissionsTable() {
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
          {DEMO_NEW_SUBMISSIONS.map((row) => (
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
                    <DropdownMenuItem>View details</DropdownMenuItem>
                    <DropdownMenuItem>Download documents</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

type TxSortKey = "date" | "amount" | "status"

function TransactionsTable() {
  const [sortBy, setSortBy] = useState<TxSortKey>("date")

  const sorted = useMemo(() => {
    const rows = [...DEMO_TRANSACTIONS]
    rows.sort((a, b) => {
      if (sortBy === "date") return b.date.getTime() - a.date.getTime()
      if (sortBy === "amount") return b.amount - a.amount
      return a.status.localeCompare(b.status)
    })
    return rows
  }, [sortBy])

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
            {sorted.map((row) => (
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
            ))}
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await productApi.getProductOverview(appId)
        const payload = (data as { data?: { headline?: OverviewHeadline; byCategory?: OverviewCategory[] } }).data
        setHeadline(payload?.headline || {})
        setCategories(Array.isArray(payload?.byCategory) ? payload.byCategory : [])
      } catch (error) {
        console.error("Error fetching product overview:", error)
        setHeadline(null)
        setCategories([])
        setError(error instanceof Error ? error.message : "Failed to load product overview")
      } finally {
        setLoading(false)
      }
    }

    if (appId) void fetchOverview()
  }, [appId])

  const handleProductClick = (type: string) => {
    router.push(`/dashboard/create-app/all-apps/${appId}/products/${type}`)
  }

  const productCards = [
    {
      title: "Mortgage Products",
      count: findCategory(categories, "MORTGAGE")?.configuredProductCount || 0,
      customers: findCategory(categories, "MORTGAGE")?.customerCount || 0,
      capital: formatMoney(findCategory(categories, "MORTGAGE")?.capitalAmount),
      issued: formatMoney(findCategory(categories, "MORTGAGE")?.issuedAmount),
      repayment: formatMoney(findCategory(categories, "MORTGAGE")?.repaymentAmount),
      type: "mortgage",
    },
    {
      title: "Loan Products",
      count: findCategory(categories, "LOAN")?.configuredProductCount || 0,
      customers: findCategory(categories, "LOAN")?.customerCount || 0,
      capital: formatMoney(findCategory(categories, "LOAN")?.capitalAmount),
      issued: formatMoney(findCategory(categories, "LOAN")?.issuedAmount),
      repayment: formatMoney(findCategory(categories, "LOAN")?.repaymentAmount),
      type: "loan",
    },
    {
      title: "Saving Products",
      count: findCategory(categories, "SAVINGS")?.configuredProductCount || 0,
      customers: findCategory(categories, "SAVINGS")?.customerCount || 0,
      capital: formatMoney(findCategory(categories, "SAVINGS")?.capitalAmount),
      issued: formatMoney(findCategory(categories, "SAVINGS")?.issuedAmount),
      repayment: formatMoney(findCategory(categories, "SAVINGS")?.repaymentAmount),
      type: "savings",
    },
    {
      title: "Investment Products",
      count: findCategory(categories, "INVESTMENT")?.configuredProductCount || 0,
      customers: findCategory(categories, "INVESTMENT")?.customerCount || 0,
      capital: formatMoney(findCategory(categories, "INVESTMENT")?.capitalAmount),
      issued: formatMoney(findCategory(categories, "INVESTMENT")?.issuedAmount),
      repayment: formatMoney(findCategory(categories, "INVESTMENT")?.repaymentAmount),
      type: "investment",
    },
    {
      title: "Commodity Products",
      count: findCategory(categories, "COMMODITY")?.configuredProductCount || 0,
      customers: findCategory(categories, "COMMODITY")?.customerCount || 0,
      inventory: formatMoney(findCategory(categories, "COMMODITY")?.inventoryAmount),
      sales: formatMoney(findCategory(categories, "COMMODITY")?.salesAmount),
      repayment: formatMoney(findCategory(categories, "COMMODITY")?.repaymentAmount),
      type: "commodity",
    },
  ]

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

      {/* Summary bar — primary three metrics match overview mocks; extra KPIs below */}
      <div className="mb-8 rounded-lg bg-[#2C2C3E] p-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div>
            {loading ? (
              <Skeleton className="mb-2 h-8 w-36 bg-gray-600/70" />
            ) : (
              <p className="text-2xl font-semibold text-white">{formatMoney(headline?.requestedAmount)}</p>
            )}
            <p className="mt-1 text-sm text-gray-400">Requested</p>
          </div>
          <div>
            {loading ? (
              <Skeleton className="mb-2 h-8 w-36 bg-gray-600/70" />
            ) : (
              <p className="text-2xl font-semibold text-white">{formatMoney(headline?.approvedAmount)}</p>
            )}
            <p className="mt-1 text-sm text-gray-400">Approved</p>
          </div>
          <div>
            {loading ? (
              <Skeleton className="mb-2 h-8 w-36 bg-gray-600/70" />
            ) : (
              <p className="text-2xl font-semibold text-white">{formatMoney(headline?.totalInterest)}</p>
            )}
            <p className="mt-1 text-sm text-gray-400">Total interest</p>
          </div>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-6 border-t border-white/10 pt-8 sm:grid-cols-2">
          <div>
            {loading ? (
              <Skeleton className="mb-2 h-7 w-32 bg-gray-600/70" />
            ) : (
              <p className="text-xl font-semibold text-white">{formatMoney(headline?.totalTransactions)}</p>
            )}
            <p className="mt-1 text-sm text-gray-400">Total transactions</p>
          </div>
          <div>
            {loading ? (
              <Skeleton className="mb-2 h-7 w-32 bg-gray-600/70" />
            ) : (
              <p className="text-xl font-semibold text-white">{formatMoney(headline?.totalSavings)}</p>
            )}
            <p className="mt-1 text-sm text-gray-400">Total savings</p>
          </div>
        </div>
      </div>

      <div className="mb-8 border-b border-gray-200">
        <div className="flex flex-wrap gap-8">
          {tabBtn("general", "General Info")}
          {tabBtn("customers", "Customers")}
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

      {activeTab === "customers" ? <CustomersTable /> : null}
      {activeTab === "new-submissions" ? <NewSubmissionsTable /> : null}
      {activeTab === "transactions" ? <TransactionsTable /> : null}

      <ProductDebugPanel appId={appId} location="platter" />
    </div>
  )
}
