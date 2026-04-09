import { configureStore } from "@reduxjs/toolkit"
import { authReducer } from "@/store/authSlice"
import { complianceReducer } from "@/store/complianceSlice"
import { merchantAppsReducer } from "@/store/merchantAppsSlice"
import { walletReducer } from "@/store/walletSlice"

export const store = configureStore({
  reducer: {
    auth: authReducer,
    compliance: complianceReducer,
    merchantApps: merchantAppsReducer,
    wallet: walletReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

