"use client"

import type React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { FaWallet } from "react-icons/fa"
import { IoMdCube } from "react-icons/io"
import { GitBranch } from "lucide-react"
import { RiSettings3Fill } from "react-icons/ri"
import { FiLogOut } from "react-icons/fi"
import { ChevronDown, ChevronUp } from "lucide-react"
import { useEffect, useState } from "react"
import { ShieldCheck } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getUserFromToken } from "@/lib/tokenManager"

interface NavItem {
  icon: React.ReactNode
  label: string
  href: string
  subItems?: { label: string; href: string }[]
}

interface AppSidebarProps {
  className?: string
  appId: string
}

/** Pick at most one active sub-link: longest href prefix wins (fixes /products vs /products/overview). */
function getActiveSubHref(pathname: string, subItems: { label: string; href: string }[]): string | null {
  const sorted = [...subItems].sort((a, b) => b.href.length - a.href.length)
  for (const s of sorted) {
    if (pathname === s.href || pathname.startsWith(`${s.href}/`)) return s.href
  }
  return null
}

const ACTIVE_ROW = "bg-[#FFF9EB] text-[#9A813F] font-medium shadow-sm ring-1 ring-[#9A813F]/10"
const INACTIVE_ROW = "text-slate-700 hover:bg-[#FFF9EB]/60"
const INACTIVE_SUB = "text-slate-600 hover:bg-[#FFF9EB]/50 hover:text-[#9A813F]"
const ACTIVE_SUB = "bg-[#FFF9EB]/80 text-[#9A813F] font-medium ring-1 ring-[#9A813F]/10"

const AppSidebar: React.FC<AppSidebarProps> = ({ className = "", appId }) => {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()

  const [isWalletsOpen, setIsWalletsOpen] = useState(pathname.startsWith(`/dashboard/create-app/all-apps/${appId}/wallets`))
  const [isProductsOpen, setIsProductsOpen] = useState(pathname.startsWith(`/dashboard/create-app/all-apps/${appId}/products`))
  const [isWorkflowOpen, setIsWorkflowOpen] = useState(pathname.startsWith(`/dashboard/create-app/all-apps/${appId}/operation-workflow`))
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
    setIsWalletsOpen(pathname.startsWith(`/dashboard/create-app/all-apps/${appId}/wallets`))
    setIsProductsOpen(pathname.startsWith(`/dashboard/create-app/all-apps/${appId}/products`))
    setIsWorkflowOpen(pathname.startsWith(`/dashboard/create-app/all-apps/${appId}/operation-workflow`))
  }, [pathname, appId])

  const navItems: NavItem[] = [
    {
      icon: <ShieldCheck size={20} />,
      label: "Admin",
      href: `/dashboard/create-app/all-apps/${appId}/admin`,
    },
    {
      icon: <FaWallet size={20} />,
      label: "Wallets",
      href: `/dashboard/create-app/all-apps/${appId}/wallets`,
      subItems: [
        { label: "Treasury wallet", href: `/dashboard/create-app/all-apps/${appId}/wallets/treasury` },
        { label: "Repayment wallet", href: `/dashboard/create-app/all-apps/${appId}/wallets/repayment` },
        { label: "KYC wallet", href: `/dashboard/create-app/all-apps/${appId}/wallets/kyc` },
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
      icon: <GitBranch size={20} />,
      label: "Operation Workflow",
      href: `/dashboard/create-app/all-apps/${appId}/operation-workflow`,
      subItems: [
        { label: "Loan Workflow", href: `/dashboard/create-app/all-apps/${appId}/operation-workflow/loan` },
        { label: "Mortgage Workflow", href: `/dashboard/create-app/all-apps/${appId}/operation-workflow/mortgage` },
      ],
    },
  ]

  return (
    <div className={`w-64 bg-white border-r border-[#E0D8C3] h-screen flex flex-col ${className}`}>
      {/* Logo */}
      <div className="p-6">
        <span className="text-xl font-bold text-[#9A813F]">PLATA</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4">
        <ul className="space-y-4">
          {navItems.map((item, index) => {
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
                  : item.label === "Operation Workflow"
                    ? isWorkflowOpen
                    : false
            const setIsOpen =
              item.label === "Wallets"
                ? setIsWalletsOpen
                : item.label === "Products"
                  ? setIsProductsOpen
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
                        isActive ? `${ACTIVE_ROW} [&_svg]:text-[#9A813F]` : `${INACTIVE_ROW} [&_svg]:text-slate-600`
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
                      isActive ? `${ACTIVE_ROW} [&_svg]:text-[#9A813F]` : `${INACTIVE_ROW} [&_svg]:text-slate-600`
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

        {/* Section Title */}
        <div className="mt-8 mb-2">
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide">Section Title</h3>
        </div>

        {/* Settings */}
        <ul>
          <li>
            <Link
              href={`/dashboard/create-app/all-apps/${appId}/settings`}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors [&_svg]:shrink-0 ${
                pathname.startsWith(`/dashboard/create-app/all-apps/${appId}/settings`)
                  ? `${ACTIVE_ROW} [&_svg]:text-[#9A813F]`
                  : `${INACTIVE_ROW} [&_svg]:text-slate-600`
              }`}
            >
              <RiSettings3Fill size={20} />
              <span>Settings</span>
            </Link>
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

export default AppSidebar
