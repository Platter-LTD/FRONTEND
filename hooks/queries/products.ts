"use client"

import { useQuery } from "@tanstack/react-query"
import {
  fetchProductById,
  fetchProductList,
  fetchProductsByAppId,
  productApi,
} from "@/lib/services/product-api"
import {
  fetchCatalogProducts,
  fetchSpringProductsForApp,
  springProductService,
} from "@/lib/services/springProductService"
import { invalidateDashboardApps, invalidateDashboardProducts } from "@/lib/dashboardSessionCache"
import { useServiceMutations } from "@/lib/query/useServiceMutations"
import { queryKeys } from "@/lib/query/keys"
import type { ListProductsParams } from "@/lib/productOverview"

type AppProductsQuery = { page?: number; limit?: number }

/** Products configured for an app (GET /products/app/:appId). Shared with productApi.getProductsByAppId. */
export function useAppProducts(appId: string | null | undefined, query?: AppProductsQuery) {
  return useQuery({
    queryKey: queryKeys.products.forApp(appId ?? "", query),
    queryFn: () => fetchProductsByAppId(appId as string, query),
    enabled: Boolean(appId),
  })
}

/** A single product (GET /products/:id). Shared with productApi.getProductById. */
export function useProduct(productId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.products.detail(productId ?? ""),
    queryFn: () => fetchProductById(productId as string),
    enabled: Boolean(productId),
  })
}

/** Catalog list (GET /products?appId=&type=&page=&limit=&search=). Shared with productApi.listProducts. */
export function useProductList(params: ListProductsParams | null) {
  return useQuery({
    queryKey: queryKeys.products.catalog({
      appId: params?.appId,
      type: params?.type,
      page: params?.page,
      limit: params?.limit,
      search: params?.search,
    }),
    queryFn: ({ signal }) => fetchProductList(params as ListProductsParams, signal),
    enabled: Boolean(params?.appId),
  })
}

/** Spring catalog for an app. Shared with springProductService.getAllProducts. */
export function useCatalogProducts(params: { appId: string; type?: string; page?: number; limit?: number } | null) {
  return useQuery({
    queryKey: queryKeys.products.catalog(params ?? {}),
    queryFn: () => fetchCatalogProducts(params as { appId: string }),
    enabled: Boolean(params?.appId),
  })
}

/** Spring products active for an app. Shared with springProductService.getProductsForApp. */
export function useSpringProductsForApp(appId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.products.forApp(appId ?? ""),
    queryFn: () => fetchSpringProductsForApp(appId as string),
    enabled: Boolean(appId),
  })
}

/**
 * Product writes as React Query mutations (same signatures as productApi / springProductService);
 * a successful write refreshes every cached product list, product detail and the app list.
 */
export function useProductActions() {
  return useServiceMutations(
    {
      createProduct: productApi.createProduct.bind(productApi),
      updateProduct: productApi.updateProduct.bind(productApi),
      saveProductConfiguration: productApi.saveProductConfiguration.bind(productApi),
      toggleProductStatus: productApi.toggleProductStatus.bind(productApi),
      toggleAppProductActivation: productApi.toggleAppProductActivation.bind(productApi),
      toggleSpringProductActivation: springProductService.toggleProductActivation.bind(springProductService),
    },
    () => {
      invalidateDashboardProducts()
      invalidateDashboardApps()
    },
  )
}

/** Portfolio overview for an app (GET /products/overview?appId=). */
export function useProductOverview(appId: string | null | undefined) {
  return useQuery({
    queryKey: ["products", "overview", appId ?? ""],
    queryFn: ({ signal }) => productApi.getProductOverview(appId as string, signal),
    enabled: Boolean(appId),
  })
}

/** One product as configured for an app (GET /products/app/:appId → row + configuration view). */
export function useProductDetailForApp(appId: string | null | undefined, productId: string | null | undefined) {
  return useQuery({
    queryKey: [...queryKeys.products.detail(productId ?? ""), "for-app", appId ?? ""],
    queryFn: async () => {
      const result = await productApi.getProductDetailForApp(appId as string, productId as string)
      if (!result.success || !result.data) throw new Error(result.error || "Product not found")
      return result
    },
    enabled: Boolean(appId && productId),
  })
}
