"use client"

import { useEffect, useRef, useState, type ChangeEvent } from "react"
import { X } from "lucide-react"
import { toast } from "sonner"
import { formatProductApiErrorMessage } from "@/lib/formatProductApiErrorMessage"
import { Drawer } from "@/components/drawer"
import { Button } from "@/components/ui/button"
import { uploadProductMediaToUrl } from "@/lib/uploadProductMediaToUrl"
import { fetchOptionLabels, fetchProductOptionLabels } from "@/lib/productOptions"
import type { SavingsConfigurePrefetched } from "@/lib/productConfigurePrefetch"
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
  SAVINGS_INTEREST_METHOD_OPTIONS,
} from "@/components/drawers/product-config-form-fields"
import { formatAmountDisplayFromUnknown } from "@/lib/formatAmountInput"
import { validateAllSavingsSteps, validateSavingsStep } from "@/lib/productConfigureStepValidation"
import {
  displayStringFromApi,
  filledOrExisting,
  interestRateFromApi,
  pickProductTab,
  pickRecord,
  previewUrlFromProduct,
} from "@/lib/productConfigureHydrate"
import {
  normalizeOtherRequirementRowFromApi,
  serializeOtherRequirementsForSubmit,
  shouldUseOtherRequirementFileUpload,
  type OtherRequirementDraft,
} from "@/lib/otherRequirementPayload"
import { fetchTenureOptionsBody } from "@/lib/productCatalogQueries"

interface ConfigureSavingsDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => void | Promise<void>
  savingsData: any
  prefetchedOptions?: SavingsConfigurePrefetched | null
}

const STEPS = ["About Product", "Structure", "Fees & Charges"]

const DEFAULT_INTEREST_METHOD_OPTIONS: string[] = [...SAVINGS_INTEREST_METHOD_OPTIONS]
const DEFAULT_SAVINGS_TYPE_OPTIONS: string[] = []
const DEFAULT_WITHDRAWAL_FLEXIBILITY_OPTIONS: string[] = []
const DEFAULT_FEE_TYPE_OPTIONS: string[] = []
const DEFAULT_PENALTY_TYPE_OPTIONS: string[] = []
const TRIGGER_DURATION_OPTIONS: string[] = []

const DEFAULT_DURATION_OPTIONS: string[] = []

