"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Loader2, X } from "lucide-react"
import { toast } from "sonner"
import { formatProductApiErrorMessage } from "@/lib/formatProductApiErrorMessage"
import { Drawer } from "@/components/drawer"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { uploadProductMediaToUrl } from "@/lib/uploadProductMediaToUrl"
import { fetchOptionLabels, fetchProductOptionLabels } from "@/lib/productOptions"
import type { CommodityConfigurePrefetched } from "@/lib/productConfigurePrefetch"
import { ProductConfigAboutStep } from "@/components/drawers/product-config-about-step"
import {
  ProductConfigInput,
  ProductConfigSelect,
  ProductConfigTabs,
  ProductConfigToggle,
} from "@/components/drawers/product-config-form-fields"
import { formatAmountDisplayFromUnknown } from "@/lib/formatAmountInput"
import { validateAllCommoditySteps, validateCommodityStep } from "@/lib/productConfigureStepValidation"
import {
  normalizeOtherRequirementRowFromApi,
  serializeOtherRequirementsForSubmit,
  shouldUseOtherRequirementFileUpload,
  type OtherRequirementDraft,
} from "@/lib/otherRequirementPayload"
import { ProductConfigOtherRequirementsPanel } from "@/components/drawers/product-config-other-requirements"

interface ConfigureCommodityDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => void | Promise<void>
  commodityData: any
  variant?: "commodity" | "investment"
  prefetchedOptions?: CommodityConfigurePrefetched | null
}

const DEFAULT_TENURE: string[] = []
const DEFAULT_YIELD_METHOD_OPTIONS: string[] = []
const DEFAULT_WITHDRAWAL_FLEXIBILITY_OPTIONS: string[] = []
const DEFAULT_FEE_TYPE_OPTIONS: string[] = []
const DEFAULT_PENALTY_TYPE_OPTIONS: string[] = []
const TRIGGER_DURATION_OPTIONS: string[] = []

interface TypeRow {
  name: string
  description: string
}

interface FeeItem {
  name: string
  feeType: string
  value: string
}

interface PenaltyItem {
  name: string
  type: string
  value: string
  triggerDuration: string
}

interface PriceRow {
  id: string
  price: string
  date: string
  source: string
}

type OtherRequirementItem = OtherRequirementDraft

function asBool(value: unknown) {
  return value === true || value === "true" || value === 1 || value === "1"
}

function previewLabelFromAssetUrl(url: string): string {
  const seg = url.split("/").pop() || ""
  try {
    return decodeURIComponent(seg)
  } catch {
    return seg
  }
}

