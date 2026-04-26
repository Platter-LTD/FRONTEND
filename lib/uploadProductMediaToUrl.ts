import { ComplianceService } from "@/lib/services/complianceService"

/** Upload via compliance document storage; returns a public URL for Product MS and related APIs. */
export async function uploadProductMediaToUrl(file: File): Promise<string> {
  const up = await ComplianceService.uploadDocument(file)
  if (!up.success || !up.url?.trim()) {
    throw new Error(up.error || "File upload failed. Please try again.")
  }
  return up.url.trim()
}
