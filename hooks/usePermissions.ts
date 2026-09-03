"use client"

import { useCallback, useMemo } from "react"
import { canAccess, NAV_PERMISSIONS } from "@/lib/adminPermissions"
import { useAppSelector } from "@/store/hooks"

export type UsePermissionsResult = {
  permissions: string[]
  isOwner: boolean
  roleId: string | null
  roleName: string | null
  /** True once login or /auth/me has populated RBAC. */
  rbacLoaded: boolean
  loading: boolean
  /** Merchant owner or assigned Admin role (full Admin matrix). */
  isAdmin: boolean
  /** Assigned Manager role (ops Yes, config/final approvals No). */
  isManager: boolean
  /** Assigned Support Staff role (read-only + tickets). */
  isSupportStaff: boolean
  /** Display label e.g. "Admin", "Manager", "Support Staff", or "Owner". */
  roleLabel: string
  can: (required: string | string[]) => boolean
  canAny: (required: string[]) => boolean
  canAll: (required: string[]) => boolean
  /** Convenience section gates matching the role spreadsheets. */
  nav: {
    apps: boolean
    compliance: boolean
    analytics: boolean
    wallets: boolean
    withdrawals: boolean
    products: boolean
    applications: boolean
    workflow: boolean
    team: boolean
    settings: boolean
  }
  /** Granular action helpers aligned to Admin / Manager / Support Staff matrices. */
  actions: {
    archiveApplication: boolean
    createApplication: boolean
    editApplication: boolean
    publishApplication: boolean
    createProduct: boolean
    editProduct: boolean
    publishProduct: boolean
    archiveProduct: boolean
    approveProductPricing: boolean
    editFeeStructures: boolean
    approveFeeStructures: boolean
    viewWalletBalances: boolean
    viewTransactionLedger: boolean
    reconcileLedger: boolean
    approvePayout: boolean
    initiatePayout: boolean
    inviteTeamMembers: boolean
    assignUserRoles: boolean
    deactivateUser: boolean
    viewActivityLogs: boolean
    approveKyc: boolean
    exportComplianceReports: boolean
    manageApiKeys: boolean
    manageSystemSettings: boolean
    exportReports: boolean
    createCustomReports: boolean
    exportAuditLogs: boolean
    viewAuditLogs: boolean
    viewSupportTickets: boolean
    respondSupportTickets: boolean
    escalateTicket: boolean
    closeTicket: boolean
  }
}

/**
 * Universal RBAC hook for Plata-frontend.
 * Source of truth: login + GET /api/v1/auth/me → Redux `auth` slice.
 *
 * Admin: full access. Manager: ops minus config/final approvals.
 * Support Staff: read-only + ticket handling.
 */
export function usePermissions(): UsePermissionsResult {
  const {
    permissions,
    isOwner,
    roleId,
    roleName,
    rbacLoaded,
    loading,
  } = useAppSelector((s) => s.auth)

  const normalizedRole = String(roleName || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
  const isAdmin = isOwner || normalizedRole === "admin"
  const isManager = !isOwner && normalizedRole === "manager"
  const isSupportStaff =
    !isOwner && (normalizedRole === "support staff" || normalizedRole === "support")

  const roleLabel = useMemo(() => {
    if (isOwner) return "Owner"
    const name = String(roleName || "").trim()
    return name || "Staff"
  }, [isOwner, roleName])

  const can = useCallback(
    (required: string | string[]) =>
      canAccess(required, {
        permissions,
        isOwner,
        roleName,
        allowIfEmpty: !rbacLoaded,
      }),
    [permissions, isOwner, roleName, rbacLoaded],
  )

  const canAny = useCallback((required: string[]) => can(required), [can])

  const canAll = useCallback(
    (required: string[]) =>
      required.every((code) =>
        canAccess(code, {
          permissions,
          isOwner,
          roleName,
          allowIfEmpty: !rbacLoaded,
        }),
      ),
    [permissions, isOwner, roleName, rbacLoaded],
  )

  const nav = useMemo(
    () => ({
      apps: can([...NAV_PERMISSIONS.apps]),
      compliance: can([...NAV_PERMISSIONS.compliance]),
      analytics: can([...NAV_PERMISSIONS.analytics]),
      wallets: can([...NAV_PERMISSIONS.wallets]),
      withdrawals: can([...NAV_PERMISSIONS.withdrawals]),
      products: can([...NAV_PERMISSIONS.products]),
      applications: can([...NAV_PERMISSIONS.applications]),
      workflow: can([...NAV_PERMISSIONS.workflow]),
      team: can([...NAV_PERMISSIONS.team]),
      settings: can([...NAV_PERMISSIONS.settings]),
    }),
    [can],
  )

  const actions = useMemo(
    () => ({
      archiveApplication: can("archive_application"),
      createApplication: can(["create_application", "create_app"]),
      editApplication: can("edit_application"),
      publishApplication: can("publish_application"),
      createProduct: can(["create_product", "create_products"]),
      editProduct: can(["edit_product", "edit_products"]),
      publishProduct: can("publish_product"),
      archiveProduct: can("archive_product"),
      approveProductPricing: can("approve_product_pricing"),
      editFeeStructures: can("edit_fee_structures"),
      approveFeeStructures: can("approve_fee_structures"),
      viewWalletBalances: can("view_wallet_balances"),
      viewTransactionLedger: can("view_transaction_ledger"),
      reconcileLedger: can("reconcile_ledger"),
      approvePayout: can("approve_payout"),
      initiatePayout: can("initiate_payout"),
      inviteTeamMembers: can("invite_team_members"),
      assignUserRoles: can("assign_user_roles"),
      deactivateUser: can("deactivate_user"),
      viewActivityLogs: can("view_user_activity_logs"),
      approveKyc: can("approve_kyc"),
      exportComplianceReports: can("export_compliance_reports"),
      manageApiKeys: can("manage_api_keys"),
      manageSystemSettings: can("manage_system_settings"),
      exportReports: can("export_reports"),
      createCustomReports: can("create_custom_reports"),
      exportAuditLogs: can("export_audit_logs"),
      viewAuditLogs: can("view_audit_logs"),
      viewSupportTickets: can("view_support_tickets"),
      respondSupportTickets: can("respond_support_tickets"),
      escalateTicket: can("escalate_ticket"),
      closeTicket: can("close_ticket"),
    }),
    [can],
  )

  return {
    permissions,
    isOwner,
    roleId,
    roleName,
    rbacLoaded,
    loading,
    isAdmin,
    isManager,
    isSupportStaff,
    roleLabel,
    can,
    canAny,
    canAll,
    nav,
    actions,
  }
}
