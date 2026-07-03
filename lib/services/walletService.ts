// Wallet Service - Comprehensive API wrapper for wallet operations
// Uses fetchWithAuth so 401 triggers silent refresh then retry (no logout on first 401).

import { fetchWithAuth, type FetchWithAuthOptions } from '@/lib/fetchWithAuth';
import { getWalletMsRoleHeaders } from '@/lib/walletMsRoleHeaders';
import { getPlataApiBaseUrl } from "@/lib/plataApiBaseUrl"
import {
  buildWalletQuery,
  legacyBundleKeyFromType,
  normalizePlataMerchantWalletType,
  walletAppHeaders,
  walletMessageFromBody,
  type PlataMerchantWalletType,
} from '@/lib/walletApiHelpers';

export { walletMessageFromBody };

function logWalletMsResponse(res: Response, input: string | URL, data: unknown) {
  const url = res.url || String(input);
  if (!res.ok) {
    console.warn('[wallet-ms]', res.status, url, data);
    return;
  }
  if (process.env.NODE_ENV === 'development') {
    console.info('[wallet-ms]', res.status, url, data);
  }
}

type WalletFetchOptions = FetchWithAuthOptions & { appId?: string };

/** All wallet-ms calls: Bearer + role hints + optional x-app-id + response logging. */
async function walletFetch(input: string | URL, init: WalletFetchOptions = {}): Promise<Response> {
  const { appId, additionalHeaders, ...rest } = init;
  const roleHeaders = typeof window !== 'undefined' ? getWalletMsRoleHeaders() : {};
  const res = await fetchWithAuth(input, {
    ...rest,
    additionalHeaders: { ...roleHeaders, ...walletAppHeaders(appId), ...additionalHeaders },
  });

  const c = res.clone();
  void (async () => {
    try {
      const data = await c.json();
      logWalletMsResponse(res, input, data);
    } catch {
      try {
        const t = await res.clone().text();
        if (!res.ok) console.warn('[wallet-ms]', res.status, String(input), t.slice(0, 500));
      } catch {
        /* ignore */
      }
    }
  })();

  return res;
}

/** Upstream base for server-side calls only. Browser uses same-origin `/api/wallets/*` proxy (CORS + IPv4). */
const WALLET_API_BASE = getPlataApiBaseUrl();

function walletV1WalletsBase(): string {
  if (typeof window !== 'undefined') {
    return '/api/wallets';
  }
  return `${WALLET_API_BASE}/api/v1/wallets`;
}

const DEFAULT_WALLET_CURRENCY = 'NGN';

