import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios"
import { getAccessToken } from "@/lib/cookieAuth"
import { refreshOrRedirectToSignIn } from "@/lib/plataAuthFetch"
import { merchantRoleHeadersFromAuthorization } from "@/lib/server/merchantRoleHeaders"

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean }

/**
 * Adds what the app/api proxy routes add today: Bearer token from the access cookie,
 * plus the x-user-role / x-merchant-id headers derived from the JWT.
 */
export function applyRequestInterceptor(instance: AxiosInstance): void {
  instance.interceptors.request.use((config) => {
    const token = getAccessToken()
    if (!token) return config

    const authorization = `Bearer ${token}`
    config.headers.set("Authorization", authorization)
    for (const [key, value] of Object.entries(merchantRoleHeadersFromAuthorization(authorization))) {
      if (!config.headers.has(key)) config.headers.set(key, value)
    }
    return config
  })
}

/** On 401, refresh once (shared in-flight refresh) and retry; redirects to sign-in if refresh fails. */
export function applyResponseInterceptor(instance: AxiosInstance): void {
  instance.interceptors.response.use(undefined, async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined
    if (error.response?.status !== 401 || !config || config._retried) {
      return Promise.reject(error)
    }

    config._retried = true
    const newToken = await refreshOrRedirectToSignIn()
    config.headers.set("Authorization", `Bearer ${newToken}`)
    return instance(config)
  })
}
