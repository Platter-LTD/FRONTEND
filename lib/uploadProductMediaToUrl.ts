import { apiClient } from "@/lib/api"
import { fileToBase64 } from "@/lib/fileUtils"
import { getImageFileValidationError } from "@/lib/fileValidation"

const PRODUCT_UPLOAD_IMAGE = "/v1/products/upload-image"
const PRODUCT_UPLOAD_DOCUMENT_TEMPLATE = "/v1/products/upload-document-template"

/** Max size when using data-URL fallback so configuration JSON stays reasonable. */
const DATA_URL_FALLBACK_MAX_BYTES = 4 * 1024 * 1024

function dataUrlFallbackEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PRODUCT_UPLOAD_DATA_URL_FALLBACK === "true"
}

function pickString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null
}

/** Normalize Product MS (or proxy) JSON into a single public URL string. */
export function extractProductUploadImageUrl(data: unknown): string | null {
  if (data == null) return null
  if (typeof data === "string" && data.trim().startsWith("http")) return data.trim()

  if (typeof data !== "object") return null
  const d = data as Record<string, unknown>

  const nested = d.data
  if (nested && typeof nested === "object") {
    const inner = nested as Record<string, unknown>
    const deep = inner.data
    if (deep && typeof deep === "object") {
      const u =
        pickString((deep as Record<string, unknown>).url) ??
        pickString((deep as Record<string, unknown>).imageUrl) ??
        pickString((deep as Record<string, unknown>).fileUrl)
      if (u) return u
    }
    const u =
      pickString(inner.url) ??
      pickString(inner.imageUrl) ??
      pickString(inner.fileUrl) ??
      pickString(inner.previewUrl)
    if (u) return u
  }

  return (
    pickString(d.url) ??
    pickString(d.imageUrl) ??
    pickString(d.fileUrl) ??
    pickString(d.previewUrl) ??
    null
  )
}

function extractErrorMessage(data: unknown, fallback: string): string {
  if (typeof data === "string" && data.trim()) {
    const t = data.trim()
    if (t.startsWith("{") || t.startsWith("[")) {
      try {
        const parsed = JSON.parse(t) as unknown
        return extractErrorMessage(parsed, fallback)
      } catch {
        return t.slice(0, 500)
      }
    }
    return t.slice(0, 500)
  }
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>
    const e = o.error ?? o.message
    if (typeof e === "string" && e.trim()) return e.trim()
  }
  return fallback
}

/**
 * Uploads a file for product configuration via Next `POST /api/v1/products/upload-image` → Product MS,
 * then returns the URL for the configuration payload.
 *
 * Used by all configure flows: **loan**, **mortgage** (incl. property preview images, documents),
 * **savings**, **commodity**, **investment** (commodity drawer variant), and **other requirements**
 * document templates (`serializeOtherRequirementsForSubmit`).
 *
 * Multipart form-data contract:
 * - `file` (required, binary file)
 * - `appId` (optional, string; key prefix hint on server)
 *
 * Optional local dev: `NEXT_PUBLIC_PRODUCT_UPLOAD_DATA_URL_FALLBACK=true` embeds a data URL when upload
 * fails (only if Product MS accepts data URLs in those fields).
 */
type UploadPreviewImageSuccess = { success: true; url: string; key: string }
type UploadPreviewImageError = { success: false; error: string }
type UploadDocumentTemplateSuccess = { success: true; url: string; key: string }
type UploadDocumentTemplateError = { success: false; error: string }

export async function uploadProductMediaToUrl(
  file: File,
  opts?: { appId?: string | null },
): Promise<string> {
  const fileError = getImageFileValidationError(file)
  if (fileError) {
    throw new Error(fileError)
  }

  const form = new FormData()
  form.append("file", file, file.name || "upload")
  const appId = String(opts?.appId ?? "").trim()
  if (appId) form.append("appId", appId)

  try {
    const res = await apiClient.post<UploadPreviewImageSuccess | UploadPreviewImageError | unknown>(
      PRODUCT_UPLOAD_IMAGE,
      form,
    )
    const payload = res.data
    if (payload && typeof payload === "object" && "success" in payload && (payload as { success?: boolean }).success === false) {
      throw new Error(extractErrorMessage(payload, "Product image upload was rejected."))
    }
    const url = extractProductUploadImageUrl(payload)
    if (url) return url
    throw new Error(extractErrorMessage(payload, "Upload succeeded but no image URL was returned."))
  } catch (err: unknown) {
    const ax = err as { response?: { data?: unknown; status?: number } }
    const status = ax.response?.status
    const body = ax.response?.data
    const upstreamMsg =
      extractErrorMessage(body, status ? `Upload failed (${status})` : "Product image upload failed.")

    if (dataUrlFallbackEnabled()) {
      if (file.size > DATA_URL_FALLBACK_MAX_BYTES) {
        throw new Error(
          `File is too large for data-URL fallback (max ${DATA_URL_FALLBACK_MAX_BYTES / (1024 * 1024)} MiB). ${upstreamMsg}`,
        )
      }
      const b64 = await fileToBase64(file)
      const mime = file.type?.trim() ? file.type.trim() : "application/octet-stream"
      return `data:${mime};base64,${b64}`
    }

    throw new Error(upstreamMsg)
  }
}

/** Uploads a document template file and returns template URL. */
export async function uploadProductDocumentTemplateToUrl(
  file: File,
  opts?: { appId?: string | null },
): Promise<string> {
  const form = new FormData()
  form.append("file", file, file.name || "template")
  const appId = String(opts?.appId ?? "").trim()
  if (appId) form.append("appId", appId)

  try {
    const res = await apiClient.post<
      UploadDocumentTemplateSuccess | UploadDocumentTemplateError | unknown
    >(PRODUCT_UPLOAD_DOCUMENT_TEMPLATE, form)
    const payload = res.data
    if (
      payload &&
      typeof payload === "object" &&
      "success" in payload &&
      (payload as { success?: boolean }).success === false
    ) {
      throw new Error(extractErrorMessage(payload, "Document template upload was rejected."))
    }
    const url = extractProductUploadImageUrl(payload)
    if (url) return url
    throw new Error(extractErrorMessage(payload, "Upload succeeded but no template URL was returned."))
  } catch (err: unknown) {
    const ax = err as { response?: { data?: unknown; status?: number } }
    const status = ax.response?.status
    const body = ax.response?.data
    const upstreamMsg = extractErrorMessage(
      body,
      status ? `Template upload failed (${status})` : "Document template upload failed.",
    )
    throw new Error(upstreamMsg)
  }
}
