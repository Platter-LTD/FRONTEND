'use client';

import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { gatewayFetch } from "@/lib/gatewayFetch"

// Product type matching the backend
export interface MobileProduct {
  id: string;
  referenceNumber: string;
  name: string;
  description: string;
  type: 'Loan' | 'Mortgage' | 'Savings' | 'Commodity';
  appId: string;
  status: string;
  isActive: boolean;
  image?: string;
  interestRate?: string;
  duration?: string;
  // Mortgage-specific
  equityContribution?: number;
  propertyValue?: number;
  // Commodity-specific
  price?: number;
  minimumQuantity?: number;
  unitOfMeasure?: string;
  createdAt: string;
  updatedAt: string;
}

interface UseMobileProductsOptions {
  type?: 'Loan' | 'Mortgage' | 'Savings' | 'Commodity';
  springAppId?: string; // Spring App ID to filter products
  autoFetch?: boolean;
}

interface UseMobileProductsReturn {
  products: MobileProduct[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  getProductById: (id: string) => MobileProduct | undefined;
  getProductsByType: (type: string) => MobileProduct[];
}

export function useMobileProducts(options: UseMobileProductsOptions = {}): UseMobileProductsReturn {
  const { type, springAppId, autoFetch = true } = options;

  // Public catalog straight from the gateway (cached); filtered by type client-side.
  const query = useQuery({
    queryKey: ['mobile-products'],
    queryFn: async () => {
      const response = await gatewayFetch('/api/v1/products', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success === false) {
        throw new Error(data.error || data.message || `Failed to fetch products: ${response.status}`);
      }
      return (Array.isArray(data.data) ? data.data : []) as MobileProduct[];
    },
    enabled: autoFetch,
  });

  const products = useMemo(
    () => (type ? (query.data ?? []).filter((p) => (p as { type?: string }).type === type) : (query.data ?? [])),
    [query.data, type],
  );
  const loading = autoFetch ? query.isLoading : false;
  const error = query.error ? query.error.message || 'Failed to fetch products' : null;
  const fetchProducts = useCallback(async () => {
    await query.refetch();
  }, [query]);
  void springAppId; // accepted for API compatibility; the gateway catalog is not app-scoped here

  const getProductById = useCallback((id: string): MobileProduct | undefined => {
    return products.find(p => p.id === id);
  }, [products]);

  const getProductsByType = useCallback((productType: string): MobileProduct[] => {
    return products.filter(p => p.type === productType);
  }, [products]);

  return {
    products,
    loading,
    error,
    refetch: fetchProducts,
    getProductById,
    getProductsByType,
  };
}

// Helper hook for specific product types
export function useLoanProducts() {
  return useMobileProducts({ type: 'Loan' });
}

export function useMortgageProducts() {
  return useMobileProducts({ type: 'Mortgage' });
}

export function useSavingsProducts() {
  return useMobileProducts({ type: 'Savings' });
}

export function useCommodityProducts() {
  return useMobileProducts({ type: 'Commodity' });
}
