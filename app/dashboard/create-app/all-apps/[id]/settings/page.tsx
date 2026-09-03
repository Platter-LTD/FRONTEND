"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Trash2, AlertTriangle, Loader2 } from "lucide-react"
import { getAccessToken } from "@/lib/cookieAuth"
import { Skeleton } from "@/components/ui/skeleton"
import { usePermissions } from "@/hooks/usePermissions"

interface App {
  id: string
  name: string
  alias?: string
  description?: string
  status: string
  [key: string]: unknown
}

const getAuthHeaders = () => {
  const token = typeof window !== "undefined" ? getAccessToken() : null
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  }
}

export default function SettingsPage() {
  const params = useParams()
  const appId = params.id as string
  const router = useRouter()
  const { actions } = usePermissions()
  const canArchiveApp = actions.archiveApplication
  const [app, setApp] = useState<App | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [confirmText, setConfirmText] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchApp = async () => {
      try {
        const response = await fetch(`/api/apps/${appId}`, {
          credentials: "include",
          headers: getAuthHeaders(),
        })
        const data = await response.json()
        if (data.success && data.data) {
          setApp(data.data)
        }
      } catch (err) {
        console.error("Failed to fetch app:", err)
      } finally {
        setLoading(false)
      }
    }

    if (appId) {
      void fetchApp()
    }
  }, [appId])

  const handleDeleteApp = async () => {
    if (confirmText !== app?.name) {
      setError("Please type the app name correctly to confirm deletion")
      return
    }

    try {
      setDeleting(true)
      setError(null)

      const response = await fetch(`/api/apps/${appId}`, {
        method: "DELETE",
        credentials: "include",
        headers: getAuthHeaders(),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete app")
      }

      router.push("/dashboard/create-app/all-apps")
    } catch (err) {
      console.error("Failed to delete app:", err)
      setError(err instanceof Error ? err.message : "Failed to delete app")
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 bg-white p-8">
        <Skeleton className="mb-2 h-8 w-28" />
        <Skeleton className="mb-6 h-4 w-48" />
        <div className="mb-8 rounded-lg border border-gray-200 p-6">
          <Skeleton className="mb-4 h-5 w-40" />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-40" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-28" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-white p-8">
      <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
      <p className="mb-6 text-sm text-gray-500">Adjust your preferences.</p>

      <div className="mb-8 rounded-lg border border-gray-200 p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">App Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">App Name</p>
            <p className="font-medium text-gray-900">{app?.name || "N/A"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">App ID</p>
            <p className="font-mono text-sm text-gray-900">{appId}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                app?.status === "approved" || app?.status === "active"
                  ? "bg-green-100 text-green-800"
                  : app?.status === "submitted"
                    ? "bg-blue-100 text-blue-800"
                    : app?.status === "rejected"
                      ? "bg-red-100 text-red-800"
                      : "bg-gray-100 text-gray-800"
              }`}
            >
              {app?.status || "draft"}
            </span>
          </div>
          {app?.alias ? (
            <div>
              <p className="text-sm text-gray-500">Alias</p>
              <p className="text-gray-900">{app.alias}</p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle className="text-red-600" size={20} />
          <h2 className="text-lg font-semibold text-red-900">Danger Zone</h2>
        </div>

        {!canArchiveApp ? (
          <p className="text-sm text-red-700">
            You don&apos;t have permission to archive or delete this application. Contact an Admin
            or account owner if you need this done.
          </p>
        ) : (
          <>
        <p className="mb-4 text-sm text-red-700">
          Deleting this app is permanent and cannot be undone. All associated data including
          products and configurations will be removed.
        </p>

        {!showDeleteConfirm ? (
          <Button
            variant="destructive"
            onClick={() => setShowDeleteConfirm(true)}
            className="bg-red-600 hover:bg-red-700"
          >
            <Trash2 size={16} className="mr-2" />
            Delete App
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-red-300 bg-white p-4">
              <p className="mb-3 text-sm text-gray-700">
                To confirm deletion, please type the app name: <strong>{app?.name}</strong>
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type app name to confirm"
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
            </div>
            <div className="flex gap-3">
              <Button
                variant="destructive"
                onClick={() => void handleDeleteApp()}
                disabled={deleting || confirmText !== app?.name}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} className="mr-2" />
                    Confirm Delete
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setConfirmText("")
                  setError(null)
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  )
}
