/**
 * Map ISO 3166-1 alpha-2 country codes to ISO 4217 currency codes for KYC / volume display.
 * Unknown codes fall back to NGN to match the rest of the merchant dashboard defaults.
 */
const COUNTRY_TO_CURRENCY: Record<string, string> = {
  NG: "NGN",
  US: "USD",
  GB: "GBP",
  CA: "CAD",
  AU: "AUD",
  NZ: "NZD",
  ZA: "ZAR",
  KE: "KES",
  GH: "GHS",
  EG: "EGP",
  MA: "MAD",
  SN: "XOF",
  CI: "XOF",
  BF: "XOF",
  ML: "XOF",
  NE: "XOF",
  TG: "XOF",
  BJ: "XOF",
  CM: "XAF",
  GA: "XAF",
  TD: "XAF",
  CF: "XAF",
  CG: "XAF",
  EU: "EUR",
  DE: "EUR",
  FR: "EUR",
  IT: "EUR",
  ES: "EUR",
  NL: "EUR",
  BE: "EUR",
  AT: "EUR",
  PT: "EUR",
  IE: "EUR",
  FI: "EUR",
  GR: "EUR",
  IN: "INR",
  PK: "PKR",
  BD: "BDT",
  CN: "CNY",
  JP: "JPY",
  KR: "KRW",
  SG: "SGD",
  MY: "MYR",
  TH: "THB",
  PH: "PHP",
  ID: "IDR",
  VN: "VND",
  AE: "AED",
  SA: "SAR",
  QA: "QAR",
  KW: "KWD",
  BH: "BHD",
  OM: "OMR",
  TR: "TRY",
  IL: "ILS",
  CH: "CHF",
  SE: "SEK",
  NO: "NOK",
  DK: "DKK",
  PL: "PLN",
  CZ: "CZK",
  RO: "RON",
  HU: "HUF",
  BR: "BRL",
  MX: "MXN",
  AR: "ARS",
  CL: "CLP",
  CO: "COP",
  PE: "PEN",
  JM: "JMD",
  TT: "TTD",
  BB: "BBD",
}

export function countryToCurrencyCode(country?: string | null): string {
  const code = (country ?? "").trim().toUpperCase()
  if (!code) return "NGN"
  return COUNTRY_TO_CURRENCY[code] ?? "NGN"
}

/** BCP 47 locale hint for number formatting; generic "en" is enough for most currencies. */
export function localeForCountry(country?: string | null): string {
  const code = (country ?? "").trim().toUpperCase()
  if (code === "NG") return "en-NG"
  if (code === "US") return "en-US"
  if (code === "GB") return "en-GB"
  return "en"
}

export function formatMonthlyVolumeDisplay(
  digitsOnly: string,
  country?: string | null,
): string {
  const digits = digitsOnly.replace(/\D/g, "")
  if (!digits) return ""
  const n = Number(digits)
  if (!Number.isFinite(n) || n < 0) return ""
  const currency = countryToCurrencyCode(country)
  const locale = localeForCountry(country)
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n)
}
