/**
 * Tolerant parser for GET /api/v1/kyc/business/documents.
 *
 * The OpenAPI spec types `data` as a free-form object, so the exact shape is unconfirmed.
 * This accepts an array, a `{ documents | businessDocuments | items | docs: [...] }` wrapper
 * (under `data` or at the top level), or an object keyed by document type, and normalises
 * each entry to a UI tile id.
 */

export type SavedBusinessDoc = {
  /** UI tile id (coi, shareholders, ...). */
  tileId: string
  /** Backend document type, normalised to snake_case. */
  type: string
  /** Backend document id, when present (for GET /document/{documentId}). */
  documentId?: string
  fileName?: string
  fileUrl?: string
  /** File size in bytes, when the API returns it. */
  fileSize?: number
  status?: string
}

/** Backend doc type (snake_case) -> UI tile id. Mirrors mapToBusinessDocType in BusinessDocument.tsx. */
const TYPE_TO_TILE: Record<string, string> = {
  certificate_of_incorporation: "coi",
  business_registration: "coi",
  coi: "coi",
  list_of_shareholders: "shareholders",
  beneficial_ownership: "shareholders",
  shareholders: "shareholders",
  bank_statement: "bank_statement",
  bank: "bank_statement",
  data_privacy_policy: "data_privacy",
  data_privacy: "data_privacy",
  articles_of_association: "article",
  article_of_association: "article",
  articles_of_formation: "article",
  article: "article",
  proof_of_address: "proof_address",
  proof_address: "proof_address",
  aml_policies: "aml",
  aml_policy: "aml",
  aml: "aml",
  license: "license",
  operating_license: "license",
  director_identification: "director_id",
  director_id: "director_id",
}

const LIST_KEYS = ["documents", "businessDocuments", "business_documents", "items", "docs", "records", "results"]

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v)

const str = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v.trim() : undefined)

const posNum = (v: unknown): number | undefined => {
  const n = typeof v === "string" ? Number(v) : v
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : undefined
}

const normType = (v: unknown): string | undefined => {
  const s = str(v)
  if (!s) return undefined
  return s
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toLowerCase()
}

/** Find the list of document entries (or a type-keyed object) inside whatever the API returned. */
function locateEntries(raw: unknown): Array<[string | undefined, unknown]> {
  const fromArray = (arr: unknown[]): Array<[string | undefined, unknown]> => arr.map((e) => [undefined, e])

  if (Array.isArray(raw)) return fromArray(raw)
  if (!isObj(raw)) return []

  // Unwrap { success, data } and similar envelopes, then look for a list key.
  const layers: Record<string, unknown>[] = [raw]
  if (isObj(raw.data)) layers.push(raw.data)
  if (Array.isArray(raw.data)) return fromArray(raw.data)

  for (const layer of layers) {
    for (const key of LIST_KEYS) {
      const v = layer[key]
      if (Array.isArray(v)) return fromArray(v)
      if (isObj(v)) return Object.entries(v)
    }
  }

  // Object keyed directly by document type: { certificate_of_incorporation: {...}, ... }
  const last = layers[layers.length - 1]
  const keyed = Object.entries(last).filter(([k]) => TYPE_TO_TILE[normType(k) ?? ""])
  return keyed
}

export function parseBusinessDocuments(raw: unknown): SavedBusinessDoc[] {
  const out: SavedBusinessDoc[] = []
  for (const [key, entry] of locateEntries(raw)) {
    const e = isObj(entry) ? entry : {}
    const type =
      normType(e.type) ??
      normType(e.documentType) ??
      normType(e.document_type) ??
      normType(e.docType) ??
      normType(e.category) ??
      normType(e.name) ??
      normType(key)
    if (!type) continue
    const tileId = TYPE_TO_TILE[type]
    if (!tileId) continue

    const fileUrl =
      str(e.fileUrl) ?? str(e.file_url) ?? str(e.url) ?? str(e.documentUrl) ?? str(e.link) ?? (typeof entry === "string" ? str(entry) : undefined)
    out.push({
      tileId,
      type,
      documentId: str(e.id) ?? str(e._id) ?? str(e.documentId) ?? str(e.document_id),
      fileName: str(e.fileName) ?? str(e.file_name) ?? str(e.filename) ?? str(e.originalName),
      fileUrl,
      fileSize: posNum(e.fileSize) ?? posNum(e.file_size) ?? posNum(e.size),
      status: str(e.status),
    })
  }
  return out
}

/** One saved doc per tile (last one wins), keyed by UI tile id. */
export function savedDocsByTile(raw: unknown): Record<string, SavedBusinessDoc> {
  const map: Record<string, SavedBusinessDoc> = {}
  for (const d of parseBusinessDocuments(raw)) map[d.tileId] = d
  return map
}

/** Tiles the merchant may skip. Bank statement and articles are optional in the UI (backend required list is being relaxed). */
export const OPTIONAL_TILE_IDS = ["license", "bank_statement", "article"]

/** Tiles that must be on file for the documents step to count as complete. */
export const REQUIRED_TILE_IDS = ["coi", "shareholders", "data_privacy", "proof_address", "aml", "director_id"]
