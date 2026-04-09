import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit"
import { toastApiError, toastApiSuccess } from "@/lib/apiToast"
import { apiClient } from "@/lib/api"

const STORAGE_KEY = "spring_merchant_selected_app_v1"

export interface MerchantAppItem {
  id: string
  appId?: string
  name: string
  websiteUrl?: string
  alias?: string
  description?: string
  subdomain?: string
  defaultAppUrl?: string
  type?: string
  key?: string
  status: string
  dateCreated?: string
  createdAt?: string
}

interface MerchantAppsState {
  apps: MerchantAppItem[]
  loading: boolean
  error: string | null
  /** Prevents repeated auto-fetch when the list is empty after an error. */
  fetchAttempted: boolean
  selectedAppId: string | null
  selectedAppName: string | null
}

function readSelected(): { id: string; name: string } | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as { id?: string; name?: string }
    if (p?.id && p?.name) return { id: p.id, name: p.name }
    return null
  } catch {
    return null
  }
}

function writeSelected(id: string | null, name: string | null) {
  if (typeof window === "undefined") return
  try {
    if (!id || !name) {
      localStorage.removeItem(STORAGE_KEY)
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ id, name }))
    }
  } catch {
    /* ignore */
  }
}

function syncSessionStorage(id: string | null, name: string | null) {
  if (typeof window === "undefined") return
  if (id && name) {
    sessionStorage.setItem("selectedAppId", id)
    sessionStorage.setItem("selectedAppName", name)
  } else {
    sessionStorage.removeItem("selectedAppId")
    sessionStorage.removeItem("selectedAppName")
  }
}

const selectedPersisted = typeof window !== "undefined" ? readSelected() : null

const initialState: MerchantAppsState = {
  apps: [],
  loading: false,
  error: null,
  fetchAttempted: false,
  selectedAppId: selectedPersisted?.id ?? null,
  selectedAppName: selectedPersisted?.name ?? null,
}

export const fetchMerchantAppsThunk = createAsyncThunk<
  MerchantAppItem[],
  void,
  { rejectValue: string }
>("merchantApps/fetch", async (_, { rejectWithValue }) => {
  try {
    const response = await apiClient.get("/apps", { includeAuth: true })
    const result = response.data as {
      success?: boolean
      data?: unknown
      error?: string
    }

    if (!result.success || result.data == null) {
      return rejectWithValue(result.error || "Failed to load apps")
    }

    const arr = Array.isArray(result.data) ? result.data : []
    const apps: MerchantAppItem[] = arr.map((app: Record<string, unknown>) => {
      const id = String(app.id ?? app.appId ?? "")
      const createdRaw = app.createdAt != null ? String(app.createdAt) : app.dateCreated != null ? String(app.dateCreated) : undefined
      let dateCreated = "N/A"
      if (createdRaw) {
        try {
          dateCreated = new Date(createdRaw).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        } catch {
          dateCreated = createdRaw
        }
      }
      const rawStatus = app.status != null ? String(app.status) : "active"
      const statusLabel =
        rawStatus === "active"
          ? "Active"
          : rawStatus === "inactive"
            ? "Inactive"
            : rawStatus === "suspended"
              ? "Suspended"
              : rawStatus
      return {
        id,
        appId: app.appId != null ? String(app.appId) : id,
        name: String(app.name || "Unnamed App"),
        websiteUrl: app.websiteUrl != null ? String(app.websiteUrl) : undefined,
        alias: app.alias != null ? String(app.alias) : undefined,
        description: app.description != null ? String(app.description) : undefined,
        subdomain: app.subdomain != null ? String(app.subdomain) : undefined,
        defaultAppUrl: app.defaultAppUrl != null ? String(app.defaultAppUrl) : undefined,
        type: app.type != null ? String(app.type) : "Mobile App",
        key: app.key != null ? String(app.key) : app.alias != null ? String(app.alias) : "N/A",
        status: statusLabel,
        dateCreated,
        createdAt: createdRaw,
      }
    })

    return apps
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to load apps"
    return rejectWithValue(msg)
  }
})

const merchantAppsSlice = createSlice({
  name: "merchantApps",
  initialState,
  reducers: {
    setSelectedMerchantApp(state, action: PayloadAction<{ id: string; name: string }>) {
      state.selectedAppId = action.payload.id
      state.selectedAppName = action.payload.name
      writeSelected(action.payload.id, action.payload.name)
      syncSessionStorage(action.payload.id, action.payload.name)
    },
    clearSelectedMerchantApp(state) {
      state.selectedAppId = null
      state.selectedAppName = null
      writeSelected(null, null)
      syncSessionStorage(null, null)
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMerchantAppsThunk.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchMerchantAppsThunk.fulfilled, (state, action) => {
        state.loading = false
        state.fetchAttempted = true
        state.apps = action.payload
        const n = action.payload.length
        toastApiSuccess(n ? `Apps loaded (${n})` : "Apps loaded (none yet)", { id: "merchant-apps-ok" })

        if (state.selectedAppId && action.payload.length > 0) {
          const still = action.payload.find((a) => a.id === state.selectedAppId)
          if (!still) {
            const first = action.payload[0]
            state.selectedAppId = first.id
            state.selectedAppName = first.name
            writeSelected(first.id, first.name)
            syncSessionStorage(first.id, first.name)
          }
        } else if (state.selectedAppId && action.payload.length === 0) {
          state.selectedAppId = null
          state.selectedAppName = null
          writeSelected(null, null)
          syncSessionStorage(null, null)
        }
      })
      .addCase(fetchMerchantAppsThunk.rejected, (state, action) => {
        state.loading = false
        state.fetchAttempted = true
        state.error = action.payload || "Failed to load apps"
        toastApiError(action.payload || "Failed to load apps", { id: "merchant-apps-err" })
      })
  },
})

export const { setSelectedMerchantApp, clearSelectedMerchantApp } = merchantAppsSlice.actions
export const merchantAppsReducer = merchantAppsSlice.reducer
