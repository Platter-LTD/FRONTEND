import type { MerchantWallet, MerchantWalletsBundle } from "@/lib/services/walletService"
import { normalizePlataMerchantWalletType } from "@/lib/walletApiHelpers"

export type CanonicalMerchantWallets = {
  billing: MerchantWallet | null
  settlement: MerchantWallet | null
  treasury: MerchantWallet | null
}

/** Resolve BILLING / SETTLEMENT / TREASURY from normalized bundle (legacy keys included). */
export function resolveCanonicalMerchantWallets(
  bundle: MerchantWalletsBundle | null | undefined,
): CanonicalMerchantWallets {
  if (!bundle) {
    return { billing: null, settlement: null, treasury: null }
  }

  return {
    billing: bundle.billing ?? bundle.operation ?? null,
    settlement: bundle.settlement ?? bundle.kyc ?? null,
    treasury: bundle.treasury ?? null,
  }
}

export function walletTypeLabel(type?: string): string {
  const norm = normalizePlataMerchantWalletType(type)
  if (norm === "BILLING") return "Billing"
  if (norm === "SETTLEMENT") return "Settlement"
  if (norm === "TREASURY") return "Treasury"
  return "Wallet"
}

export function countCanonicalWallets(wallets: CanonicalMerchantWallets): number {
  return [wallets.billing, wallets.settlement, wallets.treasury].filter(Boolean).length
}
