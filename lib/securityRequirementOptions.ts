/** Labels always merged into API “security requirements” options (loan + mortgage configure). */
export const EXTRA_SECURITY_REQUIREMENT_OPTIONS = [
  "Collateral",
  "Cheque",
  "Bank Guarantee",
  "None",
  "Other",
] as const

export const OTHER_SECURITY_CANONICAL_LABEL = "Other"

/** Product MS `requirements.security` keys. Unknown keys are stripped (stripUnknown: true). */
export const PRODUCT_MS_SECURITY_FLAGS = [
  "acceptCheque",
  "realEstateProperties",
  "otherProperties",
  "guarantor",
  "bankGuarantee",
  "savingsAccount",
  "noSecurity",
] as const

export type ProductMsSecurityFlag = (typeof PRODUCT_MS_SECURITY_FLAGS)[number]
export type ProductMsSecurity = Record<ProductMsSecurityFlag, boolean>

function truthySecurityFlag(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1"
}

function normalizeSecurityToken(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[%]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

const SECURITY_FLAG_FALLBACKS: Array<{ test: (key: string) => boolean; fallback: string }> = [
  { test: (k) => k.includes("guarantor"), fallback: "Guarantor" },
  { test: (k) => k.includes("savings") && k.includes("account"), fallback: "Savings Account" },
  { test: (k) => k === "none" || k.includes("no security") || k.replace(/\s+/g, "") === "nosecurity", fallback: "None" },
  { test: (k) => k.includes("accept cheque") || k.includes("cheque") || k === "check", fallback: "Cheque" },
  { test: (k) => k.includes("bank") && k.includes("guarantee"), fallback: "Bank Guarantee" },
  { test: (k) => k.includes("real estate") || k.includes("collateral") || /\bpropert(y|ies)\b/.test(k), fallback: "Collateral" },
  { test: (k) => k.includes("other"), fallback: OTHER_SECURITY_CANONICAL_LABEL },
]

export function mergeSecurityRequirementDisplayOptions(apiLabels: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  const add = (label: string) => {
    const trimmed = String(label ?? "").trim()
    if (!trimmed) return
    const key = trimmed.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    out.push(trimmed)
  }
  for (const o of apiLabels ?? []) add(o)
  for (const extra of EXTRA_SECURITY_REQUIREMENT_OPTIONS) {
    if (!seen.has(extra.toLowerCase())) {
      seen.add(extra.toLowerCase())
      out.push(extra)
    }
  }
  return out
}

export function matchSecurityOptionLabel(raw: unknown, options: string[], fallback = ""): string {
  const target = normalizeSecurityToken(raw)
  if (!target) return fallback
  const direct = options.find((o) => normalizeSecurityToken(o) === target)
  if (direct) return direct
  const squeezedTarget = target.replace(/\s+/g, "")
  const fuzzy = options.find((o) => normalizeSecurityToken(o).replace(/\s+/g, "") === squeezedTarget)
  if (fuzzy) return fuzzy
  const mapped = SECURITY_FLAG_FALLBACKS.find((row) => row.test(target))
  if (mapped) {
    const fromFallback = options.find((o) => normalizeSecurityToken(o) === normalizeSecurityToken(mapped.fallback))
    if (fromFallback) return fromFallback
    const fromIncludes = options.find((o) => mapped.test(normalizeSecurityToken(o)))
    if (fromIncludes) return fromIncludes
    return mapped.fallback
  }
  return fallback || String(raw ?? "").trim()
}

export function isNoneSecurityOption(option: string): boolean {
  const s = normalizeSecurityToken(option)
  return s === "none" || s.includes("no security") || s.replace(/\s+/g, "") === "nosecurity"
}

export function isOtherSecurityOption(option: string): boolean {
  const s = normalizeSecurityToken(option)
  return s === "other" || s.startsWith("other ") || s.includes("other properties")
}

export function isOtherSecuritySelected(selected: string[]): boolean {
  return selected.some((s) => isOtherSecurityOption(s))
}

export function isNoneSecuritySelected(selected: string[]): boolean {
  return selected.some((s) => isNoneSecurityOption(s))
}

/** None and Other are exclusive: turning one on clears every other toggle. */
export function nextSecuritySelection(prev: string[], option: string, checked: boolean): string[] {
  const key = option.trim().toLowerCase()
  if (!checked) {
    return prev.filter((item) => item.trim().toLowerCase() !== key)
  }
  if (isNoneSecurityOption(option) || isOtherSecurityOption(option)) {
    return [option]
  }
  const withoutExclusive = prev.filter(
    (item) => !isNoneSecurityOption(item) && !isOtherSecurityOption(item) && item.trim().toLowerCase() !== key,
  )
  return [...withoutExclusive, option]
}

/** Split API / stored strings into toggle state + free-text for “Other”. */
export function splitStoredSecurityRequirements(raw: string[]): { toggles: string[]; otherSpecification: string } {
  const toggles: string[] = []
  let otherSpecification = ""
  const pushOther = () => {
    if (!toggles.some((t) => isOtherSecurityOption(t))) {
      toggles.push(OTHER_SECURITY_CANONICAL_LABEL)
    }
  }
  for (const rawItem of raw) {
    const item = String(rawItem ?? "").trim()
    if (!item) continue
    if (/^other$/i.test(item) || isOtherSecurityOption(item)) {
      pushOther()
      continue
    }
    const m = item.match(/^other\s*[:：]\s*(.+)$/i)
    if (m) {
      pushOther()
      otherSpecification = m[1].trim()
      continue
    }
    toggles.push(item)
  }
  return { toggles, otherSpecification }
}

/** Selected labels for the configure form (not sent as a Product MS array). */
export function serializeSecurityRequirements(selected: string[], otherSpecification: string): string[] {
  const detail = otherSpecification.trim()
  return selected
    .map((s) => String(s ?? "").trim())
    .filter((s) => s && s !== "__existing__")
    .map((s) => {
      if (isOtherSecurityOption(s)) {
        return detail ? `${OTHER_SECURITY_CANONICAL_LABEL}: ${detail}` : OTHER_SECURITY_CANONICAL_LABEL
      }
      return s
    })
}

function emptySecurityFlags(): ProductMsSecurity {
  return {
    acceptCheque: false,
    realEstateProperties: false,
    otherProperties: false,
    guarantor: false,
    bankGuarantee: false,
    savingsAccount: false,
    noSecurity: false,
  }
}

/**
 * Map UI labels to Product MS `requirements.security` booleans.
 * Always returns every canonical key so PUT deep-merge can turn flags off.
 */
export function lendingSecurityBooleansFromSelection(selected: string[]): ProductMsSecurity {
  const flags = emptySecurityFlags()
  const labels = selected.map((s) => String(s ?? "").trim()).filter((s) => s && s !== "__existing__")
  if (labels.some((s) => isNoneSecurityOption(s))) {
    flags.noSecurity = true
    return flags
  }
  if (labels.some((s) => isOtherSecurityOption(s) || /^other\s*[:：]/i.test(s))) {
    flags.otherProperties = true
    return flags
  }
  for (const item of labels) {
    const s = item.toLowerCase().replace(/\s+/g, " ")
    if (s.includes("guarantor")) flags.guarantor = true
    else if (s.includes("bank") && s.includes("guarantee")) flags.bankGuarantee = true
    else if (s.includes("cheque") || s.includes("check")) flags.acceptCheque = true
    else if (s.includes("savings") && s.includes("account")) flags.savingsAccount = true
    else if (s.includes("collateral") || s.includes("real estate") || /\bpropert(y|ies)\b/.test(s)) {
      flags.realEstateProperties = true
    } else if (s.includes("other")) flags.otherProperties = true
  }
  return flags
}

function pushSecurityRawItems(raw: unknown, into: string[]) {
  if (raw == null) return
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (item == null) continue
      if (typeof item === "object") {
        const rec = item as Record<string, unknown>
        const label = rec.label ?? rec.value ?? rec.name ?? rec.type
        if (label != null && String(label).trim()) into.push(String(label).trim())
        continue
      }
      const text = String(item).trim()
      if (text) into.push(text)
    }
    return
  }
  if (typeof raw === "string" && raw.trim()) into.push(raw.trim())
}

