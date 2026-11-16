"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { toast } from "sonner"
import { formatProductApiErrorMessage } from "@/lib/formatProductApiErrorMessage"
import { Drawer } from "@/components/drawer"
import { Button } from "@/components/ui/button"
import { uploadProductMediaToUrl } from "@/lib/uploadProductMediaToUrl"
import { fetchOptionLabels, fetchProductOptionLabels } from "@/lib/productOptions"
import { ProductConfigAboutStep } from "@/components/drawers/product-config-about-step"
import {
  PRODUCT_TYPE_SECTION_HELPER,
  ProductConfigInput,
  ProductConfigSelect,
  ProductConfigFooter,
  ProductConfigStepCard,
  ProductConfigStepErrors,
  ProductConfigTabs,
  RequirementMark,
  ProductConfigToggle,
} from "@/components/drawers/product-config-form-fields"
import { formatAmountDisplayFromUnknown } from "@/lib/formatAmountInput"
import { validateAllInvestmentSteps, validateInvestmentStep } from "@/lib/productConfigureStepValidation"
import { fetchSubtypesBody, fetchTenureOptionsBody } from "@/lib/productCatalogQueries"

interface ConfigureInvestmentDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => void | Promise<void>
  investmentData: any
  /** Optional accent; defaults to gold used across product drawers */
  accentColor?: string
}

const STEPS = ["About Product", "Structure", "Fees & Charges"]

const DEFAULT_DURATION_OPTIONS: string[] = []
const DEFAULT_INTEREST_METHOD_OPTIONS: string[] = []
const INVESTMENT_TYPE_OPTIONS: string[] = []
const DEFAULT_WITHDRAWAL_FLEXIBILITY_OPTIONS: string[] = []
const DEFAULT_FEE_TYPE_OPTIONS: string[] = []
const DEFAULT_PENALTY_TYPE_OPTIONS: string[] = []
const TRIGGER_DURATION_OPTIONS: string[] = []

interface InvestmentTypeItem {
  name: string
  description: string
}

interface FeeItem {
  name: string
  feeType: string
  value: string
}

interface WithdrawalPenaltyItem {
  name: string
  type: string
  value: string
  triggerDuration: string
}

