import { getQueryClient } from "@/lib/query/queryClient"
import {
  getApiV1ProductsTypesTypeSubtypes,
  getGetApiV1ProductsTypesTypeSubtypesQueryKey,
} from "@/lib/generated/plata/products-—-builder/products-—-builder"
import {
  getApiV1ConfigurationsOptionsCommodityTenure,
  getApiV1ConfigurationsOptionsInvestmentTenure,
  getApiV1ConfigurationsOptionsSavingsTenure,
  getGetApiV1ConfigurationsOptionsCommodityTenureQueryKey,
  getGetApiV1ConfigurationsOptionsInvestmentTenureQueryKey,
  getGetApiV1ConfigurationsOptionsSavingsTenureQueryKey,
} from "@/lib/generated/plata/products-—-options/products-—-options"
import type { ProductType } from "@/lib/generated/plata/model/productType"

/**
 * Imperative, React Query–cached reads for code that loads several lists at once (configure drawers,
 * prefetch). Same keys and request functions as the generated hooks, so hooks and these share one cache.
 * They resolve to the raw `{ success, data }` body, or `{}` on failure.
 */

const tenure = {
  savings: [getGetApiV1ConfigurationsOptionsSavingsTenureQueryKey, getApiV1ConfigurationsOptionsSavingsTenure],
  investment: [getGetApiV1ConfigurationsOptionsInvestmentTenureQueryKey, getApiV1ConfigurationsOptionsInvestmentTenure],
  commodity: [getGetApiV1ConfigurationsOptionsCommodityTenureQueryKey, getApiV1ConfigurationsOptionsCommodityTenure],
} as const

export async function fetchTenureOptionsBody(kind: keyof typeof tenure): Promise<{ data?: unknown }> {
  const [key, fn] = tenure[kind]
  try {
    return (await getQueryClient().fetchQuery({ queryKey: key(), queryFn: ({ signal }) => fn(signal) })) as {
      data?: unknown
    }
  } catch {
    return {}
  }
}

export async function fetchSubtypesBody(type: string): Promise<{ data?: unknown }> {
  const productType = type.toUpperCase() as ProductType
  try {
    return (await getQueryClient().fetchQuery({
      queryKey: getGetApiV1ProductsTypesTypeSubtypesQueryKey(productType),
      queryFn: ({ signal }) => getApiV1ProductsTypesTypeSubtypes(productType, signal),
    })) as { data?: unknown }
  } catch {
    return {}
  }
}
