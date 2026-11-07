import Axios, { type AxiosRequestConfig } from "axios"
import { applyRequestInterceptor, applyResponseInterceptor } from "./interceptors"

const axiosInstance = Axios.create({
  baseURL: process.env.NEXT_PUBLIC_ACCOUNT_MS_URL || process.env.NEXT_PUBLIC_API_URL,
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
})

applyRequestInterceptor(axiosInstance)
applyResponseInterceptor(axiosInstance)

export const accountMsClient = <T>(config: AxiosRequestConfig): Promise<T> => {
  return axiosInstance(config).then(({ data }) => data)
}

export { axiosInstance as accountMsAxios }
