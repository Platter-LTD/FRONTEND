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
import { useEffect } from "react"
import Tippy from "@tippyjs/react"
import "tippy.js/dist/tippy.css"
import { useAuth } from "@/hooks/useAuth"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { fetchKycStatusThunk } from "@/store/complianceSlice"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getUserFromToken } from "@/lib/tokenManager"

interface NavItem {
  icon: React.ReactNode
  label: string
  href: string
  requiresCompliance?: boolean
}

const COMPLIANCE_MESSAGE = "Complete Compliance before you can access this section."

interface SidebarProps {
  className?: string
}

const Sidebar: React.FC<SidebarProps> = ({ className = "" }) => {
  const pathname = usePathname()
  const router = useRouter()
  const dispatch = useAppDispatch()
  const complianceComplete = useAppSelector((s) => s.compliance.isApproved)
  const { user, logout } = useAuth()

  const tokenUser = typeof window !== "undefined" ? getUserFromToken() : null
  const effectiveUser = user ?? tokenUser

  const rawDisplayName = effectiveUser
    ? [effectiveUser.firstName, effectiveUser.lastName].filter(Boolean).join(" ").trim()
    : ""
  const displayEmail = effectiveUser?.email ?? ""
  const displayName = rawDisplayName || (displayEmail ? displayEmail.split("@")[0] : "User")
  const handleLogout = async () => {
    await logout()
    router.replace("/signin")
  }

  const initialsFromName = effectiveUser
    ? `${(effectiveUser.firstName ?? "").trim().charAt(0)}${(effectiveUser.lastName ?? "").trim().charAt(0)}`.toUpperCase()
    : ""
  const initials = initialsFromName || (displayEmail?.charAt(0) ?? "U").toUpperCase()

  useEffect(() => {
    void dispatch(fetchKycStatusThunk())
  }, [pathname, dispatch])

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
            const isActive = pathname.startsWith(item.href)
            const disabled = !!(item.requiresCompliance && !complianceComplete)
            const linkClass = `flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${isActive ? "bg-[#FFF9EA] text-[#9A813F] font-medium" : "text-gray-700 hover:bg-gray-100"} ${disabled ? "pointer-events-none opacity-60 cursor-not-allowed" : ""}`

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
                className={`flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${pathname.startsWith("/dashboard/settings")
                  ? "bg-[#FFF9EA] text-[#9A813F] font-medium"
                  : "text-gray-700 hover:bg-gray-100"
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
