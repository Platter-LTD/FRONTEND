"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Bell, User } from "lucide-react"
import { DataTable, type ColumnDef } from "@/components/ui/data-table"
import { FiEyeOff } from "react-icons/fi"

export default function WalletPage() {
  const [activeTab, setActiveTab] = useState("wallet")

  const tabs = [
    { id: "wallet", label: "Wallet" },
    { id: "products", label: "Products" },
    { id: "transactions", label: "Transactions" },
    { id: "drive", label: "Drive" },
  ]

  const walletRecords = [
    {
      amount: "$0.45",
      ref: "SPI-234-BY45K",
      timestamp: "12:25 / Apr 12, 2025",
      fee: "$0.2",
      product: "Quick Vast",
      metaRef: "X20445-78P",
      userEmail: "grace.yo@spring.td",
      userPhone: "+234703674538",
    },
    {
      amount: "$0.45",
      ref: "SPI-234-BY45K",
      timestamp: "12:25 / Apr 12, 2025",
      fee: "$0.2",
      product: "Quick Vast",
      metaRef: "X20445-78P",
      userEmail: "grace.yo@spring.td",
      userPhone: "+234703674538",
    },
    {
      amount: "$0.45",
      ref: "SPI-234-BY45K",
      timestamp: "12:25 / Apr 12, 2025",
      fee: "$0.2",
      product: "Quick Vast",
      metaRef: "X20445-78P",
      userEmail: "grace.yo@spring.td",
      userPhone: "+234703674538",
    },
    {
      amount: "$0.45",
      ref: "SPI-234-BY45K",
      timestamp: "12:25 / Apr 12, 2025",
      fee: "$0.2",
      product: "Quick Vast",
      metaRef: "X20445-78P",
      userEmail: "grace.yo@spring.td",
      userPhone: "+234703674538",
    },
  ]

  type WalletRecord = (typeof walletRecords)[number]
  const columns: ColumnDef<WalletRecord, unknown>[] = [
    { accessorKey: "amount", header: "Amount", cell: ({ row }) => <span className="text-gray-900">{row.original.amount}</span> },
    { accessorKey: "ref", header: "Ref" },
    { accessorKey: "timestamp", header: "Timestamp" },
    { accessorKey: "fee", header: "Fee" },
    { accessorKey: "product", header: "Product" },
    { accessorKey: "metaRef", header: "Meta_Ref" },
    { accessorKey: "userEmail", header: "User email" },
    { accessorKey: "userPhone", header: "User Phone" },
  ]

  return (
    <div className="flex-1 bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-8 py-4">
        <div className="flex items-center justify-end gap-4 mb-6">
          <button className="relative p-2 hover:bg-gray-100 rounded-full">
            <Bell size={20} className="text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-[#9A813F] rounded-full"></span>
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full">
            <User size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium transition-colors relative ${
                activeTab === tab.id ? "text-[#9A813F]" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
              {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#9A813F]"></div>}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {/* Balance Card */}
        <div className="bg-black rounded-lg p-8 mb-8 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-2">Available Balance</p>
              <div className="flex items-baseline gap-1">
                <span className="text-white text-5xl font-semibold">$ 0.00</span>
                <span className="text-white text-2xl">.00</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <FiEyeOff className="text-gray-400" size={24} />
              <Button className="bg-[#9A813F] hover:bg-[#8A7335] text-white">Withdraw</Button>
            </div>
          </div>
        </div>

        <DataTable
          tableId="wallet-records"
          title="Wallet Record"
          columns={columns}
          data={walletRecords}
          clientSearch
          download
        />
      </div>
    </div>
  )
}
