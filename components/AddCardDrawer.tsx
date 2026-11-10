"use client"

import * as React from "react"
import { DrawerPanel } from "@/components/ui/drawer-panel"

interface AddCardDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: any) => void
}

export const AddCardDrawer: React.FC<AddCardDrawerProps> = ({ open, onOpenChange, onSubmit }) => {
  const [form, setForm] = React.useState({
    cardName: "",
    cardNumber: "",
    cvv: "",
    expiry: "",
    billing: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(form)
  }

  return (
    <DrawerPanel
      open={!!(open)}
      onOpenChange={(next) => {
        if (!next) onOpenChange(false)
      }}
      title="Add card"
      description="Enter the card details to save it for payments."
      bodyClassName="p-0 gap-0"
    >
    {/* Content */}
    <form
      onSubmit={handleSubmit}
      className="flex-1 flex flex-col justify-center px-8 py-10 space-y-8 max-w-md mx-auto w-full"
    >
      <input
        type="text"
        name="cardName"
        value={form.cardName}
        onChange={handleChange}
        placeholder="Card Name"
        className="w-full h-[60px] text-base border border-gray-200 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-black"
      />

      <input
        type="text"
        name="cardNumber"
        value={form.cardNumber}
        onChange={handleChange}
        placeholder="Card Number"
        className="w-full h-[60px] text-base border border-gray-200 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-black"
      />

      <input
        type="text"
        name="cvv"
        value={form.cvv}
        onChange={handleChange}
        placeholder="CVV"
        className="w-full h-[60px] text-base border border-gray-200 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-black"
      />

      <input
        type="text"
        name="expiry"
        value={form.expiry}
        onChange={handleChange}
        placeholder="Expiry Date"
        className="w-full h-[60px] text-base border border-gray-200 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-black"
      />

      <input
        type="text"
        name="billing"
        value={form.billing}
        onChange={handleChange}
        placeholder="Billing Address"
        className="w-full h-[60px] text-base border border-gray-200 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-black"
      />

      <button
        type="submit"
        className="w-full bg-black text-white py-3 rounded-md font-medium hover:bg-gray-800 transition-colors"
      >
        Add card
      </button>
    </form>

    </DrawerPanel>
  )
}
