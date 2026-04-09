import { getAccessToken } from '@/lib/cookieAuth';

/**
 * Merchant id from JWT (cookie-backed access token), for wallet-ms app-scoped calls.
 */
export function getMerchantIdFromAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  const token = getAccessToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as Record<string, unknown>;
    const id =
      payload.userMerchantId ??
      payload.user_merchant_id ??
      payload.merchantId ??
      payload.merchant_id;
    return typeof id === 'string' && id.trim() ? id : null;
  } catch {
    return null;
  }
}
