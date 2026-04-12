"use client"

import type React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { MdAddBox } from "react-icons/md"
import { FaUsers } from "react-icons/fa"
import { IoMdCube } from "react-icons/io"
import { TbCodeCircle2Filled } from "react-icons/tb"
import { RiSettings3Fill } from "react-icons/ri"
import { FiLogOut } from "react-icons/fi"
import { SearchIcon } from "lucide-react"
import { useEffect, useMemo } from "react"
import Tippy from "@tippyjs/react"
import "tippy.js/dist/tippy.css"
import { useAuth } from "@/hooks/useAuth"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { fetchKycStatusThunk } from "@/store/complianceSlice"
import { fetchMerchantProfileThunk } from "@/store/merchantSettingsSlice"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getUserFromToken } from "@/lib/tokenManager"

interface NavItem {
  icon: React.ReactNode
  label: string
  href: string
  requiresCompliance?: boolean
}

const COMPLIANCE_MESSAGE = "Complete Compliance before you can access this section."

const ACTIVE_ROW = "bg-[#FFF9EB] text-[#9A813F] font-medium shadow-sm ring-1 ring-[#9A813F]/10 [&_svg]:text-[#9A813F]"
const INACTIVE_ROW = "text-slate-700 hover:bg-[#FFF9EB]/60 [&_svg]:text-slate-600"

interface SidebarProps {
  className?: string
}

const Sidebar: React.FC<SidebarProps> = ({ className = "" }) => {
  const pathname = usePathname()
  const router = useRouter()
  const dispatch = useAppDispatch()
  const complianceComplete = useAppSelector((s) => s.compliance.isApproved)
  const merchantFullName = useAppSelector((s) => s.merchantSettings.fullName?.trim() ?? "")
  const { user, logout } = useAuth()

  const tokenUser = typeof window !== "undefined" ? getUserFromToken() : null
  const effectiveUser = user ?? tokenUser

  const displayEmail = effectiveUser?.email ?? ""

  /** Token / API may use camelCase or snake_case; never use the email local-part as the display name. */
  const nameFromUser = useMemo(() => {
    if (!effectiveUser) return ""
    const r = effectiveUser as unknown as Record<string, string | undefined>
    const first = (r.firstName ?? r.first_name ?? "").trim()
    const last = (r.lastName ?? r.last_name ?? "").trim()
    return [first, last].filter(Boolean).join(" ").trim()
  }, [effectiveUser])

  const displayName = nameFromUser || merchantFullName || "User"

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
    await logout()
    router.replace("/signin")
  }

  useEffect(() => {
    void dispatch(fetchKycStatusThunk())
  }, [pathname, dispatch])

  /** When JWT has no name claims, load profile once so Redux has `fullName` for the sidebar. */
  useEffect(() => {
    if (nameFromUser) return
    if (!effectiveUser?.email) return
    if (!pathname?.startsWith("/dashboard")) return
    void dispatch(fetchMerchantProfileThunk()).catch(() => {})
  }, [nameFromUser, effectiveUser?.email, pathname, dispatch])

  const navItems: NavItem[] = [
    {
      icon: <MdAddBox size={20} />,
      label: "Apps",
      href: "/dashboard/create-app/all-apps",
      requiresCompliance: true,
    },
    { icon: <IoMdCube size={20} />, label: "Compliance", href: "/dashboard/compliance", requiresCompliance: false },
    // { icon: <TbCodeCircle2Filled size={20} />, label: "Developer", href: "/dashboard/developer", requiresCompliance: true },
  ]

  return (
    <div className={`w-64 bg-white border-r border-gray-200 h-screen flex flex-col ${className}`}>
      {/* Logo */}
      <div className="p-6">
        <span className="text-2xl font-bold text-[#9A813F]">PLATA</span>
      </div>

      {/* Search */}
      <div className="px-6 mb-6">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#9A813F] focus:border-transparent text-sm"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4">
        <ul className="space-y-4">
          {navItems.map((item, index) => {
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

        {/* Section Title */}
        <div className="mt-8 mb-2 px-3">
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide">Section Title</h3>
        </div>

        {/* Settings */}
        <ul>
          <li>
            {!complianceComplete ? (
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

      {/* User Profile */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="w-9 h-9">
              <AvatarFallback className="text-sm font-semibold text-gray-900">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-gray-900">{displayName}</p>
              <p className="text-xs text-gray-500">{displayEmail}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Logout"
            className="text-gray-500 hover:text-gray-700"
          >
            <FiLogOut size={20} className="cursor-pointer" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default Sidebar
