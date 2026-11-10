"use client"

import { useState } from "react"
import { ChevronDown, AlertTriangle, Clock } from "lucide-react"
import { DataTable, type ColumnDef } from "@/components/ui/data-table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

export default function AdminCompliancePage() {
  const [activeTab, setActiveTab] = useState("compliance")

  const kycQueue = [
    {
      customer: "Grace Ayomide",
      documentType: "National ID",
      submissionDate: "Sept 19, 2025",
      status: "Rejected",
      riskLevel: "High risk",
      assignTo: "Chidi oli",
    },
    {
      customer: "Chidi Obi",
      documentType: "Drivers linenses",
      submissionDate: "Sept 19, 2025",
      status: "Under review",
      riskLevel: "Medium",
      assignTo: "Adedayo",
    },
    {
      customer: "Grace Ayomide",
      documentType: "National ID",
      submissionDate: "Sept 19, 2025",
      status: "Approved",
      riskLevel: "Low",
      assignTo: "Chidi oli",
    },
    {
      customer: "Chidi Obi",
      documentType: "Drivers linenses",
      submissionDate: "Sept 19, 2025",
      status: "Rejected",
      riskLevel: "High risk",
      assignTo: "Adedayo",
    },
  ]

  type KycItem = (typeof kycQueue)[number]
  const pill = (value: string, good: string, bad: string) => (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-sm ${
        value === good ? "bg-green-100 text-green-700" : value === bad ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
      }`}
    >
      {value}
    </span>
  )
  const columns: ColumnDef<KycItem, unknown>[] = [
    { accessorKey: "customer", header: "Customer" },
    { accessorKey: "documentType", header: "Document type" },
    { accessorKey: "submissionDate", header: "Submission date" },
    { accessorKey: "status", header: "Status", cell: ({ row }) => pill(row.original.status, "Approved", "Rejected") },
    { accessorKey: "riskLevel", header: "Risk level", cell: ({ row }) => pill(row.original.riskLevel, "Low", "High risk") },
    { accessorKey: "assignTo", header: "Assign to" },
  ]

  return (
    <div className="flex-1 bg-white">
      {/* Tabs */}
      <div className="border-b border-gray-200 px-8">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab("compliance")}
            className={`py-4 text-sm relative ${
              activeTab === "compliance" ? "text-[#3061F5]" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Compliance Management
            {activeTab === "compliance" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3061F5]" />}
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            className={`py-4 text-sm relative ${
              activeTab === "chat" ? "text-[#3061F5]" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Chat Reviews
            {activeTab === "chat" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3061F5]" />}
          </button>
        </div>
      </div>

      <div className="p-8">
        {/* Alert Cards */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 flex items-start gap-4">
            <div className="bg-[#3061F5] rounded-full p-3">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-[#3061F5] mb-1">Review Required</h3>
              <p className="text-sm text-blue-700">87 KYC applications are pending review (SLA: 24 hours)</p>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start gap-4">
            <div className="bg-red-600 rounded-full p-3">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-red-600 mb-1">Critical Alert</h3>
              <p className="text-sm text-red-700">3 high-risk AML cases require immediate attention</p>
            </div>
          </div>
        </div>

        {/* Stats Cards and Buttons on same row */}
        <div className="flex items-center gap-6 mb-8">
          {/* Stats Cards - narrower width */}
          <div className="flex gap-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6 w-64">
              <p className="text-sm text-gray-600 mb-2">KYC Completion Rate</p>
              <p className="text-4xl font-bold text-gray-900">45</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6 w-64">
              <p className="text-sm text-gray-600 mb-2">AML Alerts</p>
              <p className="text-4xl font-bold text-gray-900">5</p>
            </div>
          </div>

          <div className="flex items-center gap-4 ml-auto">
            <Button className="bg-[#3061F5] hover:bg-[#2451d4] text-white">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="mr-2"
              >
                <path
                  d="M14 10V12.6667C14 13.0203 13.8595 13.3594 13.6095 13.6095C13.3594 13.8595 13.0203 14 12.6667 14H3.33333C2.97971 14 2.64057 13.8595 2.39052 13.6095C2.14048 13.3594 2 13.0203 2 12.6667V10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M4.66667 6.66667L8 10L11.3333 6.66667"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M8 10V2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Export Report
            </Button>
            <Button className="bg-[#3061F5] hover:bg-[#2451d4] text-white">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="mr-2"
              >
                <path
                  d="M14 6V3.33333C14 2.97971 13.8595 2.64057 13.6095 2.39052C13.3594 2.14048 13.0203 2 12.6667 2H3.33333C2.97971 2 2.64057 2.14048 2.39052 2.39052C2.14048 2.64057 2 2.97971 2 3.33333V6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M11.3333 9.33333L8 6L4.66667 9.33333"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M8 6V14"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Generate Report
            </Button>
          </div>
        </div>

        <DataTable
          tableId="admin-kyc-queue"
          title="KYC Verification Queue"
          columns={columns}
          data={kycQueue}
          clientSearch
          download
          action={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="border-gray-200 bg-transparent text-gray-700 hover:bg-gray-50">
                  Filter
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>All</DropdownMenuItem>
                <DropdownMenuItem>Approved</DropdownMenuItem>
                <DropdownMenuItem>Under review</DropdownMenuItem>
                <DropdownMenuItem>Rejected</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          }
        />
      </div>
    </div>
  )
}
