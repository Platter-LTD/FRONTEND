"use client"

import * as React from "react"
import { DrawerPanel } from "@/components/ui/drawer-panel"
import { Check } from "lucide-react"

interface DeactivationSuccessDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export default function DeactivationSuccessDrawer({ isOpen, onClose }: DeactivationSuccessDrawerProps) {

  return (
    <DrawerPanel
      open={!!(isOpen)}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      title="App Deactivated"
      hideHeader
      bodyClassName="p-0 gap-0"
    >
    {/* Content */}
    <div className="flex-1 flex flex-col items-center justify-center px-12 py-16">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-6">
        <Check className="w-8 h-8 text-green-600" />
      </div>

      <h3 className="text-xl font-semibold text-gray-900 mb-2">App Deactivated</h3>
      <p className="text-sm text-gray-600 mb-12">product has been deactivated</p>

      <button
        onClick={onClose}
        className="px-16 py-3 bg-[#3061F5] hover:bg-[#2451d4] text-white rounded-lg font-medium transition-colors"
      >
        Continue
      </button>
    </div>

    </DrawerPanel>
  )
}
