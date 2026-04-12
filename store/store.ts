import { configureStore } from "@reduxjs/toolkit"
import { authReducer } from "@/store/authSlice"
import { complianceReducer } from "@/store/complianceSlice"
import { walletReducer } from "@/store/walletSlice"
import { merchantSettingsReducer } from "@/store/merchantSettingsSlice"

export const store = configureStore({
  reducer: {
    auth: authReducer,
    compliance: complianceReducer,
    wallet: walletReducer,
    merchantSettings: merchantSettingsReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

