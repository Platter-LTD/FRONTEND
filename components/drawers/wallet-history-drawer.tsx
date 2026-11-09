"use client"

import { DrawerPanel } from "@/components/ui/drawer-panel"
import { Download, Share2 } from "lucide-react"

interface WalletHistoryDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export default function WalletHistoryDrawer({ isOpen, onClose }: WalletHistoryDrawerProps) {

  return (
    <DrawerPanel
      open={!!(isOpen)}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      title="Wallet History"
      bodyClassName="p-0 gap-0"
    >


    {/* Content */}
    <div className="flex-1 overflow-y-auto px-12 py-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between py-4 border-b border-gray-100">
          <span className="text-gray-500 text-sm">App Name</span>
          <span className="font-medium">Loan product creation</span>
        </div>

        <div className="flex items-center justify-between py-4 border-b border-gray-100">
          <span className="text-gray-500 text-sm">App Description</span>
          <span className="font-medium">Complete description</span>
        </div>

        <div className="flex items-center justify-between py-4 border-b border-gray-100">
          <span className="text-gray-500 text-sm">List of product</span>
          <span className="font-medium">Product list</span>
        </div>

        <div className="flex items-center justify-between py-4 border-b border-gray-100">
          <span className="text-gray-500 text-sm">Date</span>
          <span className="font-medium">Sep 12, 2025</span>
        </div>

        <div className="flex items-center justify-between py-4 border-b border-gray-100">
          <span className="text-gray-500 text-sm">Total users</span>
          <span className="font-medium">18 Users</span>
        </div>

        <div className="flex items-center justify-between py-4 border-b border-gray-100">
          <span className="text-gray-500 text-sm">Status</span>
          <span className="text-green-600 font-medium">Successful</span>
        </div>
      </div>
    </div>

    {/* Footer */}
    <div className="border-t border-gray-100 px-8 py-6">
      <div className="flex items-center justify-center gap-8">
        <button className="flex flex-col items-center gap-2 group">
          <div className="w-14 h-14 rounded-full bg-[#3061F5] flex items-center justify-center group-hover:bg-[#2451d4] transition-colors">
            <Download className="h-5 w-5 text-white" />
          </div>
          <span className="text-sm text-gray-500">Download</span>
        </button>

        <button className="flex flex-col items-center gap-2 group">
          <div className="w-14 h-14 rounded-full bg-[#3061F5] flex items-center justify-center group-hover:bg-[#2451d4] transition-colors">
            <Share2 className="h-5 w-5 text-white" />
          </div>
          <span className="text-sm text-gray-500">Share</span>
        </button>
      </div>
    </div>

    </DrawerPanel>
  )
}
