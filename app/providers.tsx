"use client"

import type React from "react"
import { QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { Provider as ReduxProvider } from "react-redux"
import { getQueryClient } from "@/lib/query/queryClient"
import { store } from "@/store/store"
import { AuthProvider } from "@/contexts/AuthContext"
import { ChunkLoadRecovery } from "@/components/ChunkLoadRecovery"
import { ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"

export function AppProviders({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient()
  return (
    <QueryClientProvider client={queryClient}>
      <ReduxProvider store={store}>
        <AuthProvider>
          <ChunkLoadRecovery />
          {children}
          <ToastContainer position="top-right" autoClose={3000} />
          <Toaster />
          <SonnerToaster position="top-right" richColors closeButton />
        </AuthProvider>
      </ReduxProvider>
      {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}
