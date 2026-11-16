"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { adminProductsApi, adminUsersApi, adminWalletApi } from "@/lib/services/adminService"

/**
 * Admin console reads. The admin services return `{ success, data, error }`; when an API is unavailable
 * the pages show an empty state rather than an error, so these resolve to empty data in that case.
 */

export function useAdminProducts(type?: string) {
  return useQuery({
    queryKey: ["admin", "products", type ?? "all"],
    queryFn: async () => {
      const res = await adminProductsApi.getAllProducts(type)
      if (!res.success && res.error) console.warn("[AdminProducts] API unavailable:", res.error)
      return res.success && res.data ? res.data : []
    },
  })
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const res = await adminUsersApi.getAllUsers()
      if (!res.success && res.error) console.warn("[AdminUsers] API unavailable:", res.error)
      return res.success && res.data ? res.data : []
    },
  })
}

export function useAdminWalletSummary() {
  return useQuery({
    queryKey: ["admin", "wallets", "summary"],
    queryFn: async () => {
      const res = await adminWalletApi.getSummary()
      return res.success && res.data ? res.data : {}
    },
  })
}

export function useAdminWalletTransactions(limit = 50) {
  return useQuery({
    queryKey: ["admin", "wallets", "transactions", limit],
    queryFn: async () => {
      const res = await adminWalletApi.getAllTransactions({ limit })
      return res.success && res.data ? res.data : []
    },
  })
}

/** Update a product from the admin console; refreshes the admin product lists. */
export function useAdminUpdateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ productId, patch }: { productId: string; patch: Parameters<typeof adminProductsApi.updateProduct>[1] }) =>
      adminProductsApi.updateProduct(productId, patch),
    onSuccess: (res) => {
      if (res.success) void queryClient.invalidateQueries({ queryKey: ["admin", "products"] })
    },
  })
}
