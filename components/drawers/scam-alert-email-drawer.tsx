"use client"

import * as React from "react"
import { useState } from "react"
import { DrawerPanel } from "@/components/ui/drawer-panel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface ScamAlertEmailDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (email: string) => void
}

export default function ScamAlertEmailDrawer({ open, onOpenChange, onSubmit }: ScamAlertEmailDrawerProps) {
  const [email, setEmail] = useState("")


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) {
      onSubmit(email)
      setEmail("")
    }
  }

  return (
    <DrawerPanel
      open={!!(open)}
      onOpenChange={(next) => {
        if (!next) onOpenChange(false)
      }}
      title="Enter your email"
      hideHeader
      bodyClassName="p-0 gap-0"
    >
    {/* Content */}
    <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
      <div className="max-w-md mx-auto w-full space-y-6">
        {/* Title */}
        <h2 className="text-3xl font-semibold text-gray-900 text-center">Enter your email</h2>

        {/* Subtitle */}
        <p className="text-gray-600 text-center">kindly enter your email to deactivate your account</p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6 mt-8">
          {/* Email Input */}
          <div>
            <label htmlFor="email" className="block text-sm text-gray-600 mb-2">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full h-12"
              required
            />
          </div>

          {/* Deactivate Button */}
          <Button
            type="submit"
            className="w-full bg-red-600 hover:bg-red-700 text-white py-6 rounded-lg text-base font-medium"
          >
            Deactivate
          </Button>
        </form>
      </div>
    </div>

    </DrawerPanel>
  )
}
