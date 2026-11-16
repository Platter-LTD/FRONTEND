"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Plus, ExternalLink } from "lucide-react"
import CreateAppDrawer from "@/components/drawers/create-app-drawer"
import { DataTable, type ColumnDef } from "@/components/ui/data-table"
import { useAuth } from "@/hooks/useAuth"
import { useApps } from "@/hooks/queries/apps"

export default function CreateAppPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [isCreateAppOpen, setIsCreateAppOpen] = useState(false)
  const { data: apps = [], isLoading: loading, error: appsError, refetch: refetchApps } = useApps()
  const error = appsError ? "Failed to load applications. Please try again." : null

  const handleAppCreated = (app: any) => {
    setIsCreateAppOpen(false) // the create-app mutation refreshes the cached list
  }

  const handleAppClick = (appId: string) => {
    router.push(`/dashboard/create-app/all-apps/${appId}/products/overview`)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const columns: ColumnDef<any, unknown>[] = [
    { accessorKey: "name", header: "App Name", cell: ({ row }) => <span className="font-medium text-gray-900">{row.original.name}</span> },
    { id: "appId", header: "App ID", accessorFn: (app) => app.appId || app.id },
    {
      accessorKey: "websiteUrl",
      header: "Website URL",
      cell: ({ row }) => (
        <a
          href={row.original.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[#9A813F] hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {row.original.websiteUrl}
          <ExternalLink className="h-3 w-3" />
        </a>
      ),
    },
    { accessorKey: "alias", header: "Alias" },
    {
      id: "dateCreated",
      header: "Date Created",
      accessorFn: (app) => app.createdAt || app.dateCreated,
      cell: ({ row }) => formatDate(row.original.createdAt || row.original.dateCreated),
    },
    {
      id: "status",
      header: "Status",
      accessorFn: () => "Active",
      cell: () => (
        <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">Active</span>
      ),
    },
  ]

  return (
    <div className="flex-1 bg-white">
      {/* Info Banner */}
      <div className="px-8 pt-6 pb-4">
        <div className="bg-[#F5F1E8] rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Create your Application</h2>
          <p className="text-sm text-gray-600">Start by creating your app or you can integrate our in-app widget.</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        <DataTable
          tableId="merchant-apps"
          title="All Apps"
          columns={columns}
          data={apps}
          isLoading={loading}
          isError={!!error}
          error={error}
          onRefresh={() => void refetchApps()}
          clientSearch
          download
          rowDetails={{ drawer: true }}
          onRowClick={(app) => handleAppClick(app.id)}
          action={
            <Button onClick={() => setIsCreateAppOpen(true)} className="gap-2 bg-black text-white hover:bg-gray-800">
              <Plus size={16} />
              Create App
            </Button>
          }
          empty={
            <div className="px-8 py-14 text-center">
              <Plus className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <h3 className="mb-2 text-lg font-medium text-gray-900">No applications yet</h3>
              <p className="mb-6 text-gray-600">Get started by creating your first application</p>
              <Button onClick={() => setIsCreateAppOpen(true)} className="gap-2 bg-black text-white hover:bg-gray-800">
                <Plus size={16} />
                Create Your First App
              </Button>
            </div>
          }
        />
      </div>

      {/* Create App Drawer */}
      <CreateAppDrawer
        isOpen={isCreateAppOpen}
        onClose={() => setIsCreateAppOpen(false)}
        onSuccess={handleAppCreated}
      />
    </div>
  )
}
