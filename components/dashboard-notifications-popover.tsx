"use client"

import { useCallback, useMemo, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { Bell, CheckCheck, CreditCard, Shield, Sparkles } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type DashboardNotificationItem = {
  id: string
  title: string
  description: string
  createdAt: Date
  read: boolean
  variant?: "default" | "security" | "payment"
}

const SEED_NOTIFICATIONS: DashboardNotificationItem[] = [
  {
    id: "1",
    title: "Repayment received",
    description: "A scheduled repayment was credited to your repayment wallet.",
    createdAt: new Date(Date.now() - 1000 * 60 * 12),
    read: false,
    variant: "payment",
  },
  {
    id: "2",
    title: "Product configuration saved",
    description: "Your loan product settings were updated successfully.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
    read: false,
    variant: "default",
  },
  {
    id: "3",
    title: "Security: new sign-in",
    description: "We detected a login from a new device. If this was not you, reset your password.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26),
    read: true,
    variant: "security",
  },
  {
    id: "4",
    title: "KYC status",
    description: "Your compliance documents are under review.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
    read: true,
    variant: "default",
  },
]

function variantIcon(variant: DashboardNotificationItem["variant"]) {
  switch (variant) {
    case "security":
      return <Shield className="h-4 w-4 text-amber-800" aria-hidden />
    case "payment":
      return <CreditCard className="h-4 w-4 text-[#8B7355]" aria-hidden />
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
                      <span className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{n.title}</span>
                        {!n.read ? (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-[#C5A572]" aria-label="Unread" />
                        ) : null}
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-gray-600">{n.description}</span>
                      <span className="mt-1 block text-[11px] font-medium uppercase tracking-wide text-gray-400">
                        {formatDistanceToNow(n.createdAt, { addSuffix: true })}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-[#EFE8DC] bg-gray-50/80 px-4 py-2 text-center text-[11px] text-gray-500">
          Demo feed — connect your notifications API to replace this list.
        </div>
      </PopoverContent>
    </Popover>
  )
}
