'use client';

import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchMobileProductById } from '@/lib/fetchMobileProductById';
import type { MobileProduct } from '@/lib/storefrontProducts';

type UseMobileProductDetailOptions = {
  productId?: string;
  enabled?: boolean;
};

export function useMobileProductDetail({
  productId,
  enabled = true,
}: UseMobileProductDetailOptions) {
  const id = productId?.trim() ?? '';
  const query = useQuery({
    queryKey: ['mobile-product', id],
    queryFn: async () => {
      const mapped = await fetchMobileProductById(id);
      if (!mapped) throw new Error('Invalid product detail response');
      return mapped;
    },
    enabled: enabled && Boolean(id),
  });

  const product: MobileProduct | null = query.data ?? null;
  const loading = enabled && Boolean(id) && query.isLoading;
  const error = query.error ? query.error.message || 'Failed to fetch product detail' : null;
  const fetchProduct = useCallback(async () => {
    await query.refetch();
  }, [query]);

  return {
    product,
    loading,
    error,
    refetch: fetchProduct,
  };
}
