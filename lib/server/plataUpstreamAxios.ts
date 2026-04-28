import axios from "axios"
import dns from "dns"
import https from "https"
import { getPlataApiBaseUrl } from "@/lib/plataApiBaseUrl"

/** Shared agent for all outbound Plata calls from route handlers (IPv4 → fewer Fly.io timeouts). */
export const plataUpstreamHttpsAgent = new https.Agent({
  keepAlive: true,
  family: 4,
  // @ts-ignore Node lookup signature compatibility
  lookup: (hostname: string, _options: unknown, cb: (err: NodeJS.ErrnoException | null, address: string, family: number) => void) =>
    dns.lookup(hostname, { family: 4 }, cb),
})

const baseURL = getPlataApiBaseUrl().replace(/\/+$/, "")

/**
 * Server-side Plata API client. Prefer over `fetch` for outbound calls from Next route handlers:
 * Node's default `fetch` can hit IPv6 / routing issues and `ETIMEDOUT` to Fly.io; forcing IPv4 matches
 * `app/api/compliance/[...path]/route.ts` and product proxies.
 */
export const plataUpstreamAxios = axios.create({
  baseURL,
  timeout: 45_000,
  httpsAgent: plataUpstreamHttpsAgent,
  validateStatus: () => true,
  headers: { "Content-Type": "application/json" },
})

/** Same IPv4 agent as {@link plataUpstreamAxios}; no default JSON Content-Type (for multipart uploads). */
export const plataUpstreamMultipartAxios = axios.create({
  baseURL,
  timeout: 120_000,
  httpsAgent: plataUpstreamHttpsAgent,
  validateStatus: () => true,
  maxBodyLength: Infinity,
  maxContentLength: Infinity,
})
