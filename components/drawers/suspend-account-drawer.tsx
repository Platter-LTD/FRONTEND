"use client"

import { DrawerPanel } from "@/components/ui/drawer-panel"
import { Button } from "@/components/ui/button"

interface SuspendAccountDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export default function SuspendAccountDrawer({ isOpen, onClose }: SuspendAccountDrawerProps) {
  const handleSuspend = () => {
    // Handle suspend logic here
    onClose()
  }

  return (
    <DrawerPanel
      open={!!(isOpen)}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      title="Suspend Account"
      hideHeader
      bodyClassName="p-0 gap-0"
    >
    {/* Content */}
    <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
      <h2 className="text-2xl font-semibold text-gray-900 mb-2">Suspend Account</h2>
      <p className="text-sm text-gray-600 text-center mb-8 max-w-sm">
        Are you sure you want to suspend your app? This will temporarily disable access to your app and
        services.
      </p>

      <div className="flex gap-4 w-full max-w-sm">
        <Button onClick={handleSuspend} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
          Suspend
        </Button>
        <Button onClick={onClose} className="flex-1 bg-red-600 hover:bg-red-700 text-white">
          Cancel
        </Button>
      </div>
    </div>

    </DrawerPanel>
  )
}