interface SavingsTypeItem {
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

type OtherRequirementItem = OtherRequirementDraft

function previewLabelFromAssetUrl(url: string): string {
  const seg = url.split("/").pop() || ""
  try {
    return decodeURIComponent(seg)
  } catch {
    return seg
  }
}









function asBool(value: unknown) {
  return value === true || value === "true" || value === 1 || value === "1"
}

export default function ConfigureSavingsDrawer({
  isOpen,
  onClose,
  onSubmit,
  savingsData,
  prefetchedOptions = null,
}: ConfigureSavingsDrawerProps) {
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [durationOptions, setDurationOptions] = useState<string[]>(DEFAULT_DURATION_OPTIONS)
  const [otherRequirementOptions, setOtherRequirementOptions] = useState<string[]>([])
  const [contentTypeOptions, setContentTypeOptions] = useState<string[]>([])
  const [interestMethodOptions, setInterestMethodOptions] = useState<string[]>(DEFAULT_INTEREST_METHOD_OPTIONS)
  const [savingsTypeOptions, setSavingsTypeOptions] = useState<string[]>(DEFAULT_SAVINGS_TYPE_OPTIONS)
  const [withdrawalFlexibilityOptions, setWithdrawalFlexibilityOptions] = useState<string[]>(DEFAULT_WITHDRAWAL_FLEXIBILITY_OPTIONS)
  const [feeTypeOptions, setFeeTypeOptions] = useState<string[]>(DEFAULT_FEE_TYPE_OPTIONS)
  const [penaltyTypeOptions, setPenaltyTypeOptions] = useState<string[]>(DEFAULT_PENALTY_TYPE_OPTIONS)
  const [triggerDurationOptions, setTriggerDurationOptions] = useState<string[]>(TRIGGER_DURATION_OPTIONS)

  const [name, setName] = useState(savingsData?.name || "")
  const [durationOfSavings, setDurationOfSavings] = useState("")
  const [description, setDescription] = useState(savingsData?.description || "")
  const [typeNameDraft, setTypeNameDraft] = useState("")
  const [typeDescDraft, setTypeDescDraft] = useState("")
  const [savingsTypes, setSavingsTypes] = useState<SavingsTypeItem[]>([])
  const [previewImage, setPreviewImage] = useState<File | null>(null)
  const [existingPreviewAssetUrl, setExistingPreviewAssetUrl] = useState("")

  const [interestRate, setInterestRate] = useState("")
  const [interestMethod, setInterestMethod] = useState("")
  const [savingsType, setSavingsType] = useState("")
  const [withdrawalFlexibility, setWithdrawalFlexibility] = useState("")
  const [minSavingsAmount, setMinSavingsAmount] = useState("")
  const [maxSavingsAmount, setMaxSavingsAmount] = useState("")
  const [termsAndConditions, setTermsAndConditions] = useState("")

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
  const savingsHydratedKeyRef = useRef<string | null>(null)
  const [otherRequirementType, setOtherRequirementType] = useState("")
  const [otherRequirementContentType, setOtherRequirementContentType] = useState("")
  const [otherRequirementDescription, setOtherRequirementDescription] = useState("")
  const [otherRequirementFile, setOtherRequirementFile] = useState<File | null>(null)
  const [otherRequirements, setOtherRequirements] = useState<OtherRequirementItem[]>([])
  const otherRequirementUploadRef = useRef<HTMLInputElement>(null)

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
  const handleInterestRateChange = (value: string) => {
    setInterestRate(normalizePercentInput(value))
  }

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [stepErrors, setStepErrors] = useState<string[]>([])

  useEffect(() => {
    setStepErrors([])
  }, [step])

  useEffect(() => {
    if (!isOpen) return
    if (prefetchedOptions) {
      setDurationOptions(prefetchedOptions.duration)
      setInterestMethodOptions([...SAVINGS_INTEREST_METHOD_OPTIONS])
      setSavingsTypeOptions(prefetchedOptions.savingsTypes)
      setWithdrawalFlexibilityOptions(prefetchedOptions.withdrawalFlexibility)
      setFeeTypeOptions(prefetchedOptions.feeType)
      setPenaltyTypeOptions(prefetchedOptions.penaltyType)
      setTriggerDurationOptions(prefetchedOptions.triggerDuration)
      setOtherRequirementOptions(prefetchedOptions.otherRequirementType ?? [])
      setContentTypeOptions(prefetchedOptions.requirementContentType ?? [])
      return
    }
    const fetchOptions = async () => {
      try {
        const tenureJson = await fetchTenureOptionsBody("savings")
        const tenureList = (tenureJson?.data ?? []) as { value?: string | number; label?: string }[]
        const tenure =
          Array.isArray(tenureList) && tenureList.length
            ? tenureList
                .map((x) => x.label || String(x.value ?? ""))
                .filter((v): v is string => typeof v === "string" && v.length > 0)
            : []
        if (tenure.length) setDurationOptions(tenure)
      } catch {
        // keep defaults
      }
      const [
        savingsTypes,
        withdrawalFlexibility,
        feeTypes,
        penaltyTypes,
        triggerDuration,
        otherRequirementType,
        requirementContentType,
      ] = await Promise.all([
        fetchOptionLabels("savings-type", DEFAULT_SAVINGS_TYPE_OPTIONS),
        fetchOptionLabels("withdrawal-flexibility", DEFAULT_WITHDRAWAL_FLEXIBILITY_OPTIONS),
        fetchOptionLabels("fee-type", DEFAULT_FEE_TYPE_OPTIONS),
        fetchOptionLabels("penalty-type", DEFAULT_PENALTY_TYPE_OPTIONS),
        fetchProductOptionLabels("trigger-duration", TRIGGER_DURATION_OPTIONS),
        fetchProductOptionLabels("loan-other-requirement-type", []),
        fetchProductOptionLabels("loan-other-requirement-content-type", []),
      ])
      setInterestMethodOptions([...SAVINGS_INTEREST_METHOD_OPTIONS])
      setSavingsTypeOptions(savingsTypes)
      setWithdrawalFlexibilityOptions(withdrawalFlexibility)
      setFeeTypeOptions(feeTypes)
      setPenaltyTypeOptions(penaltyTypes)
      setTriggerDurationOptions(triggerDuration)
      setOtherRequirementOptions(otherRequirementType)
      setContentTypeOptions(requirementContentType)
    }
    fetchOptions()
  }, [isOpen, prefetchedOptions])

  useEffect(() => {
    if (!isOpen) {
      savingsHydratedKeyRef.current = null
      return
    }
    if (!savingsData) return
    const productKey = String(savingsData.id ?? savingsData.productId ?? "")
    if (productKey) {
      if (savingsHydratedKeyRef.current === productKey) return
      savingsHydratedKeyRef.current = productKey
    } else if (savingsHydratedKeyRef.current === "__noid__") {
      return
    } else {
      savingsHydratedKeyRef.current = "__noid__"
    }
    const about = pickProductTab(savingsData as Record<string, unknown>, "about")
    const structure = pickProductTab(savingsData as Record<string, unknown>, "structure")
    const fees = pickProductTab(savingsData as Record<string, unknown>, "feesAndCharges")
    const requirements = pickProductTab(savingsData as Record<string, unknown>, "requirements")

    setName(displayStringFromApi(savingsData.name ?? about.name) || String(savingsData.name ?? ""))
    setDurationOfSavings(
      displayStringFromApi(
        savingsData.durationOfSavings ??
          savingsData.duration ??
          about.duration ??
          about.tenure,
      ),
    )
    setDescription(displayStringFromApi(savingsData.description ?? about.description))
    setSavingsTypes(
      Array.isArray(savingsData.savingsTypes ?? about.savingsTypes)
        ? (savingsData.savingsTypes ?? about.savingsTypes).map((t: any) => ({
            name: String(t?.name ?? ""),
            description: String(t?.description ?? ""),
          }))
        : [],
    )

    const savingsAmount = (structure.savingsAmount ?? {}) as Record<string, unknown>
    setExistingPreviewAssetUrl(previewUrlFromProduct(savingsData as Record<string, unknown>))

    setInterestRate(interestRateFromApi(savingsData.interestRate ?? structure.interestRate))
    setInterestMethod(displayStringFromApi(savingsData.interestMethod ?? structure.interestMethod ?? structure.yieldMethod))
    setSavingsType(displayStringFromApi(savingsData.savingsType ?? structure.savingsType))
    setWithdrawalFlexibility(displayStringFromApi(savingsData.withdrawalFlexibility ?? structure.withdrawalFlexibility))
    setMinSavingsAmount(
      formatAmountDisplayFromUnknown(
        savingsData.minSavingsAmount ?? structure.minSavingsAmount ?? savingsAmount.min ?? "",
      ),
    )
    setMaxSavingsAmount(
      formatAmountDisplayFromUnknown(
        savingsData.maxSavingsAmount ?? structure.maxSavingsAmount ?? savingsAmount.max ?? "",
      ),
    )
    setTermsAndConditions(displayStringFromApi(savingsData.termsAndConditions ?? structure.termsAndConditions ?? structure.savingsTermsAndCondition))
    setCharges(Array.isArray(savingsData.charges ?? fees.charges) ? (savingsData.charges ?? fees.charges) : [])
    setChargeForcefulWithdrawal(
      asBool(
        savingsData.chargeForcefulWithdrawal ??
          savingsData.chargeForForcefulWithdrawal ??
          fees.chargeForcefulWithdrawal ??
          fees.chargeForForcefulWithdrawal,
      ),
    )
    const rawPenalties =
      savingsData.withdrawalPenalties ?? fees.penalties ?? fees.forcefulWithdrawalPenalties ?? []
    setWithdrawalPenalties(
      Array.isArray(rawPenalties)
        ? rawPenalties.map((p: Record<string, unknown>) => ({
            name: String(p?.name ?? ""),
            type: String(p?.type ?? p?.penaltyType ?? ""),
            value: String(p?.value ?? ""),
            triggerDuration: String(p?.triggerDuration ?? ""),
          }))
        : [],
    )
    const otherReqRaw = savingsData.otherRequirements ?? requirements.otherRequirements
    setOtherRequirements(
      Array.isArray(otherReqRaw) ? otherReqRaw.map((row: unknown) => normalizeOtherRequirementRowFromApi(row)) : [],
    )
  }, [isOpen, savingsData])

  const removeCommas = (value: string) => value.replace(/,/g, "")

  const addSavingsType = () => {
    if (!typeNameDraft.trim() || !typeDescDraft.trim()) return
    setSavingsTypes((prev) => [...prev, { name: typeNameDraft.trim(), description: typeDescDraft.trim() }])
    setTypeNameDraft("")
    setTypeDescDraft("")
  }

  const removeSavingsTypeRow = (index: number) => {
    setSavingsTypes((prev) => prev.filter((_, i) => i !== index))
  }

  const removeCharge = (index: number) => {
    setCharges((prev) => prev.filter((_, i) => i !== index))
  }

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

  const removePenalty = (index: number) => {
    setWithdrawalPenalties((prev) => prev.filter((_, i) => i !== index))
  }

  const handleOtherRequirementTypeChange = (v: string) => {
    setOtherRequirementType(v)
    if (!shouldUseOtherRequirementFileUpload(v, otherRequirementContentType)) {
      setOtherRequirementFile(null)
      setOtherRequirementDescription("")
    }
  }

  const handleOtherRequirementContentTypeChange = (v: string) => {
    setOtherRequirementContentType(v)
    if (!shouldUseOtherRequirementFileUpload(otherRequirementType, v)) {
      setOtherRequirementFile(null)
      setOtherRequirementDescription("")
    }
  }

  const addOtherRequirement = () => {
    if (!otherRequirementType || !otherRequirementContentType) return
    const docType = shouldUseOtherRequirementFileUpload(otherRequirementType, otherRequirementContentType)
    if (docType) {
      if (!otherRequirementFile) return
      setOtherRequirements((prev) => [
        ...prev,
        {
          type: otherRequirementType,
          contentType: otherRequirementContentType,
          description: otherRequirementDescription.trim() || otherRequirementFile.name,
          file: otherRequirementFile,
        },
      ])
    } else {
      if (!otherRequirementDescription.trim()) return
      setOtherRequirements((prev) => [
        ...prev,
        {
          type: otherRequirementType,
          contentType: otherRequirementContentType,
          description: otherRequirementDescription.trim(),
        },
      ])
    }
    setOtherRequirementType("")
    setOtherRequirementContentType("")
    setOtherRequirementDescription("")
    setOtherRequirementFile(null)
  }

  const removeOtherRequirement = (index: number) => {
    setOtherRequirements((prev) => prev.filter((_, i) => i !== index))
  }

  const handleBack = () => {
    if (isSubmitting) return
    if (step > 1) setStep((s) => s - 1)
  }

  const savingsValidationBase = () => {
    const savings = (savingsData || {}) as Record<string, unknown>
    const about = pickProductTab(savings, "about")
    const structure = pickProductTab(savings, "structure")
    const fees = pickProductTab(savings, "feesAndCharges")
    const existingFees = Array.isArray(fees.fees) ? fees.fees : Array.isArray(fees.charges) ? fees.charges : []
    return {
    name: filledOrExisting(name, savings.name, about.name),
    duration: filledOrExisting(durationOfSavings, savings.durationOfSavings, savings.duration, about.duration, about.tenure),
    description: filledOrExisting(description, savings.description, about.description),
    savingsTypes,
    previewImage,
    hasPreviewAsset: !!(existingPreviewAssetUrl || previewUrlFromProduct(savings)),
    interestRate: filledOrExisting(interestRate, savings.interestRate, structure.interestRate),
    interestMethod: filledOrExisting(interestMethod, savings.interestMethod, structure.interestMethod, structure.yieldMethod),
    savingsType: filledOrExisting(savingsType, savings.savingsType, structure.savingsType),
    withdrawalFlexibility: filledOrExisting(withdrawalFlexibility, savings.withdrawalFlexibility, structure.withdrawalFlexibility),
    minSavingsAmount: removeCommas(filledOrExisting(minSavingsAmount, savings.minSavingsAmount, structure.minSavingsAmount, pickRecord(structure.savingsAmount).min)),
    maxSavingsAmount: removeCommas(filledOrExisting(maxSavingsAmount, savings.maxSavingsAmount, structure.maxSavingsAmount, pickRecord(structure.savingsAmount).max)),
    termsAndConditions: filledOrExisting(termsAndConditions, savings.termsAndConditions, structure.termsAndConditions, structure.savingsTermsAndCondition),
    charges: charges.length ? charges : existingFees,
    chargeForcefulWithdrawal,
    withdrawalPenalties,
  }
  }

  const handleNext = async () => {
    if (step < STEPS.length) {
      if (step === 2) {
        const minAmount = parseFloat(removeCommas(minSavingsAmount))
        const maxAmount = parseFloat(removeCommas(maxSavingsAmount))
        if (removeCommas(minSavingsAmount) && removeCommas(maxSavingsAmount) && maxAmount < minAmount) {
          setErrors((prev) => ({ ...prev, maxAmount: "Maximum must be greater than minimum" }))
          return
        }
        setErrors((prev) => ({ ...prev, maxAmount: "" }))
      }
      const { ok, errors: vErrs } = validateSavingsStep({ step, ...savingsValidationBase() })
      if (!ok) {
        setStepErrors(vErrs)
        return
      }
      setStepErrors([])
      setStep((s) => s + 1)
      return
    }

    const all = validateAllSavingsSteps(savingsValidationBase())
    if (!all.ok) {
      setStepErrors(all.errors)
      return
    }
    setStepErrors([])

    const minAmount = parseFloat(removeCommas(minSavingsAmount))
    const maxAmount = parseFloat(removeCommas(maxSavingsAmount))
    if (removeCommas(minSavingsAmount) && removeCommas(maxSavingsAmount) && maxAmount < minAmount) {
      setErrors((prev) => ({ ...prev, maxAmount: "Maximum must be greater than minimum" }))
      return
    }

    setIsSubmitting(true)
    try {
      let previewAssetUrlSubmit = existingPreviewAssetUrl.trim() || undefined
      if (previewImage) {
        previewAssetUrlSubmit = await uploadProductMediaToUrl(previewImage)
      }

      const savingsPayload = { ...(savingsData || {}) }
      delete savingsPayload.otherRequirements
      delete savingsPayload.requirements

      await Promise.resolve(
        onSubmit({
          ...savingsPayload,
          name,
          durationOfSavings,
          description,
          savingsTypes,
          ...(previewImage ? { previewImage } : {}),
          previewAssetUrl: previewAssetUrlSubmit,
          interestRate,
          interestMethod,
          savingsType,
          withdrawalFlexibility,
          minSavingsAmount: removeCommas(minSavingsAmount),
          maxSavingsAmount: removeCommas(maxSavingsAmount),
          termsAndConditions,
          requireApplicantSignature: false,
          charges,
          chargeForcefulWithdrawal,
          withdrawalPenalties,
          /** Legacy field names for existing APIs */
          purpose: description,
          savingsTenure: durationOfSavings,
          depositCycle: withdrawalFlexibility,
          minDepositAmount: removeCommas(minSavingsAmount),
          maxDepositAmount: removeCommas(maxSavingsAmount),
          managementFee: "",
          minWithdrawalAmount: "",
          additionalRequirements: [],
        }),
      )
      toast.success("Savings product configuration saved successfully.")
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
      title="Configure Savings Product"
      subtitle="Configure the parameters of this savings product"
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
            idPrefix="savings"
            nameLabel="Name of Savings"
            name={name}
            onNameChange={setName}
            durationLabel="Duration of Savings"
            durationPlaceholder="Select"
            durationValue={durationOfSavings}
            durationOptions={durationOptions}
            onDurationChange={setDurationOfSavings}
            description={description}
            onDescriptionChange={setDescription}
            typeSectionLabel="Savings Type"
            typeSectionRequirement="optional"
            typeSectionHelperText={PRODUCT_TYPE_SECTION_HELPER}
            typeNameDraft={typeNameDraft}
            typeDescDraft={typeDescDraft}
            onTypeNameDraftChange={setTypeNameDraft}
            onTypeDescDraftChange={setTypeDescDraft}
            onAddType={addSavingsType}
            onRemoveTypeRow={removeSavingsTypeRow}
            typeRows={savingsTypes}
            previewFile={previewImage}
            previewLabel={String(
              previewImage?.name ??
                ((existingPreviewAssetUrl ? previewLabelFromAssetUrl(existingPreviewAssetUrl) : "") ||
                  savingsData?.previewImage?.fileName ||
                  savingsData?.previewImageName ||
                  ""),
            )}
            previewImageUrl={
              previewImage
                ? ""
                : String(
                    existingPreviewAssetUrl ||
                      savingsData?.about?.previewAssetUrl ||
                      savingsData?.previewImage?.url ||
                      savingsData?.previewImageUrl ||
                      "",
                  )
            }
            onPreviewFileChange={setPreviewImage}
          />
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-end">
              <ProductConfigInput
                label="Interest Rate"
                placeholder="e.g 10%"
                value={interestRate}
                onChange={handleInterestRateChange}
                numericOnly
                requirement="required"
              />
              <ProductConfigSelect
                label="Interest Method"
                placeholder="Select"
                value={interestMethod}
                options={interestMethodOptions}
                onChange={setInterestMethod}
                requirement="required"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-end">
              <ProductConfigSelect
                label="Savings Type"
                placeholder="Select"
                value={savingsType}
                options={savingsTypeOptions}
                onChange={setSavingsType}
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
                Savings Amount<RequirementMark requirement="required" />
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-end">
                <ProductConfigInput
                  label="Minimum"
                  placeholder="Min Amount"
                  value={minSavingsAmount}
                  onChange={setMinSavingsAmount}
                  numericOnly
                  formatThousands
                  requirement="required"
                />
                <ProductConfigInput
                  label="Maximum"
                  placeholder="Max Amount"
                  value={maxSavingsAmount}
                  onChange={setMaxSavingsAmount}
                  numericOnly
                  formatThousands
                  requirement="required"
                />
              </div>
              {errors.maxAmount ? <p className="text-xs text-red-600">{errors.maxAmount}</p> : null}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Savings Terms & Condition<RequirementMark requirement="required" />
              </label>
              <textarea
                value={termsAndConditions}
                onChange={(e) => setTermsAndConditions(e.target.value)}
                placeholder="Enter Terms"
                rows={5}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm shadow-xs outline-none transition hover:border-gray-400 focus:border-brand focus:ring-[3px] focus:ring-brand/20"
              />
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
              id="savings-forceful-withdrawal"
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
                    requirement="required"
                    requirementMark="asterisk"
                  />
                  <ProductConfigSelect
                    label="Type"
                    placeholder="Select Section"
                    value={penaltyType}
                    options={penaltyTypeOptions}
                    onChange={handlePenaltyTypeChange}
                    requirement="required"
                    requirementMark="asterisk"
                  />
                  <ProductConfigInput
                    label="Value"
                    placeholder="Enter Value"
                    value={penaltyValue}
                    onChange={handlePenaltyValueChange}
                    numericOnly
                    formatThousands={!isPercentType(penaltyType)}
                    requirement="required"
                    requirementMark="asterisk"
                  />
                  <ProductConfigSelect
                    label="Trigger Duration"
                    placeholder="Select Section"
                    value={penaltyTriggerDuration}
                    options={triggerDurationOptions}
                    onChange={setPenaltyTriggerDuration}
                    requirement="required"
                    requirementMark="asterisk"
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
