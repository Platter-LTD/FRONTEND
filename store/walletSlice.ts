import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { toastApiError, toastApiSuccess } from '@/lib/apiToast';
import {
  merchantWalletApi,
  transactionApi,
  type MerchantWallet,
  type MerchantWalletsBundle,
  type Transaction,
} from '@/lib/services/walletService';

type WalletScope = { merchantId: string; appId: string };

export interface WalletSliceState {
  merchantId: string | null;
  appId: string | null;
  treasury: MerchantWallet | null;
  operation: MerchantWallet | null;
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

function scopeChanged(
  state: { merchantId: string | null; appId: string | null },
  merchantId: string,
  appId: string,
) {
  return state.merchantId !== merchantId || state.appId !== appId;
}

function clearScopeData(state: WalletSliceState) {
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
    const res = await transactionApi.getTreasuryTransactions(merchantId, { appId });
    const list = Array.isArray(res.data) ? res.data : [];
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
    const res = await transactionApi.getOperationTransactions(merchantId, { appId });
    const list = Array.isArray(res.data) ? res.data : [];
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
    const res = await transactionApi.getKycTransactions(merchantId, { appId });
    const list = Array.isArray(res.data) ? res.data : [];
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
        state.treasury = wallets.treasury ?? null;
        state.operation = wallets.operation ?? null;
        state.kyc = wallets.kyc ?? null;
        const n = [wallets.treasury, wallets.operation, wallets.kyc].filter(Boolean).length;
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
