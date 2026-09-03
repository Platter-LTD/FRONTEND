import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit"
import api from "@/lib/api"
import { ENDPOINTS } from "@/lib/endpoints"
import { setSecureTokens, clearSecureTokens, getUserFromToken } from "@/lib/tokenManager"
import { getAccessToken } from "@/lib/cookieAuth"
import {
  clearSessionPermissions,
  getSessionRbac,
  saveSessionRbac,
} from "@/lib/teamPermissions"
import type {
  AuthMeResponseDto,
  AuthUser,
  LoginRequestDto,
  LoginResponseDto,
  MerchantRegistrationRequestDto,
  RbacSession,
} from "@/types/auth"

interface AuthState {
  user: AuthUser | null
  loading: boolean
  error: string | null
  isAuthenticated: boolean
  permissions: string[]
  isOwner: boolean
  roleId: string | null
  roleName: string | null
  /** True after login or a successful /auth/me hydrate. */
  rbacLoaded: boolean
}

const emptyRbac = (): RbacSession => ({
  isOwner: false,
  roleId: null,
  roleName: null,
  permissions: [],
})

function parseRbac(source: Record<string, unknown> | null | undefined): RbacSession {
  if (!source || typeof source !== "object") return emptyRbac()
  const permsRaw = source.permissions
  return {
    isOwner: source.isOwner === true,
    roleId:
      source.roleId != null
        ? String(source.roleId)
        : source.role_id != null
          ? String(source.role_id)
          : null,
    roleName:
      source.roleName != null
        ? String(source.roleName)
        : source.role_name != null
          ? String(source.role_name)
          : null,
    permissions: Array.isArray(permsRaw) ? permsRaw.map(String) : [],
  }
}

function normalizeAuthUser(raw: unknown): AuthUser | null {
  if (!raw || typeof raw !== "object") return null
  const u = raw as Record<string, unknown>
  const id = String(u.id ?? u._id ?? u.userId ?? u.sub ?? "").trim()
  const email = String(u.email ?? "").trim()
  if (!id && !email) return null
  return {
    id: id || email,
    email,
    first_name: String(u.first_name ?? u.firstName ?? "").trim(),
    last_name: String(u.last_name ?? u.lastName ?? "").trim(),
    phone: u.phone != null ? String(u.phone) : undefined,
    country: u.country != null ? String(u.country) : undefined,
    user_type: u.user_type != null ? String(u.user_type) : u.userType != null ? String(u.userType) : undefined,
    status: u.status != null ? String(u.status) : undefined,
    role_id:
      u.role_id != null
        ? String(u.role_id)
        : u.roleId != null
          ? String(u.roleId)
          : null,
  }
}

function applyRbacToState(state: AuthState, rbac: RbacSession) {
  state.permissions = rbac.permissions
  state.isOwner = rbac.isOwner
  state.roleId = rbac.roleId
  state.roleName = rbac.roleName
  state.rbacLoaded = true
  saveSessionRbac(rbac)
}

const initialRbac =
  typeof window !== "undefined" ? getSessionRbac() : emptyRbac()

const initialState: AuthState = {
  user: null,
  loading: false,
  error: null,
  isAuthenticated: false,
  permissions: initialRbac.permissions,
  isOwner: initialRbac.isOwner,
  roleId: initialRbac.roleId,
  roleName: initialRbac.roleName,
  rbacLoaded: false,
}

export const loginThunk = createAsyncThunk<
  { user: AuthUser; rbac: RbacSession },
  LoginRequestDto,
  { rejectValue: string }
>("auth/login", async (payload, { rejectWithValue }) => {
  try {
    const response = await api.post<LoginResponseDto>(ENDPOINTS.auth.login, payload)
    const responseData = response.data as LoginResponseDto & Record<string, unknown>

    let userData: AuthUser | undefined
    let accessToken: string | undefined
    let refreshToken: string | undefined

    if (responseData?.data?.tokens) {
      userData = responseData.data.user
      accessToken = responseData.data.tokens.accessToken
      refreshToken = responseData.data.tokens.refreshToken
    } else if (responseData?.data?.accessToken) {
      userData = responseData.data.user
      accessToken = responseData.data.accessToken
      refreshToken = responseData.data.refreshToken
    } else if (responseData?.accessToken) {
      userData = responseData.user
      accessToken = responseData.accessToken
      refreshToken = responseData.refreshToken
    }

    const dataBag =
      responseData?.data && typeof responseData.data === "object"
        ? (responseData.data as Record<string, unknown>)
        : null
    const rbac = parseRbac({
      ...(dataBag || {}),
      ...(responseData as Record<string, unknown>),
      permissions:
        responseData.permissions ??
        dataBag?.permissions ??
        (dataBag?.user as Record<string, unknown> | undefined)?.permissions,
      isOwner: responseData.isOwner ?? dataBag?.isOwner,
      roleId: responseData.roleId ?? dataBag?.roleId,
      roleName: responseData.roleName ?? dataBag?.roleName,
    })

    if (!accessToken) {
      return rejectWithValue("No access token received from server")
    }

    await setSecureTokens(accessToken, refreshToken)
    saveSessionRbac(rbac)

    const fallbackUser = getUserFromToken()
    const user =
      normalizeAuthUser(userData) ||
      (fallbackUser as unknown as AuthUser)
    if (!user) return rejectWithValue("Unable to resolve user from token")
    return { user, rbac }
  } catch (error: any) {
    const errorMessage =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      "Signin failed"
    return rejectWithValue(errorMessage)
  }
})

/** Primary RBAC hydrate for app reload — GET /api/v1/auth/me */
export const fetchAuthMeThunk = createAsyncThunk<
  { user: AuthUser; rbac: RbacSession } | null,
  void,
  { rejectValue: string }
