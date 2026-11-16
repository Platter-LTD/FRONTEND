"use client"

import { useState, useMemo } from "react"
import { ChevronDown } from "lucide-react"
import { DataTable, type ColumnDef } from "@/components/ui/data-table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { type AdminUser } from "@/lib/services/adminService"
import { toast } from "sonner"
import { useAdminUsers } from "@/hooks/queries/admin"

const STATUS_STYLES: Record<string, string> = {
  Active: "bg-green-100 text-green-700",
  Pending: "bg-orange-100 text-orange-700",
  Suspended: "bg-red-100 text-red-700",
  Inactive: "bg-gray-100 text-gray-600",
}

export default function AdminUsersPage() {
  const { data: users = [], isLoading: loading, refetch: refetchUsers } = useAdminUsers()
  const [statusFilter, setStatusFilter] = useState<string>("All")


  const displayUsers = users.filter(u => statusFilter === "All" || u.status === statusFilter)

  const getUserDisplayName = (u: AdminUser) =>
    (u.name ?? [u.firstName, u.lastName].filter(Boolean).join(" ")) || "—"

  const formatDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"

  const columns = useMemo<ColumnDef<AdminUser, unknown>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        accessorFn: (u) => getUserDisplayName(u),
        cell: ({ row }) => <span className="font-medium text-gray-900">{getUserDisplayName(row.original)}</span>,
      },
      { accessorKey: "role", header: "Role", cell: ({ row }) => <span className="capitalize">{row.original.role}</span> },
      { accessorKey: "email", header: "Email" },
      { accessorKey: "lastLogin", header: "Last Login", cell: ({ row }) => formatDate(row.original.lastLogin) },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[row.original.status] ?? "bg-gray-100 text-gray-600"}`}
          >
            {row.original.status}
          </span>
        ),
      },
    ],
    []
  )

  return (
    <div className="flex-1 bg-white p-8">
      <h1 className="mb-6 text-xl font-normal text-gray-900">Users</h1>
      <DataTable
        tableId="admin-users"
        title="All users"
        columns={columns}
        data={displayUsers}
        isLoading={loading}
        onRefresh={() => void refetchUsers()}
        clientSearch
        searchPlaceholder="Search users..."
        resetPageSignal={statusFilter}
        download
        empty={statusFilter !== "All" ? "No users match your filters." : "No users found. API may be unavailable."}
        action={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-gray-200 bg-transparent text-gray-700 hover:bg-gray-50">
                {statusFilter}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {["All", "Active", "Pending", "Suspended"].map((s) => (
                <DropdownMenuItem key={s} onClick={() => setStatusFilter(s)}>
                  {s}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />
    </div>
  )
}
