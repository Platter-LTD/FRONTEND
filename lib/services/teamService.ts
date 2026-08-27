/**
 * Merchant Teams — staff, roles, invitations on the Plata account API.
 * Contract: merchant-scoped (no appId filter).
 */

import { getPlataApiBaseUrl } from "@/lib/plataApiBaseUrl"
import { getAccessToken } from "@/lib/cookieAuth"
import { BACKEND } from "@/lib/endpoints"
import type {
  PermissionCatalogItem,
  PermissionCatalogResponse,
} from "@/lib/teamPermissions"

const BASE = getPlataApiBaseUrl().replace(/\/+$/, "")

function authHeaders(includeAuth = true): HeadersInit {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (includeAuth && typeof window !== "undefined") {
    const token = getAccessToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }
  return headers
}

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>
  } catch {
    return {}
  }
}

function apiError(body: Record<string, unknown>, fallback: string): string {
  const base =
    String(body.error || "") ||
    String(body.message || "") ||
    String(body.details || "") ||
    fallback
  const required = Array.isArray(body.required)
    ? body.required.map(String).filter(Boolean)
    : []
  if (required.length) {
    return `${base} (requires: ${required.join(" or ")})`
  }
  return base
}

export type TeamMemberStatus = "active" | "pending" | "suspended" | "deactivated" | string

export interface TeamMember {
  id: string
  email: string
  first_name?: string
  last_name?: string
  user_type?: string
  status: TeamMemberStatus
  email_verified?: boolean
  phone_verified?: boolean
  user_merchant_id?: string
  country?: string
  role_id?: string | null
  roleName?: string | null
  created_at?: string
  updated_at?: string
  last_login_at?: string | null
  failed_login_attempts?: number
}

export interface MerchantRole {
  id: string
  name: string
  description?: string
  permissions: string[]
  merchant_id?: string
  created_at?: string
  updated_at?: string
}

export interface TeamInvitation {
  id: string
  email: string
  roleId: string
  merchantId?: string
  token?: string
  status: "pending" | "accepted" | "expired" | string
  expiresAt?: string
  createdAt?: string
  updatedAt?: string
}

export interface TeamApiResult<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

function normalizeMember(raw: Record<string, unknown>): TeamMember {
  return {
    id: String(raw.id ?? ""),
    email: String(raw.email ?? ""),
    first_name: raw.first_name != null ? String(raw.first_name) : undefined,
    last_name: raw.last_name != null ? String(raw.last_name) : undefined,
    user_type: raw.user_type != null ? String(raw.user_type) : undefined,
    status: String(raw.status ?? "active").toLowerCase(),
    email_verified: Boolean(raw.email_verified),
    phone_verified: Boolean(raw.phone_verified),
    user_merchant_id:
      raw.user_merchant_id != null ? String(raw.user_merchant_id) : undefined,
    country: raw.country != null ? String(raw.country) : undefined,
    role_id: raw.role_id != null ? String(raw.role_id) : null,
    roleName: raw.roleName != null ? String(raw.roleName) : null,
    created_at: raw.created_at != null ? String(raw.created_at) : undefined,
    updated_at: raw.updated_at != null ? String(raw.updated_at) : undefined,
    last_login_at: raw.last_login_at != null ? String(raw.last_login_at) : null,
    failed_login_attempts:
      typeof raw.failed_login_attempts === "number"
        ? raw.failed_login_attempts
        : undefined,
  }
}

function normalizeRole(raw: Record<string, unknown>): MerchantRole {
  const perms = Array.isArray(raw.permissions)
    ? raw.permissions.map((p) => String(p))
    : []
  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? ""),
    description: raw.description != null ? String(raw.description) : undefined,
    permissions: perms,
    merchant_id: raw.merchant_id != null ? String(raw.merchant_id) : undefined,
    created_at: raw.created_at != null ? String(raw.created_at) : undefined,
    updated_at: raw.updated_at != null ? String(raw.updated_at) : undefined,
  }
}

function normalizeInvitation(raw: Record<string, unknown>): TeamInvitation {
  return {
    id: String(raw.id ?? ""),
    email: String(raw.email ?? ""),
    roleId: String(raw.roleId ?? raw.role_id ?? ""),
    merchantId:
      raw.merchantId != null
        ? String(raw.merchantId)
        : raw.merchant_id != null
          ? String(raw.merchant_id)
          : undefined,
    token: raw.token != null ? String(raw.token) : undefined,
    status: String(raw.status ?? "pending").toLowerCase(),
    expiresAt:
      raw.expiresAt != null
        ? String(raw.expiresAt)
        : raw.expires_at != null
          ? String(raw.expires_at)
          : undefined,
    createdAt:
      raw.createdAt != null
        ? String(raw.createdAt)
        : raw.created_at != null
          ? String(raw.created_at)
          : undefined,
    updatedAt:
      raw.updatedAt != null
        ? String(raw.updatedAt)
        : raw.updated_at != null
          ? String(raw.updated_at)
          : undefined,
  }
}