function exclusiveHydratedToggles(toggles: string[]): string[] {
  if (toggles.some((t) => isNoneSecurityOption(t))) {
    return [toggles.find((t) => isNoneSecurityOption(t)) || "None"]
  }
  if (toggles.some((t) => isOtherSecurityOption(t))) {
    return [toggles.find((t) => isOtherSecurityOption(t)) || OTHER_SECURITY_CANONICAL_LABEL]
  }
  return toggles
}

/**
 * Reopen/edit hydrate from Product MS `requirements.security` booleans.
 * Persist those booleans — not the security-requirements option strings.
 */
export function hydrateSecurityRequirementSelection(input: {
  security: unknown
  securityRequirements?: unknown
  extra?: unknown[]
  options: string[]
  otherSpecificationFallback?: string
}): { toggles: string[]; otherSpecification: string } {
  const options = mergeSecurityRequirementDisplayOptions(input.options)
  const rawItems: string[] = []
  pushSecurityRawItems(input.securityRequirements, rawItems)
  for (const extra of input.extra ?? []) pushSecurityRawItems(extra, rawItems)

  let otherSpecification = String(input.otherSpecificationFallback ?? "").trim()
  if (input.security && typeof input.security === "object" && !Array.isArray(input.security)) {
    const sec = input.security as Record<string, unknown>
    const otherSpecRaw = sec.otherSpecification ?? sec.otherSecurityDescription
    if (typeof otherSpecRaw === "string" && otherSpecRaw.trim()) {
      otherSpecification = otherSpecRaw.trim()
    }
    for (const [key, val] of Object.entries(sec)) {
      if (key === "otherSpecification" || key === "otherSecurityDescription") continue
      if (!truthySecurityFlag(val)) continue
      rawItems.push(matchSecurityOptionLabel(key, options, key))
    }
  } else {
    pushSecurityRawItems(input.security, rawItems)
  }

  const split = splitStoredSecurityRequirements(
    rawItems.map((item) => matchSecurityOptionLabel(item, options, item)),
  )
  const toggles = exclusiveHydratedToggles(Array.from(new Set(split.toggles.filter(Boolean))))
  return {
    toggles,
    otherSpecification: toggles.some((t) => isOtherSecurityOption(t))
      ? otherSpecification || split.otherSpecification
      : "",
  }
}
