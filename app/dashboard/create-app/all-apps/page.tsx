"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Plus, ExternalLink } from "lucide-react"
import CreateAppDrawer from "@/components/drawers/create-app-drawer"
import { TableEmptyState } from "@/components/ui/table-states"
import { DataTable, type ColumnDef } from "@/components/ui/data-table"
import { rowActionsColumn } from "@/components/ui/row-actions"
import { getAccessToken } from "@/lib/cookieAuth"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function AllAppsPage() {
  const router = useRouter()
  const [isCreateAppOpen, setIsCreateAppOpen] = useState(false)
  const [apps, setApps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState("all")

  const fetchApps = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = getAccessToken()
      const response = await fetch("/api/apps", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      })
      const result = await response.json()
      if (result.success && result.data) {
        setApps(Array.isArray(result.data) ? result.data : [])
      } else {
        setApps([])
        setError(result.error || "Failed to load applications")
      }
    } catch (err) {
      console.error("Error fetching apps:", err)
      setApps([])
      setError("Failed to load applications. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [])

  // Clear any legacy app data from localStorage (we now use API only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const keysToRemove: string[] = []
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i)
        if (key?.startsWith('plata-apps-')) keysToRemove.push(key)
      }
      keysToRemove.forEach((k) => window.localStorage.removeItem(k))
    }
  }, [])

  // Fetch apps from API whenever user lands on this page
  useEffect(() => {
    fetchApps()
  }, [fetchApps])

  const handleAppCreated = (_app: any) => {
    setIsCreateAppOpen(false)
    fetchApps()
  }

  const handleAppClick = (appId: string) => {
    router.push(`/dashboard/create-app/all-apps/${appId}/wallets/treasury`)
  }

  const statusOptions = Array.from(
    new Set(
      apps
        .map((a) => (a?.status ? String(a.status).toLowerCase() : null))
        .filter((v): v is string => Boolean(v)),
    ),
  ).sort((a, b) => a.localeCompare(b))

  const filteredApps =
    statusFilter === "all" ? apps : apps.filter((app) => String(app?.status ?? "").toLowerCase() === statusFilter)

  const formatDateCreated = (app: any) => {
    const raw = app?.dateCreated || app?.createdAt || app?.created_at || app?.date_created
    if (!raw) return "—"
    const date = new Date(raw)
    if (Number.isNaN(date.getTime())) return String(raw)
    return date.toLocaleDateString()
  }

  const columns: ColumnDef<any, unknown>[] = [
    { accessorKey: "name", header: "Application Name", cell: ({ row }) => <span className="font-medium text-gray-900">{row.original.name}</span> },
    { id: "appId", header: "App ID", accessorFn: (app) => app.appId || app.app_id || app.id || "—" },
    {
      accessorKey: "websiteUrl",
      header: "Website URL",
      cell: ({ row }) => (
        <a
          href={row.original.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 text-[#9A813F] hover:underline"
        >
          {row.original.websiteUrl}
          <ExternalLink className="h-3 w-3" />
        </a>
      ),
    },
    { accessorKey: "alias", header: "Alias" },
    { id: "dateCreated", header: "Date Created", accessorFn: (app) => formatDateCreated(app) },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">{row.original.status}</span>
      ),
    },
    rowActionsColumn<any>([{ label: "Open App", icon: ExternalLink, onClick: (app) => handleAppClick(app.id) }]),
  ]

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Applications</h1>
          <p className="text-gray-600 mt-1">Create and manage your microservice applications</p>
        </div>
        <div className="flex items-center gap-4">

          <Button onClick={() => setIsCreateAppOpen(true)} className="bg-[#9A813F] text-white hover:bg-[#8a7435]">
            <Plus className="w-4 h-4 mr-2" />
            Create Application
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="mb-8">
        <div className="bg-[#F5F1E8] rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Create your Application</h2>
          <p className="text-sm text-gray-600">Start by creating your app or you can integrate our in-app widget.</p>
        </div>
      </div>

      <DataTable
        tableId="all-apps"
        title="Applications"
        columns={columns}
        data={filteredApps}
        isLoading={loading}
        isError={!!error}
        error={error}
        onRefresh={fetchApps}
        clientSearch
        download
        resetPageSignal={statusFilter}
        rowDetails={{ drawer: true }}
        onRowClick={(app) => handleAppClick(app.id)}
        filters={{
          content: (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[190px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {statusOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ),
          activeCount: statusFilter === "all" ? 0 : 1,
          onClear: statusFilter === "all" ? undefined : () => setStatusFilter("all"),
        }}
        empty={
          apps.length > 0 ? (
            <TableEmptyState title="No applications match this status" description="Try selecting “All statuses”." />
          ) : (
            <div className="px-8 py-14 text-center">
              <Plus className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <h3 className="mb-2 text-lg font-medium text-gray-900">No applications yet</h3>
              <p className="mb-6 text-gray-600">Get started by creating your first application</p>
              <Button onClick={() => setIsCreateAppOpen(true)} className="bg-[#9A813F] text-white hover:bg-[#8a7435]">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First App
              </Button>
            </div>
          )
        }
      />

      {/* Create App Drawer */}
      <CreateAppDrawer
        isOpen={isCreateAppOpen}
        onClose={() => setIsCreateAppOpen(false)}
        onSuccess={handleAppCreated}
      />
    </div>
  )
}
