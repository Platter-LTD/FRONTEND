"use client"

import { useCallback, useMemo, useState } from "react"
import { format } from "date-fns"
import { Bell, CheckCheck, CreditCard, Headphones, Shield, Sparkles, UserRound } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type DashboardNotificationItem = {
  id: string
  title: string
  description: string
  createdAt: Date
  read: boolean
  variant?: "default" | "security" | "payment" | "compliance" | "support"
}

/** Demo feed aligned with agreed notification types (replace when notifications API ships). */
function buildDemoNotifications(): DashboardNotificationItem[] {
  const base = new Date("2026-04-12T19:16:00")
  let mins = 0
  const next = (offset: number) => {
    mins += offset
    return new Date(base.getTime() - mins * 60_000)
  }

  const rows: Omit<DashboardNotificationItem, "id" | "createdAt">[] = [
    {
      title: "App creation successful",
      description: "A new application was created and is ready for setup.",
      read: false,
      variant: "default",
    },
    {
      title: "Product creation successful",
      description: "A product was created under your merchant workspace.",
      read: false,
      variant: "default",
    },
    {
      title: "New merchant successful",
      description: "A new merchant account completed onboarding.",
      read: true,
      variant: "default",
    },
    {
      title: "Compliance incomplete",
      description: "Merchant compliance still needs required documents or steps.",
      read: false,
      variant: "compliance",
    },
    {
      title: "Withdrawal alert",
      description: "A withdrawal request needs review or has completed.",
      read: false,
      variant: "payment",
    },
    {
      title: "New support ticket",
      description: "A merchant opened a new support conversation.",
      read: true,
      variant: "support",
    },
    {
      title: "Merchant account deactivation or deletion",
      description: "A merchant account was deactivated or scheduled for removal.",
      read: true,
      variant: "security",
    },
    {
      title: "Merchant product live or deactivate",
      description: "A product went live or was taken offline for a merchant.",
      read: false,
      variant: "default",
    },
    {
      title: "New customer onboard",
      description: "A new customer finished signup or initial onboarding.",
      read: false,
      variant: "default",
    },
    {
      title: "Product creation successful",
      description: "A customer-facing product was created successfully.",
      read: true,
      variant: "default",
    },
    {
      title: "Customer KYC completed or incomplete",
      description: "Customer verification status changed — check the case for details.",
      read: false,
      variant: "compliance",
    },
    {
      title: "Withdrawal alert",
      description: "A customer withdrawal event requires attention or confirmation.",
      read: false,
      variant: "payment",
    },
    {
      title: "New support ticket",
      description: "A customer submitted a new support ticket.",
      read: true,
      variant: "support",
    },
  ]

  const out: DashboardNotificationItem[] = []
  let id = 0
  let gap = 3
  for (const row of rows) {
    out.push({ ...row, id: `n-${++id}`, createdAt: next(gap) })
    gap = 5 + (id % 7)
  }
  return out.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

const SEED_NOTIFICATIONS: DashboardNotificationItem[] = buildDemoNotifications()

function variantIcon(variant: DashboardNotificationItem["variant"]) {
  switch (variant) {
    case "security":
      return <Shield className="h-4 w-4 text-amber-800" aria-hidden />
    case "payment":
      return <CreditCard className="h-4 w-4 text-[#8B7355]" aria-hidden />
    case "compliance":
      return <UserRound className="h-4 w-4 text-[#8B7355]" aria-hidden />
    case "support":
      return <Headphones className="h-4 w-4 text-[#8B7355]" aria-hidden />
    default:
      return <Sparkles className="h-4 w-4 text-[#8B7355]" aria-hidden />
  }
}

interface DashboardNotificationsPopoverProps {
  triggerClassName?: string
}

/**
 * Notification drawer opened from the dashboard header bell.
 * Uses local demo items until a notifications API is wired.
 */
export function DashboardNotificationsPopover({ triggerClassName }: DashboardNotificationsPopoverProps) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<DashboardNotificationItem[]>(SEED_NOTIFICATIONS)

  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items])

  const markAllRead = useCallback(() => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const markOneRead = useCallback((id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }, [])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "relative rounded-full p-2 text-gray-600 outline-none transition hover:bg-[#FFF9EB] hover:text-[#8B7355] focus-visible:ring-2 focus-visible:ring-[#8B7355]/30",
            triggerClassName,
          )}
          aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"}
        >
          <Bell className="h-5 w-5" strokeWidth={1.75} />
          {unreadCount > 0 ? (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#8B7355] px-1 text-[10px] font-semibold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={10}
        className="w-[min(100vw-1.5rem,400px)] border border-[#E8DFD0] bg-white p-0 shadow-xl"
      >
        <div className="border-b border-[#EFE8DC] bg-[#FFFCF6] px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Notifications</h2>
              <p className="text-xs text-gray-500">
                {unreadCount ? `${unreadCount} unread` : "You are all caught up"}
              </p>
            </div>
            {unreadCount > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 shrink-0 gap-1 text-xs text-[#8B7355] hover:bg-[#F5EDE0] hover:text-[#6B5A45]"
                onClick={(e) => {
                  e.preventDefault()
                  markAllRead()
                }}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </Button>
            ) : null}
          </div>
        </div>

        <div className="max-h-[min(70vh,420px)] overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-gray-500">No notifications yet.</div>
          ) : (
            <ul className="divide-y divide-[#F0EBE3]">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => markOneRead(n.id)}
                    className={cn(
                      "flex w-full gap-3 px-4 py-3 text-left transition hover:bg-[#FFFAF3]",
                      !n.read && "bg-[#FFFCF6]/90",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
                        n.read ? "border-gray-200 bg-gray-50" : "border-[#E5D5C0] bg-[#FFF4E6]",
                      )}
                    >
                      {variantIcon(n.variant)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{n.title}</span>
                        {!n.read ? (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-[#C5A572]" aria-label="Unread" />
                        ) : null}
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-gray-600">{n.description}</span>
                      <span className="mt-1.5 block text-[11px] tabular-nums text-gray-500">
                        {format(n.createdAt, "MMM d, yyyy · h:mm a")}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-[#EFE8DC] bg-gray-50/80 px-4 py-2 text-center text-[11px] text-gray-500">
        You have reached the end of your notifications
        </div>
      </PopoverContent>
    </Popover>
  )
}
