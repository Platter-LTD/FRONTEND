"use client"

import { useState } from "react"
import { Drawer } from "@/components/drawer"
import { Loader2 } from "lucide-react"
import { WEBSITE_URL_PREFIX } from "@/lib/websiteUrl"
import walletService from "@/lib/services/walletService"
import { apiClient } from "@/lib/api"
import { getAccessToken } from "@/lib/cookieAuth"

interface CreateAppDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (app: any) => void
  accentColor?: string
}

export default function CreateAppDrawer({ isOpen, onClose, onSuccess, accentColor = "#9A813F" }: CreateAppDrawerProps) {
  const hoverColor = accentColor === "#7C3AED" ? "#6D28D9" : "#8A7335"
  const [formData, setFormData] = useState({
    name: "",
    websiteUrl: WEBSITE_URL_PREFIX,
    alias: "",
    description: ""
  })
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }))
    }
    // Clear submit error when user starts typing
    if (errors.submit) {
      setErrors(prev => ({ ...prev, submit: "" }))
    }
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!formData.name.trim()) {
      newErrors.name = "App name is required"
    }

    if (!formData.websiteUrl.trim() || formData.websiteUrl === WEBSITE_URL_PREFIX) {
      newErrors.websiteUrl = "Website URL is required"
    } else if (!formData.websiteUrl.match(/^https?:\/\/.+/)) {
      newErrors.websiteUrl = "Please enter a valid URL (starting with http:// or https://)"
    }

    if (!formData.alias.trim()) {
      newErrors.alias = "Alias is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsLoading(true)
    setErrors({})

    try {
      const token = getAccessToken()

      // Derive merchantId from JWT for body + wallet step (same as before)
      let merchantId: string | undefined
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]))
          merchantId =
            payload?.user_merchant_id ||
            payload?.userMerchantId ||
            payload?.merchantId ||
            payload?.userId ||
            payload?.id ||
            payload?.sub
        } catch {
          // ignore decode errors
        }
      }

      // Same path as other authed calls: cookie token via includeAuth + 401 refresh interceptor
      const response = await apiClient.post(
        "/apps",
        {
          name: formData.name,
          websiteUrl: formData.websiteUrl,
          alias: formData.alias,
          description: formData.description,
          ...(merchantId ? { merchantId } : {}),
          source: "spring-app",
        },
        { includeAuth: true },
      )

      const result = response.data as {
        success?: boolean
        data?: unknown
        error?: string
        message?: string
        details?: { message?: string }
      }

      if (result.success && result.data) {
        const createdApp = result.data.app || result.data
        const createdAppId = createdApp.appId || createdApp.id

        // Wallets are expected to exist as soon as an app is created.
        // Call the wallet creation endpoint (idempotent on backend if implemented).
        if (merchantId && createdAppId) {
          try {
            await walletService.merchant.createAllMerchantWallets(merchantId, createdAppId)
          } catch (walletErr) {
            console.error("Failed to create merchant wallets:", walletErr)
            setErrors({
              submit: "App created, but failed to create wallets. Please try again.",
            })
            return
          }
        }

        onSuccess(createdApp)
        setFormData({ name: "", websiteUrl: WEBSITE_URL_PREFIX, alias: "", description: "" })
        setErrors({})
        onClose()
      } else {
        const errorMessage =
          result.error || result.message || result.details?.message || "Failed to create app"
        console.error("Create app error:", errorMessage, result)
        setErrors({ submit: errorMessage })
      }
    } catch (error: unknown) {
      console.error("Error creating app:", error)
      const ax = error as { response?: { data?: { error?: string; message?: string } } }
      const msg =
        ax?.response?.data?.error ||
        ax?.response?.data?.message ||
        (error instanceof Error ? error.message : null) ||
        "An unexpected error occurred. Please try again."
      setErrors({ submit: msg })
    } finally {
      setIsLoading(false);
    }
  }

  const handleClose = () => {
    setFormData({ name: "", websiteUrl: WEBSITE_URL_PREFIX, alias: "", description: "" })
    setErrors({})
    onClose()
  }

  return (
    <Drawer
      open={isOpen}
      onOpenChange={handleClose}
      title="Create Application"
      subtitle="Fill in the details below to create your new microservice application"
    >
      {/* @ts-ignore */}
      <form onSubmit={handleSubmit} className="space-y-6" style={{ '--accent': accentColor, '--accent-hover': hoverColor } as React.CSSProperties}>
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-3">
            Application Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            placeholder="Enter application name"
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent text-sm bg-gray-50 focus:bg-white transition-colors"
          />
          {errors.name && <p className="text-red-500 text-xs mt-2">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-3">
            Website URL *
          </label>
          <input
            type="url"
            value={formData.websiteUrl}
            onChange={(e) => {
              const v = e.target.value
              const next = (v.startsWith("https://") || v.startsWith("http://") || v === "") ? v : WEBSITE_URL_PREFIX + v
              handleInputChange("websiteUrl", next)
            }}
            placeholder="example.com"
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent text-sm bg-gray-50 focus:bg-white transition-colors"
          />
          {errors.websiteUrl && <p className="text-red-500 text-xs mt-2">{errors.websiteUrl}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-3">
            Alias *
          </label>
          <input
            type="text"
            value={formData.alias}
            onChange={(e) => handleInputChange("alias", e.target.value)}
            placeholder="Enter application alias"
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent text-sm bg-gray-50 focus:bg-white transition-colors"
          />
          {errors.alias && <p className="text-red-500 text-xs mt-2">{errors.alias}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-3">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange("description", e.target.value)}
            placeholder="Brief description of your application"
            rows={4}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent text-sm bg-gray-50 focus:bg-white transition-colors resize-none"
          />
        </div>

        {/* Error Message */}
        {errors.submit && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{errors.submit}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-6 border-t border-gray-100 mt-6">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 font-medium transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            style={{ backgroundColor: accentColor }}
            className="flex-1 px-6 py-3 text-white rounded-lg hover:opacity-90 disabled:opacity-50 font-medium transition-colors flex items-center justify-center gap-2"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Application"
            )}
          </button>
        </div>
      </form>
    </Drawer>
  )
}