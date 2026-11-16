import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios"
import { getAccessToken } from "@/lib/cookieAuth"
import { refreshOrRedirectToSignIn } from "@/lib/plataAuthFetch"

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean }

/**
 * Attaches the Bearer access token. Identity (role, merchant) is NOT sent as headers:
 * the gateway and services derive it from the verified token, never from client-set headers.
 */
export function applyRequestInterceptor(instance: AxiosInstance): void {
  instance.interceptors.request.use((config) => {
    const token = getAccessToken()
    if (!token) return config

    config.headers.set("Authorization", `Bearer ${token}`)
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
