/**
 * Plata Treasury & Settlements console — merchant dashboard APIs.
 * Gateway: /api/v1/frontend-plata/treasury/*
 */

import { getPlataApiBaseUrl } from "@/lib/plataApiBaseUrl"
import { getAccessToken } from "@/lib/cookieAuth"
import { BACKEND } from "@/lib/endpoints"

const BASE = getPlataApiBaseUrl().replace(/\/+$/, "")

export type SettlementType = "investments" | "commodities" | "savings"
export type SettlementMode = "manual" | "automatic"

export type TreasuryPayoutRow = {
  id: string
  reference: string
  applicationId?: string
  userId?: string
  productId?: string
  productName?: string
  customerName: string
  principal?: number
  returnAmount?: number
  amount: number
  requestedOn?: string
  maturity?: string
  requestingFrom?: string
  status: string
}

export type ApproveBatchResult = {
  paidCount: number
  blockedCount: number
  paid: Array<{ reference: string; amount: number; userId?: string }>
  blocked: Array<{ reference: string; amount: number; reason?: string }>
  treasuryBalanceAfter?: number | null
  revertedToManual?: boolean | null
}

export type SettlementModeState = {
  mode: SettlementMode
  revertedToManual?: boolean
}

type ApiResult<T> = { success: true; data?: T; message?: string } | { success: false; error: string }

function authHeaders(): HeadersInit {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (typeof window !== "undefined") {
    const token = getAccessToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }
  return headers
}

function getFetchOpts(): RequestInit {
  return { headers: authHeaders(), cache: "no-store" }
}

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>
  } catch {
    return {}
  }
}

function apiError(body: Record<string, unknown>, fallback: string): string {
  return (
    String(body.error || "") ||
    String(body.message || "") ||
    String(body.details || "") ||
    fallback
  )
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function num(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value)
  return Number.isFinite(n) ? n : fallback
}

function str(value: unknown, fallback = ""): string {
  if (value == null) return fallback
  return String(value)
}

function normalizePayoutRow(raw: Record<string, unknown>): TreasuryPayoutRow {
  const principal = raw.principal != null ? num(raw.principal) : undefined
  const returnAmount =
    raw.returnAmount != null
      ? num(raw.returnAmount)
      : raw.return_amount != null
        ? num(raw.return_amount)
        : undefined
  const amount =
    raw.amount != null
      ? num(raw.amount)
      : (principal ?? 0) + (returnAmount ?? 0)

  return {
    id: str(raw.id || raw.reference),
    reference: str(raw.reference || raw.id),
    applicationId: raw.applicationId != null ? str(raw.applicationId) : undefined,
    userId: raw.userId != null ? str(raw.userId) : undefined,
    productId: raw.productId != null ? str(raw.productId) : undefined,
    productName: raw.productName != null ? str(raw.productName) : undefined,
    customerName: str(raw.customerName || raw.customer || "Customer"),
    principal,
    returnAmount,
    amount,
    requestedOn:
      raw.requestedOn != null
        ? str(raw.requestedOn)
        : raw.requested_on != null
          ? str(raw.requested_on)
          : undefined,
    maturity: raw.maturity != null ? str(raw.maturity) : undefined,
    requestingFrom:
      raw.requestingFrom != null
        ? str(raw.requestingFrom)
        : raw.requesting_from != null
          ? str(raw.requesting_from)
          : undefined,
    status: str(raw.status || "pending").toLowerCase(),
  }
}

function unwrapItems(body: Record<string, unknown>): TreasuryPayoutRow[] {
  const data = asRecord(body.data) ?? body
  const items = data.items ?? data.rows ?? data.list
  if (!Array.isArray(items)) return []
  return items
    .map((row) => asRecord(row))
    .filter((row): row is Record<string, unknown> => Boolean(row))
    .map(normalizePayoutRow)
}

function unwrapApprove(body: Record<string, unknown>): ApproveBatchResult {
  const data = asRecord(body.data) ?? body
  const paid = Array.isArray(data.paid)
    ? data.paid
        .map((row) => asRecord(row))
        .filter((row): row is Record<string, unknown> => Boolean(row))
        .map((row) => ({
          reference: str(row.reference),
          amount: num(row.amount),
          userId: row.userId != null ? str(row.userId) : undefined,
        }))
    : []
  const blocked = Array.isArray(data.blocked)
    ? data.blocked
        .map((row) => asRecord(row))
        .filter((row): row is Record<string, unknown> => Boolean(row))
        .map((row) => ({
          reference: str(row.reference),
          amount: num(row.amount),
          reason: row.reason != null ? str(row.reason) : undefined,
        }))
    : []
  return {
    paidCount: num(data.paidCount, paid.length),
    blockedCount: num(data.blockedCount, blocked.length),
    paid,
    blocked,
    treasuryBalanceAfter:
      data.treasuryBalanceAfter == null ? null : num(data.treasuryBalanceAfter),
    revertedToManual:
      data.revertedToManual == null ? null : Boolean(data.revertedToManual),
  }
}

