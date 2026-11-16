'use client'

import { useQuery } from '@tanstack/react-query'
import {
  fetchPlatformFieldCatalog,
  filterFieldsForProductType,
  loadPlatformSelectOptionsMap,
  type PlatformFieldDefinition,
  type PlatformSelectOption,
} from '@/lib/platformApplicationFields'

const NO_FIELDS: PlatformFieldDefinition[] = []
const NO_OPTIONS: Record<string, PlatformSelectOption[]> = {}

/** Platform application fields for a product type, with their select options (cached per type). */
export function usePlatformApplicationFieldCatalog(productType: 'LOAN' | 'MORTGAGE') {
  const query = useQuery({
    queryKey: ['platform-application-fields', productType],
    queryFn: async () => {
      const fields = filterFieldsForProductType(await fetchPlatformFieldCatalog(), productType)
      const optionsByPath = await loadPlatformSelectOptionsMap(fields)
      return { fields, optionsByPath }
    },
    staleTime: 30 * 60_000,
  })

  return {
    fields: query.data?.fields ?? NO_FIELDS,
    optionsByPath: query.data?.optionsByPath ?? NO_OPTIONS,
    loading: query.isLoading,
    error: query.error ? query.error.message || 'Could not load application fields.' : null,
  }
}
