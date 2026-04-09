// Wallet Service - Comprehensive API wrapper for wallet operations
// Uses fetchWithAuth so 401 triggers silent refresh then retry (no logout on first 401).

import { fetchWithAuth, type FetchWithAuthOptions } from '@/lib/fetchWithAuth';
import { getWalletMsRoleHeaders } from '@/lib/walletMsRoleHeaders';

export function walletMessageFromBody(data: unknown): string {
  if (!data || typeof data !== 'object') return '';
  const d = data as Record<string, unknown>;
  const m = d.message ?? d.error ?? d.detail;
  if (m == null || m === '') return '';
  return String(m);
}

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

/** All wallet-ms calls: Bearer + role hints + response logging (clone; body still readable by caller). */
async function walletFetch(input: string | URL, init: FetchWithAuthOptions = {}): Promise<Response> {
  const roleHeaders = typeof window !== 'undefined' ? getWalletMsRoleHeaders() : {};
  const res = await fetchWithAuth(input, {
    ...init,
    additionalHeaders: { ...roleHeaders, ...init.additionalHeaders },
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
const WALLET_API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'https://account-ms-plata.fly.dev').replace(
  /\/+$/,
  '',
);

function walletV1WalletsBase(): string {
  if (typeof window !== 'undefined') {
    return '/api/wallets';
  }
  return `${WALLET_API_BASE}/api/v1/wallets`;
}

const DEFAULT_WALLET_CURRENCY = 'NGN';

/** Main spendable balance per wallet-ms docs (mainBalance with legacy balance fallback). */
export function merchantWalletMainBalance(w: MerchantWallet | null | undefined): number {
  if (!w) return 0;
  const main = w.mainBalance;
  if (typeof main === 'number' && !Number.isNaN(main)) return main;
  const leg = w.balance;
  if (typeof leg === 'number' && !Number.isNaN(leg)) return leg;
  return 0;
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
  merchantWalletType?: 'TREASURY' | 'OPERATION' | 'KYC';
  name?: string;
  balance: number;
  mainBalance?: number;
  ledgerBalance?: number;
  currency: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
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

/** GET /wallets/merchant/:id/all may return any subset of the three app-scoped wallets. */
export type MerchantWalletsBundle = Partial<{
  treasury: MerchantWallet;
  operation: MerchantWallet;
  kyc: MerchantWallet;
}>;

// Merchant Wallet Operations
export const merchantWalletApi = {
  /**
   * Create a merchant wallet
   */
  async createMerchantWallet(
    merchantId: string,
    walletType: 'TREASURY' | 'OPERATION' | 'KYC',
    appId?: string,
    currency: string = DEFAULT_WALLET_CURRENCY,
  ) {
    const response = await walletFetch(`${walletV1WalletsBase()}/merchant`, {
      method: 'POST',
      body: JSON.stringify({
        merchantId,
        merchantWalletType: walletType,
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
      body: JSON.stringify({
        merchantId,
        currency,
        ...(appId ? { appId } : {}),
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(walletMessageFromBody(data) || 'Failed to create merchant wallets');
    }

    return data as WalletApiResponse<{ treasury: MerchantWallet; operation: MerchantWallet; kyc: MerchantWallet }>;
  },

  /**
   * Get specific merchant wallet by type
   */
  async getMerchantWallet(
    merchantId: string,
    walletType: 'TREASURY' | 'OPERATION' | 'KYC',
    appId?: string
  ) {
    const query = appId ? `?appId=${encodeURIComponent(appId)}` : '';
    const response = await walletFetch(
      `${walletV1WalletsBase()}/merchant/${merchantId}/type/${walletType}${query}`
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
    const query = appId ? `?appId=${encodeURIComponent(appId)}` : '';
    const response = await walletFetch(`${walletV1WalletsBase()}/merchant/${merchantId}/all${query}`, {
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(walletMessageFromBody(data) || 'Failed to fetch merchant wallets');
    }

    const inner = data.data ?? data;
    const bundle =
      inner?.treasury || inner?.operation || inner?.kyc
        ? inner
        : inner?.wallets ?? inner;

    if (bundle?.treasury || bundle?.operation || bundle?.kyc) {
      return {
        success: data.success !== false,
        data: bundle as MerchantWalletsBundle,
        message: data.message,
      };
    }

    return data as WalletApiResponse<MerchantWalletsBundle>;
  },

  /**
   * Update merchant wallet balance
   */
  async updateMerchantWalletBalance(merchantId: string, walletType: string, amount: number) {
    const response = await walletFetch(`${walletV1WalletsBase()}/merchant/balance`, {
      method: 'PUT',
      body: JSON.stringify({ merchantId, walletType, amount }),
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
  async createUserWallet(userId: string, merchantId: string, description?: string) {
    const response = await walletFetch(`${walletV1WalletsBase()}/user`, {
      method: 'POST',
      body: JSON.stringify({ userId, merchantId, description }),
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

// Wallet Transfers (Operation <-> KYC)
export const walletTransferApi = {
  /**
   * Transfer from Operation wallet to KYC wallet
   */
  async transferOperationToKyc(merchantId: string, amount: number, description: string) {
    const response = await walletFetch(`${walletV1WalletsBase()}/operation-to-kyc`, {
      method: 'POST',
      body: JSON.stringify({ merchantId, amount, description }),
    });

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

  /**
   * Transfer from KYC wallet to Operation wallet
   */
  async transferKycToOperation(merchantId: string, amount: number, description: string) {
    const response = await walletFetch(`${walletV1WalletsBase()}/kyc-to-operation`, {
      method: 'POST',
      body: JSON.stringify({ merchantId, amount, description }),
    });

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
};

// Transaction Queries
export const transactionApi = {
  /**
   * Get Treasury wallet transactions
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
      /** When set, scopes results to this app’s merchant wallets (if supported by wallet-ms). */
      appId?: string;
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

    const url = `${walletV1WalletsBase()}/treasury/${merchantId}/transactions?${queryParams.toString()}`;
    const response = await walletFetch(url, {});

    const data = await response.json();

    if (!response.ok) {
      throw new Error(walletMessageFromBody(data) || 'Failed to fetch treasury transactions');
    }

    if (data.data?.transactions) {
      return {
        success: data.success,
        data: data.data.transactions,
        message: data.message,
      } as WalletApiResponse<Transaction[]>;
    }

    if (Array.isArray(data.transactions)) {
      return {
        success: data.success !== false,
        data: data.transactions,
        message: data.message,
      } as WalletApiResponse<Transaction[]>;
    }

    return data as WalletApiResponse<Transaction[]>;
  },

  /**
   * Get Operation wallet transactions
   */
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
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const url = `${walletV1WalletsBase()}/operation/${merchantId}/transactions?${queryParams.toString()}`;
    const response = await walletFetch(url, {});

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(walletMessageFromBody(data) || 'Failed to fetch operation transactions');
    }

    // Normalize response: API returns { data: { transactions: [...] } }
    // We want to return { data: [...] } for easier consumption
    if (data.data?.transactions) {
      return {
        success: data.success,
        data: data.data.transactions,
        message: data.message,
      } as WalletApiResponse<Transaction[]>;
    }

    if (Array.isArray(data.transactions)) {
      return {
        success: data.success !== false,
        data: data.transactions,
        message: data.message,
      } as WalletApiResponse<Transaction[]>;
    }

    return data as WalletApiResponse<Transaction[]>;
  },

  /**
   * Get KYC wallet transactions
   */
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
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const url = `${walletV1WalletsBase()}/kyc/${merchantId}/transactions?${queryParams.toString()}`;
    const response = await walletFetch(url, {});

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(walletMessageFromBody(data) || 'Failed to fetch KYC transactions');
    }

    if (data.data?.transactions) {
      return {
        success: data.success,
        data: data.data.transactions,
        message: data.message,
      } as WalletApiResponse<Transaction[]>;
    }

    if (Array.isArray(data.transactions)) {
      return {
        success: data.success !== false,
        data: data.transactions,
        message: data.message,
      } as WalletApiResponse<Transaction[]>;
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
      {}
    );

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(walletMessageFromBody(data) || 'Failed to check funding status');
    }

    return data as WalletApiResponse<{
      status: 'PENDING' | 'COMPLETED' | 'FAILED';
      transaction: Transaction;
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
