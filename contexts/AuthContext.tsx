"use client"

import { createContext, useEffect, type ReactNode } from "react"
import { clearSecureTokens } from "@/lib/tokenManager"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { loginThunk, loadUserFromTokenThunk, logoutThunk } from "@/store/authSlice"
import type { AuthUser } from "@/types/auth"
import { clearPersistedKycStatus } from "@/hooks/queries/compliance"
import { getQueryClient } from "@/lib/query/queryClient"
import { useMutation } from "@tanstack/react-query"

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signin: (email: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch()
  const { user: authUser, loading, isAuthenticated } = useAppSelector((state) => state.auth)

  useEffect(() => {
    dispatch(loadUserFromTokenThunk())
  }, [dispatch])

  const mapAuthUserToContextUser = (user: AuthUser | null): User | null => {
    if (!user) return null
    return {
      id: user.id,
      email: user.email,
      firstName: (user as any).firstName ?? user.first_name,
      lastName: (user as any).lastName ?? user.last_name,
      role: user.user_type,
    }
  }

  const mappedUser = mapAuthUserToContextUser(authUser)

  const loginMutation = useMutation({
    mutationFn: (creds: { email: string; password: string }) => dispatch(loginThunk(creds)).unwrap(),
    // New session: drop anything cached for a previous user on this browser.
    onSuccess: () => getQueryClient().clear(),
  })

  const signin = async (email: string, password: string) => {
    await loginMutation.mutateAsync({ email, password })
  }

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await clearSecureTokens()
      clearPersistedKycStatus()
      await dispatch(logoutThunk())
    },
    // Drop every cached API response so nothing leaks into the next session on this browser.
    onSettled: () => getQueryClient().clear(),
  })

  const logout = async () => {
    await logoutMutation.mutateAsync()
  }

  return (
    <AuthContext.Provider
      value={{
        user: mappedUser,
        loading,
        signin,
        logout,
        isAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
