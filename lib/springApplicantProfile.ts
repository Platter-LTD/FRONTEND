export type SpringApplicantAuth = {
  userId?: string
  email?: string
  firstName?: string
  lastName?: string
  phone?: string
  userType?: string
  status?: string
  emailVerified?: boolean
  phoneVerified?: boolean
  country?: string
  appId?: string
  profilePictureUrl?: string
  lastLoginAt?: string
  kycStatus?: string
  kycCompleted?: boolean
}

export type SpringApplicantKycDocument = {
  type?: string
  fileName?: string
  fileType?: string
  fileSize?: number
  status?: string
  url?: string
}

export type SpringApplicantKyc = {
  status?: string
  completed?: boolean
  completedAt?: string
  personalInfo?: Record<string, unknown>
  documents?: SpringApplicantKycDocument[]
  verification?: Record<string, unknown>
}

export type SpringApplicantApplication = {
  productId?: string
  productName?: string
  productType?: string
  amount?: number
  currency?: string
  status?: string
  loanWorkflowStatus?: string
  email?: string
  applicantName?: string
  merchantId?: string
  appId?: string
  requirementSubmissions?: Record<string, unknown>[]
  guarantors?: Record<string, unknown>[]
  contractSnapshot?: Record<string, unknown>
  upstreamApplicationId?: string
  createdAt?: string
  updatedAt?: string
}

export type SpringApplicantProfile = {
  schemaVersion?: number
  fetchedAt?: string
  localApplicationId?: string
  plataApplicationId?: string
  userId?: string
  auth?: SpringApplicantAuth
  kyc?: SpringApplicantKyc
  application?: SpringApplicantApplication
  partialErrors?: string[]
}

export type SpringApplicantProfileResponse = {
  application?: Record<string, unknown>
  springApplicantProfile?: SpringApplicantProfile
  springApplicantProfileError?: string
  springApplicantProfileSkipped?: boolean
}

/** Normalize BFF / product-ms envelopes (nested `data`, snake_case fallbacks). */
export function normalizeSpringApplicantProfileResponse(raw: unknown): SpringApplicantProfileResponse {
  if (!raw || typeof raw !== "object") return {}
  const envelope = raw as Record<string, unknown>
  const data =
    envelope.data && typeof envelope.data === "object"
      ? (envelope.data as Record<string, unknown>)
      : envelope

  const profileErrorRaw =
    data.springApplicantProfileError ??
    data.spring_applicant_profile_error ??
    envelope.springApplicantProfileError ??
    envelope.spring_applicant_profile_error

  return {
    application:
      data.application && typeof data.application === "object"
        ? (data.application as Record<string, unknown>)
        : undefined,
    springApplicantProfile: (data.springApplicantProfile ??
      data.spring_applicant_profile) as SpringApplicantProfile | undefined,
    springApplicantProfileError:
      typeof profileErrorRaw === "string" && profileErrorRaw.trim() ? profileErrorRaw.trim() : undefined,
    springApplicantProfileSkipped: Boolean(
      data.springApplicantProfileSkipped ?? data.spring_applicant_profile_skipped,
    ),
  }
}

function pickStr(obj: Record<string, unknown> | undefined, ...keys: string[]): string {
  if (!obj) return ""
  for (const key of keys) {
    const v = obj[key]
    if (typeof v === "string" && v.trim()) return v.trim()
  }
  return ""
}

export function springApplicantDisplayName(
  auth?: SpringApplicantAuth,
  application?: SpringApplicantApplication,
): string {
  const fromAuth = [auth?.firstName, auth?.lastName].filter(Boolean).join(" ").trim()
  return (
    pickStr(application as Record<string, unknown> | undefined, "customerName", "applicantName") ||
    fromAuth ||
    auth?.email ||
    ""
  )
}

export function formatProfileCurrency(amount: unknown, currency = "NGN"): string {
  const n = typeof amount === "number" ? amount : typeof amount === "string" ? Number(amount) : NaN
  if (!Number.isFinite(n)) return "—"
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: currency || "NGN",
      maximumFractionDigits: 0,
    }).format(n)
  } catch {
    return `${currency} ${n.toLocaleString("en-NG")}`
  }
}