export const teamApi = {
  async listMembers(): Promise<TeamApiResult<TeamMember[]>> {
    try {
      const res = await fetch(`${BASE}${BACKEND.team.members}`, {
        headers: authHeaders(),
      })
      const body = await parseJson(res)
      if (!res.ok || body.success === false) {
        return { success: false, error: apiError(body, `HTTP ${res.status}`) }
      }
      const data = body.data as Record<string, unknown> | undefined
      const rows = Array.isArray(data?.members)
        ? (data!.members as Record<string, unknown>[])
        : Array.isArray(body.members)
          ? (body.members as Record<string, unknown>[])
          : []
      return { success: true, data: rows.map(normalizeMember) }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  },

  async changeMemberRole(
    userId: string,
    roleId: string,
  ): Promise<TeamApiResult<TeamMember>> {
    try {
      const res = await fetch(`${BASE}${BACKEND.team.changeRole(userId)}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ roleId }),
      })
      const body = await parseJson(res)
      if (!res.ok || body.success === false) {
        return { success: false, error: apiError(body, `HTTP ${res.status}`) }
      }
      const data = body.data as Record<string, unknown> | undefined
      const member = (data?.member ?? body.member) as Record<string, unknown> | undefined
      return {
        success: true,
        data: member ? normalizeMember(member) : undefined,
        message: body.message != null ? String(body.message) : undefined,
      }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  },

  async suspendMember(userId: string): Promise<TeamApiResult<TeamMember>> {
    try {
      const res = await fetch(`${BASE}${BACKEND.team.suspend(userId)}`, {
        method: "PUT",
        headers: authHeaders(),
      })
      const body = await parseJson(res)
      if (!res.ok || body.success === false) {
        return { success: false, error: apiError(body, `HTTP ${res.status}`) }
      }
      const data = body.data as Record<string, unknown> | undefined
      const member = (data?.member ?? body.member) as Record<string, unknown> | undefined
      return {
        success: true,
        data: member ? normalizeMember(member) : undefined,
        message: body.message != null ? String(body.message) : undefined,
      }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  },

  async activateMember(userId: string): Promise<TeamApiResult<TeamMember>> {
    try {
      const res = await fetch(`${BASE}${BACKEND.team.activate(userId)}`, {
        method: "PUT",
        headers: authHeaders(),
      })
      const body = await parseJson(res)
      if (!res.ok || body.success === false) {
        return { success: false, error: apiError(body, `HTTP ${res.status}`) }
      }
      const data = body.data as Record<string, unknown> | undefined
      const member = (data?.member ?? body.member) as Record<string, unknown> | undefined
      return {
        success: true,
        data: member ? normalizeMember(member) : undefined,
        message: body.message != null ? String(body.message) : undefined,
      }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  },

  async listRoles(): Promise<TeamApiResult<MerchantRole[]>> {
    try {
      const res = await fetch(`${BASE}${BACKEND.roles.list}`, {
        headers: authHeaders(),
      })
      const body = await parseJson(res)
      if (!res.ok || body.success === false) {
        return { success: false, error: apiError(body, `HTTP ${res.status}`) }
      }
      const rows = Array.isArray(body.roles)
        ? (body.roles as Record<string, unknown>[])
        : Array.isArray((body.data as Record<string, unknown> | undefined)?.roles)
          ? ((body.data as Record<string, unknown>).roles as Record<string, unknown>[])
          : []
      return { success: true, data: rows.map(normalizeRole) }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  },

  async listPermissions(): Promise<TeamApiResult<PermissionCatalogResponse>> {
    try {
      const res = await fetch(`${BASE}${BACKEND.roles.permissions}`, {
        headers: authHeaders(),
      })
      const body = await parseJson(res)
      if (!res.ok || body.success === false) {
        return { success: false, error: apiError(body, `HTTP ${res.status}`) }
      }

      const catalogRaw = Array.isArray(body.catalog)
        ? body.catalog
        : Array.isArray((body.data as Record<string, unknown> | undefined)?.catalog)
          ? ((body.data as Record<string, unknown>).catalog as unknown[])
          : []

      const catalog: PermissionCatalogItem[] = catalogRaw
        .filter((row): row is Record<string, unknown> => !!row && typeof row === "object")
        .map((row) => ({
          code: String(row.code ?? ""),
          label: String(row.label ?? row.code ?? ""),
          category: String(row.category ?? "LEGACY"),
          primary: row.primary === true,
        }))
        .filter((row) => row.code)

      const permissions = Array.isArray(body.permissions)
        ? body.permissions.map(String)
        : Array.isArray((body.data as Record<string, unknown> | undefined)?.permissions)
          ? ((body.data as Record<string, unknown>).permissions as unknown[]).map(String)
          : catalog.map((c) => c.code)

      const primaryPermissions = Array.isArray(body.primaryPermissions)
        ? body.primaryPermissions.map(String)
        : catalog.filter((c) => c.primary).map((c) => c.code)

      // If API only returns a flat list (legacy), synthesize catalog entries.
      const resolvedCatalog =
        catalog.length > 0
          ? catalog
          : permissions.map((code) => ({
              code,
              label: code.replace(/_/g, " "),
              category: "LEGACY",
              primary: true,
            }))

      return {
        success: true,
        data: {
          permissions,
          primaryPermissions:
            primaryPermissions.length > 0
              ? primaryPermissions
              : resolvedCatalog.filter((c) => c.primary).map((c) => c.code),
          catalog: resolvedCatalog,
        },
      }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  },

  async ensureDefaultRoles(sync = false): Promise<TeamApiResult<MerchantRole[]>> {
    try {
      const res = await fetch(`${BASE}${BACKEND.roles.ensureDefaults}`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ sync }),
      })
      const body = await parseJson(res)
      if (!res.ok || body.success === false) {
        return { success: false, error: apiError(body, `HTTP ${res.status}`) }
      }
      const rows = Array.isArray(body.roles)
        ? (body.roles as Record<string, unknown>[])
        : Array.isArray((body.data as Record<string, unknown> | undefined)?.roles)
          ? ((body.data as Record<string, unknown>).roles as Record<string, unknown>[])
          : []
      return {
        success: true,
        data: rows.map(normalizeRole),
        message: body.message != null ? String(body.message) : undefined,
      }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  },

  async createRole(input: {
    name: string
    description?: string
    permissions: string[]
  }): Promise<TeamApiResult<MerchantRole>> {
    try {
      const res = await fetch(`${BASE}${BACKEND.roles.create}`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(input),
      })
      const body = await parseJson(res)
      if (!res.ok || body.success === false) {
        return { success: false, error: apiError(body, `HTTP ${res.status}`) }
      }
      const role = (body.role ??
        (body.data as Record<string, unknown> | undefined)?.role) as
        | Record<string, unknown>
        | undefined
      return {
        success: true,
        data: role ? normalizeRole(role) : undefined,
        message: body.message != null ? String(body.message) : undefined,
      }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  },

  async updateRole(
    roleId: string,
    input: { name?: string; description?: string; permissions?: string[] },
  ): Promise<TeamApiResult<MerchantRole>> {
    try {
      const res = await fetch(`${BASE}${BACKEND.roles.update(roleId)}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(input),
      })
      const body = await parseJson(res)
      if (!res.ok || body.success === false) {
        return { success: false, error: apiError(body, `HTTP ${res.status}`) }
      }
      const role = (body.role ??
        (body.data as Record<string, unknown> | undefined)?.role) as
        | Record<string, unknown>
        | undefined
      return {
        success: true,
        data: role ? normalizeRole(role) : undefined,
        message: body.message != null ? String(body.message) : undefined,
      }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  },

  async deleteRole(roleId: string): Promise<TeamApiResult<null>> {
    try {
      const res = await fetch(`${BASE}${BACKEND.roles.delete(roleId)}`, {
        method: "DELETE",
        headers: authHeaders(),
      })
      const body = await parseJson(res)
      if (!res.ok || body.success === false) {
        return { success: false, error: apiError(body, `HTTP ${res.status}`) }
      }
      return {
        success: true,
        message: body.message != null ? String(body.message) : undefined,
      }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  },

  async listInvitations(): Promise<TeamApiResult<TeamInvitation[]>> {
    try {
      const res = await fetch(`${BASE}${BACKEND.invitations.list}`, {
        headers: authHeaders(),
      })
      const body = await parseJson(res)
      if (!res.ok || body.success === false) {
        return { success: false, error: apiError(body, `HTTP ${res.status}`) }
      }
      const data = body.data as Record<string, unknown> | undefined
      const rows = Array.isArray(data?.invitations)
        ? (data!.invitations as Record<string, unknown>[])
        : Array.isArray(body.invitations)
          ? (body.invitations as Record<string, unknown>[])
          : []
      return { success: true, data: rows.map(normalizeInvitation) }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  },

  async createInvitation(input: {
    email: string
    roleId: string
  }): Promise<TeamApiResult<TeamInvitation>> {
    try {
      const res = await fetch(`${BASE}${BACKEND.invitations.create}`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(input),
      })
      const body = await parseJson(res)
      if (!res.ok || body.success === false) {
        return { success: false, error: apiError(body, `HTTP ${res.status}`) }
      }
      const data = body.data as Record<string, unknown> | undefined
      const invitation = (data?.invitation ?? body.invitation) as
        | Record<string, unknown>
        | undefined
      return {
        success: true,
        data: invitation ? normalizeInvitation(invitation) : undefined,
        message: body.message != null ? String(body.message) : undefined,
      }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  },

  /** Public — no Bearer */
  async validateInvitation(
    token: string,
  ): Promise<TeamApiResult<TeamInvitation & { roleName?: string }>> {
    try {
      const res = await fetch(`${BASE}${BACKEND.invitations.validate(token)}`, {
        headers: authHeaders(false),
      })
      const body = await parseJson(res)
      if (!res.ok || body.success === false) {
        return { success: false, error: apiError(body, `HTTP ${res.status}`) }
      }
      const invitation = (body.invitation ??
        (body.data as Record<string, unknown> | undefined)?.invitation ??
        body.data) as Record<string, unknown> | undefined
      if (!invitation || typeof invitation !== "object") {
        return { success: true, data: undefined }
      }
      return {
        success: true,
        data: {
          ...normalizeInvitation(invitation),
          roleName:
            invitation.roleName != null
              ? String(invitation.roleName)
              : invitation.role_name != null
                ? String(invitation.role_name)
                : undefined,
        },
      }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  },

  /** Public — no Bearer */
  async acceptInvitation(input: {
    token: string
    firstName: string
    lastName: string
    password: string
  }): Promise<TeamApiResult<{ id: string; email: string }>> {
    try {
      const res = await fetch(`${BASE}${BACKEND.invitations.accept}`, {
        method: "POST",
        headers: authHeaders(false),
        body: JSON.stringify(input),
      })
      const body = await parseJson(res)
      if (!res.ok || body.success === false) {
        return { success: false, error: apiError(body, `HTTP ${res.status}`) }
      }
      const data = body.data as Record<string, unknown> | undefined
      const user = (data?.user ?? body.user) as Record<string, unknown> | undefined
      return {
        success: true,
        data: user
          ? {
              id: String(user.id ?? ""),
              email: String(user.email ?? ""),
            }
          : undefined,
        message: body.message != null ? String(body.message) : undefined,
      }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  },
}

/** Staff row used by Add Staff / Manage Role tables (members + pending invites). */
export type StaffTableRow = {
  id: string
  kind: "member" | "invitation"
  name: string
  role: string
  roleId?: string | null
  email: string
  lastLogin: string
  status: "Active" | "Pending" | "Suspended"
}

export function memberDisplayName(m: TeamMember): string {
  const first = (m.first_name || "").trim()
  const last = (m.last_name || "").trim()
  if (first || last) return `${first} ${last}`.trim()
  return m.email || "—"
}

export function formatLastLogin(value?: string | null): string {
  if (!value) return "—"
  try {
    return new Date(value).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  } catch {
    return value
  }
}

export function statusBadgeLabel(
  status: string,
): "Active" | "Pending" | "Suspended" {
  const s = status.toLowerCase()
  if (s === "suspended") return "Suspended"
  if (s === "pending") return "Pending"
  return "Active"
}

export function mergeStaffTableRows(
  members: TeamMember[],
  invitations: TeamInvitation[],
  roles: MerchantRole[],
): StaffTableRow[] {
  const roleNameById = new Map(roles.map((r) => [r.id, r.name]))
  const memberEmails = new Set(
    members.map((m) => m.email.trim().toLowerCase()).filter(Boolean),
  )

  const memberRows: StaffTableRow[] = members.map((m) => ({
    id: m.id,
    kind: "member",
    name: memberDisplayName(m),
    role: m.roleName || (m.role_id ? roleNameById.get(m.role_id) : undefined) || "—",
    roleId: m.role_id,
    email: m.email,
    lastLogin: formatLastLogin(m.last_login_at),
    status: statusBadgeLabel(m.status),
  }))

  const pendingInviteRows: StaffTableRow[] = invitations
    .filter((inv) => inv.status === "pending")
    .filter((inv) => !memberEmails.has(inv.email.trim().toLowerCase()))
    .map((inv) => ({
      id: `inv:${inv.id}`,
      kind: "invitation" as const,
      name: inv.email.split("@")[0] || inv.email,
      role: roleNameById.get(inv.roleId) || "—",
      roleId: inv.roleId,
      email: inv.email,
      lastLogin: "—",
      status: "Pending" as const,
    }))

  return [...memberRows, ...pendingInviteRows]
}

export function staffCounts(rows: StaffTableRow[]) {
  const total = rows.length
  const active = rows.filter((r) => r.status === "Active").length
  const inactive = rows.filter(
    (r) => r.status === "Pending" || r.status === "Suspended",
  ).length
  return { total, active, inactive }
}
