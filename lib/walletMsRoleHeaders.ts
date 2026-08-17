import { getAccessToken } from '@/lib/cookieAuth';

function pushStr(candidates: string[], v: unknown) {
  if (typeof v === 'string' && v.trim()) candidates.push(v.trim());
}

function pushArr(candidates: string[], v: unknown) {
  if (Array.isArray(v)) v.forEach((x) => pushStr(candidates, x));
}

export function getWalletMsRoleHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? getAccessToken() : null;
  if (!token) {
    return { 'x-user-role': 'MERCHANT', 'x-user-type': 'MERCHANT', 'x-user-roles': 'MERCHANT' };
  }
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as Record<string, unknown>;
    const candidates: string[] = [];
    pushStr(candidates, payload.role);
    pushStr(candidates, payload.userRole);
    pushStr(candidates, payload.user_role);
    pushStr(candidates, payload.userType);
    pushStr(candidates, payload.user_type);
    pushArr(candidates, payload.roles);
    pushArr(candidates, payload.authorities);
    if (typeof payload.scope === 'string') {
      payload.scope.split(/[\s,]+/).forEach((s) => pushStr(candidates, s));
    }
    const ra = payload.realm_access as { roles?: string[] } | undefined;
    if (ra && Array.isArray(ra.roles)) pushArr(candidates, ra.roles);

    const normalized = candidates
      .map((r) => r.toUpperCase())
      .map((r) => (r.startsWith('ROLE_') ? r.slice('ROLE_'.length) : r));

    let effective = 'MERCHANT';
    if (normalized.includes('ADMIN')) effective = 'ADMIN';
    else if (normalized.includes('MERCHANT')) effective = 'MERCHANT';
    else if (normalized.length > 0) effective = normalized[0];

    const hasMerchantId = !!(
      payload.userMerchantId ||
      payload.user_merchant_id ||
      payload.merchantId ||
      payload.merchant_id
    );
    if (hasMerchantId && effective !== 'ADMIN' && !normalized.includes('MERCHANT')) {
      effective = 'MERCHANT';
    }

    return {
      'x-user-role': effective,
      'x-user-type': effective,
      'x-user-roles': effective,
    };
  } catch {
    return { 'x-user-role': 'MERCHANT', 'x-user-type': 'MERCHANT', 'x-user-roles': 'MERCHANT' };
  }
}