>("auth/fetchMe", async (_, { rejectWithValue }) => {
  try {
    const response = await api.get<AuthMeResponseDto>(ENDPOINTS.auth.me)
    const body = response.data as AuthMeResponseDto & Record<string, unknown>
    const data =
      body?.data && typeof body.data === "object"
        ? (body.data as Record<string, unknown>)
        : (body as Record<string, unknown>)

    const user = normalizeAuthUser(data.user ?? data)
    if (!user) {
      return rejectWithValue("Invalid /auth/me payload")
    }
    const rbac = parseRbac(data)
    saveSessionRbac(rbac)
    return { user, rbac }
  } catch (error: any) {
    const status = error?.response?.status
    if (status === 401 || status === 404) return null
    return rejectWithValue(
      error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        "Failed to load session",
    )
  }
})

export const loadUserFromTokenThunk = createAsyncThunk<
  { user: AuthUser; rbac: RbacSession } | null
>("auth/loadUserFromToken", async (_, { dispatch }) => {
  try {
    const res = await fetch("/api/auth/validate", { method: "GET", credentials: "include" })
    const data = await res.json().catch(() => ({} as any))
    if (process.env.NODE_ENV === "development") {
      console.log("[auth] GET /api/auth/validate → status", res.status, "body", data)
    }

    const tokenOk = Boolean(data?.valid && data?.user)
    if (tokenOk || getAccessToken()) {
      // Prefer /auth/me for RBAC; fall back to JWT + cached session.
      const me = await dispatch(fetchAuthMeThunk())
      if (fetchAuthMeThunk.fulfilled.match(me) && me.payload) {
        return me.payload
      }

      if (tokenOk) {
        const jwtUser = data.user as AuthUser
        return {
          user: normalizeAuthUser(jwtUser) || (jwtUser as AuthUser),
          rbac: getSessionRbac(),
        }
      }
    }

    if (res.status === 401 || data?.valid === false) {
      const user = getUserFromToken()
      const token = getAccessToken()
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1])) as { exp?: number }
          if (payload.exp && payload.exp * 1000 > Date.now() && user) {
            const me = await dispatch(fetchAuthMeThunk())
            if (fetchAuthMeThunk.fulfilled.match(me) && me.payload) {
              return me.payload
            }
            return {
              user: user as unknown as AuthUser,
              rbac: getSessionRbac(),
            }
          }
        } catch {
          /* fall through */
        }
      }
      if (!getAccessToken()) {
        await clearSecureTokens()
      }
      return null
    }
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[auth] GET /api/auth/validate request failed", e)
    }
  }

  const user = getUserFromToken()
  try {
    const token = getAccessToken()
    if (token) {
      const payload = JSON.parse(atob(token.split(".")[1])) as { exp?: number }
      if (payload.exp && payload.exp * 1000 > Date.now()) {
        const me = await dispatch(fetchAuthMeThunk())
        if (fetchAuthMeThunk.fulfilled.match(me) && me.payload) {
          return me.payload
        }
        return user
          ? { user: user as unknown as AuthUser, rbac: getSessionRbac() }
          : null
      }
    }
  } catch {
    /* fall through */
  }

  return null
})

export const logoutThunk = createAsyncThunk("auth/logout", async () => {
  clearSessionPermissions()
  await clearSecureTokens()
})

export const registerMerchantThunk = createAsyncThunk<
  void,
  MerchantRegistrationRequestDto,
  { rejectValue: string }
>("auth/registerMerchant", async (payload, { rejectWithValue }) => {
  try {
    await api.post(ENDPOINTS.auth.signup.merchant, payload)
  } catch (error: any) {
    const errorMessage =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      "Registration failed"
    return rejectWithValue(errorMessage)
  }
})

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<AuthUser | null>) {
      state.user = action.payload
      state.isAuthenticated = !!action.payload
    },
    setRbac(state, action: PayloadAction<RbacSession>) {
      applyRbacToState(state, action.payload)
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginThunk.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.loading = false
        state.user = action.payload.user
        applyRbacToState(state, action.payload.rbac)
        state.isAuthenticated = true
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || "Signin failed"
        state.user = null
        state.permissions = []
        state.isOwner = false
        state.roleId = null
        state.roleName = null
        state.rbacLoaded = false
        state.isAuthenticated = false
      })
      .addCase(loadUserFromTokenThunk.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadUserFromTokenThunk.fulfilled, (state, action) => {
        state.loading = false
        if (!action.payload) {
          state.user = null
          state.isAuthenticated = false
          state.permissions = []
          state.isOwner = false
          state.roleId = null
          state.roleName = null
          state.rbacLoaded = false
          return
        }
        state.user = action.payload.user
        state.isAuthenticated = true
        applyRbacToState(state, action.payload.rbac)
      })
      .addCase(loadUserFromTokenThunk.rejected, (state) => {
        state.loading = false
        state.user = null
        state.permissions = []
        state.isOwner = false
        state.roleId = null
        state.roleName = null
        state.rbacLoaded = false
        state.isAuthenticated = false
      })
      .addCase(fetchAuthMeThunk.fulfilled, (state, action) => {
        if (!action.payload) return
        state.user = action.payload.user
        state.isAuthenticated = true
        applyRbacToState(state, action.payload.rbac)
      })
      .addCase(logoutThunk.fulfilled, (state) => {
        state.user = null
        state.permissions = []
        state.isOwner = false
        state.roleId = null
        state.roleName = null
        state.rbacLoaded = false
        state.isAuthenticated = false
        state.error = null
      })
  },
})

export const { setUser, setRbac } = authSlice.actions
export const authReducer = authSlice.reducer
