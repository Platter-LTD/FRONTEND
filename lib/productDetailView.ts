/** Helpers for Product MS GET /api/v1/products/:id and dashboard product detail UI. */

import { unwrapProductDocument } from "@/lib/productConfigureHydrate"
import { isManagementFeeName, MANAGEMENT_FEE_NAME } from "@/lib/managementFee"

export function extractProductFromResponse(json: unknown): Record<string, unknown> | null {
  if (!json || typeof json !== "object") return null
  const o = json as Record<string, unknown>
  const d = o.data
  if (d && typeof d === "object" && !Array.isArray(d)) return unwrapProductDocument(d)
  if ("id" in o || "referenceNumber" in o || "_id" in o) return unwrapProductDocument(o)
  return null
}

/** Match URL segment (Mongo id, referenceNumber, or exact product name) to a row from GET …/products/app/:appId. */
export function resolveProductIdFromAppProducts(rows: unknown[], slug: string): string | null {
  if (!slug?.trim() || !Array.isArray(rows)) return null
  const decoded = decodeURIComponent(slug.trim())
  const lower = decoded.toLowerCase()
  for (const raw of rows) {
    if (!raw || typeof raw !== "object") continue
    const p = raw as Record<string, unknown>
    const id = p.id ?? p._id
    const idStr = id != null ? String(id) : ""
    if (idStr && idStr === decoded) return idStr
    const ref = p.referenceNumber != null ? String(p.referenceNumber) : ""
    if (ref && ref === decoded) return idStr || ref
    const name = p.name != null ? String(p.name) : ""
    if (name && (name === decoded || name.toLowerCase() === lower) && idStr) return idStr
  }
  return null
}

function num(v: unknown): number | undefined {
  if (v == null || v === "") return undefined
  if (typeof v === "number" && Number.isFinite(v)) return v
  const n = Number(String(v).replace(/,/g, "").replace(/%/g, "").trim())
  return Number.isFinite(n) ? n : undefined
}

function str(v: unknown): string | undefined {
  if (v == null) return undefined
  const s = String(v).trim()
  return s || undefined
}

function pickRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}

function hasMeaningfulTabs(product: Record<string, unknown>): boolean {
  for (const key of ["about", "structure", "requirements", "feesAndCharges"] as const) {
    const v = product[key]
    if (v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).length > 0) return true
  }
  return false
}

function isPercentFeeType(feeType: unknown): boolean {
  return String(feeType || "")
    .toLowerCase()
    .includes("percent")
}

function formatFeeDisplay(feeType: unknown, value: unknown): string | undefined {
  if (value == null || String(value).trim() === "") return undefined
  const raw = String(value).trim()
  if (isPercentFeeType(feeType)) {
    return raw.includes("%") ? raw : `${raw}%`
  }
  const n = num(raw)
  if (n != null) return n.toLocaleString("en-NG")
  return raw
}

function mapInterestRate(structure: Record<string, unknown>, product: Record<string, unknown>) {
  const interestRaw = structure.interestRate ?? product.interestRate
  if (interestRaw == null || interestRaw === "") return undefined
  if (typeof interestRaw === "string" || typeof interestRaw === "number") {
    const n = String(interestRaw).replace(/%/g, "").trim()
    if (!n) return undefined
    return { value: n, type: "percentage" as const, display: `${n}%` }
  }
  if (typeof interestRaw === "object") {
    const ir = interestRaw as Record<string, unknown>
    const value = ir.value ?? ir.rate ?? ir.amount
    if (value == null || String(value).trim() === "") return undefined
    const type = String(ir.type || "percentage")
    const cleaned = String(value).replace(/%/g, "").trim()
    return {
      value: cleaned,
      type,
      display: type.toLowerCase().includes("percent") ? `${cleaned}%` : cleaned,
    }
  }
  return undefined
}