export function formatProfileDate(value: unknown): string {
  if (!value || (typeof value !== "string" && typeof value !== "number")) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
}

export function flattenPersonalInfo(info?: Record<string, unknown>): { label: string; value: string }[] {
  if (!info) return []
  const skip = new Set(["documents", "fileData", "password", "token"])
  return Object.entries(info)
    .filter(([k, v]) => !skip.has(k) && v != null && v !== "")
    .map(([k, v]) => ({
      label: k.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()),
      value:
        typeof v === "object"
          ? JSON.stringify(v)
          : typeof v === "boolean"
            ? v
              ? "Yes"
              : "No"
            : String(v),
    }))
    .slice(0, 24)
}

export function mortgageSelectionFromSnapshot(snapshot?: Record<string, unknown>) {
  const sel =
    (snapshot?.mortgageSelection as Record<string, unknown> | undefined) ||
    (snapshot?.finalSubmission as Record<string, unknown> | undefined)?.mortgageSelection as
      | Record<string, unknown>
      | undefined
  if (!sel || typeof sel !== "object") return null
  return {
    propertyName: pickStr(sel, "propertyName", "property"),
    quantity: sel.quantity,
    unitPrice: sel.unitPrice ?? sel.propertyValue,
    total: sel.total,
  }
}

export function requirementSubmissionLabel(r: Record<string, unknown>): string {
  return (
    pickStr(r, "label", "requirementType", "requirementName", "name", "requirementId") ||
    "Requirement"
  )
}

function humanizeFieldKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (s) => s.toUpperCase())
    .trim()
}

export type RequirementSubmissionDisplay =
  | { kind: "fields"; fields: { label: string; value: string }[] }
  | { kind: "text"; text: string }
  | { kind: "file"; fileName: string; url?: string }

/** Render requirement answers — `type: "json"` means structured fields in `value`, not the display label. */
export function parseRequirementSubmission(r: Record<string, unknown>): RequirementSubmissionDisplay {
  const submissionType = String(r.type ?? r.contentType ?? "").toLowerCase()
  const fileName = pickStr(r, "fileName", "documentName", "name")
  const url = submissionDocumentUrl(r)

  if (
    submissionType === "document" ||
    submissionType === "document_template" ||
    submissionType === "document_upload" ||
    url ||
    (fileName && !r.value)
  ) {
    if (fileName || url) {
      return { kind: "file", fileName: fileName || "Uploaded document", url: url || undefined }
    }
  }

  const raw = r.value ?? r.answer ?? r.submittedValue

  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const fields = Object.entries(raw as Record<string, unknown>)
      .filter(([, v]) => v != null && v !== "")
      .map(([k, v]) => ({
        label: humanizeFieldKey(k),
        value:
          typeof v === "boolean"
            ? v
              ? "Yes"
              : "No"
            : typeof v === "object"
              ? JSON.stringify(v)
              : String(v),
      }))
    if (fields.length) return { kind: "fields", fields }
  }

  if (typeof raw === "string" && raw.trim()) {
    return { kind: "text", text: raw.trim() }
  }

  if (fileName || url) {
    return { kind: "file", fileName: fileName || "Uploaded document", url: url || undefined }
  }

  if (Array.isArray(raw) && raw.length > 0) {
    return { kind: "text", text: raw.map((x) => String(x)).join(", ") }
  }

  return { kind: "text", text: "—" }
}

export type PlataSubmittedRequirement = {
  requirementType?: string
  contentType?: string
  templateFileUrl?: string
  submittedFileUrl?: string
  fileName?: string
  fileType?: string
  fileSize?: number
  documentsToDownloadIndex?: number
  otherRequirementIndex?: number
}

export type ApplicantUploadedDocument = {
  id: string
  label: string
  fileName: string
  url?: string
  templateUrl?: string
  fileType?: string
  fileSize?: number
  contentType?: string
  status?: string
  source: "requirement" | "kyc" | "plata"
}

