"use client"

import { DrawerPanel } from "@/components/ui/drawer-panel"
import { CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ActivationSuccessDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export default function ActivationSuccessDrawer({ isOpen, onClose }: ActivationSuccessDrawerProps) {
  return (
    <DrawerPanel
      open={!!(isOpen)}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      title="Activation successfully"
      hideHeader
      bodyClassName="p-0 gap-0"
    >
    {/* Content */}
    <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
        <CheckCircle size={32} className="text-green-600" />
      </div>

      <h2 className="text-2xl font-semibold text-gray-900 mb-2">Activation successfully</h2>
      <p className="text-sm text-gray-600 text-center mb-8">product has been activated</p>

      <Button onClick={onClose} className="w-full max-w-sm bg-[#9A813F] hover:bg-[#8A7335] text-white">
        Continue
      </Button>
    </div>

    </DrawerPanel>
  )
}
