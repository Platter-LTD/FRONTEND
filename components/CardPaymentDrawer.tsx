"use client"

import * as React from "react"
import { DrawerPanel } from "@/components/ui/drawer-panel"
import { Trash2 } from "lucide-react"
import type { PaymentCard } from "@/app/types/payment"
import { MdOutlineAddCard } from "react-icons/md"

interface CardPaymentDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cards: PaymentCard[]
  selectedCard: string | null
  onCardSelect: (cardId: string) => void
  onAddNewCard: () => void
  onRemoveCard?: (cardId: string) => void
  onPay: () => void
}

const CardBrandIcon: React.FC<{ brand: string }> = ({ brand }) => {
  if (brand.toLowerCase() === "visa") {
    return <img src="/images/visa-logo.png" alt="Visa" className="h-6" />
  }
  return <img src="/images/master-logo.png" alt="Mastercard" className="h-6" />
}

export const CardPaymentDrawer = ({
  open,
  onOpenChange,
  cards,
  selectedCard,
  onCardSelect,
  onAddNewCard,
  onRemoveCard,
  onPay,
}: CardPaymentDrawerProps) => {

  return (
    <DrawerPanel
      open={!!(open)}
      onOpenChange={(next) => {
        if (!next) onOpenChange(false)
      }}
      title="Select card"
      bodyClassName="p-0 gap-0"
    >


    {/* Content */}
    <div className="flex-1 px-8 py-6 overflow-y-auto space-y-4">
      <div className="max-w-md mx-auto space-y-12">
        {cards.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No cards added yet</p>
            <p className="text-sm">Add a card to make payments</p>
          </div>
        ) : (
          cards.map((card) => (
            <div
              key={card.id}
              className="flex items-center space-x-4 py-4 border-b border-gray-200"
            >
              <input
                type="radio"
                name="selectedCard"
                value={card.id}
                checked={selectedCard === card.id}
                onChange={(e) => onCardSelect(e.target.value)}
                className="w-5 h-5 accent-black cursor-pointer"
              />
              <div className="flex items-center justify-between flex-1">
                <div className="flex items-center space-x-3">
                  <CardBrandIcon brand={card.brand} />
                  <div>
                    <p className="font-medium text-gray-900 flex items-center gap-2">
                      {card.brand.toUpperCase()} {card.number}
                    </p>
                    <p className="text-sm text-gray-500">
                      NAME {card.name} &nbsp; VALID THRU {card.expiryDate}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {card.isDefault && (
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-medium">DEFAULT</span>
                  )}
                  {onRemoveCard && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveCard(card.id);
                      }}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      title="Remove card"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}

        {/* Add new card */}
        <button
          onClick={onAddNewCard}
          className="w-full flex items-center justify-center space-x-2 p-4 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600"
        >
          <span>Add new card</span>
          <MdOutlineAddCard className="w-5 h-5" />
        </button>

        {/* Pay button */}
        <button
          onClick={onPay}
          disabled={!selectedCard}
          className="w-full bg-black text-white py-4 rounded-md font-medium hover:bg-gray-800 transition-colors disabled:cursor-not-allowed mt-6"
        >
          Pay
        </button>
      </div>
    </div>

    </DrawerPanel>
  )
}
