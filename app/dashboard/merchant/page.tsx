"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw, Loader2, Plus, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import CreateAppDrawer from "@/components/drawers/create-app-drawer"
import { TableSkeleton } from "@/components/ui/table-skeleton"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { fetchMerchantAppsThunk, setSelectedMerchantApp, type MerchantAppItem } from "@/store/merchantAppsSlice"
import { buildMerchantProductsUrl } from "@/lib/merchantAppNavigation"
import { useState } from "react"

export default function MerchantDashboardPage() {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const { apps, loading, error, fetchAttempted } = useAppSelector((s) => s.merchantApps)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isCreateAppOpen, setIsCreateAppOpen] = useState(false)

  useEffect(() => {
    if (fetchAttempted) return
    void dispatch(fetchMerchantAppsThunk())
  }, [dispatch, fetchAttempted])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await dispatch(fetchMerchantAppsThunk()).unwrap()
      toast.success("Apps refreshed")
    } catch {
      toast.error("Failed to refresh apps")
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleAppClick = (app: MerchantAppItem) => {
    dispatch(setSelectedMerchantApp({ id: app.id, name: app.name }))
    router.push(buildMerchantProductsUrl("/dashboard/merchant/products/all/loan", app.id))
  }

  const handleAppCreated = (_app: unknown) => {
    setIsCreateAppOpen(false)
    void dispatch(fetchMerchantAppsThunk())
    toast.success("App created successfully!")
  }

  const isLoading = loading && !fetchAttempted

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Your Apps</h1>
        <p className="text-sm text-gray-500 mt-1">View and manage your applications</p>
      </div>

      <div className="bg-[#2563EB] rounded-2xl p-8 text-white mb-10 shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-xl font-bold mb-2">Manage Your Products</h2>
          <p className="text-white/80 text-sm">Click on an app to view and toggle products for your customers.</p>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-900">All Apps</h2>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleRefresh()}
            disabled={isRefreshing || loading}
            className="gap-2"
          >
            {isRefreshing || loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setIsCreateAppOpen(true)}
            className="gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
          >
            <Plus className="h-4 w-4" />
            Create App
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border-none shadow-sm overflow-hidden">
        {isLoading ? (
          <TableSkeleton
            variant="grid"
            columnCount={6}
            rowCount={5}
            gridCols="1.5fr 1.5fr 1fr 1fr 1fr 0.8fr"
          />
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">Something went wrong</p>
            <p className="text-gray-600 text-center mb-6">{error}</p>
            <Button variant="outline" onClick={() => void handleRefresh()} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>
          </div>
        ) : apps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <p className="text-center">
              No apps available yet.
              <br />
              <span className="text-sm">Create an app using the &quot;Create App&quot; button above.</span>
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[1.5fr_1.5fr_1fr_1fr_1fr_0.8fr] gap-4 p-4 bg-[#F3F4F6] text-xs font-semibold text-gray-600 border-b border-gray-100">
              <div>App Name</div>
              <div>App ID</div>
              <div>Date Created</div>
              <div>Type</div>
              <div>Product Key</div>
              <div>Status</div>
            </div>
            <div className="divide-y divide-gray-50">
              {apps.map((app, i) => (
                <div
                  key={app.id || i}
                  onClick={() => handleAppClick(app)}
                  className="grid grid-cols-[1.5fr_1.5fr_1fr_1fr_1fr_0.8fr] gap-4 p-5 items-center hover:bg-gray-50 cursor-pointer transition-colors"
                  role="button"
                >
                  <div className="font-medium text-gray-900 text-sm">{app.name}</div>
                  <div className="text-gray-500 text-sm font-light truncate" title={app.id}>
                    {app.id?.slice(0, 18) || "N/A"}...
                  </div>
                  <div className="text-gray-500 text-sm">{app.dateCreated ?? "N/A"}</div>
                  <div className="text-gray-500 text-sm">{app.type || "Mobile App"}</div>
                  <div className="text-gray-500 text-sm">{app.key || app.alias || "N/A"}</div>
                  <div>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        app.status === "Inactive"
                          ? "bg-gray-100 text-gray-600"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {app.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <CreateAppDrawer
        isOpen={isCreateAppOpen}
        onClose={() => setIsCreateAppOpen(false)}
        onSuccess={handleAppCreated}
        accentColor="#2563EB"
      />
    </div>
  )
}
