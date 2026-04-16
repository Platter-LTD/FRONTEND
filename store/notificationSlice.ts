import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit"
import { getAccessToken } from "@/lib/cookieAuth"

export type NotificationUiItem = {
  id: string
  title: string
  description: string
  createdAt: string
  read: boolean
  variant?: "default" | "security" | "payment" | "compliance" | "support"
}

interface NotificationsState {
  items: NotificationUiItem[]
  loading: boolean
  error: string | null
}

const initialState: NotificationsState = {
  items: [],
  loading: false,
  error: null,
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

export const fetchInAppNotificationsThunk = createAsyncThunk<
  NotificationUiItem[],
  { recipient: string; limit?: number; offset?: number },
  { rejectValue: string }
>("notifications/fetchInApp", async ({ recipient, limit = 50, offset = 0 }, { rejectWithValue }) => {
  try {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      channel: "in_app",
    })
    const token = typeof window !== "undefined" ? getAccessToken() : null
    const res = await fetch(`/api/v1/notifications/user/${encodeURIComponent(recipient)}?${params.toString()}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
      cache: "no-store",
    })

    const body = (await res.json().catch(() => ({}))) as {
      success?: boolean
      error?: string
      message?: string
      data?: { notifications?: NotificationRecord[] }
    }

    if (!res.ok || body.success === false) {
      return rejectWithValue(body.error || body.message || "Failed to load notifications")
    }

    const rows = Array.isArray(body.data?.notifications) ? body.data.notifications : []
    return rows.map((row, idx) => toUiNotification(row, idx))
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load notifications"
    return rejectWithValue(message)
  }
})

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    markNotificationRead(state, action: PayloadAction<string>) {
      state.items = state.items.map((item) => (item.id === action.payload ? { ...item, read: true } : item))
    },
    markAllNotificationsRead(state) {
      state.items = state.items.map((item) => ({ ...item, read: true }))
    },
    clearNotificationsError(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInAppNotificationsThunk.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchInAppNotificationsThunk.fulfilled, (state, action) => {
        state.loading = false
        state.items = action.payload
      })
      .addCase(fetchInAppNotificationsThunk.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || "Failed to load notifications"
      })
  },
})

export const { markNotificationRead, markAllNotificationsRead, clearNotificationsError } = notificationsSlice.actions
export const notificationsReducer = notificationsSlice.reducer
