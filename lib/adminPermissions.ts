/**
 * Admin role capability matrix (Plata Roles & Permissions spreadsheet).
 * Admin access = Yes for every row below. Gate UI with `usePermissions().can(code)`.
 * Prefer live codes from GET /api/v1/roles/permissions when available.
 */

export type AdminPermissionCategory =
  | "APPLICATIONS"
  | "PRODUCTS"
  | "FEES_AND_CHARGES"
  | "WALLET_AND_LEDGER"
  | "PAYOUTS_AND_SETTLEMENTS"
  | "FI_PARTNER_MANAGEMENT"
  | "USER_AND_TEAM_MANAGEMENT"
  | "COMPLIANCE_AND_KYC"
  | "INTEGRATIONS_AND_SYSTEM_SETTINGS"
  | "REPORTS_AND_ANALYTICS"
  | "SUPPORT_AND_TICKETS"
  | "AUDIT_LOGS"

export type AdminPermissionDef = {
  code: string
  label: string
  category: AdminPermissionCategory
  /** Alternate codes the API may still emit (legacy / plural forms). */
  aliases?: string[]
}

/** All 46 primary Admin permissions from the Admin matrix (full access). */
export const ADMIN_PERMISSIONS: AdminPermissionDef[] = [
  // APPLICATIONS
  { code: "view_applications", label: "View applications", category: "APPLICATIONS" },
  { code: "create_application", label: "Create new application", category: "APPLICATIONS", aliases: ["create_app"] },
  { code: "edit_application", label: "Edit application details", category: "APPLICATIONS" },
  { code: "publish_application", label: "Publish / go-live an application", category: "APPLICATIONS" },
  { code: "archive_application", label: "Archive or delete an application", category: "APPLICATIONS" },

  // PRODUCTS
  { code: "view_products", label: "View products", category: "PRODUCTS" },
  {
    code: "create_product",
    label: "Create new product",
    category: "PRODUCTS",
    aliases: ["create_products"],
  },
  {
    code: "edit_product",
    label: "Edit product configuration",
    category: "PRODUCTS",
    aliases: ["edit_products"],
  },
  { code: "publish_product", label: "Publish / activate a product", category: "PRODUCTS" },
  { code: "archive_product", label: "Archive / deactivate a product", category: "PRODUCTS" },
  {
    code: "approve_product_pricing",
    label: "Approve pricing or fee changes on a live product",
    category: "PRODUCTS",
  },

  // FEES & CHARGES
  { code: "view_fee_structures", label: "View fee structures", category: "FEES_AND_CHARGES" },
  { code: "edit_fee_structures", label: "Create / edit fee structures", category: "FEES_AND_CHARGES" },
  {
    code: "approve_fee_structures",
    label: "Approve fee structure changes",
    category: "FEES_AND_CHARGES",
  },

  // WALLET & LEDGER
  { code: "view_wallet_balances", label: "View wallet balances", category: "WALLET_AND_LEDGER" },
  {
    code: "view_transaction_ledger",
    label: "View transaction ledger",
    category: "WALLET_AND_LEDGER",
  },
  { code: "reconcile_ledger", label: "Reconcile ledger entries", category: "WALLET_AND_LEDGER" },
  {
    code: "flag_ledger_discrepancies",
    label: "Flag / raise ledger discrepancies",
    category: "WALLET_AND_LEDGER",
  },

  // PAYOUTS & SETTLEMENTS
  { code: "view_payout_history", label: "View payout history", category: "PAYOUTS_AND_SETTLEMENTS" },
  { code: "initiate_payout", label: "Initiate a payout", category: "PAYOUTS_AND_SETTLEMENTS" },
  { code: "approve_payout", label: "Approve a payout", category: "PAYOUTS_AND_SETTLEMENTS" },

  // FI / PARTNER MANAGEMENT
  {
    code: "view_fi_partners",
    label: "View FI / partner relationships",
    category: "FI_PARTNER_MANAGEMENT",
  },
  {
    code: "onboard_fi_partner",
    label: "Onboard a new FI / partner",
    category: "FI_PARTNER_MANAGEMENT",
  },
  { code: "edit_fi_sla", label: "Edit FI SLA terms", category: "FI_PARTNER_MANAGEMENT" },
  { code: "suspend_fi_partner", label: "Suspend an FI / partner", category: "FI_PARTNER_MANAGEMENT" },

  // USER & TEAM MANAGEMENT
  {
    code: "invite_team_members",
    label: "Invite new team members",
    category: "USER_AND_TEAM_MANAGEMENT",
    aliases: ["create_admin"],
  },
  {
    code: "assign_user_roles",
    label: "Assign or change user roles",
    category: "USER_AND_TEAM_MANAGEMENT",
  },
  {
    code: "deactivate_user",
    label: "Deactivate a user",
    category: "USER_AND_TEAM_MANAGEMENT",
  },
  {
    code: "view_user_activity_logs",
    label: "View user activity logs",
    category: "USER_AND_TEAM_MANAGEMENT",
    aliases: ["see_activity_log"],
  },

  // COMPLIANCE & KYC
  { code: "view_kyc_status", label: "View KYC status", category: "COMPLIANCE_AND_KYC" },
  {
    code: "approve_kyc",
    label: "Approve / reject KYC submissions",
    category: "COMPLIANCE_AND_KYC",
  },
  {
    code: "view_compliance_dashboard",
    label: "View compliance dashboard",
    category: "COMPLIANCE_AND_KYC",
  },
  {
    code: "export_compliance_reports",
    label: "Export compliance reports",
    category: "COMPLIANCE_AND_KYC",
  },

  // INTEGRATIONS & SYSTEM SETTINGS
  {
    code: "manage_api_keys",
    label: "Manage API keys",
    category: "INTEGRATIONS_AND_SYSTEM_SETTINGS",
  },
  {
    code: "configure_airsign",
    label: "Configure AirSign integration",
    category: "INTEGRATIONS_AND_SYSTEM_SETTINGS",
  },
  {
    code: "configure_webhooks",
    label: "Configure webhooks",
    category: "INTEGRATIONS_AND_SYSTEM_SETTINGS",
  },
  {
    code: "manage_system_settings",
    label: "Manage general system settings",
    category: "INTEGRATIONS_AND_SYSTEM_SETTINGS",
  },

  // REPORTS & ANALYTICS
  {
    code: "view_reports",
    label: "View standard reports",
    category: "REPORTS_AND_ANALYTICS",
    aliases: ["download_report"],
  },
  { code: "export_reports", label: "Export reports", category: "REPORTS_AND_ANALYTICS" },
  {
    code: "create_custom_reports",
    label: "Create custom reports",
    category: "REPORTS_AND_ANALYTICS",
  },

  // SUPPORT & TICKETS
  { code: "view_support_tickets", label: "View support tickets", category: "SUPPORT_AND_TICKETS" },
  {
    code: "respond_support_tickets",
    label: "Respond to support tickets",
    category: "SUPPORT_AND_TICKETS",
  },
  { code: "escalate_ticket", label: "Escalate a ticket", category: "SUPPORT_AND_TICKETS" },
  { code: "close_ticket", label: "Close a ticket", category: "SUPPORT_AND_TICKETS" },

  // AUDIT LOGS
  { code: "view_audit_logs", label: "View audit logs", category: "AUDIT_LOGS" },
  { code: "export_audit_logs", label: "Export audit logs", category: "AUDIT_LOGS" },
]

