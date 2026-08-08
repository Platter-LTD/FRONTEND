"use client"

import type React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutGrid,
  Plus,
  DollarSign,
  Users,
  Briefcase,
  Package,
  Wallet,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react"
import { useEffect, useState } from "react"
import Tippy from "@tippyjs/react"
import "tippy.js/dist/tippy.css"
import { useAuth } from "@/hooks/useAuth"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getUserFromToken } from "@/lib/tokenManager"

interface NavItem {
  icon: React.ReactNode
  label: string
  href: string
}

interface AdminSidebarProps {
  className?: string
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ className = "" }) => {
  const pathname = usePathname()
  const { user } = useAuth()
  const tokenUser = typeof window !== "undefined" ? getUserFromToken() : null
  const effectiveUser = user ?? tokenUser
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("plata-admin-sidebar-collapsed") === "1")
    } catch {
      /* ignore */
    }
  }, [])

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem("plata-admin-sidebar-collapsed", next ? "1" : "0")
      } catch {
        /* ignore */
      }
      return next
    })
  }

  const displayName = effectiveUser
    ? [effectiveUser.firstName, effectiveUser.lastName].filter(Boolean).join(" ").trim()
    : ""
  const displayEmail = effectiveUser?.email ?? ""
  const initialsFromName = effectiveUser
    ? `${(effectiveUser.firstName ?? "").trim().charAt(0)}${(effectiveUser.lastName ?? "").trim().charAt(0)}`.toUpperCase()
    : ""
  const initials = initialsFromName || (displayEmail?.charAt(0) ?? "U").toUpperCase()

  const navItems: NavItem[] = [
    { icon: <LayoutGrid size={20} />, label: "Overview", href: "/admin/overview" },
    { icon: <Plus size={20} />, label: "App", href: "/admin/app" },
    { icon: <Package size={20} />, label: "Product", href: "/admin/product" },
    { icon: <Wallet size={20} />, label: "Wallet and Balances", href: "/admin/wallet-and-balances" },
    { icon: <Users size={20} />, label: "Users", href: "/admin/users" },
    { icon: <Briefcase size={20} />, label: "Business", href: "/admin/business" },
    { icon: <DollarSign size={20} />, label: "Billing", href: "/admin/billing" },
    { icon: <Package size={20} />, label: "Compliance", href: "/admin/compliance" },
  ]

  return (
    <div
      className={`${collapsed ? "w-[72px]" : "w-64"} bg-[#1E2130] border-r border-gray-800 h-screen flex flex-col transition-[width] duration-200 ease-in-out shrink-0 ${className}`}
    >
      <div className={`flex items-center gap-2 border-b border-gray-800 ${collapsed ? "justify-center p-3" : "justify-between p-4"}`}>
        {!collapsed && (
          <h1 className="text-xl text-white min-w-0 truncate">
            <span className="font-bold">Spring</span> <span className="font-normal">Admin</span>
          </h1>
        )}
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="shrink-0 rounded-md p-1.5 text-gray-400 hover:bg-[#2D3142] hover:text-white"
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      <nav className={`flex-1 overflow-y-auto ${collapsed ? "px-2" : "px-4"} pt-3`}>
        <ul className="space-y-1">
          {navItems.map((item, index) => {
            const isActive = pathname.startsWith(item.href)
            const link = (
              <Link
                href={item.href}
                aria-label={item.label}
                className={`flex items-center rounded-md transition-colors ${
                  collapsed ? "justify-center px-2 py-2.5" : "space-x-3 px-3 py-2.5"
                } ${isActive ? "bg-[#2D3142] text-white" : "text-gray-300 hover:bg-[#2D3142] hover:text-white"}`}
              >
                {item.icon}
                {!collapsed && <span className="text-sm">{item.label}</span>}
              </Link>
            )
            return (
              <li key={index}>
                {collapsed ? (
                  <Tippy content={item.label} placement="right" arrow>
                    {link}
                  </Tippy>
                ) : (
                  link
                )}
              </li>
            )
          })}
        </ul>

        {!collapsed && (
          <div className="mt-8 mb-2 px-3 pt-8 border-t border-gray-700">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Section Title</h3>
          </div>
        )}

        <ul className={collapsed ? "mt-4 border-t border-gray-700 pt-4" : ""}>
          <li>
            {collapsed ? (
              <Tippy content="Settings" placement="right" arrow>
                <Link
                  href="/admin/settings"
                  aria-label="Settings"
                  className={`flex items-center justify-center rounded-md px-2 py-2.5 text-sm transition-colors ${
                    pathname.startsWith("/admin/settings")
                      ? "bg-[#2D3142] text-white"
                      : "text-gray-300 hover:bg-[#2D3142] hover:text-white"
                  }`}
                >
                  <Settings size={20} />
                </Link>
              </Tippy>
            ) : (
              <Link
                href="/admin/settings"
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                  pathname.startsWith("/admin/settings")
                    ? "bg-[#2D3142] text-white"
                    : "text-gray-300 hover:bg-[#2D3142] hover:text-white"
                }`}
              >
                <Settings size={20} />
                <span>Settings</span>
              </Link>
            )}
          </li>
        </ul>
      </nav>

      <div className={`border-t border-gray-700 p-4 ${collapsed ? "px-2" : ""}`}>
        <div className={`flex items-center ${collapsed ? "flex-col gap-2" : "justify-between"}`}>
          <div className={`flex items-center ${collapsed ? "" : "space-x-3"}`}>
            <div className="relative">
              <Avatar className="w-9 h-9">
                <AvatarFallback className="text-sm font-semibold text-white bg-[#1E2130]">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#1E2130]" />
            </div>
            {!collapsed && (
              <div>
                <p className="text-sm font-medium text-white">{displayName}</p>
                <p className="text-xs text-gray-400">{displayEmail}</p>
              </div>
            )}
          </div>
          <LogOut size={20} className="text-gray-400 cursor-pointer hover:text-gray-300" />
        </div>
      </div>
    </div>
  )
}

export default AdminSidebar