export default function ConfigureCommodityDrawer({
  isOpen,
  onClose,
  onSubmit,
  commodityData,
  variant = "commodity",
  prefetchedOptions = null,
}: ConfigureCommodityDrawerProps) {
  const isInvestment = variant === "investment"

  const steps = useMemo(
    () =>
      isInvestment
        ? (["About Product", "Structure", "Fees & Charges", "Unit Price"] as const)
        : (["About Product", "Structure", "Fees & Charges", "Commodity Price"] as const),
    [isInvestment],
  )

  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [tenureOptions, setTenureOptions] = useState<string[]>(DEFAULT_TENURE)
  const [otherRequirementOptions, setOtherRequirementOptions] = useState<string[]>([])
  const [contentTypeOptions, setContentTypeOptions] = useState<string[]>([])
  const [yieldMethodOptions, setYieldMethodOptions] = useState<string[]>(DEFAULT_YIELD_METHOD_OPTIONS)
  const [withdrawalFlexibilityOptions, setWithdrawalFlexibilityOptions] = useState<string[]>(DEFAULT_WITHDRAWAL_FLEXIBILITY_OPTIONS)
  const [feeTypeOptions, setFeeTypeOptions] = useState<string[]>(DEFAULT_FEE_TYPE_OPTIONS)
  const [penaltyTypeOptions, setPenaltyTypeOptions] = useState<string[]>(DEFAULT_PENALTY_TYPE_OPTIONS)
  const [triggerDurationOptions, setTriggerDurationOptions] = useState<string[]>(TRIGGER_DURATION_OPTIONS)

  const [name, setName] = useState(commodityData?.name || "")
  const [duration, setDuration] = useState("")
  const [description, setDescription] = useState(commodityData?.description || "")
  const [typeNameDraft, setTypeNameDraft] = useState("")
  const [typeDescDraft, setTypeDescDraft] = useState("")
  const [typeRows, setTypeRows] = useState<TypeRow[]>([])
  const [previewImage, setPreviewImage] = useState<File | null>(null)
  const [existingPreviewAssetUrl, setExistingPreviewAssetUrl] = useState("")
  const [minInvestmentAmount, setMinInvestmentAmount] = useState("")
  const [enableUnitInvestmentPurchase, setEnableUnitInvestmentPurchase] = useState(true)
  const [unitOfMeasure, setUnitOfMeasure] = useState("")
  const [compoundingFrequency, setCompoundingFrequency] = useState("")

  const [yieldMethod, setYieldMethod] = useState("")
  const [offerYieldOn, setOfferYieldOn] = useState(true)
  const [offerYieldValue, setOfferYieldValue] = useState("")
  const [withdrawalFlexibility, setWithdrawalFlexibility] = useState("")
  const [unitAmount, setUnitAmount] = useState("")
  const [minQuantityPurchase, setMinQuantityPurchase] = useState("")
  const [maxAmount, setMaxAmount] = useState("")
  const [termsAndConditions, setTermsAndConditions] = useState("")
  const [moratoriumEnabled, setMoratoriumEnabled] = useState(true)
  const [moratoriumDays, setMoratoriumDays] = useState("")
  const [contractId, setContractId] = useState("")
  const [airSignSecretKey, setAirSignSecretKey] = useState("")
  const [airSignUid, setAirSignUid] = useState("")

  const [chargeName, setChargeName] = useState("")
  const [chargeFeeType, setChargeFeeType] = useState("")
  const [chargeValue, setChargeValue] = useState("")
  const [charges, setCharges] = useState<FeeItem[]>([])
  const [forcefulWithdrawal, setForcefulWithdrawal] = useState(true)
  const [penaltyName, setPenaltyName] = useState("")
  const [penaltyType, setPenaltyType] = useState("")
  const [penaltyValue, setPenaltyValue] = useState("")
  const [penaltyTriggerDuration, setPenaltyTriggerDuration] = useState("")
  const [penalties, setPenalties] = useState<PenaltyItem[]>([])

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
  const handleOfferYieldValueChange = (value: string) => {
    setOfferYieldValue(normalizePercentInput(value))
  }

  const [priceDraft, setPriceDraft] = useState("")
  const [priceDate, setPriceDate] = useState("")
  const [priceSource, setPriceSource] = useState("")
  const [priceRows, setPriceRows] = useState<PriceRow[]>([])
  const [stepErrors, setStepErrors] = useState<string[]>([])
  const commodityHydratedKeyRef = useRef<string | null>(null)
  const [otherRequirementType, setOtherRequirementType] = useState("")
  const [otherRequirementContentType, setOtherRequirementContentType] = useState("")
  const [otherRequirementDescription, setOtherRequirementDescription] = useState("")
  const [otherRequirementFile, setOtherRequirementFile] = useState<File | null>(null)
  const [otherRequirements, setOtherRequirements] = useState<OtherRequirementItem[]>([])
  const otherRequirementUploadRef = useRef<HTMLInputElement>(null)

  const resetForm = useCallback(() => {
    const about = (commodityData?.about ?? {}) as Record<string, any>
    const structure = (commodityData?.structure ?? {}) as Record<string, any>
    const fees = (commodityData?.feesAndCharges ?? {}) as Record<string, any>
    const incomingTypeRows =
      (isInvestment ? commodityData?.investmentTypes : commodityData?.commodityTypes) ??
      commodityData?.typeRows ??
      about?.investmentTypes ??
      about?.commodityTypes
    const incomingPriceRows = isInvestment
      ? (commodityData?.unitPrices ?? commodityData?.priceHistory ?? [])
      : (commodityData?.commodityPrices ??
          commodityData?.priceHistory ??
          [])

    setStep(1)
    setName(commodityData?.name || "")
    setDuration(String(commodityData?.duration ?? about?.duration ?? about?.tenure ?? ""))
    setExistingPreviewAssetUrl(
      String(about?.previewAssetUrl ?? commodityData?.previewAssetUrl ?? commodityData?.previewImage?.url ?? ""),
    )
    setDescription(commodityData?.description || "")
    setTypeRows(
      Array.isArray(incomingTypeRows)
        ? incomingTypeRows.map((r: any) => ({ name: String(r?.name ?? ""), description: String(r?.description ?? "") }))
        : [],
    )
    setPreviewImage(null)
    setWithdrawalFlexibility(String(commodityData?.withdrawalFlexibility ?? structure?.withdrawalFlexibility ?? ""))
    if (isInvestment) {
      const invAmt = structure.investmentAmount as Record<string, unknown> | undefined
      if (invAmt && typeof invAmt === "object") {
        setMinInvestmentAmount(formatAmountDisplayFromUnknown(invAmt.min ?? ""))
        setMaxAmount(formatAmountDisplayFromUnknown(invAmt.max ?? ""))
      } else {
        setMinInvestmentAmount(formatAmountDisplayFromUnknown(commodityData?.minInvestmentAmount ?? ""))
        setMaxAmount(
          formatAmountDisplayFromUnknown(
            commodityData?.maxInvestmentAmount ?? structure.maxInvestmentAmount ?? structure.maxAmount ?? "",
          ),
        )
      }
      const u = structure.unitAmount
      if (u && typeof u === "object" && !Array.isArray(u)) {
        const uo = u as Record<string, unknown>
        setUnitAmount(formatAmountDisplayFromUnknown(uo.amount ?? ""))
        setMinQuantityPurchase(String(uo.minQuantity ?? structure.minQuantityPurchase ?? ""))
      } else {
        setUnitAmount(formatAmountDisplayFromUnknown(structure.minInvestmentAmount ?? commodityData?.unitAmount ?? ""))
        setMinQuantityPurchase(String(commodityData?.minQuantityPurchase ?? structure.minQuantityPurchase ?? ""))
      }
      const roi = structure.returnsOnInvestment
      if (roi != null && String(roi).trim() !== "") {
        setOfferYieldOn(true)
        const rs = String(roi).trim()
        setOfferYieldValue(rs.includes("%") ? rs : `${rs.replace(/%/g, "")}%`)
      } else {
        setOfferYieldOn(asBool(commodityData?.offerYieldOn ?? structure?.offerYieldOn))
        setOfferYieldValue(String(commodityData?.offerYieldValue ?? structure?.offerYieldValue ?? ""))
      }
      setYieldMethod(String(structure.interestMethod ?? commodityData?.yieldMethod ?? structure.yieldMethod ?? ""))
      setEnableUnitInvestmentPurchase(
        asBool(commodityData?.enableUnitInvestmentPurchase ?? structure.enableUnitInvestmentPurchase ?? true),
      )
      const mor = structure.moratorium
      if (mor != null && String(mor).trim() !== "" && !Number.isNaN(Number(mor))) {
        setMoratoriumEnabled(true)
        setMoratoriumDays(String(mor))
      } else {
        setMoratoriumEnabled(asBool(commodityData?.moratoriumEnabled ?? structure?.allowMoratorium))
        setMoratoriumDays(String(commodityData?.moratoriumDays ?? structure?.moratoriumDuration ?? ""))
      }
      setTermsAndConditions(
        String(
          commodityData?.termsAndConditions ??
            structure?.investmentTermsAndCondition ??
            structure?.termsAndConditions ??
            "",
        ),
      )
      setUnitOfMeasure("")
      setCompoundingFrequency("")
    } else {
      setMinInvestmentAmount("")
      setEnableUnitInvestmentPurchase(true)
      setYieldMethod(String(commodityData?.yieldMethod ?? structure?.yieldMethod ?? ""))
      setOfferYieldOn(
        asBool(structure.offerYieldEnabled ?? structure.offerYieldOn ?? commodityData?.offerYieldOn),
      )
      const oy = structure.offerYield ?? structure.offerYieldValue
      if (oy != null && String(oy).trim() !== "") {
        const rs = String(oy).trim()
        setOfferYieldValue(rs.includes("%") ? rs : `${rs.replace(/%/g, "")}%`)
      } else {
        setOfferYieldValue(String(commodityData?.offerYieldValue ?? structure?.offerYieldValue ?? ""))
      }
      setUnitAmount(formatAmountDisplayFromUnknown(structure.unitAmount ?? commodityData?.unitAmount ?? ""))
      setMinQuantityPurchase(String(structure.minQuantityPurchase ?? commodityData?.minQuantityPurchase ?? ""))
      setMaxAmount(formatAmountDisplayFromUnknown(structure.maxAmount ?? commodityData?.maxAmount ?? ""))
      setTermsAndConditions(
        String(
          structure?.commodityTermsAndCondition ??
            commodityData?.termsAndConditions ??
            structure?.termsAndConditions ??
            "",
        ),
      )
      const morC = structure.moratorium
      if (morC != null && String(morC).trim() !== "" && !Number.isNaN(Number(morC))) {
        setMoratoriumEnabled(true)
        setMoratoriumDays(String(morC))
      } else {
        setMoratoriumEnabled(asBool(commodityData?.moratoriumEnabled ?? structure?.allowMoratorium))
        setMoratoriumDays(String(commodityData?.moratoriumDays ?? structure?.moratoriumDuration ?? ""))
      }
      setUnitOfMeasure(String(commodityData?.unitOfMeasure ?? ""))
      const cfg = commodityData?.config as Record<string, unknown> | undefined
      setCompoundingFrequency(String(cfg?.compoundingFrequency ?? commodityData?.compoundingFrequency ?? ""))
    }
    setContractId(String(commodityData?.contractId ?? structure?.contractId ?? ""))
    setAirSignSecretKey(String(commodityData?.airSignSecretKey ?? structure?.airSignSecretKey ?? ""))
    setAirSignUid(String(commodityData?.airSignUid ?? structure?.airSignUid ?? ""))
    setCharges(
      Array.isArray(commodityData?.charges ?? fees?.charges ?? fees?.fees)
        ? (commodityData?.charges ?? fees?.charges ?? fees?.fees)
        : [],
    )
    setForcefulWithdrawal(
      asBool(
        commodityData?.forcefulWithdrawal ??
          commodityData?.chargeForForcefulWithdrawal ??
          fees?.chargeForcefulWithdrawal ??
          fees?.chargeForForcefulWithdrawal,
      ),
    )
    const rawPen = commodityData?.penalties ?? fees?.penalties ?? fees?.forcefulWithdrawalPenalties ?? []
    setPenalties(
      Array.isArray(rawPen)
        ? rawPen.map((p: Record<string, unknown>) => ({
            name: String(p?.name ?? ""),
            type: String(p?.type ?? p?.penaltyType ?? ""),
            value: String(p?.value ?? ""),
            triggerDuration: String(p?.triggerDuration ?? ""),
          }))
        : [],
    )
    setPriceRows(
      Array.isArray(incomingPriceRows)
        ? incomingPriceRows.map((r: any, i: number) => ({
            id: String(r?.id ?? `${Date.now()}-${i}`),
            price: formatAmountDisplayFromUnknown(r?.price ?? ""),
            date: String(r?.date ?? ""),
            source: String(r?.source ?? ""),
          }))
        : [],
    )
    const requirements = (commodityData?.requirements ?? {}) as Record<string, unknown>
    const otherReqRaw = commodityData?.otherRequirements ?? requirements.otherRequirements
    setOtherRequirements(
      Array.isArray(otherReqRaw) ? otherReqRaw.map((row: unknown) => normalizeOtherRequirementRowFromApi(row)) : [],
    )
    setOtherRequirementType("")
    setOtherRequirementContentType("")
    setOtherRequirementDescription("")
    setOtherRequirementFile(null)
    setStepErrors([])
  }, [commodityData, isInvestment])

  useEffect(() => {
    setStepErrors([])
  }, [step])

  useEffect(() => {
    if (!isOpen) {
      commodityHydratedKeyRef.current = null
      return
    }
    const pid = String(commodityData?.id ?? commodityData?.productId ?? "")
    const nextKey = `${pid}:${isInvestment}`
    if (commodityHydratedKeyRef.current === nextKey) return
    commodityHydratedKeyRef.current = nextKey
    resetForm()
  }, [isOpen, commodityData, isInvestment, resetForm])

  useEffect(() => {
    if (!isOpen) return
    if (prefetchedOptions) {
      setTenureOptions(prefetchedOptions.tenure.length ? prefetchedOptions.tenure : DEFAULT_TENURE)
      setYieldMethodOptions(prefetchedOptions.yieldMethod)
      setWithdrawalFlexibilityOptions(prefetchedOptions.withdrawalFlexibility)
      setFeeTypeOptions(prefetchedOptions.feeType)
      setPenaltyTypeOptions(prefetchedOptions.penaltyType)
      setTriggerDurationOptions(prefetchedOptions.triggerDuration)
      setOtherRequirementOptions(prefetchedOptions.otherRequirementType ?? [])
      setContentTypeOptions(prefetchedOptions.requirementContentType ?? [])
      return
    }
    const url = isInvestment
      ? "/api/configurations/options/investment-tenure"
      : "/api/configurations/options/commodity-tenure"
    const fetchTenure = async () => {
      try {
        const res = await fetch(url, { credentials: "include", cache: "no-store" })
        const json = await res.json().catch(() => ({}))
        const list = (json?.data ?? []) as { value?: string; label?: string }[]
        const opts =
          Array.isArray(list) && list.length
            ? list.map((x) => x.label || x.value).filter((v): v is string => typeof v === "string" && v.length > 0)
            : []
        if (opts.length) setTenureOptions(opts)
      } catch {
        setTenureOptions(DEFAULT_TENURE)
      }
      const [withdrawalFlexibility, feeTypes, penaltyTypes, triggerDuration, otherRequirementType, requirementContentType] =
        await Promise.all([
          fetchOptionLabels("withdrawal-flexibility", DEFAULT_WITHDRAWAL_FLEXIBILITY_OPTIONS),
          fetchOptionLabels("fee-type", DEFAULT_FEE_TYPE_OPTIONS),
          fetchOptionLabels("penalty-type", DEFAULT_PENALTY_TYPE_OPTIONS),
          fetchProductOptionLabels("trigger-duration", TRIGGER_DURATION_OPTIONS),
          fetchProductOptionLabels("loan-other-requirement-type", []),
          fetchProductOptionLabels("loan-other-requirement-content-type", []),
        ])
      setWithdrawalFlexibilityOptions(withdrawalFlexibility)
      setFeeTypeOptions(feeTypes)
      setPenaltyTypeOptions(penaltyTypes)
      setTriggerDurationOptions(triggerDuration)
      setOtherRequirementOptions(otherRequirementType)
      setContentTypeOptions(requirementContentType)

      const yieldOptions = await fetchOptionLabels(
        isInvestment ? "investment-trading-cycle" : "commodity-trading-cycle",
        DEFAULT_YIELD_METHOD_OPTIONS,
      )
      setYieldMethodOptions(yieldOptions)
    }
    fetchTenure()
  }, [isOpen, isInvestment, prefetchedOptions])

  useEffect(() => {
    if (!moratoriumEnabled) setMoratoriumDays("")
  }, [moratoriumEnabled])

  const removeCommas = (value: string) => value.replace(/,/g, "")

  const addTypeRow = () => {
    if (!typeNameDraft.trim() || !typeDescDraft.trim()) return
    setTypeRows((prev) => [...prev, { name: typeNameDraft.trim(), description: typeDescDraft.trim() }])
    setTypeNameDraft("")
    setTypeDescDraft("")
  }

  const removeTypeRowAt = (index: number) => {
    setTypeRows((prev) => prev.filter((_, i) => i !== index))
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
    setPenalties((prev) => [
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

  const addPriceRow = () => {
    if (!priceDraft.trim() || !priceDate || !priceSource.trim()) return
    setPriceRows((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        price: priceDraft.trim(),
        date: priceDate,
        source: priceSource.trim(),
      },
    ])
    setPriceDraft("")
    setPriceDate("")
    setPriceSource("")
  }

  const formatPriceTableDate = (iso: string) => {
    if (!iso) return "—"
    const d = new Date(iso + "T12:00:00")
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleBack = () => {
    if (isSubmitting) return
    if (step > 1) setStep((s) => s - 1)
  }

  const commodityValidationBase = () => ({
    isInvestment,
    name,
    duration,
    description,
    typeRows,
    previewImage,
    hasPreviewAsset: !!(
      existingPreviewAssetUrl ||
      (commodityData?.about as Record<string, unknown> | undefined)?.previewAssetUrl ||
      commodityData?.previewAssetUrl ||
      commodityData?.previewImage?.url
    ),
    yieldMethod,
    offerYieldOn,
    offerYieldValue,
    withdrawalFlexibility,
    minInvestmentAmount: removeCommas(minInvestmentAmount),
    unitAmount: removeCommas(unitAmount),
    minQuantityPurchase,
    maxAmount: removeCommas(maxAmount),
    termsAndConditions,
    moratoriumEnabled,
    moratoriumDays,
    contractId,
    airSignSecretKey,
    airSignUid,
    charges,
    priceRows: priceRows.map((r) => ({ price: removeCommas(r.price), date: r.date, source: r.source })),
  })

  const handleNext = async () => {
    if (step < steps.length) {
      const { ok, errors } = validateCommodityStep({ step, ...commodityValidationBase() })
      if (!ok) {
        setStepErrors(errors)
        return
      }
      setStepErrors([])
      setStep((s) => s + 1)
      return
    }

    const all = validateAllCommoditySteps(commodityValidationBase())
    if (!all.ok) {
      setStepErrors(all.errors)
      return
    }
    setStepErrors([])

    setIsSubmitting(true)
    try {
      let previewAssetUrlSubmit = existingPreviewAssetUrl.trim() || undefined
      if (previewImage) {
        previewAssetUrlSubmit = await uploadProductMediaToUrl(previewImage)
      }

      const otherRequirementsPayload = await serializeOtherRequirementsForSubmit(otherRequirements)

      const payload = {
        ...commodityData,
        name,
        description,
        duration,
        typeRows,
        commodityTypes: !isInvestment ? typeRows : undefined,
        investmentTypes: isInvestment ? typeRows : undefined,
        previewImage: null,
        previewAssetUrl: previewAssetUrlSubmit,
        yieldMethod,
        offerYieldOn,
        offerYieldEnabled: offerYieldOn,
        offerYieldValue,
        withdrawalFlexibility,
        unitAmount: removeCommas(unitAmount),
        minQuantityPurchase,
        maxAmount: removeCommas(maxAmount),
        termsAndConditions,
        moratoriumEnabled,
        moratoriumDays,
        contractId,
        airSignSecretKey,
        airSignUid,
        charges,
        forcefulWithdrawal,
        chargeForForcefulWithdrawal: forcefulWithdrawal,
        penalties,
        otherRequirements: otherRequirementsPayload,
        commodityPrices: !isInvestment ? priceRows.map((r) => ({ ...r, price: removeCommas(r.price) })) : undefined,
        unitPrices: isInvestment ? priceRows.map((r) => ({ ...r, price: removeCommas(r.price) })) : undefined,
        priceHistory: priceRows.map((r) => ({ ...r, price: removeCommas(r.price) })),
      }

      if (isInvestment) {
        await Promise.resolve(
          onSubmit({
            ...payload,
            purpose: description,
            tradingCycle: yieldMethod,
            investmentTenure: duration,
            investmentType: commodityData?.investmentType ?? commodityData?.productType ?? commodityData?.productSubtype,
            investmentStructureType: String(
              (commodityData?.structure as Record<string, unknown> | undefined)?.investmentType ?? "unit_based",
            ),
            securityRequirements: [],
            minimumOrderQuantity: minQuantityPurchase,
            price: removeCommas(maxAmount),
            managementFeePercent: "",
            minimumRedemptionAmount: "",
            expectedAnnualReturn: offerYieldOn ? offerYieldValue : "",
            additionalRequirements: [],
            minInvestmentAmount: removeCommas(minInvestmentAmount),
            maxInvestmentAmount: removeCommas(maxAmount),
            unitAmountPrice: removeCommas(unitAmount),
            enableUnitInvestmentPurchase,
            expectedReturn: offerYieldOn ? offerYieldValue : "",
          }),
        )
        toast.success("Investment product configuration saved successfully.")
      } else {
        const lastRow = priceRows.length ? priceRows[priceRows.length - 1] : null
        const lastPriceNum = lastRow ? Number.parseFloat(removeCommas(lastRow.price)) : NaN
        const minQtyNum = Number.parseInt(String(minQuantityPurchase).replace(/,/g, ""), 10)
        await Promise.resolve(
          onSubmit({
            ...payload,
            purpose: description,
            tradingCycle: yieldMethod,
            commodityTenure: duration,
            securityRequirements: [],
            price: Number.isFinite(lastPriceNum) ? lastPriceNum : commodityData?.price,
            minimumQuantity: Number.isFinite(minQtyNum) ? minQtyNum : undefined,
            unitOfMeasure: unitOfMeasure.trim() || undefined,
            compoundingFrequency: compoundingFrequency.trim() || undefined,
            config: compoundingFrequency.trim()
              ? { compoundingFrequency: compoundingFrequency.trim() }
              : undefined,
            managementFee: "",
            minWithdrawalAmount: minQuantityPurchase,
            expectedReturn: offerYieldOn ? offerYieldValue : "",
            additionalRequirements: [],
          }),
        )
        toast.success("Commodity product configuration saved successfully.")
      }
    } catch (err: unknown) {
      toast.error(formatProductApiErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  const title = isInvestment ? "Configure Investment Product" : "Configure Commodity Product"
  const subtitle = isInvestment
    ? "Configure the parameters of this investment product"
    : "Configure the parameters of this Commodity product"

  const nameLabel = isInvestment ? "Name of Investment" : "Name of Commodity"
  const durationLabel = isInvestment ? "Duration of Investment" : "Duration of Commodity"
  const typeSectionLabel = isInvestment ? "Investment Type" : "Commodity Type"
  const offerYieldLabel = isInvestment ? "Offer Yield on Investment" : "Offer Yield on Commodity"
  const termsLabel = isInvestment ? "Investment Terms & Condition" : "Commodity Terms & Condition"

  return (
    <Drawer
      open={isOpen}
      onOpenChange={onClose}
      title={title}
      subtitle={subtitle}
      className="w-full min-w-0 rounded-none sm:w-[92%] md:w-[78%] lg:w-[62%] xl:w-[52%] 2xl:w-[45%] sm:min-w-[400px] sm:rounded-bl-[40px] sm:rounded-tl-[40px]"
    >
      <div className="mx-auto w-full">
        <ProductConfigTabs steps={[...steps]} activeStep={step} onStepChange={setStep} />

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
            idPrefix={isInvestment ? "investment-commodity" : "commodity"}
            nameLabel={nameLabel}
            name={name}
            onNameChange={setName}
            durationLabel={durationLabel}
            durationPlaceholder="Select"
            durationValue={duration}
            durationOptions={tenureOptions}
            onDurationChange={setDuration}
            description={description}
            onDescriptionChange={setDescription}
            typeSectionLabel={typeSectionLabel}
            typeNameDraft={typeNameDraft}
            typeDescDraft={typeDescDraft}
            onTypeNameDraftChange={setTypeNameDraft}
            onTypeDescDraftChange={setTypeDescDraft}
            onAddType={addTypeRow}
            onRemoveTypeRow={removeTypeRowAt}
            typeRows={typeRows}
            previewFile={previewImage}
            previewLabel={String(
              previewImage?.name ??
                ((existingPreviewAssetUrl ? previewLabelFromAssetUrl(existingPreviewAssetUrl) : "") ||
                  commodityData?.previewImage?.fileName ||
                  commodityData?.previewImageName ||
                  ""),
            )}
            previewImageUrl={
              previewImage
                ? ""
                : String(
                    existingPreviewAssetUrl ||
                      (commodityData?.about as Record<string, unknown> | undefined)?.previewAssetUrl ||
                      commodityData?.previewImage?.url ||
                      commodityData?.previewImageUrl ||
                      "",
                  )
            }
            onPreviewFileChange={setPreviewImage}
          />
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ProductConfigSelect
                label={isInvestment ? "Interest method" : "Yield Method"}
                placeholder="Select Section"
                value={yieldMethod}
                options={yieldMethodOptions}
                onChange={setYieldMethod}
                requirement="required"
              />
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="offer-yield" className="text-sm font-medium text-gray-700">
                    {offerYieldLabel}
                    <span className="font-normal text-gray-500"> (Optional)</span>
                  </label>
                  <Switch
                    id="offer-yield"
                    checked={offerYieldOn}
                    onCheckedChange={setOfferYieldOn}
                    className="h-5 w-9 shrink-0 data-[state=checked]:bg-[#9A813F] data-[state=unchecked]:bg-slate-200"
                  />
                </div>
                {offerYieldOn ? (
                  <ProductConfigInput
                    label="Offer yield value"
                    placeholder="e.g 10%"
                    value={offerYieldValue}
                    onChange={handleOfferYieldValueChange}
                    numericOnly
                    requirement="required"
                  />
                ) : null}
              </div>
            </div>

            <div className={`grid grid-cols-1 gap-4 ${isInvestment ? "" : "sm:grid-cols-2"}`}>
              <ProductConfigSelect
                label="Withdrawal Flexibility"
                placeholder="Select"
                value={withdrawalFlexibility}
                options={withdrawalFlexibilityOptions}
                onChange={setWithdrawalFlexibility}
                requirement="required"
              />
              {!isInvestment ? (
                <ProductConfigInput
                  label="Unit Amount"
                  placeholder="e.g N10,000"
                  value={unitAmount}
                  onChange={setUnitAmount}
                  numericOnly
                  formatThousands
                  requirement="required"
                />
              ) : null}
            </div>

            {isInvestment ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ProductConfigInput
                  label="Minimum investment"
                  placeholder="e.g 50,000"
                  value={minInvestmentAmount}
                  onChange={setMinInvestmentAmount}
                  numericOnly
                  formatThousands
                  requirement="required"
                />
                <ProductConfigInput
                  label="Maximum investment"
                  placeholder="e.g 5,000,000"
                  value={maxAmount}
                  onChange={setMaxAmount}
                  numericOnly
                  formatThousands
                  requirement="required"
                />
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {isInvestment ? (
                <>
                  <ProductConfigInput
                    label="Unit price (per unit)"
                    placeholder="e.g 1,000"
                    value={unitAmount}
                    onChange={setUnitAmount}
                    numericOnly
                    formatThousands
                    requirement="required"
                  />
                  <ProductConfigInput
                    label="Min Quantity Purchase"
                    placeholder="Min Quantity"
                    value={minQuantityPurchase}
                    onChange={setMinQuantityPurchase}
                    numericOnly
                    requirement="required"
                  />
                </>
              ) : (
                <>
                  <ProductConfigInput
                    label="Min Quantity Purchase"
                    placeholder="Min Quantity"
                    value={minQuantityPurchase}
                    onChange={setMinQuantityPurchase}
                    numericOnly
                    requirement="required"
                  />
                  <ProductConfigInput
                    label="Max Amount"
                    placeholder="Max Amount"
                    value={maxAmount}
                    onChange={setMaxAmount}
                    numericOnly
                    formatThousands
                    requirement="required"
                  />
                </>
              )}
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {termsLabel}
                <span className="font-normal text-gray-500"> (Required)</span>
              </label>
              <textarea
                value={termsAndConditions}
                onChange={(e) => setTermsAndConditions(e.target.value)}
                placeholder="Enter Terms"
                rows={5}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-[#9A813F] focus:ring-2 focus:ring-[#9A813F]/20"
              />
            </div>

            {isInvestment ? (
              <ProductConfigToggle
                id="enable-unit-investment-purchase"
                label="Enable unit investment purchase"
                checked={enableUnitInvestmentPurchase}
                onChange={setEnableUnitInvestmentPurchase}
                requirement="optional"
              />
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <ProductConfigToggle
                id="commodity-moratorium"
                label="Moratorium (minimum holding period)"
                checked={moratoriumEnabled}
                onChange={setMoratoriumEnabled}
                requirement="optional"
              />
              <div className="w-full sm:max-w-xs">
                <ProductConfigInput
                  label="Holding period (days)"
                  placeholder="Enter days"
                  value={moratoriumDays}
                  onChange={setMoratoriumDays}
                  numericOnly
                  disabled={!moratoriumEnabled}
                  requirement="optional"
                />
              </div>
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
              filePickerId={isInvestment ? "investment-other-requirement-file" : "commodity-other-requirement-file"}
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
              <ProductConfigInput label="AirSign UID" placeholder="Enter UID" value={airSignUid} onChange={setAirSignUid} requirement="required" />
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
                {charges.map((c, i) => (
                  <div key={`${c.name}-${i}`} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 border-b border-gray-100 py-2 text-sm last:border-0">
                    <span className="pr-2">{c.name}</span>
                    <span>{c.feeType}</span>
                    <span>{c.value}</span>
                    <div className="flex justify-end">
                      <button type="button" onClick={() => setCharges((p) => p.filter((_, j) => j !== i))} className="text-red-600" aria-label="Remove">
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <ProductConfigToggle
              id="commodity-forceful"
              label="Charge for Forceful Withdrawal"
              checked={forcefulWithdrawal}
              onChange={setForcefulWithdrawal}
              requirement="optional"
            />

            {forcefulWithdrawal && (
              <>
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_0.9fr_0.85fr_1.25fr_auto]">
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
                  <Button type="button" onClick={addPenalty} className="h-10 self-end bg-[#9A813F] text-white hover:bg-[#8A7335]">
                    Add
                  </Button>
                </div>

                {penalties.length > 0 && (
                  <div className="rounded-md border border-dashed border-[#cdbf8b] p-3">
                    <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 border-b border-gray-100 pb-2 text-xs font-semibold text-gray-500">
                      <span>Name</span>
                      <span>Value</span>
                      <span>Trigger Duration</span>
                      <span className="text-right" />
                    </div>
                    {penalties.map((p, i) => (
                      <div key={`${p.name}-${i}`} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 border-b border-gray-100 py-2 text-sm last:border-0">
                        <span className="pr-2">{p.name}</span>
                        <span>{p.value}</span>
                        <span>{p.triggerDuration}</span>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => setPenalties((prev) => prev.filter((_, j) => j !== i))}
                            className="text-red-600"
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

        {step === 4 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
              <ProductConfigInput
                label={isInvestment ? "Enter Unit Price" : "Enter Commodity Price"}
                placeholder="e.g N12,000.44"
                value={priceDraft}
                onChange={setPriceDraft}
                numericOnly
                formatThousands
                requirement="required"
              />
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Select Date
                  <span className="font-normal text-gray-500"> (Required)</span>
                </label>
                <input
                  type="date"
                  value={priceDate}
                  onChange={(e) => setPriceDate(e.target.value)}
                  className="h-10 w-full rounded-md border border-[#e5e7eb] bg-white px-3 text-sm outline-none focus:border-[#9A813F] focus:ring-2 focus:ring-[#9A813F]/20"
                />
              </div>
              <ProductConfigInput label="Source" placeholder="Enter Value" value={priceSource} onChange={setPriceSource} requirement="required" />
              <Button type="button" onClick={addPriceRow} className="h-10 self-end bg-[#9A813F] text-white hover:bg-[#8A7335]">
                Add
              </Button>
            </div>

            {priceRows.length > 0 && (
              <div className="overflow-x-auto rounded-md border border-dashed border-[#cdbf8b] p-3">
                <div className="grid min-w-[520px] grid-cols-[1fr_1fr_1fr_auto] gap-2 border-b border-gray-100 pb-2 text-xs font-semibold text-gray-500">
                  <span>Price</span>
                  <span>Date</span>
                  <span>Source</span>
                  <span className="text-right" />
                </div>
                {priceRows.map((row) => (
                  <div
                    key={row.id}
                    className="grid min-w-[520px] grid-cols-[1fr_1fr_1fr_auto] gap-2 border-b border-gray-100 py-2 text-sm last:border-0"
                  >
                    <span className="pr-2 font-medium">{row.price}</span>
                    <span>{formatPriceTableDate(row.date)}</span>
                    <span>{row.source}</span>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setPriceRows((p) => p.filter((r) => r.id !== row.id))}
                        className="text-red-600"
                        aria-label="Remove"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
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
            {isSubmitting && step === steps.length ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" aria-hidden />
                Saving…
              </>
            ) : step === steps.length ? (
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
