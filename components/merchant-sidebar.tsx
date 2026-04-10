"use client"

import type React from "react"
import Link from "next/link"
import { usePathname, useRouter } from 'next/navigation'
import { FaWallet, FaUsers, FaCubes } from "react-icons/fa"
import { IoMdCube } from "react-icons/io"
import { GitBranch, Receipt, CreditCard, Shield, FileText } from 'lucide-react'
import { RiSettings3Fill } from "react-icons/ri"
import { FiLogOut } from "react-icons/fi"
import { ChevronDown, ChevronUp } from 'lucide-react'
import { TbCodeCircle2Filled } from "react-icons/tb"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useAuth } from "@/hooks/useAuth"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getUserFromToken } from "@/lib/tokenManager"

interface NavItem {
  icon: React.ReactNode
  label: string
  href: string
  subItems?: { label: string; href: string }[]
}

interface MerchantSidebarProps {
  className?: string
}

const MerchantSidebar: React.FC<MerchantSidebarProps> = ({ className = "" }) => {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()

  const [isWalletsOpen, setIsWalletsOpen] = useState(pathname.startsWith("/dashboard/merchant/wallets"))
  const [isProductsOpen, setIsProductsOpen] = useState(pathname.startsWith("/dashboard/merchant/products"))
  const [isApplicationsOpen, setIsApplicationsOpen] = useState(pathname.startsWith("/dashboard/merchant/applications"))
  const [isOperationWorkflowOpen, setIsOperationWorkflowOpen] = useState(
    pathname.startsWith("/dashboard/merchant/operation-workflow"),
  )
  useEffect(() => {
    setIsWalletsOpen(pathname.startsWith("/dashboard/merchant/wallets"))
    setIsProductsOpen(pathname.startsWith("/dashboard/merchant/products"))
    setIsApplicationsOpen(pathname.startsWith("/dashboard/merchant/applications"))
    setIsOperationWorkflowOpen(pathname.startsWith("/dashboard/merchant/operation-workflow"))
  }, [pathname])

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

  const navItems: NavItem[] = [
    {
      icon: <FaWallet size={20} />,
      label: "Wallets",
      href: `/dashboard/merchant/wallets`,
      subItems: [
        { label: "Settlement Wallet", href: `/dashboard/merchant/wallets/settlement` },
        { label: "Billing Wallet", href: `/dashboard/merchant/wallets/billing` },
      ],
    },
    {
      icon: <Receipt size={20} />,
      label: "Transactions",
      href: `/dashboard/merchant/transactions`,
    },
    {
      icon: <FaUsers size={20} />,
      label: "Customer",
      href: `/dashboard/merchant/customer`,
    },
    {
      icon: <FileText size={20} />,
      label: "Applications",
      href: `/dashboard/merchant/applications`,
      subItems: [
        { label: "All Applications", href: `/dashboard/merchant/applications` },
        { label: "Pending Review", href: `/dashboard/merchant/applications/pending` },
      ],
    },
    {
      icon: <IoMdCube size={20} />,
      label: "Products",
      href: `/dashboard/merchant/products`,
      subItems: [
        { label: "All Product", href: `/dashboard/merchant/products/all` },
        { label: "Active Products", href: `/dashboard/merchant/products/active` },
      ],
    },
    {
      icon: <GitBranch size={20} />,
      label: "Operation Workflow",
      href: `/dashboard/merchant/operation-workflow`,
      subItems: [
        { label: "Loan Workflow", href: `/dashboard/merchant/operation-workflow/loan-workflow` },
        { label: "Mortgage Workflow", href: `/dashboard/merchant/operation-workflow/mortgage-workflow` },
      ],
    },
    {
      icon: <FaCubes size={20} />,
      label: "App Builder",
      href: `/dashboard/merchant/app-builder`,
    },
    {
      icon: <TbCodeCircle2Filled size={20} />,
      label: "Developer",
      href: `/dashboard/merchant/developer`,
    },
  ]

  return (
    <div className={`w-64 bg-white border-r border-gray-200 h-screen flex flex-col ${className}`}>
      {/* Logo */}
      <div className="p-6 border-b border-gray-100">
        <h1 className="text-2xl font-bold text-[#7C3AED]">PLATA</h1>
      </div>

      {/* Manage App button directly under the logo */}
      <div className="px-4 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="w-full bg-[#7C3AED] text-white hover:bg-[#6D28D9] hover:text-white border-none justify-center gap-2"
            >
              ABC Mortgage App
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem asChild>
              <Link href="/dashboard/create-app/all-apps">
                All Apps
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4">
        <ul className="space-y-1">
          {navItems.map((item, index) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
            const hasSubItems = item.subItems && item.subItems.length > 0
            const isOpen =
              item.label === "Wallets"
                ? isWalletsOpen
                : item.label === "Products"
                  ? isProductsOpen
                  : item.label === "Applications"
                    ? isApplicationsOpen
                    : item.label === "Operation Workflow"
                      ? isOperationWorkflowOpen
                      : false
            const setIsOpen =
              item.label === "Wallets"
                ? setIsWalletsOpen
                : item.label === "Products"
                  ? setIsProductsOpen
                  : item.label === "Applications"
                    ? setIsApplicationsOpen
                    : item.label === "Operation Workflow"
                      ? setIsOperationWorkflowOpen
                      : () => { }

            return (
              <li key={index}>
                {hasSubItems ? (
                  <div>
                    <button
                      onClick={() => setIsOpen(!isOpen)}
                      className={`flex items-center justify-between w-full px-3 py-2.5 rounded-md transition-colors ${isActive ? "bg-[#EDE9FE] text-gray-900 font-medium" : "text-gray-700 hover:bg-gray-50"
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        {item.icon}
                        <span className="text-sm">{item.label}</span>
                      </div>
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {/* Sub-items */}
                    {isOpen && (
                      <ul className="mt-1 space-y-0.5">
                        {item.subItems?.map((subItem, subIndex) => {
                          const isSubActive = pathname === subItem.href || pathname.startsWith(`${subItem.href}/`)
                          return (
                            <li key={subIndex}>
                              <Link
                                href={subItem.href}
                                className={`block px-3 py-2 ml-9 rounded-md text-sm transition-colors relative ${isSubActive
                                  ? "text-gray-900 font-medium bg-white"
                                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                                  }`}
                              >
                                {isSubActive && (
                                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-[#7C3AED] rounded-r"></span>
                                )}
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
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${isActive ? "bg-[#EDE9FE] text-gray-900 font-medium" : "text-gray-700 hover:bg-gray-50"
                      }`}
                  >
                    {item.icon}
                    <span className="text-sm">{item.label}</span>
                  </Link>
                )}
              </li>
            )
          })}
        </ul>

        {/* Section Title */}
        <div className="mt-8 mb-2">
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide px-3">Section Title</h3>
        </div>

        {/* Settings */}
        <ul className="space-y-1">
          <li>
            <Link
              href={`/dashboard/merchant/billing`}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${pathname.startsWith(`/dashboard/merchant/billing`)
                ? "bg-[#EDE9FE] text-gray-900 font-medium"
                : "text-gray-700 hover:bg-gray-50"
                }`}
            >
              <CreditCard size={20} />
              <span>Billing</span>
            </Link>
          </li>
          <li>
            <Link
              href={`/dashboard/merchant/settings`}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${pathname.startsWith(`/dashboard/merchant/settings`)
                ? "bg-[#EDE9FE] text-gray-900 font-medium"
                : "text-gray-700 hover:bg-gray-50"
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

export default MerchantSidebar
