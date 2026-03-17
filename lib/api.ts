// lib/api.ts
import axios, {
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios"
import { getAccessToken } from "@/lib/cookieAuth"

// Only log in development
const isDev = process.env.NODE_ENV !== 'production'

// Use relative URL so requests go through our own Next.js API proxy
export interface ApiRequestConfig extends AxiosRequestConfig {
  includeAuth?: boolean
}

const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
})

// Request interceptor: use cookie (or localStorage fallback) for token
api.interceptors.request.use((config: InternalAxiosRequestConfig & { includeAuth?: boolean }) => {
  const includeAuth = (config as any).includeAuth ?? true

  if (!includeAuth) {
    if (config.headers) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (config.headers as any).Authorization
    }
    return config
  }

  if (config.data instanceof FormData && config.headers) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (config.headers as any)["Content-Type"]
  }

  const token = typeof window !== "undefined" ? getAccessToken() : null

  if (token) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(config.headers as any).Authorization = `Bearer ${token}`
  }

  return config
})

// Response interceptor: on 401, refresh via cookie (server reads refreshToken cookie)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (isDev) {
      console.log("API Error:", originalRequest?.url, error.response?.status)
    }

    const isAuthEndpoint = originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/refresh') ||
      originalRequest?.url?.includes('/auth/register') ||
      originalRequest?.url?.includes('/auth/me') ||
      originalRequest?.url?.includes('/v1/auth/')

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true
      try {
        const res = await axios.post("/api/auth/refresh", {}, { withCredentials: true })
        const newAccessToken = res.data?.data?.accessToken ?? res.data?.accessToken
        if (newAccessToken) {
          api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
          return api(originalRequest)
        }
      } catch {
        /* refresh failed */
      }
      delete api.defaults.headers.common.Authorization
      if (typeof window !== "undefined" && !window.location.pathname.includes("/signin")) {
        window.location.href = "/signin"
      }
    }
    return Promise.reject(error)
  },
)

type ApiClient = {
  get<T = unknown>(url: string, config?: ApiRequestConfig): Promise<AxiosResponse<T>>
  delete<T = unknown>(url: string, config?: ApiRequestConfig): Promise<AxiosResponse<T>>
  post<T = unknown, B = unknown>(url: string, data?: B, config?: ApiRequestConfig): Promise<AxiosResponse<T>>
  put<T = unknown, B = unknown>(url: string, data?: B, config?: ApiRequestConfig): Promise<AxiosResponse<T>>
  patch<T = unknown, B = unknown>(url: string, data?: B, config?: ApiRequestConfig): Promise<AxiosResponse<T>>
}

export const apiClient: ApiClient = {
  get: (url, config) => api.get(url, { ...config }),
  delete: (url, config) => api.delete(url, { ...config }),
  post: (url, data, config) => api.post(url, data, { ...config }),
  put: (url, data, config) => api.put(url, data, { ...config }),
  patch: (url, data, config) => api.patch(url, data, { ...config }),
}

export default api
