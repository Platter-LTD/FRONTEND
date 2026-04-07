import { configureStore } from "@reduxjs/toolkit"
import { authReducer } from "@/store/authSlice"
import { complianceReducer } from "@/store/complianceSlice"
import { merchantAppsReducer } from "@/store/merchantAppsSlice"

export const store = configureStore({
  reducer: {
    auth: authReducer,
    compliance: complianceReducer,
    merchantApps: merchantAppsReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

