import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit"
import { fetchWithAuth } from "@/lib/fetchWithAuth"
import { BACKEND } from "@/lib/endpoints"
import type { AuthUser, SessionDto } from "@/types/auth"

function formatApiError(res: Response, json: unknown): string {
  const j = json as { error?: string; message?: string }
  const msg = j?.error ?? j?.message
  return typeof msg === "string" && msg.trim() ? msg.trim() : `Request failed (${res.status})`
}

function mapProfileFromResponse(json: unknown): {
  profile: AuthUser | null
  fullName: string
  currentEmail: string
  phone: string
  country: string
} {
  const dataAny = (json as { data?: unknown })?.data ?? json
  const d = dataAny as Record<string, unknown>
  const firstName = d?.first_name ?? d?.firstName ?? d?.first
  const lastName = d?.last_name ?? d?.lastName ?? d?.last
  const emailValue = d?.email ?? (d?.user as Record<string, unknown>)?.email ?? ""
  const phoneValue = d?.phone ?? d?.phone_number ?? d?.phoneNumber ?? ""
  const countryValue = d?.country ?? d?.country_code ?? d?.countryCode ?? ""

  return {
    profile: dataAny as AuthUser,
    fullName: [firstName, lastName]
      .filter((v) => typeof v === "string" && (v as string).trim().length > 0)
      .join(" "),
    currentEmail: String(emailValue ?? ""),
    phone: String(phoneValue ?? "").replace(/^\+\d+/, ""),
    country: String(countryValue ?? "").toLowerCase(),
  }
}

function parseSessions(json: unknown): SessionDto[] {
  const j = json as Record<string, unknown>
  const list =
    (Array.isArray((j?.data as Record<string, unknown>)?.sessions)
      ? ((j.data as Record<string, unknown>).sessions as SessionDto[])
      : undefined) ??
    (Array.isArray(((j?.data as Record<string, unknown>)?.data as Record<string, unknown>)?.sessions)
      ? ((((j.data as Record<string, unknown>).data as Record<string, unknown>).sessions as SessionDto[]) ??
        undefined)
      : undefined) ??
    (Array.isArray(j?.data) ? (j.data as SessionDto[]) : undefined) ??
    (Array.isArray(j?.sessions) ? (j.sessions as SessionDto[]) : undefined) ??
    []
  return Array.isArray(list) ? list : []
}

export interface MerchantSettingsState {
  profile: AuthUser | null
  fullName: string
  currentEmail: string
  phone: string
  country: string
  newEmail: string
  confirmEmail: string
  emailCurrentPassword: string
  passwordCurrent: string
  passwordNew: string
  passwordConfirm: string
  sessions: SessionDto[]
  profileLoading: boolean
  profileSaving: boolean
  emailSaving: boolean
  passwordSaving: boolean
  sessionsLoading: boolean
  deactivating: boolean
}

const initialState: MerchantSettingsState = {
  profile: null,
  fullName: "",
  currentEmail: "",
  phone: "",
  country: "",
  newEmail: "",
  confirmEmail: "",
  emailCurrentPassword: "",
  passwordCurrent: "",
  passwordNew: "",
  passwordConfirm: "",
  sessions: [],
  profileLoading: false,
  profileSaving: false,
  emailSaving: false,
  passwordSaving: false,
  sessionsLoading: false,
  deactivating: false,
}

export const fetchMerchantProfileThunk = createAsyncThunk(
  "merchantSettings/fetchProfile",
  async (_, { rejectWithValue }) => {
    const res = await fetchWithAuth(BACKEND.user.profile, { method: "GET" })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      return rejectWithValue(formatApiError(res, json))
    }
    return mapProfileFromResponse(json)
  },
)

export const updateMerchantProfileThunk = createAsyncThunk(
  "merchantSettings/updateProfile",
  async (
    body: { first_name: string; last_name: string; phone: string; country: string },
    { dispatch, rejectWithValue },
  ) => {
    const res = await fetchWithAuth(BACKEND.user.updateProfile, {
      method: "PUT",
      body: JSON.stringify(body),
    })
    const putJson = await res.json().catch(() => ({}))
    if (!res.ok) {
      return rejectWithValue(formatApiError(res, putJson))
    }
    await dispatch(fetchMerchantProfileThunk()).unwrap()
    return true
  },
)

export const updateMerchantEmailThunk = createAsyncThunk(
  "merchantSettings/updateEmail",
  async (
    body: { newEmail: string; confirmEmail: string; currentPassword: string },
    { dispatch, rejectWithValue },
  ) => {
    const res = await fetchWithAuth(BACKEND.user.updateEmail, {
      method: "PUT",
      body: JSON.stringify(body),
    })
    const emailJson = await res.json().catch(() => ({}))
    if (!res.ok) {
      return rejectWithValue(formatApiError(res, emailJson))
    }
    await dispatch(fetchMerchantProfileThunk()).unwrap()
    return true
  },
)

export const changeMerchantPasswordThunk = createAsyncThunk(
  "merchantSettings/changePassword",
  async (body: { currentPassword: string; newPassword: string }, { rejectWithValue }) => {
    const res = await fetchWithAuth(BACKEND.password.change, {
      method: "PUT",
      body: JSON.stringify(body),
    })
    const pwdJson = await res.json().catch(() => ({}))
    if (!res.ok) {
      return rejectWithValue(formatApiError(res, pwdJson))
    }
    return true
  },
)

