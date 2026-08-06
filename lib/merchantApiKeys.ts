import { getAccessToken } from "@/lib/cookieAuth"
import { fetchWithAuth } from "@/lib/fetchWithAuth"
import { handleSessionExpired, isInvalidOrExpiredTokenError } from "@/lib/plataAuthFetch"

export type ApiKeyEnvironment = "test" | "live"
export type ApiKeyStatus = "active" | "revoked" | "expired" | string

export interface MerchantApiKey {
  id: string
  merchant_id?: string
  name: string
  public_key: string
  secret_key: string
  environment: ApiKeyEnvironment | string
  status: ApiKeyStatus
  permissions?: string[]
  created_at?: string | null
  updated_at?: string | null
  expires_at?: string | null
  last_used_at?: string | null
}

export interface CreateApiKeyInput {
  name?: string
  environment?: ApiKeyEnvironment
  permissions?: string[]
  /** Omit for non-expiring keys (preferred for integrator keys). */
  expires_in_days?: number
}

export interface CreateApiKeyResult {
  apiKey: MerchantApiKey
  secretKey: string
}

export class MerchantApiKeysError extends Error {
  status: number
  retryAfterSec: number | null

  constructor(message: string, status: number, retryAfterSec: number | null = null) {
    super(message)
    this.name = "MerchantApiKeysError"
    this.status = status
    this.retryAfterSec = retryAfterSec
  }
}

const LIST_CACHE_TTL_MS = 30_000
const MAX_RETRIES = 3

let listCache: { at: number; keys: MerchantApiKey[] } | null = null
let listInflight: Promise<MerchantApiKey[]> | null = null

function authHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? getAccessToken() : null
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function parseRetryAfter(res: Response, data: unknown): number | null {
  const header = res.headers.get("retry-after")
  if (header) {
    const asNum = Number(header)
    if (Number.isFinite(asNum) && asNum >= 0) return Math.ceil(asNum)
    const asDate = Date.parse(header)
    if (!Number.isNaN(asDate)) {
      return Math.max(1, Math.ceil((asDate - Date.now()) / 1000))
    }
  }
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>
    const raw = d.retryAfter ?? d.retry_after ?? d.retryAfterSeconds
    const n = Number(raw)
    if (Number.isFinite(n) && n >= 0) return Math.ceil(n)
  }
  return null
}

function errorMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback
  const d = data as Record<string, unknown>
  const details = d.details
  const error = d.error
  const message = d.message
  if (typeof details === "string" && details.trim()) return details
  if (typeof error === "string" && error.trim()) return error
  if (typeof message === "string" && message.trim()) return message
  return fallback
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchKeysApi(
  input: string,
  init: RequestInit,
  fallbackError: string,
): Promise<{ res: Response; json: unknown }> {
  let attempt = 0
  while (true) {
    const res = await fetchWithAuth(input, {
      ...init,
      credentials: "include",
      headers: {
        ...authHeaders(),
        ...(init.headers || {}),
      },
    })
    const json = await res.json().catch(() => ({}))

    if (res.status === 401 || isInvalidOrExpiredTokenError(json)) {
      await handleSessionExpired()
    }

    if (res.status !== 429) {
      if (!res.ok) {
        throw new MerchantApiKeysError(
          errorMessage(json, `${fallbackError} (${res.status})`),
          res.status,
        )
      }
      return { res, json }
    }

    attempt += 1
    const retryAfter = parseRetryAfter(res, json) ?? Math.min(8, 2 ** attempt)
    if (attempt > MAX_RETRIES) {
      throw new MerchantApiKeysError(
        `Rate limited by the API gateway. Please wait ${retryAfter}s and try again.`,
        429,
        retryAfter,
      )
    }
    await sleep(retryAfter * 1000)
  }
}

