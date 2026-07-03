import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { toastApiError, toastApiSuccess } from '@/lib/apiToast';
import {
  merchantWalletApi,
  transactionApi,
  type MerchantWallet,
  type MerchantWalletsBundle,
  type Transaction,
} from '@/lib/services/walletService';
import { countCanonicalWallets, resolveCanonicalMerchantWallets } from '@/lib/merchantWalletBundle';

type WalletScope = { merchantId: string; appId: string };
type WalletTxKind = 'treasury' | 'billing' | 'settlement';

async function loadTransactionsForAppWallet(
  merchantId: string,
  appId: string,
  kind: WalletTxKind,
): Promise<Transaction[]> {
  const params = { appId };
  const res =
    kind === 'treasury'
      ? await transactionApi.getTreasuryTransactions(merchantId, params)
      : kind === 'settlement'
        ? await transactionApi.getSettlementTransactions(merchantId, params)
        : await transactionApi.getBillingTransactions(merchantId, params);

  const list = Array.isArray(res.data) ? res.data : [];

  // Belt-and-suspenders: only show txs for this app's wallet instance when walletId is present.
  try {
    const walletsRes = await merchantWalletApi.getAllMerchantWallets(merchantId, appId);
    if (walletsRes.success && walletsRes.data) {
      const canonical = resolveCanonicalMerchantWallets(walletsRes.data);
      const wallet =
        kind === 'treasury'
          ? canonical.treasury
          : kind === 'settlement'
            ? canonical.settlement
            : canonical.billing;
      if (wallet?.id) {
        return list.filter((tx) => !tx.walletId || tx.walletId === wallet.id);
      }
    }
  } catch {
    /* merchant + appId scoped list is sufficient */
  }

  return list;
}

export interface WalletSliceState {
  merchantId: string | null;
  appId: string | null;
  billing: MerchantWallet | null;
  settlement: MerchantWallet | null;
  treasury: MerchantWallet | null;
  /** @deprecated Use billing */
  operation: MerchantWallet | null;
  /** @deprecated Use settlement */
  kyc: MerchantWallet | null;
  treasuryTransactions: Transaction[];
  operationTransactions: Transaction[];
  kycTransactions: Transaction[];
  walletsLoading: boolean;
  walletsError: string | null;
  treasuryTxLoading: boolean;
  treasuryTxError: string | null;
  operationTxLoading: boolean;
  operationTxError: string | null;
  kycTxLoading: boolean;
  kycTxError: string | null;
}

function applyMerchantWalletBundle(state: WalletSliceState, wallets: MerchantWalletsBundle) {
  const canonical = resolveCanonicalMerchantWallets(wallets);
  state.billing = canonical.billing;
  state.settlement = canonical.settlement;
  state.treasury = canonical.treasury;
  state.operation = canonical.billing;
  state.kyc = canonical.settlement;
}

function clearScopeData(state: WalletSliceState) {
  state.billing = null;
  state.settlement = null;
  state.treasury = null;
  state.operation = null;
  state.kyc = null;
  state.treasuryTransactions = [];
  state.operationTransactions = [];
  state.kycTransactions = [];
}

const initialState: WalletSliceState = {
  merchantId: null,
  appId: null,
  billing: null,
  settlement: null,
  treasury: null,
  operation: null,
  kyc: null,
  treasuryTransactions: [],
  operationTransactions: [],
  kycTransactions: [],
  walletsLoading: false,
  walletsError: null,
  treasuryTxLoading: false,
  treasuryTxError: null,
  operationTxLoading: false,
  operationTxError: null,
  kycTxLoading: false,
  kycTxError: null,
};

function scopeChanged(
  state: { merchantId: string | null; appId: string | null },
  merchantId: string,
  appId: string,
) {
  return state.merchantId !== merchantId || state.appId !== appId;
}

export const fetchAppMerchantWalletsThunk = createAsyncThunk<
  { merchantId: string; appId: string; wallets: MerchantWalletsBundle },
  WalletScope,
  { rejectValue: string }
