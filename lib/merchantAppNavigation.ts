/**
 * Keep the current merchant products tab when switching apps; otherwise open the default products view.
 */
export function buildMerchantProductsUrl(pathname: string, appId: string): string {
  const base = pathname.includes("/products/all/")
    ? pathname
    : "/dashboard/merchant/products/all/loan"
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "")
  params.set("appId", appId)
  return `${base}?${params.toString()}`
}
