/**
 * Role permission catalog helpers + Teams RBAC gating (Plata).
 * Prefer labels from GET /api/v1/roles/permissions → `catalog`.
 */

export type PermissionCatalogItem = {
  code: string
  label: string
  category: string
  primary: boolean
}

export type PermissionCatalogResponse = {
  permissions: string[]
  primaryPermissions: string[]
  catalog: PermissionCatalogItem[]
}

/** Protected standard role names — cannot be deleted. */
export const STANDARD_ROLE_NAMES = ["Admin", "Manager", "Support Staff"] as const

export function isStandardRoleName(name?: string | null): boolean {
  const n = String(name || "").trim()
  return STANDARD_ROLE_NAMES.some((s) => s.toLowerCase() === n.toLowerCase())
}

const CATEGORY_LABELS: Record<string, string> = {
  APPLICATIONS: "Applications",
  PRODUCTS: "Products",
  FEES_AND_CHARGES: "Fees & charges",
  WALLET_AND_LEDGER: "Wallet & ledger",
  PAYOUTS_AND_SETTLEMENTS: "Payouts & settlements",
  FI_PARTNER_MANAGEMENT: "FI partner management",
  USER_AND_TEAM_MANAGEMENT: "User & team management",
  COMPLIANCE_AND_KYC: "Compliance & KYC",
  INTEGRATIONS_AND_SYSTEM_SETTINGS: "Integrations & system settings",
  REPORTS_AND_ANALYTICS: "Reports & analytics",
  SUPPORT_AND_TICKETS: "Support & tickets",
  AUDIT_LOGS: "Audit logs",
  LEGACY: "Legacy",
}

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] || category.replace(/_/g, " ")
}

/** Fallback when catalog has not loaded yet. */
const LEGACY_PERMISSION_LABELS: Record<string, string> = {
  create_admin: "Create / invite admin (legacy)",
  edit_products: "Edit products",
  create_products: "Create products",
  view_products: "View products",
  change_password: "Change password",
  see_billing: "See billing",
  add_payment_method: "Add payment method",
  edit_payment_method: "Edit payment method",
  create_app: "Create app",
  see_activity_log: "See activity log",
  download_report: "Download report",
  invite_team_members: "Invite team members",
  assign_user_roles: "Assign user roles",
  deactivate_user: "Deactivate / suspend user",
  manage_system_settings: "Manage system settings",
  view_user_activity_logs: "View user activity logs",
}

export function permissionLabel(
  code: string,
  catalog?: PermissionCatalogItem[] | null,
): string {
  const fromCatalog = catalog?.find((c) => c.code === code)?.label
  if (fromCatalog) return fromCatalog
  return LEGACY_PERMISSION_LABELS[code] || code.replace(/_/g, " ")
}

/** Primary-only catalog entries for Create Role, grouped by category. */
export function groupPrimaryPermissions(
  catalog: PermissionCatalogItem[],
): { category: string; label: string; items: PermissionCatalogItem[] }[] {
  const primary = catalog.filter((c) => c.primary)
  const order = Object.keys(CATEGORY_LABELS).filter((c) => c !== "LEGACY")
  const byCat = new Map<string, PermissionCatalogItem[]>()
  for (const item of primary) {
    const list = byCat.get(item.category) || []
    list.push(item)
    byCat.set(item.category, list)
  }
  const groups: { category: string; label: string; items: PermissionCatalogItem[] }[] = []
  for (const cat of order) {
    const items = byCat.get(cat)
    if (items?.length) groups.push({ category: cat, label: categoryLabel(cat), items })
  }
  for (const [cat, items] of byCat) {
    if (order.includes(cat) || cat === "LEGACY") continue
    groups.push({ category: cat, label: categoryLabel(cat), items })
  }
  return groups
}

// ─── Session permissions (from login `permissions[]`) ─────────────────────────

const SESSION_PERMISSIONS_KEY = "plata.sessionPermissions"

export function saveSessionPermissions(permissions: string[]): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(SESSION_PERMISSIONS_KEY, JSON.stringify(permissions))
  } catch {
    /* ignore quota */
  }
}

export function clearSessionPermissions(): void {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(SESSION_PERMISSIONS_KEY)
  } catch {
    /* ignore */
  }
}

export function getSessionPermissions(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(SESSION_PERMISSIONS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

/**
 * Owners / admins typically receive the full catalog from login.
 * If we have no stored list yet, allow UI actions (backend still enforces).
 */
export function hasAnyPermission(
  required: string[],
  sessionPermissions?: string[] | null,
): boolean {
  const perms = sessionPermissions ?? getSessionPermissions()
  if (!perms.length) return true
  return required.some((code) => perms.includes(code))
}

export const TEAM_PERMISSIONS = {
  invite: ["invite_team_members"],
  listInvites: ["invite_team_members", "assign_user_roles", "view_user_activity_logs"],
  listMembers: [
    "invite_team_members",
    "assign_user_roles",
    "deactivate_user",
    "view_user_activity_logs",
  ],
  changeRole: ["assign_user_roles"],
  suspendActivate: ["deactivate_user"],
  manageRoles: ["assign_user_roles", "manage_system_settings"],
  ensureDefaults: [
    "assign_user_roles",
    "invite_team_members",
    "manage_system_settings",
  ],
} as const