export default function ConfigureInvestmentDrawer({
  isOpen,
  onClose,
  onSubmit,
  investmentData,
  accentColor = "#9A813F",
}: ConfigureInvestmentDrawerProps) {
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [durationOptions, setDurationOptions] = useState<string[]>(DEFAULT_DURATION_OPTIONS)
  const [interestMethodOptions, setInterestMethodOptions] = useState<string[]>(DEFAULT_INTEREST_METHOD_OPTIONS)
  const [withdrawalFlexibilityOptions, setWithdrawalFlexibilityOptions] = useState<string[]>(DEFAULT_WITHDRAWAL_FLEXIBILITY_OPTIONS)
  const [feeTypeOptions, setFeeTypeOptions] = useState<string[]>(DEFAULT_FEE_TYPE_OPTIONS)
  const [penaltyTypeOptions, setPenaltyTypeOptions] = useState<string[]>(DEFAULT_PENALTY_TYPE_OPTIONS)
  const [investmentTypeOptions, setInvestmentTypeOptions] = useState<string[]>(INVESTMENT_TYPE_OPTIONS)
  const [triggerDurationOptions, setTriggerDurationOptions] = useState<string[]>(TRIGGER_DURATION_OPTIONS)

  const [name, setName] = useState(investmentData?.name || "")
  const [duration, setDuration] = useState("")
  const [description, setDescription] = useState(investmentData?.description || "")
  const [typeNameDraft, setTypeNameDraft] = useState("")
  const [typeDescDraft, setTypeDescDraft] = useState("")
  const [investmentTypes, setInvestmentTypes] = useState<InvestmentTypeItem[]>([])
  const [previewImage, setPreviewImage] = useState<File | null>(null)

  const [roi, setRoi] = useState("")
  const [interestMethod, setInterestMethod] = useState("")
  const [investmentType, setInvestmentType] = useState("")
  const [withdrawalFlexibility, setWithdrawalFlexibility] = useState("")
  const [minAmount, setMinAmount] = useState("")
  const [maxAmount, setMaxAmount] = useState("")
  const [termsAndConditions, setTermsAndConditions] = useState("")

  const [enableUnitInvestment, setEnableUnitInvestment] = useState(false)
  const [moratoriumEnabled, setMoratoriumEnabled] = useState(true)
  const [moratoriumDays, setMoratoriumDays] = useState("")
  const [unitAmount, setUnitAmount] = useState("")
  const [minQuantity, setMinQuantity] = useState("")

  const [chargeName, setChargeName] = useState("")
  const [chargeFeeType, setChargeFeeType] = useState("")
  const [chargeValue, setChargeValue] = useState("")
  const [charges, setCharges] = useState<FeeItem[]>([])
  const [chargeForcefulWithdrawal, setChargeForcefulWithdrawal] = useState(true)
  const [penaltyName, setPenaltyName] = useState("")
  const [penaltyType, setPenaltyType] = useState("")
  const [penaltyValue, setPenaltyValue] = useState("")
  const [penaltyTriggerDuration, setPenaltyTriggerDuration] = useState("")
  const [withdrawalPenalties, setWithdrawalPenalties] = useState<WithdrawalPenaltyItem[]>([])

  const isPercentType = (value: string) => value.toLowerCase().includes("percent")
  const cleanNumeric = (value: string) => value.replace(/,/g, "").replace(/[^0-9.]/g, "")
  const normalizePercentInput = (raw: string) => {
    const numeric = cleanNumeric(raw)
    if (!numeric) return ""
    return `${numeric}%`
  }
  const normalizeTypedValue = (raw: string, type: string) => {
    const numeric = cleanNumeric(raw)
    if (!numeric) return ""
    return isPercentType(type) ? `${numeric}%` : formatAmountDisplayFromUnknown(numeric)
  }
  const handleChargeFeeTypeChange = (nextType: string) => {
    setChargeFeeType(nextType)
    setChargeValue((prev) => normalizeTypedValue(prev, nextType))
  }
  const handlePenaltyTypeChange = (nextType: string) => {
    setPenaltyType(nextType)
    setPenaltyValue((prev) => normalizeTypedValue(prev, nextType))
  }
  const handleChargeValueChange = (value: string) => {
    setChargeValue(normalizeTypedValue(value, chargeFeeType))
  }
  const handlePenaltyValueChange = (value: string) => {
    setPenaltyValue(normalizeTypedValue(value, penaltyType))
  }
  const handleRoiChange = (value: string) => {
    setRoi(normalizePercentInput(value))
  }

  const [stepErrors, setStepErrors] = useState<string[]>([])

  useEffect(() => {
    if (!isOpen) return
    const fetchOptions = async () => {
      try {
        const tenureJson = await fetchTenureOptionsBody("investment")
        const tenureList = (tenureJson?.data ?? []) as { value?: string; label?: string }[]
        const tenure =
          Array.isArray(tenureList) && tenureList.length
            ? tenureList.map((x) => x.label || x.value).filter((v): v is string => typeof v === "string" && v.length > 0)
            : []
        if (tenure.length) setDurationOptions(tenure)
      } catch {
        // keep defaults
      }
      const [interestMethods, withdrawalFlexibility, feeTypes, penaltyTypes, triggerDuration] = await Promise.all([
        fetchProductOptionLabels("interest-method", DEFAULT_INTEREST_METHOD_OPTIONS),
        fetchOptionLabels("withdrawal-flexibility", DEFAULT_WITHDRAWAL_FLEXIBILITY_OPTIONS),
        fetchOptionLabels("fee-type", DEFAULT_FEE_TYPE_OPTIONS),
        fetchOptionLabels("penalty-type", DEFAULT_PENALTY_TYPE_OPTIONS),
        fetchProductOptionLabels("trigger-duration", TRIGGER_DURATION_OPTIONS),
      ])
      setInterestMethodOptions(interestMethods)
      setWithdrawalFlexibilityOptions(withdrawalFlexibility)
      setFeeTypeOptions(feeTypes)
      setPenaltyTypeOptions(penaltyTypes)
      setTriggerDurationOptions(triggerDuration)

      try {
        const subtypesJson = (await fetchSubtypesBody("INVESTMENT")) as {
          data?: Array<{ label?: string; value?: string | number }>
        }
        const subtypeOptions = (subtypesJson?.data ?? [])
          .map((x) => x.label || (x.value !== undefined && x.value !== null ? String(x.value) : ""))
          .filter((v): v is string => typeof v === "string" && v.length > 0)
        setInvestmentTypeOptions(subtypeOptions)
      } catch {
        setInvestmentTypeOptions(INVESTMENT_TYPE_OPTIONS)
      }
    }
    fetchOptions()
  }, [isOpen, step])

  useEffect(() => {
    setStepErrors([])
  }, [step])

  const removeCommas = (value: string) => value.replace(/,/g, "")

  const addInvestmentTypeRow = () => {
    if (!typeNameDraft.trim() || !typeDescDraft.trim()) return
    setInvestmentTypes((prev) => [...prev, { name: typeNameDraft.trim(), description: typeDescDraft.trim() }])
    setTypeNameDraft("")
    setTypeDescDraft("")
  }

  const removeInvestmentTypeRow = (index: number) => {
    setInvestmentTypes((prev) => prev.filter((_, i) => i !== index))
  }

  const removeCharge = (index: number) => setCharges((prev) => prev.filter((_, i) => i !== index))
  const addCharge = () => {
    if (!chargeName.trim() || !chargeFeeType || !chargeValue.trim()) return
    setCharges((prev) => [...prev, { name: chargeName.trim(), feeType: chargeFeeType, value: chargeValue.trim() }])
    setChargeName("")
    setChargeFeeType("")
    setChargeValue("")
  }

  const addPenalty = () => {
    if (!penaltyName.trim() || !penaltyType || !penaltyValue.trim() || !penaltyTriggerDuration) return
    setWithdrawalPenalties((prev) => [
      ...prev,
      {
        name: penaltyName.trim(),
        type: penaltyType,
        value: penaltyValue.trim(),
        triggerDuration: penaltyTriggerDuration,
      },
    ])
    setPenaltyName("")
    setPenaltyType("")
    setPenaltyValue("")
    setPenaltyTriggerDuration("")
  }

  const removePenalty = (index: number) => setWithdrawalPenalties((prev) => prev.filter((_, i) => i !== index))

  const handleEnableUnitInvestmentChange = (checked: boolean) => {
    setEnableUnitInvestment(checked)
    if (!checked) setUnitAmount("")
  }

  const handleBack = () => {
    if (isSubmitting) return
    if (step > 1) setStep((s) => s - 1)
  }

  const investmentValidationBase = () => ({
    name,
    duration,
    description,
    investmentTypes,
    previewImage,
    hasPreviewAsset: !!(
      (investmentData?.about as Record<string, unknown> | undefined)?.previewAssetUrl ||
      investmentData?.previewAssetUrl ||
      investmentData?.previewImage?.url
    ),
    roi,
    interestMethod,
    investmentType,
    withdrawalFlexibility,
    minAmount: removeCommas(minAmount),
    maxAmount: removeCommas(maxAmount),
    termsAndConditions,
    enableUnitInvestment,
    unitAmount: removeCommas(unitAmount),
    minQuantity,
    charges,
    chargeForcefulWithdrawal,
    withdrawalPenalties,
  })

  const handleNext = async () => {
    if (step < STEPS.length) {
      const { ok, errors } = validateInvestmentStep({ step, ...investmentValidationBase() })
      if (!ok) {
        setStepErrors(errors)
        return
      }
      setStepErrors([])
      setStep((s) => s + 1)
      return
    }

    const all = validateAllInvestmentSteps(investmentValidationBase())
    if (!all.ok) {
      setStepErrors(all.errors)
      return
    }
    setStepErrors([])

    setIsSubmitting(true)
    try {
      let previewAssetUrlSubmit =
        String(
          (investmentData?.about as Record<string, unknown> | undefined)?.previewAssetUrl ??
            investmentData?.previewAssetUrl ??
            investmentData?.previewImage?.url ??
            "",
        ).trim() || undefined
      if (previewImage) {
        previewAssetUrlSubmit = await uploadProductMediaToUrl(previewImage)
      }

      await Promise.resolve(
        onSubmit({
          ...investmentData,
          name,
          durationOfInvestment: duration,
          description,
          investmentTypes,
          previewImage: null,
          previewAssetUrl: previewAssetUrlSubmit,
          returnsOnInvestment: roi,
          interestMethod,
          investmentType,
          withdrawalFlexibility,
          minInvestmentAmount: removeCommas(minAmount),
          maxInvestmentAmount: removeCommas(maxAmount),
          termsAndConditions,
          enableUnitInvestment,
          enableUnitInvestmentPurchase: enableUnitInvestment,
          moratoriumEnabled,
          moratoriumDays,
          unitAmount: enableUnitInvestment ? removeCommas(unitAmount) : "",
          minQuantity,
          charges,
          chargeForcefulWithdrawal,
          withdrawalPenalties,
          requireApplicantSignature: false,
          /** Fields older flows / APIs may still read */
          purpose: description,
          investmentTenure: duration,
          expectedReturn: roi,
          payoutCycle: withdrawalFlexibility,
          riskLevel: investmentType,
          currency: "",
          managementFee: "",
          prospectusDocuments: [],
        }),
      )
      toast.success("Investment product configuration saved successfully.")
    } catch (err: unknown) {
      toast.error(formatProductApiErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Drawer
      open={isOpen}
      onOpenChange={onClose}
      title="Configure Investment Product"
      subtitle="Configure the parameters of this investment product"
      className="sm:max-w-[48rem]"
      bodyClassName="bg-gray-50/70 p-4 sm:p-6"
      subHeader={<ProductConfigTabs steps={STEPS} activeStep={step} onStepChange={setStep} />}
      footer={
        <ProductConfigFooter
          step={step}
          total={STEPS.length}
          isSubmitting={isSubmitting}
          onBack={handleBack}
          onNext={handleNext}
        />
      }
    >
      <ProductConfigStepCard steps={STEPS} activeStep={step}>

        <ProductConfigStepErrors errors={stepErrors} />

        {step === 1 && (
          <ProductConfigAboutStep
            idPrefix="investment"
            nameLabel="Name of Investment"
            name={name}
            onNameChange={setName}
            durationLabel="Duration of Investment"
            durationPlaceholder="Select"
            durationValue={duration}
            durationOptions={durationOptions}
            onDurationChange={setDuration}
            description={description}
            onDescriptionChange={setDescription}
            typeSectionLabel="Investment Type"
            typeSectionRequirement="optional"
            typeSectionHelperText={PRODUCT_TYPE_SECTION_HELPER}
            typeNameDraft={typeNameDraft}
            typeDescDraft={typeDescDraft}
            onTypeNameDraftChange={setTypeNameDraft}
            onTypeDescDraftChange={setTypeDescDraft}
            onAddType={addInvestmentTypeRow}
            onRemoveTypeRow={removeInvestmentTypeRow}
            typeRows={investmentTypes}
            previewFile={previewImage}
            onPreviewFileChange={setPreviewImage}
            accentColor={accentColor}
          />
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-end">
              <ProductConfigInput
                label="Returns on Investment (ROI)"
                placeholder="e.g 10%"
                value={roi}
                onChange={handleRoiChange}
                numericOnly
                requirement="required"
              />
              <ProductConfigSelect
                label="Yield Method"
                placeholder="Select"
                value={interestMethod}
                options={interestMethodOptions}
                onChange={setInterestMethod}
                requirement="required"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-end">
              <ProductConfigSelect
                label="Investment Type"
                placeholder="Select"
                value={investmentType}
                options={investmentTypeOptions}
                onChange={setInvestmentType}
                requirement="required"
              />
              <ProductConfigSelect
                label="Withdrawal Flexibility"
                placeholder="Select"
                value={withdrawalFlexibility}
                options={withdrawalFlexibilityOptions}
                onChange={setWithdrawalFlexibility}
                requirement="required"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Investment Amount<RequirementMark requirement="required" />
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-end">
                <ProductConfigInput
                  label="Minimum"
                  placeholder="Min Amount"
                  value={minAmount}
                  onChange={setMinAmount}
                  numericOnly
                  formatThousands
                  requirement="required"
                />
                <ProductConfigInput
                  label="Maximum"
                  placeholder="Max Amount"
                  value={maxAmount}
                  onChange={setMaxAmount}
                  numericOnly
                  formatThousands
                  requirement="required"
                />
              </div>
            </div>

            <ProductConfigToggle
              id="investment-unit-purchase"
              label="Enable unit investment purchase"
              checked={enableUnitInvestment}
              onChange={handleEnableUnitInvestmentChange}
              requirement="optional"
            />

            {enableUnitInvestment ? (
              <ProductConfigInput
                label="Unit price (per unit)"
                placeholder="e.g 1,000"
                value={unitAmount}
                onChange={setUnitAmount}
                numericOnly
                formatThousands
                requirement="optional"
              />
            ) : null}

            {enableUnitInvestment ? (
              <ProductConfigInput
                label="Min Quantity Purchase"
                placeholder="Min Quantity"
                value={minQuantity}
                onChange={setMinQuantity}
                requirement="required"
              />
            ) : null}

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Investment Terms &amp; Condition<RequirementMark requirement="required" />
              </label>
              <textarea
                value={termsAndConditions}
                onChange={(e) => setTermsAndConditions(e.target.value)}
                placeholder="Enter Terms"
                rows={5}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm shadow-xs outline-none transition hover:border-gray-400 focus:border-brand focus:ring-[3px] focus:ring-brand/20"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <ProductConfigToggle
                id="investment-moratorium"
                label="Moratorium"
                checked={moratoriumEnabled}
                onChange={setMoratoriumEnabled}
                requirement="optional"
              />
              {moratoriumEnabled ? (
                <div className="min-w-[140px] flex-1 sm:max-w-xs">
                  <ProductConfigInput
                    label="Moratorium (days)"
                    placeholder="Enter days"
                    value={moratoriumDays}
                    onChange={setMoratoriumDays}
                    numericOnly
                    requirement="optional"
                  />
                </div>
              ) : null}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
              <ProductConfigInput
                label="Name of Charge or Fee"
                placeholder="e.g Processing Fee"
                value={chargeName}
                onChange={setChargeName}
                requirement="required"
              />
              <ProductConfigSelect
                label="Fee Type"
                placeholder="Select Section"
                value={chargeFeeType}
                  options={feeTypeOptions}
                  onChange={handleChargeFeeTypeChange}
                  requirement="required"
              />
                <ProductConfigInput
                  label="Value"
                  placeholder="Enter Value"
                  value={chargeValue}
                  onChange={handleChargeValueChange}
                  numericOnly
                  formatThousands={!isPercentType(chargeFeeType)}
                  requirement="required"
                />
              <Button type="button" onClick={addCharge} className="h-10 self-end rounded-lg bg-brand px-4 text-brand-foreground hover:bg-brand/90">
                Add
              </Button>
            </div>

            {charges.length > 0 && (
              <div className="rounded-lg border border-gray-200 bg-white px-3 py-1 shadow-xs">
                <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 border-b border-gray-200 py-2 text-[11px] font-semibold tracking-wide text-gray-500 uppercase">
                  <span>Name</span>
                  <span>Type</span>
                  <span>Value</span>
                  <span className="text-right" />
                </div>
                {charges.map((charge, index) => (
                  <div
                    key={`${charge.name}-${index}`}
                    className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 border-b border-gray-100 py-2.5 text-sm text-gray-800 last:border-0"
                  >
                    <span className="pr-2">{charge.name}</span>
                    <span>{charge.feeType}</span>
                    <span>{charge.value}</span>
                    <div className="flex justify-end">
                      <button type="button" onClick={() => removeCharge(index)} className="rounded-md p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600" aria-label="Remove">
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <ProductConfigToggle
              id="investment-forceful-withdrawal"
              label="Charge for Forceful Withdrawal"
              checked={chargeForcefulWithdrawal}
              onChange={setChargeForcefulWithdrawal}
              requirement="optional"
            />

            {chargeForcefulWithdrawal && (
              <>
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.3fr_1fr_0.9fr_1.1fr_auto] xl:items-end">
                  <ProductConfigInput
                    label="Name of Penalty"
                    placeholder="e.g Processing Fee"
                    value={penaltyName}
                    onChange={setPenaltyName}
                    requirement="optional"
                  />
                  <ProductConfigSelect
                    label="Type"
                    placeholder="Select Section"
                    value={penaltyType}
                    options={penaltyTypeOptions}
                    onChange={handlePenaltyTypeChange}
                    requirement="optional"
                  />
                  <ProductConfigInput
                    label="Value"
                    placeholder="Enter Value"
                    value={penaltyValue}
                    onChange={handlePenaltyValueChange}
                    numericOnly
                    formatThousands={!isPercentType(penaltyType)}
                    requirement="optional"
                  />
                  <ProductConfigSelect
                    label="Trigger Duration"
                    placeholder="Select Section"
                    value={penaltyTriggerDuration}
                    options={triggerDurationOptions}
                    onChange={setPenaltyTriggerDuration}
                    requirement="optional"
                  />
                  <Button type="button" onClick={addPenalty} className="h-10 self-end rounded-lg bg-brand px-4 text-brand-foreground hover:bg-brand/90">
                    Add
                  </Button>
                </div>

                {withdrawalPenalties.length > 0 && (
                  <div className="rounded-lg border border-gray-200 bg-white px-3 py-1 shadow-xs">
                    <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 border-b border-gray-200 py-2 text-[11px] font-semibold tracking-wide text-gray-500 uppercase">
                      <span>Name</span>
                      <span>Value</span>
                      <span>Trigger Duration</span>
                      <span className="text-right" />
                    </div>
                    {withdrawalPenalties.map((penalty, index) => (
                      <div
                        key={`${penalty.name}-${index}`}
                        className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 border-b border-gray-100 py-2.5 text-sm text-gray-800 last:border-0"
                      >
                        <span className="pr-2">{penalty.name}</span>
                        <span>{penalty.value}</span>
                        <span>{penalty.triggerDuration}</span>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => removePenalty(index)}
                            className="rounded-md p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                            aria-label="Remove penalty"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

          </div>
        )}
      </ProductConfigStepCard>
    </Drawer>
  )
}
