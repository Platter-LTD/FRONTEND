"use client"

import { useState } from "react"
import { Copy, Check } from "lucide-react"
import { toast } from "sonner"
import { DataTable, type ColumnDef } from "@/components/ui/data-table"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import type { Transaction } from "@/lib/services/walletService"
import { formatPlataWalletAmount } from "@/lib/walletDisplay"
import { cn } from "@/lib/utils"

function formatWhen(iso: string | undefined) {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return iso
  }
}

function txTypeLabel(type: Transaction["type"]): "Deposit" | "Withdrawal" {
  return type === "DEBIT" ? "Withdrawal" : "Deposit"
}

function truncateRef(value: string, max = 18) {
  if (!value) return "—"
  if (value.length <= max) return value
  return `${value.slice(0, max)}…`
}

function RefHoverCell({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const full = value || "—"

  const copy = async () => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      toast.success("Reference copied")
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error("Could not copy")
    }
  }

  return (
    <HoverCard openDelay={150}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="max-w-[11rem] truncate text-left text-sm text-gray-800 underline-offset-2 hover:underline"
        >
          {truncateRef(full)}
        </button>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="w-80 p-3">
        <p className="text-xs leading-relaxed break-all whitespace-normal text-gray-700">{full}</p>
        <button
          type="button"
          onClick={() => void copy()}
          className="mt-2 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy reference"}
        </button>
      </HoverCardContent>
    </HoverCard>
  )
}

const columns: ColumnDef<Transaction, unknown>[] = [
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row: { original: tx } }) => (
      <span className="text-gray-900">
        {tx.type === "DEBIT" ? "-" : ""}
        {formatPlataWalletAmount(Math.abs(tx.amount))}
      </span>
    ),
  },
  {
    id: "type",
    header: "Type",
    accessorFn: (tx) => txTypeLabel(tx.type),
    cell: ({ row }) => {
      const typeLabel = txTypeLabel(row.original.type)
      return (
        <span
          className={cn(
            "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
            typeLabel === "Deposit" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800",
          )}
        >
          {typeLabel}
        </span>
      )
    },
  },
  { accessorKey: "status", header: "Status" },
  {
    accessorKey: "description",
    header: "Description",
    size: 260,
    cell: ({ row }) => (
      <span className="block truncate" title={row.original.description}>
        {row.original.description || "—"}
      </span>
    ),
  },
  {
    id: "reference",
    header: "Reference",
    accessorFn: (tx) => tx.referenceId || tx.id,
    cell: ({ row }) => <RefHoverCell value={row.original.referenceId || row.original.id} />,
  },
  { accessorKey: "createdAt", header: "Time", cell: ({ row }) => formatWhen(row.original.createdAt) },
]

export function MerchantTransactionsTable({
  transactions,
  loading,
  currency = "NGN",
  searchTerm,
  onSearchChange,
  emptyMessage = "No transactions yet",
}: {
  transactions: Transaction[]
  loading: boolean
  currency?: string
  searchTerm: string
  onSearchChange: (v: string) => void
  emptyMessage?: string
}) {
  void currency
  const filtered = transactions.filter((tx) => {
    const q = searchTerm.toLowerCase().trim()
    if (!q) return true
    const ref = (tx.referenceId || tx.id || "").toLowerCase()
    const desc = (tx.description || "").toLowerCase()
    const st = (tx.status || "").toLowerCase()
    const typ = txTypeLabel(tx.type).toLowerCase()
    return ref.includes(q) || desc.includes(q) || st.includes(q) || typ.includes(q)
  })

  return (
    <DataTable
      tableId="merchant-transactions"
      title="Transactions"
      columns={columns}
      data={filtered}
      isLoading={loading}
      onSearch={onSearchChange}
      initialSearch={searchTerm}
      download
      resetPageSignal={searchTerm}
      empty={emptyMessage}
    />
  )
}
