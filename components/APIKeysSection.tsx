"use client"

import { useCallback, useEffect, useState, type ReactNode } from "react"
import { Copy, Eye, EyeOff, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  createMerchantApiKey,
  formatApiKeyDate,
  listMerchantApiKeys,
  maskSecret,
  revokeMerchantApiKey,
  type ApiKeyEnvironment,
  type MerchantApiKey,
} from "@/lib/merchantApiKeys"

interface APIKeysSectionProps {
  className?: string
  /** Optional note under the list (e.g. dashboard vs app settings). */
  footerNote?: ReactNode
}

async function copyText(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(`${label} copied`)
  } catch {
    toast.error("Could not copy to clipboard")
  }
}

function statusBadgeClass(status: string): string {
  const s = status.toLowerCase()
  if (s === "active") return "bg-green-100 text-green-800"
  if (s === "revoked") return "bg-red-100 text-red-800"
  if (s === "expired") return "bg-amber-100 text-amber-800"
  return "bg-gray-100 text-gray-800"
}

function envBadgeClass(env: string): string {
  return env === "test" ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-800"
}

function KeyValueRow({
  label,
  value,
  masked,
  onToggleMask,
  canToggleMask,
}: {
  label: string
  value: string
  masked?: boolean
  onToggleMask?: () => void
  canToggleMask?: boolean
}) {
  const display = !value ? "—" : masked ? maskSecret(value) : value
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 font-mono text-xs text-gray-800">
          {display}
        </code>
        {canToggleMask && onToggleMask ? (
          <button
            type="button"
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label={masked ? "Reveal secret" : "Hide secret"}
            onClick={onToggleMask}
          >
            {masked ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
        ) : null}
        <button
          type="button"
          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
          aria-label={`Copy ${label}`}
          disabled={!value}
          onClick={() => void copyText(value, label)}
        >
          <Copy className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export default function APIKeysSection({ className = "", footerNote }: APIKeysSectionProps) {
  const [keys, setKeys] = useState<MerchantApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [createdOpen, setCreatedOpen] = useState(false)
  const [revokeTarget, setRevokeTarget] = useState<MerchantApiKey | null>(null)

  const [name, setName] = useState("")
  const [environment, setEnvironment] = useState<ApiKeyEnvironment>("live")
  const [useExpiry, setUseExpiry] = useState(false)
  const [expiresInDays, setExpiresInDays] = useState("90")

  const [createdPublic, setCreatedPublic] = useState("")
  const [createdSecret, setCreatedSecret] = useState("")
  const [createdName, setCreatedName] = useState("")
  const [revealCreatedSecret, setRevealCreatedSecret] = useState(false)

  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({})

  const loadKeys = useCallback(async (force = false) => {
    setLoading(true)
    try {
      const list = await listMerchantApiKeys({ force })
      setKeys(list)
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : "Failed to load API keys")
      setKeys([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadKeys(false)
  }, [loadKeys])

  const resetCreateForm = () => {
    setName("")
    setEnvironment("live")
    setUseExpiry(false)
    setExpiresInDays("90")
  }

  const handleCreate = async () => {
    const trimmed = name.trim()
    if (trimmed && (trimmed.length < 3 || trimmed.length > 50)) {
      toast.error("Name must be between 3 and 50 characters")
      return
    }

    let expiry: number | undefined
    if (useExpiry) {
      const n = Number(expiresInDays)
      if (!Number.isInteger(n) || n < 1 || n > 365) {
        toast.error("Expiry must be between 1 and 365 days")
        return
      }
      expiry = n
    }

    try {
      setCreating(true)
      const result = await createMerchantApiKey({
        ...(trimmed ? { name: trimmed } : {}),
        environment,
        ...(expiry != null ? { expires_in_days: expiry } : {}),
      })

      setCreatedName(result.apiKey.name || trimmed || "API Key")
      setCreatedPublic(result.apiKey.public_key)
      setCreatedSecret(result.secretKey || result.apiKey.secret_key)
      setRevealCreatedSecret(false)
      setCreateOpen(false)
      resetCreateForm()
      setCreatedOpen(true)
      toast.success("API key created successfully")
      await loadKeys(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create API key")
    } finally {
      setCreating(false)
    }
  }

  const handleRevoke = async () => {
    if (!revokeTarget?.id) return
    try {
      setRevokingId(revokeTarget.id)
      await revokeMerchantApiKey(revokeTarget.id)
      toast.success("API key revoked")
      setRevokeTarget(null)
      await loadKeys(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke API key")
    } finally {
      setRevokingId(null)
    }
  }

  return (
    <section className={className}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-gray-900">API Keys</h2>
          <p className="text-sm text-gray-500">
            Merchant account keys for Plata gateway integrations (not per-app)
          </p>
        </div>
        <Button
          type="button"
          className="w-full shrink-0 rounded-md bg-[#9A813F] px-6 text-white hover:bg-[#8A7335] sm:w-auto"
          onClick={() => setCreateOpen(true)}
        >
          Generate New Key
        </Button>
      </div>

      <div className="space-y-4 rounded-lg border border-gray-200/80 bg-[#F0F2F5] p-6">
        {loading ? (
          Array.from({ length: 3 }).map((_, idx) => (
            <div key={`skeleton-key-${idx}`} className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
              <Skeleton className="mb-2 h-5 w-40" />
              <Skeleton className="mb-3 h-4 w-48" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))
        ) : keys.length === 0 ? (
          <div className="rounded-md border border-gray-200 bg-white p-6 text-center text-sm text-gray-500 shadow-sm">
            No API keys found. Generate your first key to get started.
          </div>
        ) : (
          keys.map((key) => {
            const secretRevealed = !!revealedSecrets[key.id]
            const isRevoked = String(key.status).toLowerCase() === "revoked"
            return (
              <div
                key={key.id}
                className="space-y-4 rounded-md border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-gray-900">{key.name || "API Key"}</p>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${envBadgeClass(String(key.environment))}`}
                      >
                        {key.environment || "live"}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(String(key.status))}`}
                      >
                        {key.status || "active"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      Created {formatApiKeyDate(key.created_at)}
                      {key.expires_at
                        ? ` · Expires ${formatApiKeyDate(key.expires_at)}`
                        : " · No expiry"}
                    </p>
                  </div>
                  {!isRevoked ? (
                    <button
                      type="button"
                      className="shrink-0 rounded-md p-1.5 text-red-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      aria-label="Revoke key"
                      disabled={revokingId === key.id}
                      onClick={() => setRevokeTarget(key)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>

                <div className="grid gap-3 sm:grid-cols-1">
                  <KeyValueRow label="PLATA_PUBLIC_KEY" value={key.public_key} />
                  <KeyValueRow
                    label="PLATA_SECRET_KEY"
                    value={key.secret_key}
                    masked={!secretRevealed}
                    canToggleMask={!!key.secret_key}
                    onToggleMask={() =>
                      setRevealedSecrets((prev) => ({ ...prev, [key.id]: !prev[key.id] }))
                    }
                  />
                </div>
              </div>
            )
          })
        )}
      </div>

      {footerNote ? <div className="mt-4 text-sm text-gray-500">{footerNote}</div> : null}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate API Key</DialogTitle>
            <DialogDescription>
              Create a public/secret key pair for server-to-server gateway auth. Leave expiry empty
              unless you need the key to auto-expire.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="api-key-name">Name (optional)</Label>
              <Input
                id="api-key-name"
                placeholder="e.g. Dashboard Production Key"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
              />
              <p className="text-xs text-gray-500">3–50 characters. Default: key-&lt;timestamp&gt;</p>
            </div>

            <div className="space-y-2">
              <Label>Environment</Label>
              <Select
                value={environment}
                onValueChange={(v) => setEnvironment(v as ApiKeyEnvironment)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select environment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="live">live</SelectItem>
                  <SelectItem value="test">test</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="rounded border-gray-300"
                  checked={useExpiry}
                  onChange={(e) => setUseExpiry(e.target.checked)}
                />
                Set expiry (days)
              </label>
              {useExpiry ? (
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(e.target.value)}
                />
              ) : (
                <p className="text-xs text-gray-500">
                  Recommended for integrator keys: no expiry (omit expires_in_days).
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#9A813F] text-white hover:bg-[#8A7335]"
              disabled={creating}
              onClick={() => void handleCreate()}
            >
              {creating ? "Creating..." : "Create key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Created credentials dialog */}
      <Dialog open={createdOpen} onOpenChange={setCreatedOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>API key created</DialogTitle>
            <DialogDescription>
              {createdName} — copy and store these credentials securely for your server integration.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <KeyValueRow label="PLATA_PUBLIC_KEY" value={createdPublic} />
            <KeyValueRow
              label="PLATA_SECRET_KEY"
              value={createdSecret}
              masked={!revealCreatedSecret}
              canToggleMask={!!createdSecret}
              onToggleMask={() => setRevealCreatedSecret((v) => !v)}
            />
            <p className="text-sm text-amber-800">
              Do not embed the secret key in browser or mobile apps. Rotate by creating a new key,
              updating consumers, then revoking the old one.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" className="bg-[#9A813F] text-white hover:bg-[#8A7335]" onClick={() => setCreatedOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke confirm */}
      <AlertDialog open={!!revokeTarget} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API key?</AlertDialogTitle>
            <AlertDialogDescription>
              This soft-revokes <strong>{revokeTarget?.name || "this key"}</strong>. Gateway requests
              using it will fail. You cannot undo revoke — create a new key to rotate.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!revokingId}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={!!revokingId}
              onClick={(e) => {
                e.preventDefault()
                void handleRevoke()
              }}
            >
              {revokingId ? "Revoking..." : "Revoke key"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
