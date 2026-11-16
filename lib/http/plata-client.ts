import Axios, { type AxiosRequestConfig } from "axios"
import { applyRequestInterceptor, applyResponseInterceptor } from "./interceptors"

/**
 * Single axios instance for the Plata gateway (account-ms-plata), which routes
 * /api/v1/* to every backend microservice. Used as orval's mutator for specs/plata.json.
 */
const axiosInstance = Axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
})

applyRequestInterceptor(axiosInstance)
applyResponseInterceptor(axiosInstance)

export const plataClient = <T>(config: AxiosRequestConfig): Promise<T> => {
  return axiosInstance(config).then(({ data }) => data)
}

export { axiosInstance as plataAxios }
