"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus, AlertTriangle } from "lucide-react"
import { DataTable, type ColumnDef } from "@/components/ui/data-table"
import ScamAlertConfirmationDrawer from "@/components/drawers/scam-alert-confirmation-drawer"
import ScamAlertEmailDrawer from "@/components/drawers/scam-alert-email-drawer"

export default function ScamAlertPage() {
  const [step, setStep] = useState(0) // 0: initial, 1: confirmation, 2: email
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false)
  const [isEmailDrawerOpen, setIsEmailDrawerOpen] = useState(false)

  const apps = [
    {
      name: "Name of App",
      appId: "ab2c3d4-7890-1234",
      dateCreated: "Apr 12, 2025",
      product: "Quick Money",
      productKey: "X20445-78P",
      status: "Active",
    },
    {
      name: "Name of App",
      appId: "ab2c3d4-7890-1234",
      dateCreated: "Apr 12, 2025",
      product: "Quick Money",
      productKey: "X20445-78P",
      status: "Inactive",
    },
    {
      name: "Name of App",
      appId: "ab2c3d4-7890-1234",
      dateCreated: "Apr 11, 2025",
      product: "Quick Money",
      productKey: "X20445-78P",
      status: "Active",
    },
    {
      name: "Name of App",
      appId: "ab2c3d4-7890-1234",
      dateCreated: "Apr 11, 2025",
      product: "Quick Money",
      productKey: "X20445-78P",
      status: "Inactive",
    },
  ]

  type App = (typeof apps)[number]
  const columns: ColumnDef<App, unknown>[] = [
    { accessorKey: "name", header: "App Name", cell: ({ row }) => <span className="text-gray-900">{row.original.name}</span> },
    { accessorKey: "appId", header: "App ID" },
    { accessorKey: "dateCreated", header: "Date Created" },
    { accessorKey: "product", header: "Product" },
    { accessorKey: "productKey", header: "Product Key" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
            row.original.status === "Active" ? "bg-[#F5F1E8] text-[#9A813F]" : "bg-[#FFF3D3] text-[#B8860B]"
          }`}
        >
          {row.original.status}
        </span>
      ),
    },
  ]

  const handleNext = () => {
    if (step === 0) {
      setStep(1)
      setIsConfirmationOpen(true)
    } else if (step === 1) {
      setStep(2)
      setIsConfirmationOpen(false)
      setIsEmailDrawerOpen(true)
    } else {
      setStep(0)
      setIsEmailDrawerOpen(false)
    }
  }

  const handleAlertClick = () => {
    setIsConfirmationOpen(true)
  }

  const handleConfirmationYes = () => {
    setIsConfirmationOpen(false)
    setIsEmailDrawerOpen(true)
  }

  const handleDeactivate = (email: string) => {
    setIsEmailDrawerOpen(false)
  }

  return (
    <div className="flex-1 bg-white">
      <div className="px-8 pt-6 pb-4">
        <div className="flex items-center justify-end gap-4">
          <Button onClick={handleNext} variant="outline" className="gap-2 bg-transparent">
            Next
          </Button>
          <button
            onClick={handleAlertClick}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            <AlertTriangle size={20} />
            <span className="text-sm font-medium">Under attack? Click here</span>
          </button>
        </div>
      </div>

      <div className="px-8 pb-8">
        <div className="border-2 border-red-500 rounded-lg p-6">
          {/* Welcome section */}
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">Welcome</h1>
            <p className="text-sm text-gray-600">Our application platform</p>
          </div>

          {/* Create your Application info box */}
          <div className="bg-[#F5F1E8] rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Create your Application</h2>
            <p className="text-sm text-gray-600">start by creating your app or you can integrate our in-app widget.</p>
          </div>

          {/* All App heading with create button */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">All App</h2>
            <Button className="bg-black text-white hover:bg-gray-800 gap-2">
              <Plus size={16} />
              create app
            </Button>
          </div>
        </div>

        <div className="mt-6">
          <DataTable tableId="scam-alert-apps" columns={columns} data={apps} clientSearch download />
        </div>
      </div>

      <ScamAlertConfirmationDrawer
        open={isConfirmationOpen}
        onOpenChange={setIsConfirmationOpen}
        onConfirm={handleConfirmationYes}
      />
      <ScamAlertEmailDrawer open={isEmailDrawerOpen} onOpenChange={setIsEmailDrawerOpen} onSubmit={handleDeactivate} />
    </div>
  )
}