export const fetchMerchantSessionsThunk = createAsyncThunk(
  "merchantSettings/fetchSessions",
  async (_, { rejectWithValue }) => {
    const res = await fetchWithAuth(BACKEND.sessions.list, { method: "GET" })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      return rejectWithValue(formatApiError(res, json))
    }
    return parseSessions(json)
  },
)

export const revokeMerchantSessionThunk = createAsyncThunk(
  "merchantSettings/revokeSession",
  async (sessionId: string, { rejectWithValue }) => {
    const res = await fetchWithAuth(BACKEND.sessions.revoke(sessionId), { method: "DELETE" })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      return rejectWithValue(formatApiError(res, json))
    }
    return sessionId
  },
)

export const deactivateMerchantAccountThunk = createAsyncThunk(
  "merchantSettings/deactivate",
  async (_, { rejectWithValue }) => {
    const res = await fetchWithAuth(BACKEND.user.deactivate, { method: "POST", body: JSON.stringify({}) })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      return rejectWithValue(formatApiError(res, json))
    }
    return true
  },
)

const merchantSettingsSlice = createSlice({
  name: "merchantSettings",
  initialState,
  reducers: {
    setAccountFields(state, action: PayloadAction<Partial<Pick<MerchantSettingsState, "fullName" | "phone" | "country">>>) {
      const p = action.payload
      if (p.fullName !== undefined) state.fullName = p.fullName
      if (p.phone !== undefined) state.phone = p.phone
      if (p.country !== undefined) state.country = p.country
    },
    setEmailFields(
      state,
      action: PayloadAction<Partial<Pick<MerchantSettingsState, "newEmail" | "confirmEmail" | "emailCurrentPassword">>>,
    ) {
      const p = action.payload
      if (p.newEmail !== undefined) state.newEmail = p.newEmail
      if (p.confirmEmail !== undefined) state.confirmEmail = p.confirmEmail
      if (p.emailCurrentPassword !== undefined) state.emailCurrentPassword = p.emailCurrentPassword
    },
    setPasswordFields(
      state,
      action: PayloadAction<Partial<Pick<MerchantSettingsState, "passwordCurrent" | "passwordNew" | "passwordConfirm">>>,
    ) {
      const p = action.payload
      if (p.passwordCurrent !== undefined) state.passwordCurrent = p.passwordCurrent
      if (p.passwordNew !== undefined) state.passwordNew = p.passwordNew
      if (p.passwordConfirm !== undefined) state.passwordConfirm = p.passwordConfirm
    },
    clearEmailForm(state) {
      state.newEmail = ""
      state.confirmEmail = ""
      state.emailCurrentPassword = ""
    },
    clearPasswordForm(state) {
      state.passwordCurrent = ""
      state.passwordNew = ""
      state.passwordConfirm = ""
    },
    resetMerchantSettings() {
      return { ...initialState }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMerchantProfileThunk.pending, (state) => {
        state.profileLoading = true
      })
      .addCase(fetchMerchantProfileThunk.fulfilled, (state, action) => {
        state.profileLoading = false
        state.profile = action.payload.profile
        state.fullName = action.payload.fullName
        state.currentEmail = action.payload.currentEmail
        state.phone = action.payload.phone
        state.country = action.payload.country
      })
      .addCase(fetchMerchantProfileThunk.rejected, (state) => {
        state.profileLoading = false
      })
      .addCase(updateMerchantProfileThunk.pending, (state) => {
        state.profileSaving = true
      })
      .addCase(updateMerchantProfileThunk.fulfilled, (state) => {
        state.profileSaving = false
      })
      .addCase(updateMerchantProfileThunk.rejected, (state) => {
        state.profileSaving = false
      })
      .addCase(updateMerchantEmailThunk.pending, (state) => {
        state.emailSaving = true
      })
      .addCase(updateMerchantEmailThunk.fulfilled, (state) => {
        state.emailSaving = false
        state.newEmail = ""
        state.confirmEmail = ""
        state.emailCurrentPassword = ""
      })
      .addCase(updateMerchantEmailThunk.rejected, (state) => {
        state.emailSaving = false
      })
      .addCase(changeMerchantPasswordThunk.pending, (state) => {
        state.passwordSaving = true
      })
      .addCase(changeMerchantPasswordThunk.fulfilled, (state) => {
        state.passwordSaving = false
        state.passwordCurrent = ""
        state.passwordNew = ""
        state.passwordConfirm = ""
      })
      .addCase(changeMerchantPasswordThunk.rejected, (state) => {
        state.passwordSaving = false
      })
      .addCase(fetchMerchantSessionsThunk.pending, (state) => {
        state.sessionsLoading = true
      })
      .addCase(fetchMerchantSessionsThunk.fulfilled, (state, action) => {
        state.sessionsLoading = false
        state.sessions = action.payload
      })
      .addCase(fetchMerchantSessionsThunk.rejected, (state) => {
        state.sessionsLoading = false
      })
      .addCase(revokeMerchantSessionThunk.fulfilled, (state, action) => {
        state.sessions = state.sessions.filter((s) => s.id !== action.payload)
      })
      .addCase(deactivateMerchantAccountThunk.pending, (state) => {
        state.deactivating = true
      })
      .addCase(deactivateMerchantAccountThunk.fulfilled, (state) => {
        state.deactivating = false
      })
      .addCase(deactivateMerchantAccountThunk.rejected, (state) => {
        state.deactivating = false
      })
  },
})

export const {
  setAccountFields,
  setEmailFields,
  setPasswordFields,
  clearEmailForm,
  clearPasswordForm,
  resetMerchantSettings,
} = merchantSettingsSlice.actions

export const merchantSettingsReducer = merchantSettingsSlice.reducer
