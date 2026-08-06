/** Plata merchant wallets are denominated in Nigerian Naira (wallet-ms default). */
export const PLATA_WALLET_CURRENCY = "NGN" as const

/** Always show NGN on Plata wallet UI (ignore mistaken upstream codes like USD). */
export function plataWalletDisplayCurrency(_raw?: string | null): typeof PLATA_WALLET_CURRENCY {
  return PLATA_WALLET_CURRENCY
}

export function plataWalletCurrencyLabel(): string {
  return "NGN"
}

export function plataWalletCurrencyPrefix(): string {
  return "₦"
}

export function formatPlataWalletBalanceParts(amount: number) {
  const formatted = Math.max(0, amount).toFixed(2).split(".")
  return {
    major: Number(formatted[0]).toLocaleString("en-NG"),
    minor: formatted[1] || "00",
  }
}

export function formatPlataWalletAmount(amount: number): string {
  const { major, minor } = formatPlataWalletBalanceParts(amount)
  return `${plataWalletCurrencyPrefix()}${major}.${minor}`
}
