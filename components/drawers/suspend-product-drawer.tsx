"use client"

import * as React from "react"
import { DrawerPanel } from "@/components/ui/drawer-panel"
import { Shield } from "lucide-react"

interface SuspendProductDrawerProps {
  isOpen: boolean
  onClose: () => void
  onDeactivate: () => void
}

export default function SuspendProductDrawer({ isOpen, onClose, onDeactivate }: SuspendProductDrawerProps) {

  return (
    <DrawerPanel
      open={!!(isOpen)}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      title="Info on App"
      bodyClassName="p-0 gap-0"
    >


    {/* Content */}
    <div className="flex-1 flex flex-col items-center justify-center px-12 py-16">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-6">
        <Shield className="w-8 h-8 text-gray-600" />
      </div>
      <p className="text-center text-gray-600 mb-12 max-w-md">
        write up on the activation or deactivation of the product
      </p>

      <div className="flex gap-4">
        <button
          onClick={onClose}
          className="px-8 py-3 bg-[#3061F5] hover:bg-[#2451d4] text-white rounded-lg font-medium transition-colors"
        >
          Activate App
        </button>
        <button
          onClick={onDeactivate}
          className="px-8 py-3 bg-[#F44336] hover:bg-[#da190b] text-white rounded-lg font-medium transition-colors"
        >
          Deactivate App
        </button>
      </div>
    </div>

    </DrawerPanel>
  )
}
