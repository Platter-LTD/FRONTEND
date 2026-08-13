"use client"

import { createContext, useEffect, useRef, type ReactNode } from "react"
import { usePathname } from "next/navigation"
import { buildSigninUrl, getCurrentReturnTo } from "@/lib/authReturnTo"
import { getAccessToken } from "@/lib/cookieAuth"
import { clearSecureTokens } from "@/lib/tokenManager"
import { isOnAuthPage } from "@/lib/plataAuthFetch"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { loginThunk, loadUserFromTokenThunk, logoutThunk } from "@/store/authSlice"
import { clearComplianceState } from "@/store/complianceSlice"
import type { AuthUser } from "@/types/auth"

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
  const pathname = usePathname()
  const { user: authUser, loading, isAuthenticated } = useAppSelector((state) => state.auth)
  const retriedLoadRef = useRef(false)

  useEffect(() => {
    dispatch(loadUserFromTokenThunk())
  }, [dispatch])

  // Protected routes: leave when auth finished and there is no session.
  // Never call handleSessionExpired here — it races in-flight refresh and clears good cookies.
  useEffect(() => {
    if (loading) return
    if (isAuthenticated) {
      retriedLoadRef.current = false
      return
    }
    if (!pathname?.startsWith("/dashboard") && !pathname?.startsWith("/admin")) return
    if (isOnAuthPage()) return

    const token = typeof window !== "undefined" ? getAccessToken() : null
    if (token && !retriedLoadRef.current) {
      retriedLoadRef.current = true
      void dispatch(loadUserFromTokenThunk())
      return
    }

    // After retry (or no cookie): hard navigate so middleware doesn't bounce us back.
    void (async () => {
      if (token) await clearSecureTokens()
      window.location.replace(buildSigninUrl(getCurrentReturnTo()))
    })()
  }, [loading, isAuthenticated, pathname, dispatch])

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

  const signin = async (email: string, password: string) => {
    try {
      await dispatch(loginThunk({ email, password })).unwrap()
    } catch (error: any) {
      throw error
    }
  }

  const logout = async () => {
    await clearSecureTokens()
    dispatch(clearComplianceState())
    await dispatch(logoutThunk())
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
