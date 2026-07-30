"use client"

import type React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { MdAddBox } from "react-icons/md"
import { IoMdCube } from "react-icons/io"
import { RiSettings3Fill } from "react-icons/ri"
import { FiLogOut } from "react-icons/fi"
import { FaWallet } from "react-icons/fa"
import { BarChart3, GitBranch, ChevronDown, ChevronUp, FileText, ShieldCheck } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import Tippy from "@tippyjs/react"
import "tippy.js/dist/tippy.css"
import { toast } from "sonner"
import { useAuth } from "@/hooks/useAuth"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { fetchKycStatusThunk } from "@/store/complianceSlice"
import { fetchMerchantProfileThunk } from "@/store/merchantSettingsSlice"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getUserFromToken } from "@/lib/tokenManager"
import { displayNameFromEmail, looksLikeEmailLocalOnly } from "@/lib/userNameFromClaims"

interface GlobalNavItem {
  icon: React.ReactNode
  label: string
  href: string
  requiresCompliance?: boolean
}

interface AppNavItem {
  icon: React.ReactNode
  label: string
  href: string
  subItems?: { label: string; href: string }[]
}

const COMPLIANCE_MESSAGE = "Complete Compliance before you can access this section."

const ACTIVE_ROW =
  "bg-[#FFF9EB] text-[#9A813F] font-medium shadow-sm ring-1 ring-[#9A813F]/10 [&_svg]:text-[#9A813F]"
const INACTIVE_ROW = "text-slate-700 hover:bg-[#FFF9EB]/60 [&_svg]:text-slate-600"
const INACTIVE_SUB = "text-slate-600 hover:bg-[#FFF9EB]/50 hover:text-[#9A813F]"
const ACTIVE_SUB = "bg-[#FFF9EB]/80 text-[#9A813F] font-medium ring-1 ring-[#9A813F]/10"

function getActiveSubHref(pathname: string, subItems: { label: string; href: string }[]): string | null {
  const sorted = [...subItems].sort((a, b) => b.href.length - a.href.length)
  for (const s of sorted) {
    if (pathname === s.href || pathname.startsWith(`${s.href}/`)) return s.href
  }
  return null
}

function appIdFromPathname(pathname: string | null): string | null {
  if (!pathname) return null
  const m = pathname.match(/^\/dashboard\/create-app\/all-apps\/([^/]+)(?:\/|$)/)
  return m?.[1] ?? null
}

