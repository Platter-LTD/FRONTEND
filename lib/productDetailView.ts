/** Helpers for Product MS GET /api/v1/products/:id and dashboard product detail UI. */

import { unwrapProductDocument } from "@/lib/productConfigureHydrate"

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
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

function hasMeaningfulTabs(product: Record<string, unknown>): boolean {
  for (const key of ["about", "structure", "requirements", "feesAndCharges"] as const) {
    const v = product[key]
    if (v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).length > 0) return true
  }
  return false
}

/**
 * Maps new discriminator tabs (about / structure / feesAndCharges) to the legacy configuration
 * shape used by the product detail "Configuration" tab, or returns legacy `configuration` if present.
 */
export function mapProductToConfigurationView(product: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!product) return null
  const legacy = product.configuration
  if (legacy && typeof legacy === "object" && !Array.isArray(legacy)) return legacy as Record<string, unknown>

  if (!hasMeaningfulTabs(product)) return null

  const about = (product.about as Record<string, unknown>) || {}
  const structure = (product.structure as Record<string, unknown>) || {}
  const fees = (product.feesAndCharges as Record<string, unknown>) || {}

  const interestRaw = structure.interestRate
  let interestRate: { value: string | number; type: string } | undefined
  if (typeof interestRaw === "string") {
    const n = interestRaw.replace(/%/g, "").trim()
    interestRate = { value: n, type: "percentage" }
  } else if (interestRaw && typeof interestRaw === "object") {
    const ir = interestRaw as Record<string, unknown>
    interestRate = {
      value: (ir.value as string | number) ?? "",
      type: String(ir.type || "percentage"),
    }
  }

  const tenureRaw = about.tenure ?? structure.tenure
  let loanTenure: { value: string; unit: string } | undefined
  if (typeof tenureRaw === "string" && tenureRaw.trim()) {
    const m = tenureRaw.trim().match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?/)
    loanTenure = m
      ? { value: m[1], unit: (m[2] || "month").replace(/s$/i, "") }
      : { value: tenureRaw.trim(), unit: "" }
  }

  const penalties = fees.penalties
  const firstPenalty =
    Array.isArray(penalties) && penalties.length > 0 && penalties[0] && typeof penalties[0] === "object"
      ? (penalties[0] as Record<string, unknown>)
      : null

  const meta = product.metadata as Record<string, unknown> | undefined

  return {
    purpose: (product.description as string) || (about.description as string),
    currency: meta?.currency as string | undefined,
    minimumFacilityAmount: num(structure.minLoanAmount ?? structure.minFacilityAmount),
    maximumFacilityAmount: num(structure.maxLoanAmount ?? structure.maxFacilityAmount),
    interestRate,
    loanTenure,
    repaymentCycle: (structure.repaymentFrequency || structure.repaymentSchedule) as string | undefined,
    minimumRepaymentAmount: num(structure.minimumRepaymentAmount),
    managementFee: num(fees.managementFee),
    penalty:
      firstPenalty && firstPenalty.value != null
        ? {
            value: firstPenalty.value,
            type: String(firstPenalty.type || "")
              .toLowerCase()
              .includes("percent")
              ? "percentage"
              : "flat",
          }
        : undefined,
    withdrawalPenalty: undefined,
  }
}
