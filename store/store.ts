import { configureStore } from "@reduxjs/toolkit"
import { authReducer } from "@/store/authSlice"
import { complianceReducer } from "@/store/complianceSlice"
import { walletReducer } from "@/store/walletSlice"
import { merchantSettingsReducer } from "@/store/merchantSettingsSlice"
import { notificationsReducer } from "@/store/notificationSlice"

export const store = configureStore({
  reducer: {
    auth: authReducer,
    compliance: complianceReducer,
    wallet: walletReducer,
    merchantSettings: merchantSettingsReducer,
    notifications: notificationsReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

