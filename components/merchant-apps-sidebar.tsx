"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutGrid, User, ShieldCheck, Code2, Settings, Search, LogOut } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/hooks/useAuth"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getUserFromToken } from "@/lib/tokenManager"

export default function MerchantAppsSidebar() {
  const pathname = usePathname()
  const { user } = useAuth()
  const tokenUser = typeof window !== "undefined" ? getUserFromToken() : null
  const effectiveUser = user ?? tokenUser

  const displayName = effectiveUser
    ? [effectiveUser.firstName, effectiveUser.lastName].filter(Boolean).join(" ").trim()
    : ""
  const displayEmail = effectiveUser?.email ?? ""
  const initialsFromName = effectiveUser
    ? `${(effectiveUser.firstName ?? "").trim().charAt(0)}${(effectiveUser.lastName ?? "").trim().charAt(0)}`.toUpperCase()
    : ""
  const initials = initialsFromName || (displayEmail?.charAt(0) ?? "U").toUpperCase()

  const navItems = [
    { icon: <LayoutGrid size={20} />, label: "Apps", href: "/dashboard/merchant" },
    { icon: <User size={20} />, label: "Admin", href: "/dashboard/merchant/admin" },
    { icon: <ShieldCheck size={20} />, label: "Compliance", href: "/dashboard/merchant/compliance" },
    { icon: <Code2 size={20} />, label: "Developer", href: "/dashboard/merchant/developer" },
  ]

  return (
    <div className="w-64 bg-[#F9F9FB] border-r border-gray-200 h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6">
        <h1 className="text-2xl font-bold text-[#7C3AED]">PLATA</h1>
      </div>

      {/* Search */}
      <div className="px-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <Input 
            placeholder="Search" 
            className="pl-9 h-10 bg-white border-gray-200"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-[#E0E7FF] text-[#7C3AED]" // Active state based on purple tint in screenshot
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          )
        })}

        <div className="pt-8 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
           Section Title
        </div>
        
        <Link
          href="/dashboard/merchant/settings"
          className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium mt-1 ${
            pathname === "/dashboard/merchant/settings" || pathname.startsWith("/dashboard/merchant/settings/")
              ? "bg-[#E0E7FF] text-[#7C3AED]"
              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          }`}
        >
          <Settings size={20} />
          Settings
        </Link>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3 group cursor-pointer">
            <div className="relative">
                <Avatar className="w-10 h-10 border-2 border-white shadow-sm">
                  <AvatarFallback className="text-sm font-semibold text-gray-900">{initials}</AvatarFallback>
                </Avatar>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{displayName}</p>
                <p className="text-xs text-gray-500 truncate">{displayEmail}</p>
            </div>
            <LogOut size={18} className="text-gray-400 group-hover:text-gray-600" />
        </div>
      </div>
    </div>
  )
}