function mapLoanTenure(about: Record<string, unknown>, structure: Record<string, unknown>, product: Record<string, unknown>) {
  const tenureRaw = about.tenure ?? about.duration ?? structure.tenure ?? product.tenure ?? product.duration
  if (tenureRaw == null || tenureRaw === "") return undefined
  if (typeof tenureRaw === "string" && tenureRaw.trim()) {
    const m = tenureRaw.trim().match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?/)
    if (m) {
      const unit = (m[2] || "month").replace(/s$/i, "")
      return { value: m[1], unit, display: `${m[1]} ${unit}(s)` }
    }
    return { value: tenureRaw.trim(), unit: "", display: tenureRaw.trim() }
  }
  if (typeof tenureRaw === "object") {
    const t = tenureRaw as Record<string, unknown>
    if (typeof t.label === "string" && t.label.trim()) {
      return { value: t.label.trim(), unit: "", display: t.label.trim() }
    }
    const value = t.value ?? t.min
    const unit = String(t.unit || "month").replace(/s$/i, "")
    if (value != null && String(value).trim()) {
      return { value: String(value), unit, display: `${value} ${unit}(s)` }
    }
  }
  return undefined
}

function findManagementFee(fees: unknown[]): { feeType: string; value: string; display: string } | undefined {
  for (const row of fees) {
    if (!row || typeof row !== "object") continue
    const fee = row as Record<string, unknown>
    if (!isManagementFeeName(fee.name)) continue
    const feeType = String(fee.feeType ?? fee.type ?? "Flat")
    const value = fee.value != null ? String(fee.value) : "0"
    const display = formatFeeDisplay(feeType, value) || "0"
    return { feeType, value, display }
  }
  return {
    feeType: "Flat",
    value: "0",
    display: "0",
  }
}

function mapPenalty(raw: unknown): { value: string | number; type: string; display: string } | undefined {
  if (!raw || typeof raw !== "object") return undefined
  const p = raw as Record<string, unknown>
  if (p.value == null || String(p.value).trim() === "") return undefined
  const type = isPercentFeeType(p.type ?? p.feeType) ? "percentage" : "flat"
  const value = p.value as string | number
  const display = formatFeeDisplay(type === "percentage" ? "Percent" : "Flat", value) || String(value)
  return { value, type, display }
}

/**
 * Maps new discriminator tabs (about / structure / feesAndCharges) to the legacy configuration
 * shape used by the product detail "Configuration" tab, or returns legacy `configuration` if present.
 */
