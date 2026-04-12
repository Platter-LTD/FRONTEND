/**
 * Whether a chosen file should be accepted as a PDF for compliance uploads.
 * Rejects obvious non-PDF MIME types (e.g. images) even if the name ends in `.pdf`.
 */
export function isPdfFile(file: File): boolean {
  const name = file.name.toLowerCase()
  const type = (file.type || "").toLowerCase()
  if (type.startsWith("image/")) return false
  if (type === "application/pdf" || type === "application/x-pdf") return true
  return name.endsWith(".pdf")
}
