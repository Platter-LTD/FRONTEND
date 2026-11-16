"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { CreditCard, Plus, Loader2, Building2, Wallet } from "lucide-react"
import type { PaymentMethod } from "@/lib/services/paymentService"
import { usePaymentActions, usePaymentMethods } from "@/hooks/queries/payments"

export function BillingPaymentMethodsTab() {
  const methodsQuery = usePaymentMethods()
  const paymentActions = usePaymentActions()
  const paymentMethods: PaymentMethod[] = methodsQuery.data?.data ?? []
  const loading = methodsQuery.isLoading
  const error = methodsQuery.error ? "Failed to load payment methods" : null
  const loadPaymentMethods = () => void methodsQuery.refetch()

  const handleSetDefault = async (id: string) => {
    try {
      await paymentActions.setDefaultPaymentMethod(id)
    } catch (err) {
      console.error('Failed to set default payment method:', err)
    }
  }

  const handleDeleteMethod = async (id: string) => {
    try {
      await paymentActions.deletePaymentMethod(id)
    } catch (err) {
      console.error('Failed to delete payment method:', err)
    }
  }

  const getMethodIcon = (type: string) => {
    switch (type) {
      case 'card':
        return CreditCard
      case 'bank':
        return Building2
      case 'wallet':
        return Wallet
      default:
        return CreditCard
    }
  }

  const getMethodLabel = (method: PaymentMethod) => {
    if (method.type === 'card' && method.details?.brand && method.details?.last4) {
      return `${method.details.brand} •••• ${method.details.last4}`
    }
    if (method.type === 'bank_transfer' && method.details?.bankName) {
      return `${method.details.bankName} Account`
    }
    return method.type.charAt(0).toUpperCase() + method.type.slice(1)
  }

  const getExpiryLabel = (method: PaymentMethod) => {
    if (method.type === 'card' && method.details?.expiryMonth && method.details?.expiryYear) {
      return `Expires ${String(method.details.expiryMonth).padStart(2, '0')}/${String(method.details.expiryYear).slice(-2)}`
    }
    return ''
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div></div>
        <Button className="bg-black text-white hover:bg-gray-800">
          <Plus className="w-4 h-4 mr-2" />
          Add Payment Method
        </Button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <p className="text-red-600">{error}</p>
            <Button onClick={loadPaymentMethods} variant="outline" className="mt-2">
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && !error && paymentMethods.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No payment methods added yet</p>
            <p className="text-sm text-gray-400">Add a payment method to get started</p>
          </CardContent>
        </Card>
      )}

      {/* Payment Methods List */}
      {!loading && !error && paymentMethods.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {paymentMethods.map((method) => {
            const Icon = getMethodIcon(method.type)
            return (
              <Card key={method.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-8 bg-gray-200 rounded flex items-center justify-center">
                        <Icon className="w-6 h-6 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium">{getMethodLabel(method)}</p>
                        {getExpiryLabel(method) && (
                          <p className="text-sm text-gray-600">{getExpiryLabel(method)}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {method.isDefault && (
                        <Badge className="bg-[#9A813F] text-white">Default</Badge>
                      )}
                      {!method.isDefault && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleSetDefault(method.id)}
                        >
                          Set Default
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
