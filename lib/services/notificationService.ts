"use client"

import { getAccessToken } from "@/lib/cookieAuth"

export type NotificationChannel = "email" | "sms" | "in_app"

type NotificationRecord = {
  id?: string
  _id?: string
  template?: string
  status?: string
  createdAt?: string
  sentAt?: string
  data?: Record<string, unknown>
}

type GetUserNotificationsResponse = {
  success: boolean
  data?: {
    notifications?: NotificationRecord[]
    total?: number
    limit?: number
    offset?: number
  }
  error?: string
  message?: string
}

type SendNotificationPayload = {
  channel: NotificationChannel
  recipient: string
  template: string
  data?: Record<string, unknown>
  priority?: "normal" | "high" | "low"
}

type SendDualNotificationPayload = {
  userId: string
  email: string
  template: string
  data?: Record<string, unknown>
}

function getHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? getAccessToken() : null
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function readJsonSafe<T>(response: Response, fallbackError: string): Promise<T> {
  const json = (await response.json().catch(() => ({ success: false, error: fallbackError }))) as T
  return json
}

export const notificationService = {
  async getUserNotifications(recipient: string, params?: { limit?: number; offset?: number; channel?: NotificationChannel }) {
    const search = new URLSearchParams()
    if (params?.limit != null) search.set("limit", String(params.limit))
    if (params?.offset != null) search.set("offset", String(params.offset))
    if (params?.channel) search.set("channel", params.channel)

    const response = await fetch(`/api/v1/notifications/user/${encodeURIComponent(recipient)}${search.toString() ? `?${search}` : ""}`, {
      method: "GET",
      headers: getHeaders(),
      credentials: "include",
      cache: "no-store",
    })

    return readJsonSafe<GetUserNotificationsResponse>(response, "Failed to load notifications")
  },

  async send(payload: SendNotificationPayload) {
    const response = await fetch("/api/v1/notifications/send", {
      method: "POST",
      headers: getHeaders(),
      credentials: "include",
      body: JSON.stringify(payload),
    })
    return readJsonSafe<Record<string, unknown>>(response, "Failed to send notification")
  },

  async sendDual(payload: SendDualNotificationPayload) {
    const response = await fetch("/api/v1/notifications/send-dual", {
      method: "POST",
      headers: getHeaders(),
      credentials: "include",
      body: JSON.stringify(payload),
    })
    return readJsonSafe<Record<string, unknown>>(response, "Failed to send dual notification")
  },

  async getStatus(notificationId: string) {
    const response = await fetch(`/api/v1/notifications/${encodeURIComponent(notificationId)}/status`, {
      method: "GET",
      headers: getHeaders(),
      credentials: "include",
      cache: "no-store",
    })
    return readJsonSafe<Record<string, unknown>>(response, "Failed to load notification status")
  },
}

export type { NotificationRecord }
