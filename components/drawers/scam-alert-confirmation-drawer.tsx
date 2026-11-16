"use client"

import * as React from "react"
import { DrawerPanel } from "@/components/ui/drawer-panel"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ScamAlertConfirmationDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export default function ScamAlertConfirmationDrawer({
  open,
  onOpenChange,
  onConfirm,
}: ScamAlertConfirmationDrawerProps) {

  return (
    <DrawerPanel
      open={!!(open)}
      onOpenChange={(next) => {
        if (!next) onOpenChange(false)
      }}
      title="Are you sure"
      hideHeader
      bodyClassName="p-0 gap-0"
    >
    {/* Content */}
    <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
      <div className="max-w-md mx-auto text-center space-y-6">
        {/* Alert Icon */}
        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto">
          <AlertTriangle size={40} className="text-red-600" />
        </div>

        {/* Title */}
        <h2 className="text-3xl font-semibold text-gray-900">Are you sure</h2>

        {/* Subtitle */}
        <p className="text-gray-600 text-lg">Your account is Under attack?</p>

        {/* Yes Button */}
        <Button
          onClick={onConfirm}
          className="w-full bg-red-600 hover:bg-red-700 text-white py-6 rounded-lg text-base font-medium mt-8"
        >
          Yes
        </Button>
      </div>
    </div>

    </DrawerPanel>
  )
}
