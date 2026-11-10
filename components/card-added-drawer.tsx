"use client"

import * as React from "react"
import { DrawerPanel } from "@/components/ui/drawer-panel"
import { Check } from "lucide-react"

interface CardAddedDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cardNumber?: string
}

export const CardAddedDrawer = ({ open, onOpenChange, cardNumber = "5129 •••••••••12" }: CardAddedDrawerProps) => {

  return (
    <DrawerPanel
      open={!!(open)}
      onOpenChange={(next) => {
        if (!next) onOpenChange(false)
      }}
      title="Card added successfully"
      hideHeader
      bodyClassName="p-0 gap-0"
    >
    {/* Content */}
    <div className="flex-1 flex flex-col items-center justify-center px-8 py-16 text-center space-y-6">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
        <Check className="w-8 h-8 text-green-600" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Card added successfully</h2>
        <p className="text-gray-600 mb-8">Card {cardNumber} 5129 •••••••••12 has been added successfully</p>
        <button
          onClick={() => onOpenChange(false)}
          className="w-full bg-[#74612F] text-white py-4 rounded-lg font-medium hover:bg-[#D4C7A8] transition-colors mt-2"
        >
          Close
        </button>
      </div>
    </div>

    </DrawerPanel>
  )
}