export function mapProductToConfigurationView(product: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!product) return null

  const about = pickRecord(product.about)
  const structure = pickRecord(product.structure)
  const fees = pickRecord(product.feesAndCharges)
  const requirements = pickRecord(product.requirements)
  const meta = pickRecord(product.metadata)
  const legacy = pickRecord(product.configuration)

  const hasTabs = hasMeaningfulTabs(product)
  if (!hasTabs && Object.keys(legacy).length === 0) return null

  const loanAmount = pickRecord(structure.loanAmount)
  const feeRows = Array.isArray(fees.fees)
    ? fees.fees
    : Array.isArray(fees.charges)
      ? fees.charges
      : Array.isArray(legacy.charges)
        ? legacy.charges
        : []

  const lateRepayment = pickRecord(fees.lateRepayment)
  const latePenalties = Array.isArray(lateRepayment.penalties)
    ? lateRepayment.penalties
    : Array.isArray(fees.penalties)
      ? fees.penalties
      : []
  const firstLatePenalty = latePenalties[0]
  const forceful = Array.isArray(fees.forcefulWithdrawalPenalties) ? fees.forcefulWithdrawalPenalties : []
  const firstForceful = forceful[0]

  const management = findManagementFee(feeRows)
  const interestRate = mapInterestRate(structure, product) || mapInterestRate(legacy, product)
  const loanTenure = mapLoanTenure(about, structure, product) || mapLoanTenure(pickRecord(legacy), {}, product)

  const minAmount =
    num(structure.minLoanAmount) ??
    num(structure.minFacilityAmount) ??
    num(loanAmount.min) ??
    num(structure.mortgageAmount) ??
    num(legacy.minimumFacilityAmount)

  const maxAmount =
    num(structure.maxLoanAmount) ??
    num(structure.maxFacilityAmount) ??
    num(loanAmount.max) ??
    num(structure.mortgageAmount) ??
    num(legacy.maximumFacilityAmount)

  const currency =
    str(meta.currency) ||
    str(product.currency) ||
    str(legacy.currency) ||
    "NGN"

  const purpose =
    str(product.description) ||
    str(about.description) ||
    str(about.productDescription) ||
    str(legacy.purpose)

  const repaymentCycle =
    str(structure.repaymentFrequency) ||
    str(structure.repaymentSchedule) ||
    str(structure.repaymentStructure) ||
    str(legacy.repaymentCycle)

  const otherFees = feeRows
    .map((row) => {
      if (!row || typeof row !== "object") return null
      const fee = row as Record<string, unknown>
      if (isManagementFeeName(fee.name)) return null
      const name = str(fee.name)
      if (!name) return null
      const feeType = String(fee.feeType ?? fee.type ?? "Flat")
      const value = fee.value != null ? String(fee.value) : ""
      return {
        name,
        feeType,
        value,
        display: formatFeeDisplay(feeType, value) || value || "—",
      }
    })
    .filter(Boolean)

  return {
    purpose,
    currency,
    minimumFacilityAmount: minAmount,
    maximumFacilityAmount: maxAmount,
    mortgageAmount: num(structure.mortgageAmount),
    interestRate,
    interestMethod: str(structure.interestMethod) || str(product.interestMethod),
    loanTenure,
    repaymentCycle,
    repaymentWorkflow: str(structure.repaymentWorkflow),
    amortizationSchedule: str(structure.amortizationSchedule),
    acceptableNpa: str(structure.acceptableNPA ?? structure.acceptableNpa ?? product.acceptableNpa),
    equityRequirement: str(structure.equityRequirement ?? product.equityRequirement),
    equityContribution: num(structure.equityContribution ?? product.equityContribution),
    minimumRepaymentAmount: num(structure.minimumRepaymentAmount ?? legacy.minimumRepaymentAmount),
    managementFee: management ? num(management.value) : 0,
    managementFeeDisplay: management?.display ?? "0",
    managementFeeType: management?.feeType ?? "Flat",
    otherFees,
    penalty: mapPenalty(firstLatePenalty) || mapPenalty(legacy.penalty),
    withdrawalPenalty: mapPenalty(firstForceful) || mapPenalty(legacy.withdrawalPenalty),
    deductChargesOnLoan:
      fees.deductAllChargesOnLoan ?? fees.deductChargesOnLoan ?? legacy.deductChargesOnLoan,
    customerPayChargesBeforeDisbursement:
      fees.customerPaysChargesBeforeDisbursement ??
      fees.customerPayChargesBeforeDisbursement ??
      legacy.customerPayChargesBeforeDisbursement,
    enableLateRepaymentCharges:
      lateRepayment.enabled ?? fees.enableLateRepaymentCharges ?? legacy.enableLateRepaymentCharges,
    securityRequirements: requirements.securityRequirements ?? product.securityRequirements,
    documentRequirements: requirements.documentRequirements ?? product.documentRequirements,
    otherRequirements: requirements.otherRequirements ?? product.otherRequirements,
  }
}

/** Human-readable display helpers for configuration cards. */
export function displayOrNA(value: unknown): string {
  if (value == null) return "N/A"
  const s = String(value).trim()
  return s || "N/A"
}

export function displayMoney(amount: number | undefined, currency?: string): string {
  if (amount == null || !Number.isFinite(amount)) return "N/A"
  const prefix = currency ? `${currency} ` : ""
  return `${prefix}${amount.toLocaleString("en-NG")}`
}

export { MANAGEMENT_FEE_NAME }