>('wallet/fetchAppMerchantWallets', async ({ merchantId, appId }, { rejectWithValue }) => {
  try {
    const res = await merchantWalletApi.getAllMerchantWallets(merchantId, appId);
    if (!res.success || !res.data) {
      const r = res as { error?: string; message?: string };
      return rejectWithValue(r.error || r.message || 'Failed to load merchant wallets');
    }
    const w = res.data as MerchantWalletsBundle;
    if (process.env.NODE_ENV === 'development') {
      console.info('[wallet] merchant wallets response', { merchantId, appId, bundle: w });
    }
    return { merchantId, appId, wallets: w };
  } catch (e) {
    return rejectWithValue(e instanceof Error ? e.message : 'Failed to load merchant wallets');
  }
});

export const fetchTreasuryTransactionsThunk = createAsyncThunk<
  { merchantId: string; appId: string; transactions: Transaction[] },
  WalletScope,
  { rejectValue: string }
>('wallet/fetchTreasuryTransactions', async ({ merchantId, appId }, { rejectWithValue }) => {
  try {
    const list = await loadTransactionsForAppWallet(merchantId, appId, 'treasury');
    if (process.env.NODE_ENV === 'development') {
      console.info('[wallet] treasury transactions', { merchantId, appId, count: list.length });
    }
    return { merchantId, appId, transactions: list };
  } catch (e) {
    return rejectWithValue(e instanceof Error ? e.message : 'Failed to load treasury transactions');
  }
});

export const fetchOperationTransactionsThunk = createAsyncThunk<
  { merchantId: string; appId: string; transactions: Transaction[] },
  WalletScope,
  { rejectValue: string }
>('wallet/fetchOperationTransactions', async ({ merchantId, appId }, { rejectWithValue }) => {
  try {
    const list = await loadTransactionsForAppWallet(merchantId, appId, 'billing');
    if (process.env.NODE_ENV === 'development') {
      console.info('[wallet] operation transactions', { merchantId, appId, count: list.length });
    }
    return { merchantId, appId, transactions: list };
  } catch (e) {
    return rejectWithValue(e instanceof Error ? e.message : 'Failed to load operation transactions');
  }
});

export const fetchKycTransactionsThunk = createAsyncThunk<
  { merchantId: string; appId: string; transactions: Transaction[] },
  WalletScope,
  { rejectValue: string }