function normalizeKey(raw: Record<string, unknown>): MerchantApiKey {
  return {
    id: String(raw.id ?? raw._id ?? ""),
    merchant_id: raw.merchant_id != null ? String(raw.merchant_id) : undefined,
    name: String(raw.name ?? ""),
    public_key: String(raw.public_key ?? raw.publicKey ?? ""),
    secret_key: String(raw.secret_key ?? raw.secretKey ?? ""),
    environment: String(raw.environment ?? raw.env ?? "live") as ApiKeyEnvironment,
    status: String(raw.status ?? "active"),
    permissions: Array.isArray(raw.permissions) ? (raw.permissions as string[]) : undefined,
    created_at: (raw.created_at ?? raw.createdAt ?? null) as string | null,
    updated_at: (raw.updated_at ?? raw.updatedAt ?? null) as string | null,
    expires_at: (raw.expires_at ?? raw.expiresAt ?? null) as string | null,
    last_used_at: (raw.last_used_at ?? raw.lastUsedAt ?? null) as string | null,
  }
}

function parseListPayload(json: unknown): MerchantApiKey[] {
  const root = (json ?? {}) as Record<string, unknown>
  const data = (root.data ?? root) as Record<string, unknown> | unknown[]
  let list: unknown[] = []
  if (Array.isArray(data)) {
    list = data
  } else if (data && typeof data === "object" && Array.isArray((data as Record<string, unknown>).apiKeys)) {
    list = (data as Record<string, unknown>).apiKeys as unknown[]
  }
  return list
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map(normalizeKey)
    .filter((k) => k.id)
}

export function invalidateMerchantApiKeysCache() {
  listCache = null
}

export async function listMerchantApiKeys(options?: { force?: boolean }): Promise<MerchantApiKey[]> {
  const force = !!options?.force
  if (!force && listCache && Date.now() - listCache.at < LIST_CACHE_TTL_MS) {
    return listCache.keys
  }
  if (!force && listInflight) {
    return listInflight
  }

  const run = (async () => {
    const { json } = await fetchKeysApi(
      "/api/v1/keys",
      { method: "GET", cache: "no-store" },
      "Failed to load API keys",
    )
    const keys = parseListPayload(json)
    listCache = { at: Date.now(), keys }
    return keys
  })()

  listInflight = run
  try {
    return await run
  } finally {
    if (listInflight === run) listInflight = null
  }
}

export async function createMerchantApiKey(input: CreateApiKeyInput): Promise<CreateApiKeyResult> {
  const body: Record<string, unknown> = {}
  const name = input.name?.trim()
  if (name) body.name = name
  if (input.environment) body.environment = input.environment
  if (input.permissions?.length) body.permissions = input.permissions
  if (typeof input.expires_in_days === "number" && Number.isFinite(input.expires_in_days)) {
    body.expires_in_days = input.expires_in_days
  }

  const { json } = await fetchKeysApi(
    "/api/v1/keys",
    { method: "POST", body: JSON.stringify(body) },
    "Failed to create API key",
  )

  const root = json as Record<string, unknown>
  const data = (root.data ?? {}) as Record<string, unknown>
  const apiKeyRaw = (data.apiKey ?? data) as Record<string, unknown>
  const apiKey = normalizeKey(apiKeyRaw)
  const secretKey = String(data.secretKey ?? apiKey.secret_key ?? "").trim()
  if (secretKey && !apiKey.secret_key) apiKey.secret_key = secretKey

  if (!apiKey.id) {
    throw new MerchantApiKeysError("API key created but response was incomplete", 502)
  }

  invalidateMerchantApiKeysCache()
  return { apiKey, secretKey: secretKey || apiKey.secret_key }
}

export async function revokeMerchantApiKey(keyId: string): Promise<void> {
  await fetchKeysApi(
    `/api/v1/keys/${encodeURIComponent(keyId)}`,
    { method: "DELETE" },
    "Failed to revoke API key",
  )
  invalidateMerchantApiKeysCache()
}

export function formatApiKeyDate(raw: unknown): string {
  if (raw == null || raw === "") return "—"
  const d = new Date(String(raw))
  if (Number.isNaN(d.getTime())) return String(raw)
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

export function maskSecret(value: string): string {
  const v = value.trim()
  if (!v) return "—"
  if (v.length <= 12) return "•".repeat(Math.max(v.length, 8))
  return `${v.slice(0, 8)}${"•".repeat(20)}${v.slice(-4)}`
}
