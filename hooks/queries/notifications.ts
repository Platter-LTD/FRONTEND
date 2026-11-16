"use client"

import { useQuery } from "@tanstack/react-query"
import { getAccessToken } from "@/lib/cookieAuth"
import { gatewayFetch } from "@/lib/gatewayFetch"

export type NotificationUiItem = {
  id: string
  title: string
  description: string
  createdAt: string
  read: boolean
  variant?: "default" | "security" | "payment" | "compliance" | "support"
}



type NotificationRecord = {
  id?: string
  _id?: string
  template?: string
  status?: string
  createdAt?: string
  sentAt?: string
  data?: Record<string, unknown>
}

function inferVariant(template?: string): NotificationUiItem["variant"] {
  const t = String(template || "").toLowerCase()
  if (t.includes("compliance") || t.includes("kyc")) return "compliance"
  if (t.includes("withdrawal") || t.includes("billing") || t.includes("payment")) return "payment"
  if (t.includes("support") || t.includes("ticket")) return "support"
  if (t.includes("deactivate") || t.includes("delete") || t.includes("status")) return "security"
  return "default"
}

function toUiNotification(row: NotificationRecord, index: number): NotificationUiItem {
  const data = row.data ?? {}
  const title =
    (typeof data.inAppTitle === "string" && data.inAppTitle.trim()) ||
    (typeof row.template === "string" && row.template.trim()) ||
    "Notification"
  const description =
    (typeof data.inAppBody === "string" && data.inAppBody.trim()) ||
    (typeof row.template === "string" && row.template.trim()) ||
    "You have a new notification."
  const id = String(row.id ?? row._id ?? `notification-${index}`)
  const createdAt = row.createdAt ?? row.sentAt ?? new Date().toISOString()
  const read = String(row.status || "").toLowerCase() === "read"

  return {
    id,
    title,
    description,
    createdAt,
    read,
    variant: inferVariant(row.template),
  }
}

async function loadInAppNotifications(recipient: string, limit: number, offset: number): Promise<NotificationUiItem[]> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset), channel: "in_app" })
  const token = typeof window !== "undefined" ? getAccessToken() : null
  const res = await gatewayFetch(`/api/v1/notifications/user/${encodeURIComponent(recipient)}?${params.toString()}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  })
  const body = (await res.json().catch(() => ({}))) as {
    success?: boolean
    error?: string
    message?: string
    data?: { notifications?: NotificationRecord[] }
  }
  if (!res.ok || body.success === false) throw new Error(body.error || body.message || "Failed to load notifications")
  const rows = Array.isArray(body.data?.notifications) ? body.data.notifications : []
  return rows.map((row, idx) => toUiNotification(row, idx))
}

/** In-app notifications for a recipient (fetched while `enabled`, e.g. when the popover is open). */
export function useInAppNotifications(recipient: string | null | undefined, enabled = true, limit = 50, offset = 0) {
  return useQuery({
    queryKey: ["notifications", "in-app", recipient ?? "", limit, offset],
    queryFn: () => loadInAppNotifications(recipient as string, limit, offset),
    enabled: enabled && Boolean(recipient),
  })
}