function coerceWalletAmount(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/** Main spendable balance per wallet-ms docs (mainBalance with legacy balance fallback). */
export function merchantWalletMainBalance(w: MerchantWallet | null | undefined): number {
  if (!w) return 0;
  const main = coerceWalletAmount(w.mainBalance);
  if (main != null) return main;
  const leg = coerceWalletAmount(w.balance);
  if (leg != null) return leg;
  return 0;
}

/** Ledger balance when returned separately from mainBalance. */
export function merchantWalletLedgerBalance(w: MerchantWallet | null | undefined): number {
  if (!w) return 0;
  const ledger = coerceWalletAmount(w.ledgerBalance);
  if (ledger != null) return ledger;
  return merchantWalletMainBalance(w);
}

// Types
export interface Wallet {
  id: string;
  userId: string;
  merchantId?: string;
  mainBalance: number;
  ledgerBalance: number;
  currency: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  createdAt: string;
  updatedAt: string;
}

export interface MerchantWallet {
  id: string;
  merchantId: string;
  walletType: 'MERCHANT';
  merchantWalletType?: PlataMerchantWalletType;
  name?: string;
  balance: number;
  mainBalance?: number;
  ledgerBalance?: number;
  currency: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  appId?: string;
  appName?: string;
  payonusSubaccountCode?: string;
  virtualNuban?: {
    accountType?: string;
    provisionStatus?: string;
    accountNumber?: string;
    bankName?: string;
    bankCode?: string;
    providerReference?: string;
    provisionedAt?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  walletId: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  description: string;
  referenceId?: string;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: string;
  updatedAt: string;
}

export interface WalletApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

/** GET /wallets/merchant/:id/all may return legacy keys or a wallets array. */
export type MerchantWalletsBundle = Partial<{
  treasury: MerchantWallet;
  operation: MerchantWallet;
  kyc: MerchantWallet;
  billing: MerchantWallet;
  settlement: MerchantWallet;
}>;

function normalizeMerchantWalletsBundle(raw: unknown): MerchantWalletsBundle {
  if (!raw || typeof raw !== 'object') return {};
  const inner = raw as Record<string, unknown>;
  const bundle: MerchantWalletsBundle = {};

  const assign = (wallet: unknown) => {
    if (!wallet || typeof wallet !== 'object') return;
    const w = wallet as MerchantWallet;
    const key = legacyBundleKeyFromType(w.merchantWalletType);
    if (key && !bundle[key]) bundle[key] = w;
    const norm = normalizePlataMerchantWalletType(w.merchantWalletType);
    if (norm === 'BILLING') bundle.billing = w;
    if (norm === 'TREASURY') bundle.treasury = bundle.treasury ?? w;
    if (norm === 'SETTLEMENT') bundle.settlement = w;
  };

  if (inner.treasury) assign(inner.treasury);
  if (inner.operation) assign(inner.operation);
  if (inner.kyc) assign(inner.kyc);
  if (inner.billing) assign(inner.billing);
  if (inner.settlement) assign(inner.settlement);

  const wallets = inner.wallets;
  if (Array.isArray(wallets)) wallets.forEach(assign);

  return bundle;
}

// Merchant Wallet Operations
export const merchantWalletApi = {
  /**
   * Create a merchant wallet
   */
  async createMerchantWallet(
    merchantId: string,
    walletType: PlataMerchantWalletType,
    appId?: string,
    currency: string = DEFAULT_WALLET_CURRENCY,
    name?: string,
  ) {
    const merchantWalletType = normalizePlataMerchantWalletType(walletType);
    const response = await walletFetch(`${walletV1WalletsBase()}/merchant`, {
      method: 'POST',
      appId,
      body: JSON.stringify({
        name: name || `${merchantWalletType} Wallet`,
        merchantWalletType,
        currency,
        ...(appId ? { appId } : {}),
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(walletMessageFromBody(data) || 'Failed to create merchant wallet');
    }

    return data as WalletApiResponse<MerchantWallet>;
  },

  /**
   * Create all merchant wallets (Treasury, Operation, KYC)
   */
  async createAllMerchantWallets(merchantId: string, appId?: string, currency: string = DEFAULT_WALLET_CURRENCY) {
    const response = await walletFetch(`${walletV1WalletsBase()}/merchant/all`, {
      method: 'POST',
      appId,
      body: JSON.stringify({
        currency,
        ...(appId ? { appId } : {}),
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(walletMessageFromBody(data) || 'Failed to create merchant wallets');
    }

    const bundle = normalizeMerchantWalletsBundle(data.data ?? data);
    return {
      success: data.success !== false,
      data: bundle,
      message: data.message,
    } as WalletApiResponse<MerchantWalletsBundle>;
  },

  /**
   * Get specific merchant wallet by type
   */
  async getMerchantWallet(
    merchantId: string,
    walletType: PlataMerchantWalletType,
    appId?: string
  ) {
    const merchantWalletType = normalizePlataMerchantWalletType(walletType);
    const query = buildWalletQuery(undefined, appId);
    const response = await walletFetch(
      `${walletV1WalletsBase()}/merchant/${merchantId}/type/${merchantWalletType}${query}`,
      { appId },
    );

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(walletMessageFromBody(data) || 'Failed to fetch merchant wallet');
    }

    // Normalize response: API returns { data: { wallet: {...} } }
    // We want to return { data: {...} } for easier consumption
    if (data.data?.wallet) {
      return {
        success: data.success,
        data: data.data.wallet,
        message: data.message,
      } as WalletApiResponse<MerchantWallet>;
    }

    return data as WalletApiResponse<MerchantWallet>;
  },

  /**
   * Get all merchant wallets
   */
  async getAllMerchantWallets(merchantId: string, appId?: string) {
    const query = buildWalletQuery(undefined, appId);
    const response = await walletFetch(`${walletV1WalletsBase()}/merchant/${merchantId}/all${query}`, {
      appId,
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(walletMessageFromBody(data) || 'Failed to fetch merchant wallets');
    }

    const bundle = normalizeMerchantWalletsBundle(data.data ?? data);
    return {
      success: data.success !== false,
      data: bundle,
      message: data.message,
    } as WalletApiResponse<MerchantWalletsBundle>;
  },

  /**
   * Update merchant wallet balance (by walletId per wallet-ms contract)
   */
  async updateMerchantWalletBalance(walletId: string, amount: number, description?: string) {
    const response = await walletFetch(`${walletV1WalletsBase()}/merchant/balance`, {
      method: 'PUT',
      body: JSON.stringify({ walletId, amount, description }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(walletMessageFromBody(data) || 'Failed to update merchant wallet balance');
    }

    return data as WalletApiResponse<MerchantWallet>;
  },
};

// User Wallet Operations
export const userWalletApi = {
  /**
   * Create a user wallet
   */
  async createUserWallet(name: string, currency: string = DEFAULT_WALLET_CURRENCY) {
    const response = await walletFetch(`${walletV1WalletsBase()}/user`, {
      method: 'POST',
      body: JSON.stringify({ name, currency }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(walletMessageFromBody(data) || 'Failed to create user wallet');
    }

    return data as WalletApiResponse<Wallet>;
  },

  /**
   * Get user wallet
   */
  async getUserWallet(userId: string) {
    const response = await walletFetch(`${walletV1WalletsBase()}/user/${userId}`, {
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(walletMessageFromBody(data) || 'Failed to fetch user wallet');
    }

    return data as WalletApiResponse<Wallet>;
  },

  /**
   * Update user wallet balance
   */
  async updateUserWalletBalance(userId: string, amount: number, description?: string) {
    const response = await walletFetch(`${walletV1WalletsBase()}/user/${userId}/balance`, {
      method: 'PUT',
      body: JSON.stringify({ amount, description }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(walletMessageFromBody(data) || 'Failed to update user wallet balance');
    }

    return data as WalletApiResponse<Wallet>;
  },

  /**
   * Get user wallet transactions with filtering
   */
  async getUserTransactions(
    userId: string,
    params?: {
      page?: number;
      limit?: number;
      type?: 'CREDIT' | 'DEBIT';
      status?: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
      startDate?: string;
      endDate?: string;
    }
  ) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const url = `${walletV1WalletsBase()}/user/${userId}/transactions?${queryParams.toString()}`;
    const response = await walletFetch(url, {});

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(walletMessageFromBody(data) || 'Failed to fetch user transactions');
    }

    return data as WalletApiResponse<Transaction[]>;
  },

  /**
   * Transfer money from user wallet
   */
  async transferFromUserWallet(
    userId: string,
    transferData: {
      toWalletId: string;
      amount: number;
      description: string;
    }
  ) {
    const response = await walletFetch(`${walletV1WalletsBase()}/user/${userId}/transfer`, {
      method: 'POST',
      body: JSON.stringify(transferData),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(walletMessageFromBody(data) || 'Failed to transfer funds');
    }

    return data as WalletApiResponse<{ wallet: Wallet; transaction: Transaction }>;
  },

  /**
   * Make a 3rd party API call from user wallet
   */
  async makeApiCall(
    userId: string,
    apiCallData: {
      endpoint: string;
      method: string;
      headers: Record<string, string>;
      body: any;
      amount: number;
      description: string;
      apiKey?: string;
    }
  ) {
    const response = await walletFetch(`${walletV1WalletsBase()}/user/${userId}/api-call`, {
      method: 'POST',
      body: JSON.stringify(apiCallData),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(walletMessageFromBody(data) || 'Failed to make API call');
    }

    return data as WalletApiResponse<{ wallet: Wallet; transaction: Transaction; apiResponse: any }>;
  },

  /**
   * Get all user wallets for a merchant
   */
  async getUserWalletsByMerchant(merchantId: string) {
    const response = await walletFetch(`${walletV1WalletsBase()}/merchant/${merchantId}/users`, {
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(walletMessageFromBody(data) || 'Failed to fetch user wallets');
    }

    return data as WalletApiResponse<Wallet[]>;
  },
};

// Wallet Transfers (Billing <-> Settlement; legacy Operation <-> KYC aliases)
export const walletTransferApi = {
  /** POST /billing-to-settlement (legacy: /operation-to-kyc) */
  async transferBillingToSettlement(amount: number, description: string, appId?: string) {
    const body = JSON.stringify({ amount, description });
    let response = await walletFetch(`${walletV1WalletsBase()}/billing-to-settlement`, {
      method: 'POST',
      appId,
      body,
    });
    if (response.status === 404) {
      response = await walletFetch(`${walletV1WalletsBase()}/operation-to-kyc`, {
        method: 'POST',
        appId,
        body,
      });
    }
    const data = await response.json();
    if (!response.ok) {
      throw new Error(walletMessageFromBody(data) || 'Failed to transfer funds');
    }
    return data as WalletApiResponse<{
      fromWallet: MerchantWallet;
      toWallet: MerchantWallet;
      transaction: Transaction;
    }>;
  },

  /** POST /settlement-to-billing (legacy: /kyc-to-operation) */
  async transferSettlementToBilling(amount: number, description: string, appId?: string) {
    const body = JSON.stringify({ amount, description });
    let response = await walletFetch(`${walletV1WalletsBase()}/settlement-to-billing`, {
      method: 'POST',
      appId,
      body,
    });
    if (response.status === 404) {
      response = await walletFetch(`${walletV1WalletsBase()}/kyc-to-operation`, {
        method: 'POST',
        appId,
        body,
      });
    }
    const data = await response.json();
    if (!response.ok) {
      throw new Error(walletMessageFromBody(data) || 'Failed to transfer funds');
    }
    return data as WalletApiResponse<{
      fromWallet: MerchantWallet;
      toWallet: MerchantWallet;
      transaction: Transaction;
    }>;
  },

  /** POST /treasury/transfer */
  async transferTreasury(
    transfer: { fromWalletId: string; toWalletId: string; amount: number; description: string },
    appId?: string,
  ) {
    const response = await walletFetch(`${walletV1WalletsBase()}/treasury/transfer`, {
      method: 'POST',
      appId,
      body: JSON.stringify(transfer),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(walletMessageFromBody(data) || 'Failed to transfer treasury funds');
    }
    return data as WalletApiResponse<{
      fromWallet: MerchantWallet;
      toWallet: MerchantWallet;
      transaction: Transaction;
    }>;
  },

  /** @deprecated Use transferBillingToSettlement */
  async transferOperationToKyc(merchantId: string, amount: number, description: string) {
    return walletTransferApi.transferBillingToSettlement(amount, description);
  },

  /** @deprecated Use transferSettlementToBilling */
  async transferKycToOperation(merchantId: string, amount: number, description: string) {
    return walletTransferApi.transferSettlementToBilling(amount, description);
  },
};

// Transaction Queries
async function fetchMerchantWalletTransactions(
  paths: string[],
  merchantId: string,
  params?: {
    page?: number;
    limit?: number;
    type?: 'CREDIT' | 'DEBIT';
    status?: string;
    startDate?: string;
    endDate?: string;
    appId?: string;
  },
): Promise<WalletApiResponse<Transaction[]>> {
  const query = buildWalletQuery(
    {
      page: params?.page,
      limit: params?.limit,
      type: params?.type,
      status: params?.status,
      startDate: params?.startDate,
      endDate: params?.endDate,
    },
    params?.appId,
  );

  let lastError = 'Failed to fetch transactions';
  for (const segment of paths) {
    const response = await walletFetch(
      `${walletV1WalletsBase()}/${segment}/${merchantId}/transactions${query}`,
      { appId: params?.appId },
    );
    const data = await response.json();
    if (response.status === 404) {
      lastError = walletMessageFromBody(data) || lastError;
      continue;
    }
    if (!response.ok) {
      throw new Error(walletMessageFromBody(data) || lastError);
    }
    if (data.data?.transactions) {
      return { success: data.success, data: data.data.transactions, message: data.message };
    }
    if (Array.isArray(data.transactions)) {
      return { success: data.success !== false, data: data.transactions, message: data.message };
    }
    return data as WalletApiResponse<Transaction[]>;
  }
  throw new Error(lastError);
}

export const transactionApi = {
  /**
   * Get Treasury wallet transactions (Plata disbursement wallet)
   */
  async getTreasuryTransactions(
    merchantId: string,
    params?: {
      page?: number;
      limit?: number;
      type?: 'CREDIT' | 'DEBIT';
      status?: string;
      startDate?: string;
      endDate?: string;
      appId?: string;
    }
  ) {
    return fetchMerchantWalletTransactions(['treasury'], merchantId, params);
  },

  /**
   * Get Billing wallet transactions (legacy Operation)
   */
  async getBillingTransactions(
    merchantId: string,
    params?: {
      page?: number;
      limit?: number;
      type?: 'CREDIT' | 'DEBIT';
      status?: string;
      startDate?: string;
      endDate?: string;
      appId?: string;
    }
  ) {
    return fetchMerchantWalletTransactions(['billing', 'operation'], merchantId, params);
  },

  /**
   * Get Settlement wallet transactions (legacy KYC)
   */
  async getSettlementTransactions(
    merchantId: string,
    params?: {
      page?: number;
      limit?: number;
      type?: 'CREDIT' | 'DEBIT';
      status?: string;
      startDate?: string;
      endDate?: string;
      appId?: string;
    }
  ) {
    return fetchMerchantWalletTransactions(['settlement', 'kyc'], merchantId, params);
  },

  /** @deprecated Use getBillingTransactions */
  async getOperationTransactions(
    merchantId: string,
    params?: {
      page?: number;
      limit?: number;
      type?: 'CREDIT' | 'DEBIT';
      status?: string;
      startDate?: string;
      endDate?: string;
      appId?: string;
    }
  ) {
    return transactionApi.getBillingTransactions(merchantId, params);
  },

  /** @deprecated Use getSettlementTransactions */
  async getKycTransactions(
    merchantId: string,
    params?: {
      page?: number;
      limit?: number;
      type?: 'CREDIT' | 'DEBIT';
      status?: string;
      startDate?: string;
      endDate?: string;
      appId?: string;
    }
  ) {
    return transactionApi.getSettlementTransactions(merchantId, params);
  },

  /** GET /api/v1/transactions/:walletId */
  async getByWalletId(walletId: string) {
    const base =
      typeof window !== 'undefined'
        ? '/api/transactions'
        : `${WALLET_API_BASE}/api/v1/transactions`;
    const response = await walletFetch(`${base}/${encodeURIComponent(walletId)}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(walletMessageFromBody(data) || 'Failed to fetch wallet transactions');
    }
    if (data.data?.transactions) {
      return { success: data.success, data: data.data.transactions, message: data.message };
    }
    return data as WalletApiResponse<Transaction[]>;
  },
};

// Billing Operations (Debit wallets)
export const billingApi = {
  /**
   * Debit Operation wallet
   */
  async debitOperationWallet(merchantId: string, amount: number, description: string) {
    const response = await walletFetch(`${walletV1WalletsBase()}/operation/debit`, {
      method: 'POST',
      body: JSON.stringify({ merchantId, amount, description }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(walletMessageFromBody(data) || 'Failed to debit operation wallet');
    }

    return data as WalletApiResponse<{ wallet: MerchantWallet; transaction: Transaction }>;
  },

  /**
   * Debit KYC wallet
   */
  async debitKycWallet(merchantId: string, amount: number, description: string) {
    const response = await walletFetch(`${walletV1WalletsBase()}/kyc/debit`, {
      method: 'POST',
      body: JSON.stringify({ merchantId, amount, description }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(walletMessageFromBody(data) || 'Failed to debit KYC wallet');
    }

    return data as WalletApiResponse<{ wallet: MerchantWallet; transaction: Transaction }>;
  },

  /**
   * Process KYC fee
   */
  async processKycFee(merchantId: string, amount: number, description?: string) {
    const response = await walletFetch(`${walletV1WalletsBase()}/kyc/fee`, {
      method: 'POST',
      body: JSON.stringify({ merchantId, amount, description: description || 'KYC Fee' }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(walletMessageFromBody(data) || 'Failed to process KYC fee');
    }

    return data as WalletApiResponse<{ wallet: MerchantWallet; transaction: Transaction }>;
  },

  /**
   * Debit user wallet (for billing)
   */
  async debitUserWallet(userId: string, amount: number, description: string) {
    const response = await walletFetch(`${walletV1WalletsBase()}/treasury/debit`, {
      method: 'POST',
      body: JSON.stringify({ userId, amount, description }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(walletMessageFromBody(data) || 'Failed to debit user wallet');
    }

    return data as WalletApiResponse<{ wallet: Wallet; transaction: Transaction }>;
  },

  /**
   * Debit Treasury wallet
   */
  async debitTreasuryWallet(merchantId: string, amount: number, description: string) {
    const response = await walletFetch(`${walletV1WalletsBase()}/treasury/debit-merchant`, {
      method: 'POST',
      body: JSON.stringify({ merchantId, amount, description }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(walletMessageFromBody(data) || 'Failed to debit treasury wallet');
    }

    return data as WalletApiResponse<{ wallet: MerchantWallet; transaction: Transaction }>;
  },

  /** POST /settlement/payout — merchant settlement withdrawal to bank */
  async settlementPayout(
    payout: {
      appId?: string;
      accountNumber: string;
      bankCode: string;
      accountName: string;
      bankName?: string;
      amount: number;
      currency?: string;
      narration?: string;
      reference?: string;
    },
    appId?: string,
  ) {
    const response = await walletFetch(`${walletV1WalletsBase()}/settlement/payout`, {
      method: 'POST',
      appId: appId ?? payout.appId,
      body: JSON.stringify(payout),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(walletMessageFromBody(data) || 'Failed to initiate settlement payout');
    }
    return data as WalletApiResponse<{
      wallet: MerchantWallet;
      transaction: Transaction;
      payoutReference?: string;
      providerReference?: string;
      providerStatus?: string;
      duplicate?: boolean;
    }>;
  },
};

// Funding Operations
export const fundingApi = {
  /**
   * Handle funding callback (webhook endpoint - typically called by payment providers)
   */
  async handleFundingCallback(callbackData: {
    transactionId: string;
    walletId: string;
    amount: number;
    status: 'SUCCESS' | 'FAILED';
    provider: string;
    metadata?: any;
  }) {
    const response = await walletFetch(`${walletV1WalletsBase()}/funding/callback`, {
      method: 'POST',
      body: JSON.stringify(callbackData),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(walletMessageFromBody(data) || 'Failed to process funding callback');
    }

    return data as WalletApiResponse<{ wallet: Wallet; transaction: Transaction }>;
  },

  /**
   * Check funding status
   */
  async checkFundingStatus(transactionId: string) {
    const response = await walletFetch(
      `${walletV1WalletsBase()}/funding/status/${transactionId}`,
      { skipAuth: true },
    );

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(walletMessageFromBody(data) || 'Failed to check funding status');
    }

    return data as WalletApiResponse<{
      transactionId?: string;
      status: 'PENDING' | 'COMPLETED' | 'FAILED' | string;
      message?: string;
      transaction?: Transaction;
    }>;
  },
};

// Combined export for convenience
export const walletService = {
  merchant: merchantWalletApi,
  user: userWalletApi,
  transfer: walletTransferApi,
  transaction: transactionApi,
  billing: billingApi,
  funding: fundingApi,
};

export default walletService;
