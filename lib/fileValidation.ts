import { isPdfFile } from "@/lib/isPdfFile"

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".svg"]

export function isAllowedImageFile(file: File): boolean {
  const type = (file.type || "").toLowerCase()
  if (["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"].includes(type)) {
    return true
  }
  const name = file.name.toLowerCase()
  return IMAGE_EXTENSIONS.some((ext) => name.endsWith(ext))
}

export function getImageFileValidationError(file: File): string | null {
  if (!isAllowedImageFile(file)) {
    return "Invalid file type. Allowed image formats: PNG, JPEG, JPG, SVG, WebP."
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return "File size must not exceed 5MB."
  }
  return null
}

export function getPdfFileValidationError(file: File): string | null {
  if (!isPdfFile(file)) {
    return "Invalid file type. Only PDF files are allowed."
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return "File size must not exceed 5MB."
  }
  return null
}

/** PDF or image — used for mortgage propertyDocumentation uploads. */
export function getPdfOrImageFileValidationError(file: File): string | null {
  if (isAllowedImageFile(file) || isPdfFile(file)) {
    if (file.size > MAX_UPLOAD_BYTES) {
      return "File size must not exceed 5MB."
    }
    return null
  }
  return "Invalid file type. Allowed formats: PDF, PNG, JPEG, JPG, SVG, WebP."
}