function unwrapMode(body: Record<string, unknown>): SettlementModeState {
  const data = asRecord(body.data) ?? body
  const modeRaw = str(data.mode || "manual").toLowerCase()
  return {
    mode: modeRaw === "automatic" ? "automatic" : "manual",
    revertedToManual: Boolean(data.revertedToManual),
  }
}

function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === "") continue
    sp.set(k, String(v))
  }
  const s = sp.toString()
  return s ? `?${s}` : ""
}

export const treasuryConsoleApi = {
  async listWithdrawals(
    appId: string,
    limit = 50,
  ): Promise<ApiResult<{ items: TreasuryPayoutRow[] }>> {
    try {
      const res = await fetch(
        `${BASE}${BACKEND.treasuryConsole.withdrawals}${qs({ appId, limit })}`,
        getFetchOpts(),
      )
      const body = await parseJson(res)
      if (!res.ok || body.success === false) {
        return { success: false, error: apiError(body, `HTTP ${res.status}`) }
      }
      return { success: true, data: { items: unwrapItems(body) } }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  },

  async approveWithdrawals(
    appId: string,
    references: string[],
  ): Promise<ApiResult<ApproveBatchResult>> {
    try {
      const res = await fetch(`${BASE}${BACKEND.treasuryConsole.withdrawalsApprove}`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ appId, references }),
      })
      const body = await parseJson(res)
      if (!res.ok || body.success === false) {
        return { success: false, error: apiError(body, `HTTP ${res.status}`) }
      }
      return { success: true, data: unwrapApprove(body) }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  },

  async listSettlements(
    appId: string,
    settlementType: SettlementType,
    limit = 50,
  ): Promise<ApiResult<{ items: TreasuryPayoutRow[] }>> {
    try {
      const res = await fetch(
        `${BASE}${BACKEND.treasuryConsole.settlements(settlementType)}${qs({ appId, limit })}`,
        getFetchOpts(),
      )
      const body = await parseJson(res)
      if (!res.ok || body.success === false) {
        return { success: false, error: apiError(body, `HTTP ${res.status}`) }
      }
      return { success: true, data: { items: unwrapItems(body) } }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  },

  async getSettlementMode(
    appId: string,
    settlementType: SettlementType,
  ): Promise<ApiResult<SettlementModeState>> {
    try {
      const res = await fetch(
        `${BASE}${BACKEND.treasuryConsole.settlementsMode(settlementType)}${qs({ appId })}`,
        getFetchOpts(),
      )
      const body = await parseJson(res)
      if (!res.ok || body.success === false) {
        return { success: false, error: apiError(body, `HTTP ${res.status}`) }
      }
      return { success: true, data: unwrapMode(body) }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  },

  async setSettlementMode(
    appId: string,
    settlementType: SettlementType,
    mode: SettlementMode,
  ): Promise<ApiResult<SettlementModeState & Partial<ApproveBatchResult>>> {
    try {
      const res = await fetch(`${BASE}${BACKEND.treasuryConsole.settlementsMode(settlementType)}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ appId, mode }),
      })
      const body = await parseJson(res)
      if (!res.ok || body.success === false) {
        return { success: false, error: apiError(body, `HTTP ${res.status}`) }
      }
      const data = asRecord(body.data) ?? body
      if (data.paidCount != null || Array.isArray(data.paid) || data.blockedCount != null) {
        const batch = unwrapApprove(body)
        return {
          success: true,
          data: {
            ...batch,
            mode: batch.revertedToManual ? "manual" : mode,
            revertedToManual: Boolean(batch.revertedToManual),
            treasuryBalanceAfter: batch.treasuryBalanceAfter ?? undefined,
          },
        }
      }
      return { success: true, data: unwrapMode(body) }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  },

  async approveSettlements(
    appId: string,
    settlementType: SettlementType,
    references: string[],
  ): Promise<ApiResult<ApproveBatchResult>> {
    try {
      const res = await fetch(
        `${BASE}${BACKEND.treasuryConsole.settlementsApprove(settlementType)}`,
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ appId, references }),
        },
      )
      const body = await parseJson(res)
      if (!res.ok || body.success === false) {
        return { success: false, error: apiError(body, `HTTP ${res.status}`) }
      }
      return { success: true, data: unwrapApprove(body) }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  },
}
