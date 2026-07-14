"use client"

import { useEffect, useRef, useState, type ChangeEvent } from "react"
import { Loader2, X } from "lucide-react"
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
  ProductConfigTabs,
  ProductConfigToggle,
  SAVINGS_INTEREST_METHOD_OPTIONS,
} from "@/components/drawers/product-config-form-fields"
import { formatAmountDisplayFromUnknown } from "@/lib/formatAmountInput"
import { validateAllSavingsSteps, validateSavingsStep } from "@/lib/productConfigureStepValidation"
import {
  normalizeOtherRequirementRowFromApi,
  serializeOtherRequirementsForSubmit,
  shouldUseOtherRequirementFileUpload,
  type OtherRequirementDraft,
} from "@/lib/otherRequirementPayload"
import { ProductConfigOtherRequirementsPanel } from "@/components/drawers/product-config-other-requirements"

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
  const [contractId, setContractId] = useState("")
  const [airSignSecretKey, setAirSignSecretKey] = useState("")
  const [airSignUid, setAirSignUid] = useState("")

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
        const tenureRes = await fetch("/api/configurations/options/savings-tenure", { credentials: "include", cache: "no-store" })
        const tenureJson = await tenureRes.json().catch(() => ({}))
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
    const about = (savingsData.about ?? {}) as Record<string, any>
    const structure = (savingsData.structure ?? {}) as Record<string, any>
    const fees = (savingsData.feesAndCharges ?? {}) as Record<string, any>
    const requirements = (savingsData.requirements ?? {}) as Record<string, unknown>

    setName(String(savingsData.name ?? ""))
    setDurationOfSavings(
      String(
        savingsData.durationOfSavings ??
          savingsData.duration ??
          about.duration ??
          about.tenure ??
          "",
      ),
    )
    setDescription(String(savingsData.description ?? ""))
    setSavingsTypes(
      Array.isArray(savingsData.savingsTypes ?? about.savingsTypes)
        ? (savingsData.savingsTypes ?? about.savingsTypes).map((t: any) => ({
            name: String(t?.name ?? ""),
            description: String(t?.description ?? ""),
          }))
        : [],
    )

    const savingsAmount = (structure.savingsAmount ?? {}) as Record<string, unknown>
    setExistingPreviewAssetUrl(
      String(about.previewAssetUrl ?? savingsData.previewAssetUrl ?? savingsData.previewImage?.url ?? ""),
    )

    setInterestRate(String(savingsData.interestRate ?? structure.interestRate ?? ""))
    setInterestMethod(String(savingsData.interestMethod ?? structure.interestMethod ?? ""))
    setSavingsType(String(savingsData.savingsType ?? structure.savingsType ?? ""))
    setWithdrawalFlexibility(String(savingsData.withdrawalFlexibility ?? structure.withdrawalFlexibility ?? ""))
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
    setTermsAndConditions(String(savingsData.termsAndConditions ?? structure.termsAndConditions ?? ""))
    setContractId(String(savingsData.contractId ?? structure.contractId ?? ""))
    setAirSignSecretKey(String(savingsData.airSignSecretKey ?? structure.airSignSecretKey ?? ""))
    setAirSignUid(String(savingsData.airSignUid ?? structure.airSignUid ?? ""))

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

  const savingsValidationBase = () => ({
    name,
    duration: durationOfSavings,
    description,
    savingsTypes,
    previewImage,
    interestRate,
    interestMethod,
    savingsType,
    withdrawalFlexibility,
    minSavingsAmount: removeCommas(minSavingsAmount),
    maxSavingsAmount: removeCommas(maxSavingsAmount),
    termsAndConditions,
    contractId,
    airSignSecretKey,
    airSignUid,
    charges,
    chargeForcefulWithdrawal,
    withdrawalPenalties,
  })

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

      const otherRequirementsPayload = await serializeOtherRequirementsForSubmit(otherRequirements)

      await Promise.resolve(
        onSubmit({
          ...savingsData,
          name,
          durationOfSavings,
          description,
          savingsTypes,
          previewImage: null,
          previewAssetUrl: previewAssetUrlSubmit,
          interestRate,
          interestMethod,
          savingsType,
          withdrawalFlexibility,
          minSavingsAmount: removeCommas(minSavingsAmount),
          maxSavingsAmount: removeCommas(maxSavingsAmount),
          termsAndConditions,
          contractId,
          airSignSecretKey,
          airSignUid,
          charges,
          chargeForcefulWithdrawal,
          withdrawalPenalties,
          otherRequirements: otherRequirementsPayload,
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
      className="w-full min-w-0 rounded-none sm:w-[92%] md:w-[78%] lg:w-[62%] xl:w-[52%] 2xl:w-[45%] sm:min-w-[400px] sm:rounded-bl-[40px] sm:rounded-tl-[40px]"
    >
      <div className="mx-auto w-full">
        <ProductConfigTabs steps={STEPS} activeStep={step} onStepChange={setStep} />

        {stepErrors.length > 0 ? (
          <div
            className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            role="alert"
          >
            <p className="mb-2 font-medium">Please fix the following before continuing:</p>
            <ul className="list-inside list-disc space-y-1">
              {stepErrors.map((msg) => (
                <li key={msg}>{msg}</li>
              ))}
            </ul>
          </div>
        ) : null}

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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                Savings Amount <span className="font-normal text-gray-500">(Required)</span>
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                Savings Terms & Condition <span className="font-normal text-gray-500">(Required)</span>
              </label>
              <textarea
                value={termsAndConditions}
                onChange={(e) => setTermsAndConditions(e.target.value)}
                placeholder="Enter Terms"
                rows={5}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-[#9A813F] focus:ring-2 focus:ring-[#9A813F]/20"
              />
            </div>

            <ProductConfigOtherRequirementsPanel
              otherRequirementOptions={otherRequirementOptions}
              contentTypeOptions={contentTypeOptions}
              otherRequirementType={otherRequirementType}
              otherRequirementContentType={otherRequirementContentType}
              otherRequirementDescription={otherRequirementDescription}
              otherRequirementFile={otherRequirementFile}
              otherRequirements={otherRequirements}
              uploadInputRef={otherRequirementUploadRef}
              filePickerId="savings-other-requirement-file"
              onTypeChange={handleOtherRequirementTypeChange}
              onContentTypeChange={handleOtherRequirementContentTypeChange}
              onDescriptionChange={setOtherRequirementDescription}
              onFileChange={setOtherRequirementFile}
              onAdd={addOtherRequirement}
              onRemoveItem={removeOtherRequirement}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <ProductConfigInput
                label="Contract ID"
                placeholder="Enter Contract ID"
                value={contractId}
                onChange={setContractId}
                requirement="required"
              />
              <ProductConfigInput
                label="AirSign Secret Key"
                placeholder="Enter secret key"
                value={airSignSecretKey}
                onChange={setAirSignSecretKey}
                requirement="required"
              />
              <ProductConfigInput
                label="AirSign UID"
                placeholder="Enter UID"
                value={airSignUid}
                onChange={setAirSignUid}
                requirement="required"
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
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
              <Button type="button" onClick={addCharge} className="h-10 self-end bg-[#9A813F] text-white hover:bg-[#8A7335]">
                Add
              </Button>
            </div>

            {charges.length > 0 && (
              <div className="rounded-md border border-dashed border-[#cdbf8b] p-3">
                <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 border-b border-gray-100 pb-2 text-xs font-semibold text-gray-500">
                  <span>Name</span>
                  <span>Type</span>
                  <span>Value</span>
                  <span className="text-right" />
                </div>
                {charges.map((charge, index) => (
                  <div
                    key={`${charge.name}-${index}`}
                    className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 border-b border-gray-100 py-2 text-sm last:border-0"
                  >
                    <span className="pr-2">{charge.name}</span>
                    <span>{charge.feeType}</span>
                    <span>{charge.value}</span>
                    <div className="flex justify-end">
                      <button type="button" onClick={() => removeCharge(index)} className="text-red-600 hover:text-red-700" aria-label="Remove">
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
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_0.9fr_0.85fr_1.25fr_auto]">
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
                  <Button type="button" onClick={addPenalty} className="h-10 self-end bg-[#9A813F] text-white hover:bg-[#8A7335]">
                    Add
                  </Button>
                </div>

                {withdrawalPenalties.length > 0 && (
                  <div className="rounded-md border border-dashed border-[#cdbf8b] p-3">
                    <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 border-b border-gray-100 pb-2 text-xs font-semibold text-gray-500">
                      <span>Name</span>
                      <span>Value</span>
                      <span>Trigger Duration</span>
                      <span className="text-right" />
                    </div>
                    {withdrawalPenalties.map((penalty, index) => (
                      <div
                        key={`${penalty.name}-${index}`}
                        className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 border-b border-gray-100 py-2 text-sm last:border-0"
                      >
                        <span className="pr-2">{penalty.name}</span>
                        <span>{penalty.value}</span>
                        <span>{penalty.triggerDuration}</span>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => removePenalty(index)}
                            className="text-red-600 hover:text-red-700"
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

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button
            onClick={handleBack}
            variant="outline"
            disabled={isSubmitting}
            className="h-11 flex-1 border-[#c9b271] text-[#77642f] bg-transparent"
          >
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={isSubmitting}
            className="h-11 flex-1 bg-[#9A813F] text-white hover:bg-[#8A7335] disabled:opacity-70"
          >
            {isSubmitting && step === STEPS.length ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" aria-hidden />
                Saving…
              </>
            ) : step === STEPS.length ? (
              "Submit"
            ) : (
              "Next"
            )}
          </Button>
        </div>
      </div>
    </Drawer>
  )
}
