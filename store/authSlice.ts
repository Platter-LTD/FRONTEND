import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit"
import api from "@/lib/api"
import { ENDPOINTS } from "@/lib/endpoints"
import { setSecureTokens, clearSecureTokens, getUserFromToken } from "@/lib/tokenManager"
import { getAccessToken } from "@/lib/cookieAuth"
import type {
  AuthUser,
  LoginRequestDto,
  LoginResponseDto,
  MerchantRegistrationRequestDto,
} from "@/types/auth"

interface AuthState {
  user: AuthUser | null
  loading: boolean
  error: string | null
  isAuthenticated: boolean
}

const initialState: AuthState = {
  user: null,
  loading: false,
  error: null,
  isAuthenticated: false,
}

export const loginThunk = createAsyncThunk<
  AuthUser,
  LoginRequestDto,
  { rejectValue: string }
>("auth/login", async (payload, { rejectWithValue }) => {
  try {
    const response = await api.post<LoginResponseDto>(ENDPOINTS.auth.login, payload)
    const responseData = response.data

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
    } else if ((responseData as any)?.accessToken) {
      const direct = responseData as any
      userData = direct.user
      accessToken = direct.accessToken
      refreshToken = direct.refreshToken
    }

    if (!accessToken) {
      return rejectWithValue("No access token received from server")
    }

    await setSecureTokens(accessToken, refreshToken)

    const fallbackUser = getUserFromToken()
    return (userData as AuthUser) || (fallbackUser as unknown as AuthUser) || rejectWithValue("Unable to resolve user from token")
  } catch (error: any) {
    const errorMessage =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      "Signin failed"
    return rejectWithValue(errorMessage)
  }
})

export const loadUserFromTokenThunk = createAsyncThunk<AuthUser | null>(
  "auth/loadUserFromToken",
  async () => {
    try {
      const res = await fetch("/api/auth/validate", { method: "GET", credentials: "include" })
      const data = await res.json().catch(() => ({} as any))
      if (process.env.NODE_ENV === "development") {
        console.log("[auth] GET /api/auth/validate → status", res.status, "body", data)
      }
      if (data?.valid && data?.user) {
        if (process.env.NODE_ENV === "development") {
          console.log("[auth] user applied from validate response", data.user)
        }
        return data.user as AuthUser
      }

      // Access/refresh are dead — clear stale cookies so we don't sit on dashboard with 401 spam.
      if (res.status === 401 || data?.valid === false) {
        await clearSecureTokens()
        return null
      }
    } catch (e) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[auth] GET /api/auth/validate request failed", e)
      }
    }

    // Network hiccup only: keep user if JWT is still unexpired; otherwise clear and sign out.
    const user = getUserFromToken()
    try {
      const token = getAccessToken()
      if (token) {
        const payload = JSON.parse(atob(token.split(".")[1])) as { exp?: number }
        if (payload.exp && payload.exp * 1000 > Date.now()) {
          if (process.env.NODE_ENV === "development") {
            console.log("[auth] validate unreachable; using unexpired JWT claims", user)
          }
          return (user as any) || null
        }
      }
    } catch {
      /* fall through */
    }

    await clearSecureTokens()
    return null
  },
)

export const logoutThunk = createAsyncThunk("auth/logout", async () => {
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
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginThunk.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.loading = false
        state.user = action.payload
        state.isAuthenticated = true
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || "Signin failed"
        state.user = null
        state.isAuthenticated = false
      })
      .addCase(loadUserFromTokenThunk.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadUserFromTokenThunk.fulfilled, (state, action) => {
        state.loading = false
        state.user = action.payload
        state.isAuthenticated = !!action.payload
      })
      .addCase(loadUserFromTokenThunk.rejected, (state) => {
        state.loading = false
        state.user = null
        state.isAuthenticated = false
      })
      .addCase(logoutThunk.fulfilled, (state) => {
        state.user = null
        state.isAuthenticated = false
        state.error = null
      })
  },
})

export const { setUser } = authSlice.actions
export const authReducer = authSlice.reducer

