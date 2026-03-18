"use client"

import { useEffect, useState, useRef } from "react"
import { Upload } from "lucide-react"
import { Drawer } from "@/components/drawer"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import TextInput from "@/components/text-input"
import InputGroup from "@/components/input-group"

interface ConfigureCommodityDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => void
  commodityData: any
  variant?: "commodity" | "investment"
}

const SECURITY_OPTIONS = [
  { id: "market-insurance", label: "Market Insurance" },
  { id: "storage-insurance", label: "Storage Insurance" },
  { id: "quality-assurance", label: "Quality Assurance" },
  { id: "delivery-guarantee", label: "Delivery Guarantee" },
  { id: "none", label: "None" },
]

export default function ConfigureCommodityDrawer({
  isOpen,
  onClose,
  onSubmit,
  commodityData,
  variant = "commodity",
}: ConfigureCommodityDrawerProps) {
  const isInvestment = variant === "investment"
  const [step, setStep] = useState(1)
  const [purpose, setPurpose] = useState(commodityData?.description || "")
  const [tradingCycle, setTradingCycle] = useState("")
  const [tenureSelection, setTenureSelection] = useState("")
  const [tradingCycleOptions, setTradingCycleOptions] = useState<string[]>([
    "Daily",
    "Weekly",
    "Monthly",
    "Quarterly",
    "Seasonally",
  ])
  const [tenureOptions, setTenureOptions] = useState<string[]>([
    "3 months",
    "6 months",
    "12 months",
    "24 months",
    "Open-ended",
  ])
  const [securityRequirements, setSecurityRequirements] = useState<string[]>([])
  const [minInvestmentAmount, setMinInvestmentAmount] = useState("")
  const [maxInvestmentAmount, setMaxInvestmentAmount] = useState("")
  const [managementFee, setManagementFee] = useState("")
  const [minWithdrawalAmount, setMinWithdrawalAmount] = useState("")
  const [expectedReturn, setExpectedReturn] = useState("")
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!isOpen) return

    const fetchOptions = async () => {
      try {
        const tradingUrl = isInvestment
          ? "/api/configurations/options/investment-trading-cycle"
          : "/api/configurations/options/commodity-trading-cycle"
        const tenureUrl = isInvestment
          ? "/api/configurations/options/investment-tenure"
          : "/api/configurations/options/commodity-tenure"
        const [tradingRes, tenureRes] = await Promise.all([
          fetch(tradingUrl, { credentials: "include" }),
          fetch(tenureUrl, { credentials: "include" }),
        ])

        const tradingJson = await tradingRes.json().catch(() => ({}))
        const tenureJson = await tenureRes.json().catch(() => ({}))

        const tradingList = (tradingJson?.data ?? []) as { value?: string; label?: string }[]
        const tenureList = (tenureJson?.data ?? []) as { value?: string; label?: string }[]

        const trading =
          Array.isArray(tradingList) && tradingList.length
            ? tradingList
                .map((x) => x.label || x.value)
                .filter((v): v is string => typeof v === "string" && v.length > 0)
            : []
        const tenure =
          Array.isArray(tenureList) && tenureList.length
            ? tenureList
                .map((x) => x.label || x.value)
                .filter((v): v is string => typeof v === "string" && v.length > 0)
            : []

        if (trading.length) setTradingCycleOptions(trading)
        if (tenure.length) setTenureOptions(tenure)
      } catch {
        // keep defaults
      }
    }

    fetchOptions()
  }, [isOpen, isInvestment])

  // Format number with commas
  const formatWithCommas = (value: string) => {
    const numericValue = value.replace(/[^0-9.]/g, '')
    const parts = numericValue.split('.')
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    return parts.join('.')
  }

  // Remove commas for storage
  const removeCommas = (value: string) => {
    return value.replace(/,/g, '')
  }

  // Handle currency input change
  const handleCurrencyChange = (value: string, setter: (val: string) => void) => {
    const rawValue = removeCommas(value)
    if (rawValue === '' || /^\d*\.?\d{0,2}$/.test(rawValue)) {
      setter(formatWithCommas(rawValue))
    }
  }

  // Handle percentage input change with max 100 validation
  const handlePercentageChange = (value: string, setter: (val: string) => void, fieldName: string) => {
    const rawValue = value.replace(/[^0-9.]/g, '')
    if (rawValue === '' || /^\d*\.?\d{0,2}$/.test(rawValue)) {
      const numValue = parseFloat(rawValue)
      if (rawValue === '' || numValue <= 100) {
        setter(rawValue)
        setErrors(prev => ({ ...prev, [fieldName]: '' }))
      } else {
        setErrors(prev => ({ ...prev, [fieldName]: 'Percentage cannot exceed 100%' }))
      }
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type !== 'application/pdf') {
        alert('Please upload a PDF file')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB')
        return
      }
      setUploadedFile(file)
    }
  }

  const handleSecurityChange = (optionId: string, checked: boolean) => {
    if (checked) {
      setSecurityRequirements(prev => [...prev, optionId])
    } else {
      setSecurityRequirements(prev => prev.filter(id => id !== optionId))
    }
  }

  const handleNext = () => {
    if (step === 1) {
      setStep(2)
    } else if (step === 2) {
      // Validate before submit
      const minAmount = parseFloat(removeCommas(minInvestmentAmount))
      const maxAmount = parseFloat(removeCommas(maxInvestmentAmount))
      
      if (maxAmount < minAmount) {
        setErrors(prev => ({ ...prev, maxAmount: 'Maximum must be greater than minimum' }))
        return
      }
      
      if (errors.managementFee || errors.expectedReturn) {
        return
      }
      
      if (isInvestment) {
        onSubmit({
          ...commodityData,
          purpose,
          tradingCycle,
          investmentTenure: tenureSelection,
          investmentType:
            commodityData?.investmentType ?? commodityData?.productType ?? commodityData?.productSubtype,
          securityRequirements,
          minimumOrderQuantity: removeCommas(minInvestmentAmount),
          price: removeCommas(maxInvestmentAmount),
          managementFeePercent: managementFee,
          minimumRedemptionAmount: removeCommas(minWithdrawalAmount),
          expectedAnnualReturn: expectedReturn,
        })
      } else {
        onSubmit({
          ...commodityData,
          purpose,
          tradingCycle,
          commodityTenure: tenureSelection,
          securityRequirements,
          minInvestmentAmount: removeCommas(minInvestmentAmount),
          maxInvestmentAmount: removeCommas(maxInvestmentAmount),
          managementFee,
          minWithdrawalAmount: removeCommas(minWithdrawalAmount),
          expectedReturn,
        })
      }
    }
  }

  const handleBack = () => {
    if (step === 2) {
      setStep(1)
    }
  }

  const breadcrumb = (
    <div className="flex items-center gap-2 text-sm text-gray-500">
      <span className={step === 1 ? "text-[#9A813F] font-medium" : ""}>Purpose</span>
      <span>/</span>
      <span className={step === 2 ? "text-[#9A813F] font-medium" : ""}>Amount</span>
      <span>/</span>
      <span>Timeline</span>
    </div>
  )

  return (
    <Drawer
      open={isOpen}
      onOpenChange={onClose}
      title={isInvestment ? "Configure investment product" : "Configure commodity product"}
      subtitle={
        step === 1
          ? isInvestment
            ? "Investment purpose and schedule"
            : "Create the product you want"
          : isInvestment
            ? "Commitment and return details"
            : "Product amount details"
      }
    >
      <div className="mb-4">{breadcrumb}</div>

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Purpose/Description</label>
            <textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Purpose/Description"
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9A813F] focus:border-transparent resize-none"
            />
          </div>

          <InputGroup
            label={isInvestment ? "Investment trading cycle" : "Trading cycle"}
            placeholder={isInvestment ? "Select cycle" : "Trading cycle"}
            options={tradingCycleOptions}
            value={tradingCycle}
            onChange={setTradingCycle}
            accentColor="#9A813F"
          />

          <InputGroup
            label={isInvestment ? "Investment tenure" : "Commodity tenure"}
            placeholder={isInvestment ? "Investment tenure" : "Commodity tenure"}
            options={tenureOptions}
            value={tenureSelection}
            onChange={setTenureSelection}
            accentColor="#9A813F"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Security Requirements (select all that apply)</label>
            <div className="grid grid-cols-2 gap-3">
              {SECURITY_OPTIONS.map((option) => (
                <div key={option.id} className="flex items-center gap-3">
                  <Checkbox
                    id={`security-${option.id}`}
                    checked={securityRequirements.includes(option.id)}
                    onCheckedChange={(checked) => handleSecurityChange(option.id, checked as boolean)}
                    className="rounded-full data-[state=checked]:bg-[#9A813F] data-[state=checked]:border-[#9A813F]"
                  />
                  <label htmlFor={`security-${option.id}`} className="text-sm text-gray-700 cursor-pointer">
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Additional requirement</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="mx-auto mb-2 text-gray-400" size={24} />
              {uploadedFile ? (
                <p className="text-sm text-green-600 mb-1">{uploadedFile.name}</p>
              ) : (
                <p className="text-sm text-gray-600 mb-1">Additional requirement</p>
              )}
              <p className="text-xs text-gray-400">PDF format • Max. 5MB</p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".pdf"
                className="hidden"
              />
              <Button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 bg-[#9A813F] text-white hover:bg-[#8A7335]"
              >
                {uploadedFile ? 'Change File' : 'Upload'}
              </Button>
            </div>
          </div>

          <Button
            onClick={handleNext}
            disabled={!purpose || !tradingCycle || !tenureSelection || securityRequirements.length === 0}
            className="w-full bg-black text-white hover:bg-gray-800 h-12 mt-6"
          >
            Next
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isInvestment ? "Minimum order quantity (₦)" : "Minimum investment amount (₦)"}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₦</span>
              <input
                type="text"
                placeholder="0.00"
                value={minInvestmentAmount}
                onChange={(e) => handleCurrencyChange(e.target.value, setMinInvestmentAmount)}
                className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9A813F] focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isInvestment ? "Reference price / max commitment (₦)" : "Maximum investment amount (₦)"}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₦</span>
              <input
                type="text"
                placeholder="0.00"
                value={maxInvestmentAmount}
                onChange={(e) => handleCurrencyChange(e.target.value, setMaxInvestmentAmount)}
                className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9A813F] focus:border-transparent"
              />
            </div>
            {removeCommas(minInvestmentAmount) && removeCommas(maxInvestmentAmount) && 
             parseFloat(removeCommas(maxInvestmentAmount)) < parseFloat(removeCommas(minInvestmentAmount)) && (
              <p className="text-red-500 text-xs mt-1">Maximum must be greater than minimum</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isInvestment ? "Management fee (%)" : "Management fee (%)"}
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="0.00"
                value={managementFee}
                onChange={(e) => handlePercentageChange(e.target.value, setManagementFee, 'managementFee')}
                className={`w-full pl-4 pr-8 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9A813F] focus:border-transparent ${errors.managementFee ? 'border-red-500' : 'border-gray-300'}`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">%</span>
            </div>
            {errors.managementFee && <p className="text-red-500 text-xs mt-1">{errors.managementFee}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isInvestment ? "Minimum redemption amount (₦)" : "Minimum withdrawal amount (₦)"}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₦</span>
              <input
                type="text"
                placeholder="0.00"
                value={minWithdrawalAmount}
                onChange={(e) => handleCurrencyChange(e.target.value, setMinWithdrawalAmount)}
                className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9A813F] focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isInvestment ? "Expected annual return (% p.a.)" : "Expected return (% per annum)"}
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="0.00"
                value={expectedReturn}
                onChange={(e) => handlePercentageChange(e.target.value, setExpectedReturn, 'expectedReturn')}
                className={`w-full pl-4 pr-16 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9A813F] focus:border-transparent ${errors.expectedReturn ? 'border-red-500' : 'border-gray-300'}`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">% p.a.</span>
            </div>
            {errors.expectedReturn && <p className="text-red-500 text-xs mt-1">{errors.expectedReturn}</p>}
          </div>

          <div className="flex gap-4 mt-6">
            <Button onClick={handleBack} variant="outline" className="flex-1 h-12 bg-transparent">
              Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={!minInvestmentAmount || !maxInvestmentAmount || !managementFee || !minWithdrawalAmount || !expectedReturn}
              className="flex-1 bg-black text-white hover:bg-gray-800 h-12"
            >
              {isInvestment ? "Save investment configuration" : "Save configuration"}
            </Button>
          </div>
        </div>
      )}
    </Drawer>
  )
}
