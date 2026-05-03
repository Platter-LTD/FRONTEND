/**
 * Display formatting for currency / amount text fields (thousand separators).
 * Submit paths should use `stripAmountGrouping` before parsing numbers.
 */

/** Remove grouping commas for API / parseFloat. */
export function stripAmountGrouping(display: string): string {
  return display.replace(/,/g, "")
}

/** Keep digits and at most one decimal point. */
export function sanitizeAmountDigits(raw: string): string {
  const cleaned = stripAmountGrouping(raw).replace(/[^0-9.]/g, "")
  const firstDot = cleaned.indexOf(".")
  if (firstDot === -1) return cleaned
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "")
}

/** Add thousand separators to the integer part (supports optional decimals). */
export function formatThousandsFromDigits(digits: string): string {
  if (!digits) return ""
  const neg = digits.startsWith("-")
  let s = neg ? digits.slice(1) : digits
  const parts = s.split(".")
  let intPart = parts[0] ?? ""
  if (!intPart && parts.length > 1) intPart = "0"
  intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  const frac = parts.length > 1 ? `.${parts[1]}` : ""
  return (neg ? "-" : "") + intPart + frac
}

/** Format unknown API / hydrate values for display in amount inputs. */
export function formatAmountDisplayFromUnknown(raw: unknown): string {
  if (raw === undefined || raw === null || raw === "") return ""
  return formatThousandsFromDigits(sanitizeAmountDigits(String(raw)))
}
