import { fileToBase64 } from "@/lib/fileUtils"

/** Draft row in configure drawers (may include a file before submit). */
export type OtherRequirementDraft = {
  type: string
  contentType: string
  description: string
  file?: File | null
}

function matchesDocumentUploadLabel(raw: string): boolean {
  const t = raw.trim().toLowerCase().replace(/[_-]+/g, " ")
  if (!t) return false
  if (t.includes("document") && t.includes("upload")) return true
  if (t.replace(/\s+/g, "") === "documentupload") return true
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

/** Show file upload instead of description when either column selects document upload. */
export function shouldUseOtherRequirementFileUpload(type: string, contentType: string): boolean {
  return isDocumentUploadRequirementType(type) || isDocumentUploadContentType(contentType)
}

/** Shape sent to product configuration / backend. */
export async function serializeOtherRequirementsForSubmit(items: OtherRequirementDraft[]) {
  return Promise.all(
    items.map(async (item) => {
      const row: Record<string, unknown> = {
        type: item.type,
        contentType: item.contentType,
        description: item.description,
      }
      if (item.file) {
        row.fileName = item.file.name
        row.fileType = item.file.type
        row.fileSize = item.file.size
        row.fileBase64 = await fileToBase64(item.file)
      }
      return row
    }),
  )
}
