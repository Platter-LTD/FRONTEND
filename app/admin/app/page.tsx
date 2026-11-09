"use client"

import { useState } from "react"
import { Eye, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTable, type ColumnDef } from "@/components/ui/data-table"
import { rowActionsColumn } from "@/components/ui/row-actions"
import SuspendProductDrawer from "@/components/drawers/suspend-product-drawer"
import SuspendAccountDrawer from "@/components/drawers/suspend-account-drawer"

export default function AdminAppPage() {
  const [activeTab, setActiveTab] = useState("all")
  const [selectedApps, setSelectedApps] = useState<string[]>([])
  const [isSuspendDrawerOpen, setIsSuspendDrawerOpen] = useState(false)
  const router = useRouter()

  const tabs = [
    { id: "all", label: "All Apps" },
    { id: "suspended", label: "Suspended apps" },
  ]

  const apps = [
    {
      id: "1",
      name: "Name of App",
      appId: "ab2c3d4-7890-1234",
      dateCreated: "Apr 12, 2025",
      product: "Quick Money",
      productKey: "X20445-78P",
      status: "Active",
    },
    {
      id: "2",
      name: "Name of App",
      appId: "ab2c3d4-7890-1234",
      dateCreated: "Apr 12, 2025",
      product: "Quick Money",
      productKey: "X20445-78P",
      status: "Inactive",
    },
    {
      id: "3",
      name: "Name of App",
      appId: "ab2c3d4-7890-1234",
      dateCreated: "Apr 11, 2025",
      product: "Quick Money",
      productKey: "X20445-78P",
      status: "Active",
    },
    {
      id: "4",
      name: "Name of App",
      appId: "ab2c3d4-7890-1234",
      dateCreated: "Apr 11, 2025",
      product: "Quick Money",
      productKey: "X20445-78P",
      status: "Inactive",
    },
  ]

  const handleSelectApp = (appId: string) => {
    setSelectedApps((prev) => (prev.includes(appId) ? prev.filter((id) => id !== appId) : [...prev, appId]))
  }

  const statusPill = (status: string) => (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
        status === "Active" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
      }`}
    >
      {status}
    </span>
  )

  type App = (typeof apps)[number]
  const columns: ColumnDef<App, unknown>[] = [
    ...(activeTab === "suspended"
      ? [
          {
            id: "select",
            size: 48,
            header: () => <span className="sr-only">Select</span>,
            meta: { label: "Select" },
            cell: ({ row }) => (
              <Checkbox
                checked={selectedApps.includes(row.original.id)}
                onCheckedChange={() => handleSelectApp(row.original.id)}
                onClick={(e) => e.stopPropagation()}
                aria-label={`Select ${row.original.name}`}
              />
            ),
          } satisfies ColumnDef<App, unknown>,
        ]
      : []),
    { accessorKey: "name", header: "App Name", cell: ({ row }) => <span className="text-gray-900">{row.original.name}</span> },
    { accessorKey: "appId", header: "App ID" },
    { accessorKey: "dateCreated", header: "Date Created" },
    { accessorKey: "product", header: "Product" },
    { accessorKey: "productKey", header: "Product Key" },
    { accessorKey: "status", header: "Status", cell: ({ row }) => statusPill(row.original.status) },
    ...(activeTab === "all" ? [rowActionsColumn<App>([{ label: "View app", icon: Eye, onClick: (app) => router.push(`/admin/app/${app.id}`) }])] : []),
  ]

  const handleSuspendApps = () => {
    setIsSuspendDrawerOpen(true)
  }

  const handleDeactivate = () => {
    // Handle deactivation logic
    setIsSuspendDrawerOpen(false)
    setSelectedApps([])
  }

  return (
    <div className="flex-1 bg-white">
      <div className="border-b border-gray-200 px-8 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-4 text-sm font-medium transition-colors relative ${
                  activeTab === tab.id ? "text-[#4169E1]" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab.label}
                {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4169E1]" />}
              </button>
            ))}
          </div>
          {activeTab === "suspended" && (
            <Button
              onClick={handleSuspendApps}
              disabled={selectedApps.length === 0}
              className="bg-[#4169E1] text-white hover:bg-[#3557c7] gap-2 disabled:opacity-50 mb-4"
            >
              <X size={16} />
              Suspend Apps
            </Button>
          )}
        </div>
      </div>

      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {activeTab === "suspended" ? "Suspended Apps" : "Product Transactions"}
          </h2>
        </div>

        <DataTable
          tableId={`admin-apps-${activeTab}`}
          columns={columns}
          data={apps}
          clientSearch
          searchPlaceholder="Search apps"
          download
          onRowClick={activeTab === "all" ? (app) => router.push(`/admin/app/${app.id}`) : undefined}
        />
      </div>

      <SuspendProductDrawer
        isOpen={isSuspendDrawerOpen}
        onClose={() => setIsSuspendDrawerOpen(false)}
        onDeactivate={handleDeactivate}
      />
      <SuspendAccountDrawer isOpen={isSuspendDrawerOpen} onClose={() => setIsSuspendDrawerOpen(false)} />
    </div>
  )
}
