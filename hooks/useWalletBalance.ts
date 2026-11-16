'use client';

import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { userWalletApi, Wallet } from '@/lib/services/walletService';
import { getAccessToken } from '@/lib/cookieAuth';

interface UseWalletBalanceReturn {
    wallet: Wallet | null;
    balance: number;
    formattedBalance: string;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

/**
 * Hook to fetch and display the current user's wallet balance.
 * Extracts userId from the JWT access token stored in localStorage.
 * Calls wallet-ms.fly.dev via walletService.user.getUserWallet(userId)
 */
export function useWalletBalance(): UseWalletBalanceReturn {
    const getUserIdFromToken = (): string | null => {
        if (typeof window === 'undefined') return null;
        const token = getAccessToken();
        if (!token) return null;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.userId || payload.id || payload.sub || null;
        } catch {
            return null;
        }
    };
    const userId = getUserIdFromToken();

    const query = useQuery({
        queryKey: ['wallets', 'user', userId ?? ''],
        queryFn: async () => {
            const response = await userWalletApi.getUserWallet(userId as string);
            if (!response.success || !response.data) throw new Error('Could not fetch wallet');
            return response.data;
        },
        enabled: Boolean(userId),
    });

    const wallet: Wallet | null = query.data ?? null;
    const loading = Boolean(userId) && query.isLoading;
    // Don't surface wallet errors loudly — mobile home page should still render.
    const error = !userId ? 'Not authenticated' : query.error ? query.error.message || 'Failed to fetch wallet' : null;
    const refetch = useCallback(async () => {
        await query.refetch();
    }, [query]);

    const balance = wallet?.mainBalance ?? 0;

    // Format as Nigerian Naira with locale formatting
    const formattedBalance = balance > 0
        ? `₦${balance.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : '₦0.00';

    return { wallet, balance, formattedBalance, loading, error, refetch };
}