>('wallet/fetchKycTransactions', async ({ merchantId, appId }, { rejectWithValue }) => {
  try {
    const list = await loadTransactionsForAppWallet(merchantId, appId, 'settlement');
    if (process.env.NODE_ENV === 'development') {
      console.info('[wallet] KYC transactions', { merchantId, appId, count: list.length });
    }
    return { merchantId, appId, transactions: list };
  } catch (e) {
    return rejectWithValue(e instanceof Error ? e.message : 'Failed to load KYC transactions');
  }
});

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    clearWalletScope(state) {
      state.merchantId = null;
      state.appId = null;
      clearScopeData(state);
      state.walletsLoading = false;
      state.walletsError = null;
      state.treasuryTxLoading = false;
      state.operationTxLoading = false;
      state.kycTxLoading = false;
      state.treasuryTxError = null;
      state.operationTxError = null;
      state.kycTxError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAppMerchantWalletsThunk.pending, (state, action) => {
        const { merchantId, appId } = action.meta.arg;
        if (scopeChanged(state, merchantId, appId)) {
          state.merchantId = merchantId;
          state.appId = appId;
          clearScopeData(state);
        }
        state.walletsLoading = true;
        state.walletsError = null;
      })
      .addCase(fetchAppMerchantWalletsThunk.fulfilled, (state, action) => {
        const { merchantId, appId, wallets } = action.payload;
        if (scopeChanged(state, merchantId, appId)) return;
        state.walletsLoading = false;
        applyMerchantWalletBundle(state, wallets);
        const n = countCanonicalWallets(resolveCanonicalMerchantWallets(wallets));
        toastApiSuccess(
          n >= 1
            ? `Wallet data loaded (${n} merchant wallet${n === 1 ? '' : 's'})`
            : 'Wallet data loaded',
          { id: 'wallet-ms-page-ok' },
        );
      })
      .addCase(fetchAppMerchantWalletsThunk.rejected, (state, action) => {
        const { merchantId, appId } = action.meta.arg;
        if (scopeChanged(state, merchantId, appId)) return;
        state.walletsLoading = false;
        state.walletsError = action.payload || 'Failed to load wallets';
        toastApiError(action.payload || 'Failed to load merchant wallets', { id: 'wallet-ms-wallets-err' });
      })
      .addCase(fetchTreasuryTransactionsThunk.pending, (state, action) => {
        const { merchantId, appId } = action.meta.arg;
        if (scopeChanged(state, merchantId, appId)) {
          state.merchantId = merchantId;
          state.appId = appId;
          clearScopeData(state);
        }
        state.treasuryTxLoading = true;
        state.treasuryTxError = null;
      })
      .addCase(fetchTreasuryTransactionsThunk.fulfilled, (state, action) => {
        const { merchantId, appId, transactions } = action.payload;
        if (scopeChanged(state, merchantId, appId)) return;
        state.treasuryTxLoading = false;
        state.treasuryTransactions = transactions;
      })
      .addCase(fetchTreasuryTransactionsThunk.rejected, (state, action) => {
        const { merchantId, appId } = action.meta.arg;
        if (scopeChanged(state, merchantId, appId)) return;
        state.treasuryTxLoading = false;
        state.treasuryTxError = action.payload || 'Failed to load transactions';
        toastApiError(action.payload || 'Failed to load treasury transactions', { id: 'wallet-ms-treasury-tx-err' });
      })
      .addCase(fetchOperationTransactionsThunk.pending, (state, action) => {
        const { merchantId, appId } = action.meta.arg;
        if (scopeChanged(state, merchantId, appId)) {
          state.merchantId = merchantId;
          state.appId = appId;
          clearScopeData(state);
        }
        state.operationTxLoading = true;
        state.operationTxError = null;
      })
      .addCase(fetchOperationTransactionsThunk.fulfilled, (state, action) => {
        const { merchantId, appId, transactions } = action.payload;
        if (scopeChanged(state, merchantId, appId)) return;
        state.operationTxLoading = false;
        state.operationTransactions = transactions;
      })
      .addCase(fetchOperationTransactionsThunk.rejected, (state, action) => {
        const { merchantId, appId } = action.meta.arg;
        if (scopeChanged(state, merchantId, appId)) return;
        state.operationTxLoading = false;
        state.operationTxError = action.payload || 'Failed to load transactions';
        toastApiError(action.payload || 'Failed to load operation transactions', { id: 'wallet-ms-op-tx-err' });
      })
      .addCase(fetchKycTransactionsThunk.pending, (state, action) => {
        const { merchantId, appId } = action.meta.arg;
        if (scopeChanged(state, merchantId, appId)) {
          state.merchantId = merchantId;
          state.appId = appId;
          clearScopeData(state);
        }
        state.kycTxLoading = true;
        state.kycTxError = null;
      })
      .addCase(fetchKycTransactionsThunk.fulfilled, (state, action) => {
        const { merchantId, appId, transactions } = action.payload;
        if (scopeChanged(state, merchantId, appId)) return;
        state.kycTxLoading = false;
        state.kycTransactions = transactions;
      })
      .addCase(fetchKycTransactionsThunk.rejected, (state, action) => {
        const { merchantId, appId } = action.meta.arg;
        if (scopeChanged(state, merchantId, appId)) return;
        state.kycTxLoading = false;
        state.kycTxError = action.payload || 'Failed to load transactions';
        toastApiError(action.payload || 'Failed to load KYC transactions', { id: 'wallet-ms-kyc-tx-err' });
      });
  },
});

export const { clearWalletScope } = walletSlice.actions;
export const walletReducer = walletSlice.reducer;
