import { uploadProductDocumentTemplateToUrl } from "@/lib/uploadProductMediaToUrl"

/** Product MS enum for `requirements.otherRequirements[].contentType`. */
export type OtherRequirementContentTypeApi = "document_upload" | "document_template"

/** Draft row in configure drawers (may include a file before submit). */
export type OtherRequirementDraft = {
  type: string
  contentType: string
  description: string
  file?: File | null
  /** Set when row was loaded from Product MS (re-save without re-upload). */
  templateFileUrl?: string | null
}

function matchesDocumentUploadLabel(raw: string): boolean {
  const t = raw.trim().toLowerCase().replace(/[_-]+/g, " ")
  if (!t) return false
  if (t.includes("document") && t.includes("upload")) return true
  if (t.replace(/\s+/g, "") === "documentupload") return true
  return false
}

function matchesDocumentTemplateLabel(raw: string): boolean {
  const t = raw.trim().toLowerCase().replace(/[_-]+/g, " ")
  if (!t) return false
  if (t.includes("document") && t.includes("template")) return true
  if (t.replace(/\s+/g, "") === "documenttemplate") return true
  return false
}

/** Requirement type dropdown: e.g. "Document upload". */
export function isDocumentUploadRequirementType(type: string): boolean {
  return matchesDocumentUploadLabel(type)
}

/** Content type dropdown: e.g. "Document upload" (common in Plata UI). */
export function isDocumentUploadContentType(contentType: string): boolean {
  return matchesDocumentUploadLabel(contentType)
}

/** Content type dropdown: e.g. "Document template". */
export function isDocumentTemplateContentType(contentType: string): boolean {
  return matchesDocumentTemplateLabel(contentType)
}

/**
 * Other requirements behavior (by selected Content Type):
 * - "Document template" => show file upload field
 * - "Document upload"   => show description text field
 * - anything else       => show description text field
 */
export function shouldUseOtherRequirementFileUpload(type: string, contentType: string): boolean {
  void type
  return isDocumentTemplateContentType(contentType)
}

/**
 * Maps UI / legacy labels to Product MS `contentType` enum.
 * Backend only accepts `document_upload` and `document_template` (and optionally empty).
 */
export function normalizeOtherRequirementContentTypeForApi(
  raw: string,
  opts?: { hasFile?: boolean },
): OtherRequirementContentTypeApi {
  const s = String(raw ?? "").trim()
  const lower = s.toLowerCase().replace(/[\s_-]+/g, "_").replace(/^_+|_+$/g, "")
  if (lower === "document_upload") return "document_upload"
  if (lower === "document_template") return "document_template"
  if (isDocumentTemplateContentType(s)) return "document_template"
  if (isDocumentUploadContentType(s)) return "document_upload"
  const snake = s
    .trim()
    .toLowerCase()
    .replace(/%/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
  if (snake === "document_upload" || (snake.includes("upload") && snake.includes("document")))
    return "document_upload"
  if (snake === "document_template" || (snake.includes("template") && snake.includes("document")))
    return "document_template"
  if (opts?.hasFile) return "document_template"
  return "document_upload"
}

/** Normalize API / saved rows into drawer draft shape. */
export function normalizeOtherRequirementRowFromApi(raw: unknown): OtherRequirementDraft {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}
  const ct = String(r.contentType ?? "").trim()
  const tpl =
    typeof r.templateFileUrl === "string" && r.templateFileUrl.trim()
      ? r.templateFileUrl.trim()
      : typeof r.url === "string" && r.url.trim() && ct.includes("template")
        ? r.url.trim()
        : undefined
  return {
    type: String(r.type ?? r.requirementType ?? "").trim(),
    contentType: ct,
    description: String(r.description ?? "").trim(),
    file: undefined,
    templateFileUrl: tpl,
  }
}

/**
 * Rows sent to `buildConfigurationPayload` → Product MS.
 * For `document_template`, Product MS expects `templateFileUrl` (URL from
 * `POST /api/v1/products/upload-document-template` via `uploadProductDocumentTemplateToUrl`).
 */
export async function serializeOtherRequirementsForSubmit(items: OtherRequirementDraft[]) {
  return Promise.all(
    items.map(async (item) => {
      const hasFile = !!item.file
      const existingTemplateUrl =
        typeof item.templateFileUrl === "string" && item.templateFileUrl.trim()
          ? item.templateFileUrl.trim()
          : ""
      const apiContentType = normalizeOtherRequirementContentTypeForApi(item.contentType, {
        hasFile: hasFile || !!existingTemplateUrl,
      })

      let templateFileUrl: string | undefined
      if (apiContentType === "document_template") {
        if (hasFile) {
          templateFileUrl = await uploadProductDocumentTemplateToUrl(item.file!)
        } else if (existingTemplateUrl) {
          templateFileUrl = existingTemplateUrl
        } else {
          throw new Error(
            "Document template requires a file. Attach a template file before saving, or reload the product if the template is already stored.",
          )
        }
      }

      const row: Record<string, unknown> = {
        type: String(item.type ?? "").trim(),
        contentType: apiContentType,
        description: item.description,
      }
      if (apiContentType === "document_template" && templateFileUrl) {
        row.templateFileUrl = templateFileUrl
      }
      return row
    }),
  )
}
