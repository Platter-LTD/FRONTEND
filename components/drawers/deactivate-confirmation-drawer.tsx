"use client"

import * as React from "react"
import { DrawerPanel } from "@/components/ui/drawer-panel"

interface DeactivateConfirmationDrawerProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

export default function DeactivateConfirmationDrawer({
  isOpen,
  onClose,
  onConfirm,
}: DeactivateConfirmationDrawerProps) {

  return (
    <DrawerPanel
      open={!!(isOpen)}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      title="Deactivate app"
      bodyClassName="p-0 gap-0"
    >
    {/* Content */}
    <div className="flex-1 flex flex-col items-center justify-center px-12 py-16">
      <p className="text-center text-gray-900 text-lg font-medium mb-12">
        Are you sure you want to deactivate this app?
      </p>

      <div className="flex gap-4">
        <button
          onClick={onConfirm}
          className="px-12 py-3 bg-[#3061F5] hover:bg-[#2451d4] text-white rounded-lg font-medium transition-colors"
        >
          Yes
        </button>
        <button
          onClick={onClose}
          className="px-12 py-3 bg-[#F44336] hover:bg-[#da190b] text-white rounded-lg font-medium transition-colors"
        >
          No
        </button>
      </div>
    </div>

    </DrawerPanel>
  )
}