export function formatFileSize(bytes: unknown): string {
  const n = typeof bytes === "number" ? bytes : typeof bytes === "string" ? Number(bytes) : NaN
  if (!Number.isFinite(n) || n <= 0) return ""
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function submissionDocumentUrl(r: Record<string, unknown>): string {
  return pickStr(
    r,
    "submittedFileUrl",
    "fileUrl",
    "url",
    "documentUrl",
    "downloadUrl",
  )
}

function submissionKey(r: Record<string, unknown>): string {
  return [
    pickStr(r, "requirementId", "requirementType", "label", "type"),
    submissionDocumentUrl(r),
    pickStr(r, "fileName"),
  ]
    .filter(Boolean)
    .join("|")
}

function pushUniqueSubmission(
  target: Record<string, unknown>[],
  seen: Set<string>,
  items: unknown[] | undefined,
) {
  if (!Array.isArray(items)) return
  for (const item of items) {
    if (!item || typeof item !== "object") continue
    const row = item as Record<string, unknown>
    const key = submissionKey(row) || JSON.stringify(row)
    if (seen.has(key)) continue
    seen.add(key)
    target.push(row)
  }
}

/** Merge requirement rows from every path in the spring-applicant-profile envelope. */
export function collectRequirementSubmissions(payload: SpringApplicantProfileResponse): Record<string, unknown>[] {
  const seen = new Set<string>()
  const merged: Record<string, unknown>[] = []
  const profile = payload.springApplicantProfile
  const plataApp = payload.application

  pushUniqueSubmission(merged, seen, profile?.application?.requirementSubmissions)
  const springSnapshot = profile?.application?.contractSnapshot
  if (springSnapshot && typeof springSnapshot === "object") {
    pushUniqueSubmission(
      merged,
      seen,
      (springSnapshot as Record<string, unknown>).requirementSubmissions as unknown[] | undefined,
    )
  }

  if (plataApp && typeof plataApp === "object") {
    pushUniqueSubmission(merged, seen, (plataApp as Record<string, unknown>).submittedRequirements as unknown[] | undefined)
    const plataSnapshot = (plataApp as Record<string, unknown>).contractSnapshot
    if (plataSnapshot && typeof plataSnapshot === "object") {
      pushUniqueSubmission(
        merged,
        seen,
        (plataSnapshot as Record<string, unknown>).requirementSubmissions as unknown[] | undefined,
      )
    }
  }

  return merged
}

export function isDocumentRequirementSubmission(r: Record<string, unknown>): boolean {
  const t = String(r.type ?? r.contentType ?? "").toLowerCase()
  if (
    t === "document" ||
    t === "file" ||
    t === "upload" ||
    t === "document_template" ||
    t === "document_upload"
  ) {
    return true
  }
  return Boolean(submissionDocumentUrl(r))
}

/** Normalize spring-applicant-profile envelope with full Plata application detail (submittedRequirements, guarantorKyc). */
export function mergeProfilePayloadWithPlataApplication(
  payload: SpringApplicantProfileResponse,
  plataApplication?: Record<string, unknown> | null,
): SpringApplicantProfileResponse {
  if (!plataApplication || typeof plataApplication !== "object") return payload

  const existingApp =
    payload.application && typeof payload.application === "object"
      ? (payload.application as Record<string, unknown>)
      : {}

  return {
    ...payload,
    application: {
      ...existingApp,
      ...plataApplication,
      submittedRequirements:
        plataApplication.submittedRequirements ?? existingApp.submittedRequirements,
      guarantorKyc: plataApplication.guarantorKyc ?? existingApp.guarantorKyc,
      contractSnapshot: plataApplication.contractSnapshot ?? existingApp.contractSnapshot,
    },
  }
}

export function collectGuarantors(payload: SpringApplicantProfileResponse): Record<string, unknown>[] {
  const plataApp =
    payload.application && typeof payload.application === "object"
      ? (payload.application as Record<string, unknown>)
      : undefined

  const fromPlataKyc = plataApp?.guarantorKyc
  if (Array.isArray(fromPlataKyc) && fromPlataKyc.length) {
    return fromPlataKyc as Record<string, unknown>[]
  }

  const fromProfile = payload.springApplicantProfile?.application?.guarantors
  if (Array.isArray(fromProfile) && fromProfile.length) {
    return fromProfile as Record<string, unknown>[]
  }

  const fromPlataGuarantors = plataApp?.guarantors
  if (Array.isArray(fromPlataGuarantors) && fromPlataGuarantors.length) {
    return fromPlataGuarantors as Record<string, unknown>[]
  }

  return []
}

export function collectApplicantUploadedDocuments(
  payload: SpringApplicantProfileResponse,
): ApplicantUploadedDocument[] {
  const docs: ApplicantUploadedDocument[] = []
  const seen = new Set<string>()

  const pushDoc = (doc: ApplicantUploadedDocument) => {
    const key = `${doc.source}|${doc.url ?? ""}|${doc.fileName}|${doc.label}`
    if (seen.has(key)) return
    seen.add(key)
    docs.push(doc)
  }

  for (const r of collectRequirementSubmissions(payload)) {
    if (!isDocumentRequirementSubmission(r)) continue
    const url = submissionDocumentUrl(r)
    const fileName = pickStr(r, "fileName", "documentName", "name") || "Uploaded document"
    const fileSizeRaw = r.fileSize
    const fileSize =
      typeof fileSizeRaw === "number"
        ? fileSizeRaw
        : typeof fileSizeRaw === "string"
          ? Number(fileSizeRaw)
          : undefined
    pushDoc({
      id: submissionKey(r) || fileName,
      label: requirementSubmissionLabel(r),
      fileName,
      url: url || undefined,
      templateUrl: pickStr(r, "templateFileUrl") || undefined,
      fileType: pickStr(r, "fileType", "mimeType") || undefined,
      fileSize: Number.isFinite(fileSize) ? fileSize : undefined,
      contentType: pickStr(r, "contentType") || undefined,
      status: pickStr(r, "status") || undefined,
      source: "requirement",
    })
  }

  const kycDocs = payload.springApplicantProfile?.kyc?.documents ?? []
  for (const doc of kycDocs) {
    const url = pickStr(doc as Record<string, unknown>, "url", "fileUrl", "documentUrl")
    const fileName = doc.fileName || doc.type || "KYC document"
    pushDoc({
      id: `kyc-${doc.type ?? fileName}`,
      label: doc.type?.replaceAll("_", " ") || "KYC document",
      fileName,
      url: url || undefined,
      fileType: doc.fileType,
      status: doc.status,
      source: "kyc",
    })
  }

  return docs
}

export function collectNonDocumentRequirements(
  payload: SpringApplicantProfileResponse,
): Record<string, unknown>[] {
  return collectRequirementSubmissions(payload).filter((r) => !isDocumentRequirementSubmission(r))
}

/** True when Plata-side application data is enough to render a review panel without Spring. */
export function hasPlataReviewContent(payload: SpringApplicantProfileResponse): boolean {
  const plataApp =
    payload.application && typeof payload.application === "object"
      ? (payload.application as Record<string, unknown>)
      : null
  if (!plataApp) return false

  if (Array.isArray(plataApp.submittedRequirements) && plataApp.submittedRequirements.length > 0) {
    return true
  }
  if (collectRequirementSubmissions(payload).length > 0) return true
  if (collectApplicantUploadedDocuments(payload).length > 0) return true

  if (pickStr(plataApp, "customerName", "applicantName", "email", "productName")) return true
  if (plataApp.amount != null || plataApp.contractSnapshot != null) return true

  return false
}

export type ApplicantCustomerInfo = {
  loanReason?: string
  maritalStatus?: string
  monthlyEarnings?: string
  repaymentSource?: string
  politicallyExposed?: string
  repayingWithSpouse?: string
}

function readProfileSubmissionValue(submissions: Record<string, unknown>[], ...keys: string[]): string {
  const normalizedKeys = keys.map((k) => k.toLowerCase())
  for (const r of submissions) {
    const type = pickStr(r, "requirementType", "label", "name", "requirementName").toLowerCase()
    if (!normalizedKeys.includes(type)) continue
    const val = r.value ?? r.text ?? r.answer
    if (typeof val === "string" && val.trim()) return val.trim()
    if (val && typeof val === "object") {
      const obj = val as { value?: unknown; other?: unknown }
      if (typeof obj.value === "string" && obj.value.trim()) {
        const base = obj.value.trim()
        if (base.toLowerCase() === "other" && typeof obj.other === "string" && obj.other.trim()) {
          return obj.other.trim()
        }
        return base
      }
    }
  }
  return ""
}

function formatPepAnswer(value: string): string {
  const v = value.toLowerCase()
  if (v === "yes") return "Yes — Politically Exposed Person"
  if (v === "no") return "No"
  return value || ""
}

function formatYesNo(value: string): string {
  const v = value.toLowerCase()
  if (v === "yes") return "Yes"
  if (v === "no") return "No"
  return value || ""
}

/** Customer questionnaire fields (PEP, spouse repayment, etc.) from requirement submissions. */
export function extractApplicantCustomerInfo(
  payload: SpringApplicantProfileResponse,
): ApplicantCustomerInfo {
  const submissions = collectRequirementSubmissions(payload)
  const snapshot =
    payload.application && typeof payload.application === "object"
      ? ((payload.application as Record<string, unknown>).contractSnapshot as Record<string, unknown> | undefined)
      : undefined
  const profileBlock =
    snapshot?.applicantProfile && typeof snapshot.applicantProfile === "object"
      ? (snapshot.applicantProfile as Record<string, unknown>)
      : undefined

  return {
    loanReason:
      readProfileSubmissionValue(submissions, "Loan Reason") ||
      pickStr(profileBlock, "loanReason", "loan_reason"),
    maritalStatus:
      readProfileSubmissionValue(submissions, "Marital Status") ||
      pickStr(profileBlock, "maritalStatus", "marital_status"),
    monthlyEarnings:
      readProfileSubmissionValue(submissions, "Monthly Earnings") ||
      pickStr(profileBlock, "monthlyEarnings", "monthly_earnings"),
    repaymentSource:
      readProfileSubmissionValue(submissions, "Source of Repayment") ||
      pickStr(profileBlock, "repaymentSource", "repayment_source"),
    politicallyExposed:
      readProfileSubmissionValue(submissions, "PEP Status", "Politically Exposed") ||
      pickStr(profileBlock, "politicallyExposed", "pepStatus", "pep"),
    repayingWithSpouse:
      readProfileSubmissionValue(submissions, "Repaying with Spouse") ||
      pickStr(profileBlock, "repayingWithSpouse", "repaying_with_spouse"),
  }
}

export function applicantCustomerInfoRows(info: ApplicantCustomerInfo): { label: string; value: string }[] {
  const rows = [
    { label: "Loan reason", value: info.loanReason || "" },
    { label: "Marital status", value: info.maritalStatus || "" },
    { label: "Monthly earnings", value: info.monthlyEarnings || "" },
    { label: "Source of repayment", value: info.repaymentSource || "" },
    { label: "PEP status", value: formatPepAnswer(info.politicallyExposed || "") },
    { label: "Repaying with spouse", value: formatYesNo(info.repayingWithSpouse || "") },
  ]
  return rows.filter((r) => r.value)
}

/** Spouse / co-borrower KYC rows when applicant indicated joint repayment. */
export function collectSpouseKycEntries(payload: SpringApplicantProfileResponse): Record<string, unknown>[] {
  const plataApp =
    payload.application && typeof payload.application === "object"
      ? (payload.application as Record<string, unknown>)
      : undefined

  const fromSpouseKyc = plataApp?.spouseKyc
  if (Array.isArray(fromSpouseKyc) && fromSpouseKyc.length) {
    return fromSpouseKyc as Record<string, unknown>[]
  }
  if (fromSpouseKyc && typeof fromSpouseKyc === "object") {
    return [fromSpouseKyc as Record<string, unknown>]
  }

  return collectGuarantors(payload).filter((g) => {
    const rel = String(g.relationship || g.role || g.type || "").toLowerCase()
    return rel.includes("spouse") || rel.includes("co-borrower") || rel.includes("coborrower")
  })
}