export const ADMIN_PERMISSION_CODES: string[] = ADMIN_PERMISSIONS.map((p) => p.code)

/**
 * Manager matrix (spreadsheet): day-to-day ops, excluding system config and final approvals.
 * Codes with `access: false` must stay gated off for Managers.
 */
export const MANAGER_PERMISSION_ACCESS: Record<string, boolean> = {
  // APPLICATIONS
  view_applications: true,
  create_application: true,
  edit_application: true,
  publish_application: true,
  archive_application: false,

  // PRODUCTS
  view_products: true,
  create_product: true,
  edit_product: true,
  publish_product: true,
  archive_product: true,
  approve_product_pricing: true,

  // FEES & CHARGES
  view_fee_structures: true,
  edit_fee_structures: true,
  approve_fee_structures: false,

  // WALLET & LEDGER
  view_wallet_balances: true,
  view_transaction_ledger: true,
  reconcile_ledger: true,
  flag_ledger_discrepancies: true,

  // PAYOUTS & SETTLEMENTS
  view_payout_history: true,
  initiate_payout: true,
  approve_payout: false,

  // FI / PARTNER — not on Manager sheet → denied
  view_fi_partners: false,
  onboard_fi_partner: false,
  edit_fi_sla: false,
  suspend_fi_partner: false,

  // USER & TEAM MANAGEMENT
  invite_team_members: true,
  assign_user_roles: false,
  deactivate_user: false,
  view_user_activity_logs: true,

  // COMPLIANCE & KYC
  view_kyc_status: true,
  approve_kyc: true,
  view_compliance_dashboard: true,
  export_compliance_reports: true,

  // INTEGRATIONS & SYSTEM SETTINGS — all No
  manage_api_keys: false,
  configure_airsign: false,
  configure_webhooks: false,
  manage_system_settings: false,

  // REPORTS & ANALYTICS
  view_reports: true,
  export_reports: true,
  create_custom_reports: true,

  // SUPPORT & TICKETS
  view_support_tickets: true,
  respond_support_tickets: true,
  escalate_ticket: true,
  close_ticket: true,

  // AUDIT LOGS
  view_audit_logs: true,
  export_audit_logs: false,
}