export interface DashboardSidebarProps {
  className?: string
  /** When set (e.g. from server layout), used before pathname-derived id. */
  appId?: string
}

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({ className = "", appId: appIdProp }) => {
  const pathname = usePathname()
  const router = useRouter()
  const dispatch = useAppDispatch()
  const complianceComplete = useAppSelector((s) => s.compliance.isApproved)
  const merchantFullName = useAppSelector((s) => s.merchantSettings.fullName?.trim() ?? "")
  const { user, logout } = useAuth()

  const derivedAppId = useMemo(() => appIdFromPathname(pathname ?? null), [pathname])
  const appId = appIdProp ?? derivedAppId
  const inAppContext = Boolean(appId)

  const [isWalletsOpen, setIsWalletsOpen] = useState(false)
  const [isProductsOpen, setIsProductsOpen] = useState(false)
  const [isApplicationsOpen, setIsApplicationsOpen] = useState(false)
  const [isWorkflowOpen, setIsWorkflowOpen] = useState(false)

  const tokenUser = typeof window !== "undefined" ? getUserFromToken() : null
  const effectiveUser = user ?? tokenUser

  const displayEmail = effectiveUser?.email ?? ""

  const nameFromUser = useMemo(() => {
    if (!effectiveUser) return ""
    const r = effectiveUser as unknown as Record<string, string | undefined>
    const first = (r.firstName ?? r.first_name ?? "").trim()
    const last = (r.lastName ?? r.last_name ?? "").trim()
    return [first, last].filter(Boolean).join(" ").trim()
  }, [effectiveUser])

  const displayName = useMemo(() => {
    if (nameFromUser) return nameFromUser
    const m = merchantFullName.trim()
    if (m && displayEmail && !looksLikeEmailLocalOnly(m, displayEmail)) return m
    const inferred = displayNameFromEmail(displayEmail)
    return inferred || "User"
  }, [nameFromUser, merchantFullName, displayEmail])

  const initials = useMemo(() => {
    const parts = displayName.split(/\s+/).filter((p) => p.length > 0)
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase()
    }
    if (parts.length === 1 && parts[0].length >= 2) {
      return parts[0].slice(0, 2).toUpperCase()
    }
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase()
    }
    return (displayEmail.charAt(0) || "U").toUpperCase()
  }, [displayName, displayEmail])

  const handleLogout = async () => {
    const id = toast.loading("Logging out...")
    try {
      await logout()
      toast.success("Logged out successfully", { id })
      router.replace("/signin")
    } catch {
      toast.error("Could not log out. Please try again.", { id })
    }
  }

  useEffect(() => {
    void dispatch(fetchKycStatusThunk())
  }, [pathname, dispatch])

  useEffect(() => {
    if (nameFromUser) return
    if (!effectiveUser?.email) return
    if (!pathname?.startsWith("/dashboard")) return
    void dispatch(fetchMerchantProfileThunk()).catch(() => {})
  }, [nameFromUser, effectiveUser?.email, pathname, dispatch])

  useEffect(() => {
    if (!appId) {
      setIsWalletsOpen(false)
      setIsProductsOpen(false)
      setIsApplicationsOpen(false)
      setIsWorkflowOpen(false)
      return
    }
    setIsWalletsOpen(pathname.startsWith(`/dashboard/create-app/all-apps/${appId}/wallets`))
    setIsProductsOpen(pathname.startsWith(`/dashboard/create-app/all-apps/${appId}/products`))
    setIsApplicationsOpen(pathname.startsWith(`/dashboard/create-app/all-apps/${appId}/applications`))
    setIsWorkflowOpen(pathname.startsWith(`/dashboard/create-app/all-apps/${appId}/operation-workflow`))
  }, [pathname, appId])

  const globalNavItems: GlobalNavItem[] = [
    {
      icon: <MdAddBox size={20} />,
      label: "Apps",
      href: "/dashboard/create-app/all-apps",
      requiresCompliance: true,
    },
    { icon: <IoMdCube size={20} />, label: "Compliance", href: "/dashboard/compliance", requiresCompliance: false },
  ]

  const appNavItems: AppNavItem[] = appId
    ? [
        {
          icon: <BarChart3 size={20} />,
          label: "Analytics",
          href: `/dashboard/create-app/all-apps/${appId}/admin/analytics`,
        },
        {
          icon: <FaWallet size={20} />,
          label: "Wallets",
          href: `/dashboard/create-app/all-apps/${appId}/wallets/treasury`,
          subItems: [
            { label: "Treasury wallet", href: `/dashboard/create-app/all-apps/${appId}/wallets/treasury` },
            { label: "Billing wallet", href: `/dashboard/create-app/all-apps/${appId}/wallets/billing` },
            { label: "Repayment wallet", href: `/dashboard/create-app/all-apps/${appId}/wallets/repayment` },
          ],
        },
        {
          icon: <IoMdCube size={20} />,
          label: "Products",
          href: `/dashboard/create-app/all-apps/${appId}/products`,
          subItems: [
            { label: "All Products", href: `/dashboard/create-app/all-apps/${appId}/products` },
            { label: "Product Overview", href: `/dashboard/create-app/all-apps/${appId}/products/overview` },
          ],
        },
        {
          icon: <FileText size={20} />,
          label: "Applications",
          href: `/dashboard/create-app/all-apps/${appId}/applications`,
          subItems: [
            { label: "All Applications", href: `/dashboard/create-app/all-apps/${appId}/applications` },
            { label: "Pending Review", href: `/dashboard/create-app/all-apps/${appId}/applications/pending` },
          ],
        },
        {
          icon: <GitBranch size={20} />,
          label: "Operation Workflow",
          href: `/dashboard/create-app/all-apps/${appId}/operation-workflow`,
          subItems: [
            { label: "Loan Workflow", href: `/dashboard/create-app/all-apps/${appId}/operation-workflow/loan` },
            {
              label: "Mortgage Workflow",
              href: `/dashboard/create-app/all-apps/${appId}/operation-workflow/mortgage`,
            },
          ],
        },
      ]
    : []

  const teamHref = appId ? `/dashboard/create-app/all-apps/${appId}/admin` : ""
  const analyticsHref = appId ? `/dashboard/create-app/all-apps/${appId}/admin/analytics` : ""
  const isTeamActive =
    Boolean(appId) &&
    (pathname === teamHref ||
      (pathname.startsWith(`${teamHref}/`) && !pathname.startsWith(analyticsHref)))

  return (
    <div className={`w-64 bg-white border-r border-gray-200 h-screen flex flex-col ${className}`}>
      <div className="p-6">
        <span className="text-2xl font-bold text-[#9A813F]">PLATA</span>
      </div>

      <nav className="flex-1 px-4">
        {inAppContext && appId ? (
          <ul className="space-y-4">
            {appNavItems.map((item, index) => {
              const hasSubItems = item.subItems && item.subItems.length > 0
              const activeSubHref = hasSubItems && item.subItems ? getActiveSubHref(pathname, item.subItems) : null
              const isActive = hasSubItems
                ? activeSubHref !== null || pathname === item.href || pathname.startsWith(`${item.href}/`)
                : pathname === item.href || pathname.startsWith(`${item.href}/`)
              const isOpen =
                item.label === "Wallets"
                  ? isWalletsOpen
                  : item.label === "Products"
                    ? isProductsOpen
                    : item.label === "Applications"
                      ? isApplicationsOpen
                      : item.label === "Operation Workflow"
                        ? isWorkflowOpen
                        : false
              const setIsOpen =
                item.label === "Wallets"
                  ? setIsWalletsOpen
                  : item.label === "Products"
                    ? setIsProductsOpen
                    : item.label === "Applications"
                      ? setIsApplicationsOpen
                      : item.label === "Operation Workflow"
                        ? setIsWorkflowOpen
                        : () => {}

              return (
                <li key={index}>
                  {hasSubItems ? (
                    <div>
                      <button
                        type="button"
                        onClick={() => setIsOpen(!isOpen)}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 transition-colors [&_svg]:shrink-0 ${
                          isActive ? ACTIVE_ROW : INACTIVE_ROW
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex shrink-0 items-center [&_svg]:block">{item.icon}</span>
                          <span className="truncate text-sm">{item.label}</span>
                        </div>
                        <span className={`shrink-0 ${isActive ? "text-[#9A813F]" : "text-slate-500"}`}>
                          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </span>
                      </button>
                      {isOpen && (
                        <ul className="ml-9 mt-2 space-y-1 border-l border-[#E8DFD0] pl-3">
                          {item.subItems?.map((subItem, subIndex) => {
                            const isSubActive = activeSubHref === subItem.href
                            return (
                              <li key={subIndex}>
                                <Link
                                  href={subItem.href}
                                  className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                                    isSubActive ? ACTIVE_SUB : INACTIVE_SUB
                                  }`}
                                >
                                  {subItem.label}
                                </Link>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </div>
                  ) : (
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors [&_svg]:shrink-0 ${
                        isActive ? ACTIVE_ROW : INACTIVE_ROW
                      }`}
                    >
                      <span className="flex shrink-0 [&_svg]:block">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <ul className="space-y-4">
            {globalNavItems.map((item, index) => {
              const isActive =
                pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`))
              const disabled = !!(item.requiresCompliance && !complianceComplete)
              const linkClass = `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors [&_svg]:shrink-0 ${
                isActive ? ACTIVE_ROW : INACTIVE_ROW
              } ${disabled ? "pointer-events-none cursor-not-allowed opacity-60" : ""}`

              return (
                <li key={index}>
                  {disabled ? (
                    <Tippy content={COMPLIANCE_MESSAGE} placement="top" arrow theme="sidebar-light">
                      <span className="flex w-full cursor-not-allowed">
                        <span className={`${linkClass} pointer-events-none w-full`}>
                          {item.icon}
                          <span className="text-sm">{item.label}</span>
                        </span>
                      </span>
                    </Tippy>
                  ) : (
                    <Link href={item.href} className={linkClass}>
                      {item.icon}
                      <span className="text-sm">{item.label}</span>
                    </Link>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        <div className="mt-8 mb-2 px-3">
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide">Section Title</h3>
        </div>

        <ul className="space-y-4">
          {inAppContext && appId ? (
            <li>
              <Link
                href={teamHref}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors [&_svg]:shrink-0 ${
                  isTeamActive ? ACTIVE_ROW : INACTIVE_ROW
                }`}
              >
                <ShieldCheck size={20} />
                <span>Team</span>
              </Link>
            </li>
          ) : null}
          <li>
            {inAppContext && appId ? (
              <Link
                href={`/dashboard/create-app/all-apps/${appId}/settings`}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors [&_svg]:shrink-0 ${
                  pathname.startsWith(`/dashboard/create-app/all-apps/${appId}/settings`) ? ACTIVE_ROW : INACTIVE_ROW
                }`}
              >
                <RiSettings3Fill size={20} />
                <span>Settings</span>
              </Link>
            ) : !complianceComplete ? (
              <Tippy content={COMPLIANCE_MESSAGE} placement="top" arrow theme="sidebar-light">
                <span className="flex items-center space-x-3 px-3 py-2 rounded-md text-gray-700 opacity-60 cursor-not-allowed w-full">
                  <RiSettings3Fill size={20} />
                  <span className="text-sm">Settings</span>
                </span>
              </Tippy>
            ) : (
              <Link
                href="/dashboard/settings"
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors [&_svg]:shrink-0 ${
                  pathname.startsWith("/dashboard/settings") ? ACTIVE_ROW : INACTIVE_ROW
                }`}
              >
                <RiSettings3Fill size={20} />
                <span className="text-sm">Settings</span>
              </Link>
            )}
          </li>
        </ul>
      </nav>

      <div className="py-4 px-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            <Avatar className="w-9 h-9 shrink-0">
              <AvatarFallback className="text-sm font-semibold text-gray-900 border border-gray-200 rounded-full">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
              <p className="text-xs text-gray-500 truncate">{displayEmail}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Logout"
            className="text-gray-500 hover:text-gray-700 pr-2 shrink-0"
          >
            <FiLogOut size={20} className="cursor-pointer" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default DashboardSidebar
