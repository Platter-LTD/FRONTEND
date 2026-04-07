"use client"

import { Suspense, useEffect, useMemo } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import ProductTabs from "@/components/product-tabs"
import ProductCards from "@/components/product-cards"
import { Loader2 } from "lucide-react"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { setSelectedMerchantApp } from "@/store/merchantAppsSlice"

interface MerchantProductsWrapperProps {
  category: "Loan" | "Mortgage" | "Savings" | "Commodity" | "Investment"
  theme?: "spring" | "platter"
}

function MerchantProductsContent({ category }: MerchantProductsWrapperProps) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const dispatch = useAppDispatch()
  const { apps, selectedAppId, selectedAppName, fetchAttempted } = useAppSelector((s) => s.merchantApps)

  const urlAppId = searchParams.get("appId")

  useEffect(() => {
    if (!fetchAttempted || apps.length === 0 || urlAppId) return
    if (!selectedAppId) {
      dispatch(setSelectedMerchantApp({ id: apps[0].id, name: apps[0].name }))
    }
  }, [fetchAttempted, apps, urlAppId, selectedAppId, dispatch])

  useEffect(() => {
    if (!urlAppId || apps.length === 0) return
    const match = apps.find((a) => a.id === urlAppId)
    if (match && match.id !== selectedAppId) {
      dispatch(setSelectedMerchantApp({ id: match.id, name: match.name }))
    }
  }, [urlAppId, apps, selectedAppId, dispatch])

  useEffect(() => {
    if (urlAppId || !selectedAppId || !pathname.includes("/products/all/")) return
    const params = new URLSearchParams(searchParams.toString())
    params.set("appId", selectedAppId)
    router.replace(`${pathname}?${params.toString()}`)
  }, [urlAppId, selectedAppId, pathname, router, searchParams])

  const effectiveAppId = urlAppId || selectedAppId || undefined

  const titleName = useMemo(() => {
    if (urlAppId && apps.length) {
      const a = apps.find((x) => x.id === urlAppId)
      if (a) return a.name
    }
    return selectedAppName
  }, [urlAppId, apps, selectedAppName])

  if (fetchAttempted && apps.length === 0) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <p className="text-gray-600 mt-2">Create an app under Your Apps to manage products.</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          {titleName ? `${titleName} — Products` : "All Products"}
        </h1>
        {effectiveAppId && (
          <p className="text-sm text-gray-500 mt-1">Manage product visibility for your customers</p>
        )}
      </div>
      <div className="border-b border-gray-200 mb-6">
        <ProductTabs showBorder={false} appId={effectiveAppId} />
      </div>
      <ProductCards category={category} appId={effectiveAppId} />
    </div>
  )
}

export default function MerchantProductsWrapper(props: MerchantProductsWrapperProps) {
  return (
    <Suspense
      fallback={
        <div className="p-8 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#7C3AED]" />
        </div>
      }
    >
      <MerchantProductsContent {...props} />
    </Suspense>
  )
}
