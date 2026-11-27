import type { ShareholderRow } from "@/providers/ComplianceFormProvider"
import { pickShareholderPhone } from "@/lib/pickShareholderPhone"

/** File metadata the API stores for a shareholder upload (`addressDocument`, legacy `uboDocument`, ...). */
export type ShareholderFile = {
  fileName?: string
  fileType?: string
  fileSize?: number
  fileUrl?: string
  uploadDate?: string
}

type Raw = Record<string, unknown>

const isObj = (v: unknown): v is Raw => !!v && typeof v === "object" && !Array.isArray(v)
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "")

/** KYC-link fields are never shown to the merchant (the backend no longer issues them). */
const KYC_KEYS = new Set(["kyc", "kycUrl", "kycURL", "kycLink", "kyc_link", "verificationUrl", "livenessUrl"])

/** Document fields on a shareholder record, with their display label. */
const FILE_FIELDS: Array<[string, string]> = [
  ["addressDocument", "Proof of address"],
  ["statusReport", "Status report"],
  ["uboDocument", "Proof of address (UBO)"],
  ["bankStatement", "Bank statement"],
]

/** Every uploaded file on a shareholder record that has a URL. */
export function shareholderFiles(raw: unknown): Array<{ label: string; file: ShareholderFile }> {
  if (!isObj(raw)) return []
  const out: Array<{ label: string; file: ShareholderFile }> = []
  for (const [key, label] of FILE_FIELDS) {
    const f = raw[key]
    if (isObj(f) && str(f.fileUrl)) out.push({ label, file: f as ShareholderFile })
  }
  return out
}

/** Show only the last 4 digits of a BVN / NIN. */
export const maskId = (v: unknown): string => {
  const s = str(v)
  return s.length > 4 ? `${"•".repeat(s.length - 4)}${s.slice(-4)}` : s
}

const statusOf = (s: unknown): ShareholderRow["status"] => {
  const v = str(s).toUpperCase()
  if (v === "APPROVED" || v === "SUCCESSFUL" || v === "VERIFIED") return "Successful"
  if (v === "REJECTED" || v === "FAILED") return "Failed"
  return "Pending"
}

/** Server id of a shareholder row (`_id` per the spec; `id` as a fallback). */
export function shareholderId(raw: unknown): string {
  const s = isObj(raw) ? raw : {}
  return str(s._id) || str(s.id) || str(s.shareholderId)
}

/** API shareholder (GET /kyc/business/{merchantId}/beneficial-owners) -> table row. */
export function toShareholderRow(raw: unknown): ShareholderRow {
  const s = isObj(raw) ? raw : {}
  return {
    id: shareholderId(s) || undefined,
    name: str(s.fullName) || str(s.name) || "Unknown",
    email: str(s.email),
    phone: pickShareholderPhone(s),
    date: String(s.submittedAt || s.createdAt || new Date().toISOString()).slice(0, 16).replace("T", " "),
    status: statusOf(s.status),
    raw: s,
  }
}

/**
 * Record shown in the "View details" drawer: the shareholder's fields with BVN/NIN masked,
 * KYC links and internal ids removed, and uploaded files grouped under "Documents".
 */
export function shareholderDetailsRecord(row: ShareholderRow): Record<string, unknown> {
  const raw = row.raw ?? {}
  const fileKeys = new Set(FILE_FIELDS.map(([k]) => k))
  const rest: Raw = {}
  for (const [k, v] of Object.entries(raw)) {
    if (KYC_KEYS.has(k) || fileKeys.has(k) || k === "_id" || k === "__v") continue
    rest[k] = v
  }
  return {
    fullName: row.name,
    email: row.email,
    phoneNumber: row.phone,
    ...rest,
    bvn: maskId(raw.bvn),
    nin: maskId(raw.nin),
    status: row.status,
    documents: shareholderFiles(raw).map(({ label, file }) => ({
      name: label,
      fileName: file.fileName,
      fileUrl: file.fileUrl,
      uploadDate: file.uploadDate,
    })),
  }
}

/**
 * Body row for PUT /kyc/business/beneficial-owners, keeping only the fields the spec accepts
 * (the endpoint replaces the whole array, so existing rows are resent).
 */
export function toBeneficialOwnerPayload(raw: unknown): Raw {
  const s = isObj(raw) ? raw : {}
  const out: Raw = {}
  for (const k of ["_id", "fullName", "email", "phoneNumber", "shareholderType", "bvn", "nin", "address", "addressDocument", "statusReport", "status"]) {
    const v = s[k]
    if (v != null && v !== "") out[k] = v
  }
  if (!out.fullName) out.fullName = str(s.name) || "Unknown"
  return out
}