/** Permission codes Manager is allowed (Access = Yes). */
export const MANAGER_ALLOWED_CODES: string[] = Object.entries(MANAGER_PERMISSION_ACCESS)
  .filter(([, allowed]) => allowed)
  .map(([code]) => code)

/** Permission codes Manager must never get in UI (Access = No). */
export const MANAGER_DENIED_CODES: string[] = Object.entries(MANAGER_PERMISSION_ACCESS)
  .filter(([, allowed]) => !allowed)
  .map(([code]) => code)

/**
 * Support Staff matrix (spreadsheet): read-only + ticket handling only.
 * Codes with `access: false` must stay gated off for Support Staff.
 */
export const SUPPORT_STAFF_PERMISSION_ACCESS: Record<string, boolean> = {
  // APPLICATIONS — view only
  view_applications: true,
  create_application: false,
  edit_application: false,
  publish_application: false,
  archive_application: false,

  // PRODUCTS — view only
  view_products: true,
  create_product: false,
  edit_product: false,
  publish_product: false,
  archive_product: false,
  approve_product_pricing: false,

  // FEES & CHARGES — view only
  view_fee_structures: true,
  edit_fee_structures: false,
  approve_fee_structures: false,

  // WALLET & LEDGER
  view_wallet_balances: false,
  view_transaction_ledger: true,
  reconcile_ledger: false,
  flag_ledger_discrepancies: true,

  // PAYOUTS & SETTLEMENTS — view only
  view_payout_history: true,
  initiate_payout: false,
  approve_payout: false,

  // FI / PARTNER — not on sheet → denied
  view_fi_partners: false,
  onboard_fi_partner: false,
  edit_fi_sla: false,
  suspend_fi_partner: false,

  // USER & TEAM MANAGEMENT — all No
  invite_team_members: false,
  assign_user_roles: false,
  deactivate_user: false,
  view_user_activity_logs: false,

  // COMPLIANCE & KYC — view only
  view_kyc_status: true,
  approve_kyc: false,
  view_compliance_dashboard: true,
  export_compliance_reports: false,

  // INTEGRATIONS & SYSTEM SETTINGS — all No
  manage_api_keys: false,
  configure_airsign: false,
  configure_webhooks: false,
  manage_system_settings: false,

  // REPORTS & ANALYTICS — view only
  view_reports: true,
  export_reports: false,
  create_custom_reports: false,

  // SUPPORT & TICKETS — full Yes
  view_support_tickets: true,
  respond_support_tickets: true,
  escalate_ticket: true,
  close_ticket: true,

  // AUDIT LOGS — all No
  view_audit_logs: false,
  export_audit_logs: false,
}

/** Permission codes Support Staff is allowed (Access = Yes). */
export const SUPPORT_STAFF_ALLOWED_CODES: string[] = Object.entries(
  SUPPORT_STAFF_PERMISSION_ACCESS,
)
  .filter(([, allowed]) => allowed)
  .map(([code]) => code)

/** Permission codes Support Staff must never get in UI (Access = No). */
export const SUPPORT_STAFF_DENIED_CODES: string[] = Object.entries(
  SUPPORT_STAFF_PERMISSION_ACCESS,
)
  .filter(([, allowed]) => !allowed)
  .map(([code]) => code)

