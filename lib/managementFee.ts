/** Exact name product-ms seeds via ensureDefaultManagementFee. Do not rename. */
export const MANAGEMENT_FEE_NAME = "Management Fee"

export type ManagementFeeRow = {
  name: string
  feeType: string
  value: string
}

export const DEFAULT_MANAGEMENT_FEE: ManagementFeeRow = {
  name: MANAGEMENT_FEE_NAME,
  feeType: "Flat",
  value: "0",
}

export function isManagementFeeName(name?: unknown): boolean {
  return String(name ?? "").trim().toLowerCase() === MANAGEMENT_FEE_NAME.toLowerCase()
}

function normalizeFeeRow(raw: unknown): ManagementFeeRow | null {
  if (!raw || typeof raw !== "object") return null
  const row = raw as Record<string, unknown>
  const name = String(row.name ?? "").trim()
  if (!name) return null
  const feeType = String(row.feeType ?? row.type ?? "Flat").trim() || "Flat"
  const valueRaw = row.value
  // Preserve "" so merchants can clear the Management Fee value while typing.
  // Only default to "0" when the field is missing (null/undefined).
  const value =
    valueRaw === undefined || valueRaw === null
      ? isManagementFeeName(name)
        ? "0"
        : ""
      : String(valueRaw).trim()
  return {
    name: isManagementFeeName(name) ? MANAGEMENT_FEE_NAME : name,
    feeType,
    value,
  }
}

/**
 * Pin Management Fee first with exact name. Merchants may edit feeType/value only.
 * If missing, seeds Flat / 0 (API would re-seed on save anyway).
 */
export function ensureManagementFeePinned<T extends ManagementFeeRow>(
  fees: unknown[] | null | undefined,
): T[] {
  const mapped = (Array.isArray(fees) ? fees : [])
    .map((row) => normalizeFeeRow(row))
    .filter((row): row is ManagementFeeRow => Boolean(row))

  const mgmtIdx = mapped.findIndex((row) => isManagementFeeName(row.name))
  const management: ManagementFeeRow =
    mgmtIdx >= 0
      ? { ...mapped[mgmtIdx], name: MANAGEMENT_FEE_NAME }
      : { ...DEFAULT_MANAGEMENT_FEE }

  const rest = mapped.filter((_, index) => index !== mgmtIdx)
  return [management, ...rest] as T[]
}

/** Coerce empty Management Fee value to 0 / 0% for PUT (UI may temporarily be blank). */
export function finalizeFeesForSubmit<T extends ManagementFeeRow>(
  fees: unknown[] | null | undefined,
): T[] {
  return ensureManagementFeePinned<T>(fees).map((row) => {
    if (!isManagementFeeName(row.name)) return row
    const trimmed = String(row.value ?? "").trim()
    if (trimmed) return { ...row, name: MANAGEMENT_FEE_NAME }
    const isPercent = String(row.feeType || "").toLowerCase().includes("percent")
    return {
      ...row,
      name: MANAGEMENT_FEE_NAME,
      value: isPercent ? "0%" : "0",
    }
  })
}
