"use client"

import { ChevronDown } from "lucide-react"
import { DataTable, type ColumnDef } from "@/components/ui/data-table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

const businesses = [
  {
    businessDetails: "Business Details",
    contactPerson: "Chidi oli",
    phone: "+234801234567B",
    industry: "Logistics",
    kycStatus: "Completed",
    status: "Verified",
    submissionDate: "Sept 19, 2025",
  },
  {
    businessDetails: "Business Details",
    contactPerson: "Vera Vera",
    phone: "+234801234567B",
    industry: "Fintech",
    kycStatus: "Failed",
    status: "Rejected",
    submissionDate: "Sept 19, 2025",
  },
  {
    businessDetails: "Business Details",
    contactPerson: "Chidi oli",
    phone: "+234801234567B",
    industry: "Logistics",
    kycStatus: "Document Review",
    status: "Pending Review",
    submissionDate: "Sept 19, 2025",
  },
  {
    businessDetails: "Business Details",
    contactPerson: "Vera Vera",
    phone: "+234801234567B",
    industry: "Banking",
    kycStatus: "Completed",
    status: "Verified",
    submissionDate: "Sept 19, 2025",
  },
]

type Business = (typeof businesses)[number]

function statusPill(value: string, good: string, bad: string) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-sm ${
        value === good ? "bg-green-100 text-green-700" : value === bad ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
      }`}
    >
      {value}
    </span>
  )
}

const columns: ColumnDef<Business, unknown>[] = [
  { accessorKey: "businessDetails", header: "Business Details" },
  {
    accessorKey: "contactPerson",
    header: "Contact Person",
    cell: ({ row }) => (
      <div>
        <div className="text-sm">{row.original.contactPerson}</div>
        <div className="text-xs text-gray-500">{row.original.phone}</div>
      </div>
    ),
  },
  { accessorKey: "industry", header: "Industry" },
  { accessorKey: "kycStatus", header: "KYC Status", cell: ({ row }) => statusPill(row.original.kycStatus, "Completed", "Failed") },
  { accessorKey: "status", header: "Status", cell: ({ row }) => statusPill(row.original.status, "Verified", "Rejected") },
  { accessorKey: "submissionDate", header: "Submission Date" },
]

export default function AdminBusinessPage() {

  return (
    <div className="flex-1 bg-white p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-medium text-gray-900 mb-2">Business Management</h1>
        <p className="text-sm text-gray-600">Manage business accounts, KYB processes, and corporate verification</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-50 rounded-lg p-6">
          <p className="text-sm text-gray-600 mb-2">Total Businesses</p>
          <p className="text-3xl font-bold text-gray-900 mb-1">2,847</p>
          <p className="text-xs text-green-600">+12.5% from last month</p>
        </div>

        <div className="bg-gray-50 rounded-lg p-6">
          <p className="text-sm text-gray-600 mb-2">Verified Businesses</p>
          <p className="text-3xl font-bold text-gray-900 mb-1">2,456</p>
          <p className="text-xs text-green-600">+15.3% from last month</p>
        </div>

        <div className="bg-gray-50 rounded-lg p-6">
          <p className="text-sm text-gray-600 mb-2">Pending Verification</p>
          <p className="text-3xl font-bold text-gray-900 mb-1">234</p>
          <p className="text-xs text-red-600">+8.2% from last month</p>
        </div>
      </div>

      <DataTable
        tableId="admin-businesses"
        title="Registered Businesses"
        columns={columns}
        data={businesses}
        clientSearch
        searchPlaceholder="Search businesses"
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
              <DropdownMenuItem>Verified</DropdownMenuItem>
              <DropdownMenuItem>Pending</DropdownMenuItem>
              <DropdownMenuItem>Rejected</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />
    </div>
  )
}
