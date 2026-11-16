"use client"

import { useQuery } from "@tanstack/react-query"
import { loadProductOptions, productOptionsQueryKey } from "@/lib/productOptions"

import {
  useGetApiV1ProductsTypes,
  useGetApiV1ProductsTypesTypeSubtypes,
} from "@/lib/generated/plata/products-—-builder/products-—-builder"
import {
  useGetApiV1ConfigurationsOptionsCommodityTenure,
  useGetApiV1ConfigurationsOptionsInvestmentTenure,
  useGetApiV1ConfigurationsOptionsSavingsTenure,
} from "@/lib/generated/plata/products-—-options/products-—-options"
import type { ProductType } from "@/lib/generated/plata/model/productType"

type OptionRow = { value?: string | number; label?: string }

/** `{ data: [...] }` → the rows array (the spec types `data` loosely as an object). */
function rows(body: unknown): OptionRow[] {
  const data = (body as { data?: unknown } | undefined)?.data
  return Array.isArray(data) ? (data as OptionRow[]) : []
}

/** Display labels (label, else value), dropping empties. */
function labels(body: unknown): string[] {
  return rows(body)
    .map((x) => x.label || (x.value != null ? String(x.value) : ""))
    .filter((v): v is string => v.length > 0)
}

/** Product types for the "create product" picker: [{ value, label }]. */
export function useProductTypes(enabled = true) {
  return useGetApiV1ProductsTypes({
    query: {
      enabled,
      select: (body) =>
        rows(body).filter((r): r is { value: string; label: string } => Boolean(r.value && r.label)),
    },
  })
}

/** Subtype labels for a product type ("Loan" / "LOAN" etc. — sent upper-case as the spec requires). */
export function useProductSubtypeLabels(type: string, enabled = true) {
  return useGetApiV1ProductsTypesTypeSubtypes(type.toUpperCase() as ProductType, {
    query: { enabled: enabled && Boolean(type), select: labels },
  })
}

/** Tenure option labels from /configurations/options/{savings|investment|commodity}-tenure. */
export function useTenureLabels(kind: "savings" | "investment" | "commodity", enabled = true) {
  const savings = useGetApiV1ConfigurationsOptionsSavingsTenure({
    query: { enabled: enabled && kind === "savings", select: labels },
  })
  const investment = useGetApiV1ConfigurationsOptionsInvestmentTenure({
    query: { enabled: enabled && kind === "investment", select: labels },
  })
  const commodity = useGetApiV1ConfigurationsOptionsCommodityTenure({
    query: { enabled: enabled && kind === "commodity", select: labels },
  })
  return kind === "savings" ? savings : kind === "investment" ? investment : commodity
}

/** `{ value, label }` rows for /products/options/:name (shares the cache with lib/productOptions fetchers). */
export function useProductOptions(
  optionName: string,
  query?: Record<string, string | number | boolean | undefined | null>,
  enabled = true,
) {
  return useQuery({
    queryKey: productOptionsQueryKey(optionName, query),
    queryFn: () => loadProductOptions(optionName, query),
    staleTime: 30 * 60_000,
    enabled,
  })
}

/** Labels for /products/options/:name, or `fallback` while loading / when empty. */
export function useOptionLabels(optionName: string, fallback: string[] = [], enabled = true) {
  const { data } = useProductOptions(optionName, undefined, enabled)
  const labels = data?.map((o) => o.label) ?? []
  return labels.length ? labels : fallback
}
