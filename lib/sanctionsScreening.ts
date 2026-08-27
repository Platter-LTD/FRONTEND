/**
 * Chipper / OpenSanctions PEP screening on LOAN & MORTGAGE applications.
 * Populated automatically on submit — no separate merchant “run check” call.
 */

export type SanctionsScreeningStatus =
  | "clear"
  | "flagged"
  | "error"
  | "skipped"
  | "pending"
  | string

export type SanctionsScreeningMatch = {
  id?: string
  caption?: string
  schema?: string
  datasets?: string[]
  matchType?: string
  countries?: string[]
}

export type SanctionsScreening = {
  status?: SanctionsScreeningStatus
  flagged?: boolean
  checkedAt?: string
  checkedName?: string
  provider?: string
  dataset?: string
  message?: string
  matchCount?: number
  matches?: SanctionsScreeningMatch[]
  rawResponse?: Record<string, unknown> | null
  selfDeclaredPep?: boolean | null
}

export type PepSearchUiResult = "positive" | "negative" | "pending" | "error" | "skipped"

export function parseSanctionsScreening(raw: unknown): SanctionsScreening | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null
  const row = raw as Record<string, unknown>
  const matchesRaw = Array.isArray(row.matches) ? row.matches : []
  const matches: SanctionsScreeningMatch[] = matchesRaw
    .filter((m): m is Record<string, unknown> => !!m && typeof m === "object")
    .map((m) => ({
      id: m.id != null ? String(m.id) : undefined,
      caption: m.caption != null ? String(m.caption) : undefined,
      schema: m.schema != null ? String(m.schema) : undefined,
      datasets: Array.isArray(m.datasets) ? m.datasets.map(String) : undefined,
      matchType: m.matchType != null ? String(m.matchType) : undefined,
      countries: Array.isArray(m.countries) ? m.countries.map(String) : undefined,
    }))

  return {
    status: row.status != null ? String(row.status) : undefined,
    flagged: typeof row.flagged === "boolean" ? row.flagged : undefined,
    checkedAt: row.checkedAt != null ? String(row.checkedAt) : undefined,
    checkedName: row.checkedName != null ? String(row.checkedName) : undefined,
    provider: row.provider != null ? String(row.provider) : undefined,
    dataset: row.dataset != null ? String(row.dataset) : undefined,
    message: row.message != null ? String(row.message) : undefined,
    matchCount: typeof row.matchCount === "number" ? row.matchCount : matches.length || undefined,
    matches,
    rawResponse:
      row.rawResponse && typeof row.rawResponse === "object"
        ? (row.rawResponse as Record<string, unknown>)
        : null,
    selfDeclaredPep:
      typeof row.selfDeclaredPep === "boolean"
        ? row.selfDeclaredPep
        : row.selfDeclaredPep === null
          ? null
          : undefined,
  }
}

export function extractSanctionsScreeningFromApplication(
  application?: Record<string, unknown> | null,
): SanctionsScreening | null {
  if (!application) return null
  return (
    parseSanctionsScreening(application.sanctionsScreening) ||
    parseSanctionsScreening(application.sanctions_screening)
  )
}

export function pepSearchUiResult(screening: SanctionsScreening | null): PepSearchUiResult | null {
  if (!screening) return null
  if (screening.flagged === true || screening.status === "flagged") return "positive"
  if (screening.status === "error") return "error"
  if (screening.status === "skipped") return "skipped"
  if (screening.status === "pending") return "pending"
  if (screening.flagged === false || screening.status === "clear") return "negative"
  return "pending"
}

function titleCaseWords(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function pepLevelOfExposure(screening: SanctionsScreening): string {
  if (screening.flagged !== true && screening.status !== "flagged") return "None"
  const matchType = (screening.matches?.[0]?.matchType || "").toLowerCase()
  if (matchType.includes("exact")) return "High"
  if (matchType.includes("fuzzy") || matchType.includes("partial")) return "Medium"
  if ((screening.matchCount ?? screening.matches?.length ?? 0) > 0) return "High"
  return "Review required"
}

export function pepClassificationLabel(screening: SanctionsScreening): string {
  const dataset = (screening.dataset || "").toLowerCase()
  const schema = screening.matches?.[0]?.schema
  const base =
    dataset.includes("chipper") || dataset.includes("pep")
      ? "Domestic PEP"
      : dataset
        ? titleCaseWords(dataset)
        : "PEP screening match"
  if (schema && schema.toLowerCase() !== "person") {
    return `${base} — ${titleCaseWords(schema)}`
  }
  if (dataset.includes("chipper")) return `${base} — Chipper PEPs`
  return base
}

/** OpenSanctions Chipper CSV rarely includes office titles — fall back to matched caption. */
export function pepPresentPosition(screening: SanctionsScreening): string {
  const raw = screening.rawResponse
  const fromRaw =
    raw && typeof raw === "object"
      ? String(
          (raw as Record<string, unknown>).presentPosition ||
            (raw as Record<string, unknown>).position ||
            (raw as Record<string, unknown>).currentPosition ||
            "",
        ).trim()
      : ""
  if (fromRaw) return fromRaw
  const caption = screening.matches?.[0]?.caption || screening.checkedName
  if (caption) return `Matched name: ${caption}`
  return "Not available from screening source"
}

export function pepPreviousPosition(screening: SanctionsScreening): string {
  const raw = screening.rawResponse
  const fromRaw =
    raw && typeof raw === "object"
      ? String(
          (raw as Record<string, unknown>).previousPosition ||
            (raw as Record<string, unknown>).formerPosition ||
            "",
        ).trim()
      : ""
  if (fromRaw) return fromRaw
  const matchType = screening.matches?.[0]?.matchType
  if (matchType) return `Match type: ${titleCaseWords(matchType)}`
  return "Not available from screening source"
}

export function pepSourceNote(screening: SanctionsScreening): string {
  const provider = screening.provider || "OpenSanctions"
  const dataset = screening.dataset || "PEP dataset"
  let when = "just now"
  if (screening.checkedAt) {
    try {
      when = new Date(screening.checkedAt).toLocaleString()
    } catch {
      when = screening.checkedAt
    }
  }
  return `Source: ${provider} · ${dataset} · Retrieved ${when}`
}
