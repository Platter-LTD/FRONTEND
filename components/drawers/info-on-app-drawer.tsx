"use client"

import { DrawerPanel } from "@/components/ui/drawer-panel"
import { Button } from "@/components/ui/button"

interface InfoOnAppDrawerProps {
  isOpen: boolean
  onClose: () => void
  onActivate: () => void
}

export default function InfoOnAppDrawer({ isOpen, onClose, onActivate }: InfoOnAppDrawerProps) {
  return (
    <DrawerPanel
      open={!!(isOpen)}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      title="Info on App"
      hideHeader
      bodyClassName="p-0 gap-0"
    >
    {/* Content */}
    <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
      <h2 className="text-2xl font-semibold text-gray-900 mb-2">Info on App</h2>
      <p className="text-sm text-gray-600 text-center mb-8">
        write up on the activation or deactivation of the product
      </p>

      <div className="flex gap-4 w-full max-w-sm">
        <Button onClick={onActivate} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
          Activate App
        </Button>
        <Button onClick={onClose} className="flex-1 bg-red-600 hover:bg-red-700 text-white">
          Deactivate App
        </Button>
      </div>
    </div>

    </DrawerPanel>
  )
}