/** Sidebar / section → permission required to see it (any of). */
export const NAV_PERMISSIONS = {
  apps: ["view_applications", "create_application", "create_app", "publish_application"],
  compliance: ["view_compliance_dashboard", "view_kyc_status", "approve_kyc"],
  analytics: ["view_reports", "create_custom_reports", "download_report"],
  wallets: ["view_wallet_balances", "view_transaction_ledger", "view_payout_history"],
  /** View/initiate only — approve is gated separately via `approve_payout`. */
  withdrawals: ["view_payout_history", "initiate_payout", "approve_payout"],
  products: ["view_products", "create_product", "create_products", "edit_product", "edit_products"],
  applications: ["view_applications"],
  workflow: ["view_applications", "edit_application"],
  team: ["invite_team_members", "assign_user_roles", "view_user_activity_logs", "deactivate_user"],
  settings: ["manage_system_settings", "manage_api_keys", "configure_webhooks", "configure_airsign"],
} as const

function expandCodes(codes: string[]): Set<string> {
  const set = new Set<string>()
  for (const code of codes) {
    set.add(code)
    for (const def of ADMIN_PERMISSIONS) {
      if (def.code === code || def.aliases?.includes(code)) {
        set.add(def.code)
        def.aliases?.forEach((a) => set.add(a))
      }
    }
  }
  return set
}

function canonicalCode(code: string): string {
  for (const def of ADMIN_PERMISSIONS) {
    if (def.code === code || def.aliases?.includes(code)) return def.code
  }
  return code
}

function normalizeRoleName(roleName?: string | null): string {
  return String(roleName || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
}

function isManagerRole(roleName?: string | null): boolean {
  return normalizeRoleName(roleName) === "manager"
}

function isSupportStaffRole(roleName?: string | null): boolean {
  const n = normalizeRoleName(roleName)
  return n === "support staff" || n === "support"
}

function presetAllowedCodes(roleName?: string | null): string[] | null {
  if (isManagerRole(roleName)) return MANAGER_ALLOWED_CODES
  if (isSupportStaffRole(roleName)) return SUPPORT_STAFF_ALLOWED_CODES
  return null
}

function presetDeniedCodes(roleName?: string | null): string[] | null {
  if (isManagerRole(roleName)) return MANAGER_DENIED_CODES
  if (isSupportStaffRole(roleName)) return SUPPORT_STAFF_DENIED_CODES
  return null
}

/**
 * Effective permission set for gating.
 * - Owner / Admin → full Admin matrix
 * - Manager / Support Staff → intersection with spreadsheet Yes-list;
 *   if session list empty after load, fall back to that Yes-list
 * - Other roles → session permissions as returned by the API
 */
export function resolveEffectivePermissions(options: {
  permissions?: string[] | null
  isOwner?: boolean
  roleName?: string | null
}): string[] {
  if (options.isOwner) return [...ADMIN_PERMISSION_CODES]
  const role = normalizeRoleName(options.roleName)
  if (role === "admin") return [...ADMIN_PERMISSION_CODES]

  const session = Array.isArray(options.permissions) ? options.permissions.map(String) : []
  const preset = presetAllowedCodes(options.roleName)

  if (preset) {
    const allowed = expandCodes(preset)
    if (!session.length) return [...preset]
    return session.filter((code) => allowed.has(code) || allowed.has(canonicalCode(code)))
  }

  return session
}

/**
 * Effective capability check.
 * - Merchant owner (`isOwner`) → full Admin matrix (all Yes).
 * - Role name Admin → full Admin matrix.
 * - Role name Manager → Manager matrix (ops Yes, config/approvals No).
 * - Role name Support Staff → read-only + tickets matrix.
 * - Otherwise match any required code (including aliases) against session permissions.
 */
export function canAccess(
  required: string | string[],
  options: {
    permissions?: string[] | null
    isOwner?: boolean
    roleName?: string | null
    /** When permissions have never been loaded, fail open so UI still works until /me returns. */
    allowIfEmpty?: boolean
  },
): boolean {
  if (options.isOwner) return true
  const role = normalizeRoleName(options.roleName)
  if (role === "admin") return true

  const need = Array.isArray(required) ? required : [required]

  // Hard-deny spreadsheet "No" rows for known presets even if a stale token lists them.
  const deniedList = presetDeniedCodes(options.roleName)
  if (deniedList) {
    const denied = expandCodes(deniedList)
    if (need.every((code) => denied.has(code) || denied.has(canonicalCode(code)))) {
      return false
    }
  }

  const effective = resolveEffectivePermissions(options)
  if (!effective.length) return options.allowIfEmpty !== false

  const have = expandCodes(effective)
  return need.some((code) => have.has(code) || have.has(canonicalCode(code)))
}
