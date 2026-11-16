"use client"
import { Drawer } from "@/components/drawer"
import { Skeleton } from "@/components/ui/skeleton"
import { useProductTypes } from "@/hooks/queries/productCatalog"

type ProductTypeOption = {
  value: string
  label: string
}

interface CreateProductDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSelectProduct: (productType: string) => void
  accentColor?: string
  cardBgColor?: string
  cardHoverColor?: string
}

export default function CreateProductDrawer({ 
  isOpen, 
  onClose, 
  onSelectProduct,
  accentColor = "#9A813F",
  cardBgColor = "#F5F1E8",
  cardHoverColor = "#EBE5D6"
}: CreateProductDrawerProps) {
  // Cached across opens; the skeleton only shows on the very first load.
  const { data: fetchedTypes, isPending: isLoadingTypes } = useProductTypes(isOpen)
  const productTypes: ProductTypeOption[] = fetchedTypes ?? []

  // Static descriptions keyed by backend type value
  const descriptions: Record<string, string> = {
    Loan:
      "Set up loan products, define repayment terms, interest rates, and eligibility criteria, then manage them from your dashboard.",
    Mortgage:
      "Create mortgage products to finance property purchases, configure repayment schedules and interest structures for long-term offerings.",
    Savings:
      "Offer tailored savings plans with interest rates, deposit requirements, and lock-in periods to help users grow funds securely.",
    Commodity:
      "Offer commodity products and manage trading cycles, tenure, and security requirements directly from your dashboard.",
    Investment:
      "Create investment products and portfolios that enable customers to grow wealth with structured returns.",
  }

  return (
    <Drawer
      open={isOpen}
      onOpenChange={onClose}
      title="Create Product"
      subtitle="Select the product option you want to create with us"
    >
      <div className="grid grid-cols-2 gap-4">
        {isLoadingTypes
          ? Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg p-6 min-h-[140px]"
                style={{ backgroundColor: cardBgColor }}
              >
                <Skeleton className="h-6 w-28 mb-3 bg-black/10" />
                <Skeleton className="h-3 w-full mb-2 bg-black/10" />
                <Skeleton className="h-3 w-full mb-2 bg-black/10" />
                <Skeleton className="h-3 w-[85%] bg-black/10" />
              </div>
            ))
          : productTypes.map((product) => (
              <button
                key={product.value}
                onClick={() => onSelectProduct(product.value.toLowerCase())}
                className="rounded-lg p-6 text-left transition-colors"
                style={{
                  backgroundColor: cardBgColor,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = cardHoverColor)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = cardBgColor)}
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{product.label}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {descriptions[product.value] || descriptions[product.label] || ""}
                </p>
              </button>
            ))}
      </div>
    </Drawer>
  )
}
