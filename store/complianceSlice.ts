import { createAsyncThunk, createSlice } from "@reduxjs/toolkit"
import { ComplianceService } from "@/lib/services/complianceService"
import { extractKycStatusString, isKycStatusApproved } from "@/lib/kycApproval"
import { isMerchantComplianceBypassEnabled } from "@/lib/merchantComplianceBypass"

const BYPASS = isMerchantComplianceBypassEnabled()

const STORAGE_KEY = "spring_compliance_kyc_v1"

type PersistedCompliance = {
  kycStatusRaw: unknown
  isApproved: boolean
  statusString?: string
}

function readPersisted(): PersistedCompliance | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PersistedCompliance
  } catch {
    return null
  }
}

function writePersisted(data: PersistedCompliance | null) {
  if (typeof window === "undefined") return
  try {
    if (data == null) {
      localStorage.removeItem(STORAGE_KEY)
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    }
  } catch {
    /* ignore quota / private mode */
  }
}

const LOG_KYC_STATUS =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_DEBUG_MERCHANT_KYC === "true"

interface ComplianceState {
  kycStatusRaw: unknown | null
  isApproved: boolean
  statusString: string | undefined
  loading: boolean
  error: string | null
}

const persisted = typeof window !== "undefined" ? readPersisted() : null

const initialState: ComplianceState = {
  kycStatusRaw: persisted?.kycStatusRaw ?? null,
  isApproved: BYPASS ? true : (persisted?.isApproved ?? false),
  statusString: persisted?.statusString,
  loading: !BYPASS,
  error: null,
}

export const fetchKycStatusThunk = createAsyncThunk(
  "compliance/fetchKycStatus",
  async (_, { rejectWithValue }) => {
    if (BYPASS) {
      return {
        kycStatusRaw: null as unknown,
        isApproved: true,
        statusString: "approved" as string | undefined,
      }
    }
    try {
      const kycStatusRaw = await ComplianceService.getKycStatusForCurrentUser()
      const statusString = extractKycStatusString(kycStatusRaw)
      const isApproved = isKycStatusApproved(kycStatusRaw)
      if (LOG_KYC_STATUS) {
        console.info("[MerchantCompliance/KYC] status response (raw):", kycStatusRaw)
        console.info("[MerchantCompliance/KYC] extractKycStatusString →", statusString ?? "(none)")
        console.info("[MerchantCompliance/KYC] isApproved (unlocks sidebar) →", isApproved)
      }
      return { kycStatusRaw, isApproved, statusString }
    } catch (err) {
      if (LOG_KYC_STATUS) {
        console.info("[MerchantCompliance/KYC] fetch failed (sidebar stays locked):", err)
      }
      return rejectWithValue(err instanceof Error ? err.message : "KYC fetch failed")
    }
  },
)

const complianceSlice = createSlice({
  name: "compliance",
  initialState,
  reducers: {
    clearComplianceState(state) {
      state.kycStatusRaw = null
      state.isApproved = BYPASS
      state.statusString = undefined
      state.error = null
      writePersisted(null)
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchKycStatusThunk.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchKycStatusThunk.fulfilled, (state, action) => {
        state.loading = false
        state.kycStatusRaw = action.payload.kycStatusRaw
        state.isApproved = action.payload.isApproved
        state.statusString = action.payload.statusString
        state.error = null
        writePersisted({
          kycStatusRaw: action.payload.kycStatusRaw,
          isApproved: action.payload.isApproved,
          statusString: action.payload.statusString,
        })
      })
      .addCase(fetchKycStatusThunk.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as string) || "KYC fetch failed"
        state.isApproved = true
        state.kycStatusRaw = null
        writePersisted({
          kycStatusRaw: null,
          isApproved: true,
          statusString: undefined,
        })
      })
  },
})

export const { clearComplianceState } = complianceSlice.actions
export const complianceReducer = complianceSlice.reducer
