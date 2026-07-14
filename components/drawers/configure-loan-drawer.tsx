"use client"

import { useEffect, useMemo, useState, type ChangeEvent, useRef } from "react"
import { Loader2, X } from "lucide-react"
import { toast } from "sonner"
import { formatProductApiErrorMessage } from "@/lib/formatProductApiErrorMessage"
import { getPdfFileValidationError } from "@/lib/fileValidation"
import { Drawer } from "@/components/drawer"
import { Button } from "@/components/ui/button"
import {
  uploadProductDocumentTemplateToUrl,
  uploadProductMediaToUrl,
} from "@/lib/uploadProductMediaToUrl"
import {
  normalizeOtherRequirementRowFromApi,
  serializeOtherRequirementsForSubmit,
  shouldUseOtherRequirementFileUpload,
  type OtherRequirementDraft,
} from "@/lib/otherRequirementPayload"
import { fetchOptionLabels, fetchProductOptionLabels } from "@/lib/productOptions"
import type { LoanConfigurePrefetched } from "@/lib/productConfigurePrefetch"
import { ProductConfigAboutStep } from "@/components/drawers/product-config-about-step"
import { ProductConfigDocumentRequirementsPanel } from "@/components/drawers/product-config-document-requirements"
import { ProductConfigOtherRequirementsPanel } from "@/components/drawers/product-config-other-requirements"
import {
  DEFAULT_REPAYMENT_WORKFLOWS,
  ProductConfigInput,
  ProductConfigRepaymentWorkflowPanel,
  ProductConfigSelect,
  ProductConfigTabs,
  ProductConfigToggle,
  withRepaymentStructureOptions,
} from "@/components/drawers/product-config-form-fields"
import { validateAllLoanSteps, validateLoanStep } from "@/lib/productConfigureStepValidation"
import { formatAmountDisplayFromUnknown } from "@/lib/formatAmountInput"
import {
  isOtherSecuritySelected,
  mergeSecurityRequirementDisplayOptions,
  OTHER_SECURITY_CANONICAL_LABEL,
  serializeSecurityRequirements,
  splitStoredSecurityRequirements,
} from "@/lib/securityRequirementOptions"

interface ConfigureLoanDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => void | Promise<void>
  loanData: any
  /** When set, dropdown options are applied immediately (no in-drawer fetch). */
  prefetchedOptions?: LoanConfigurePrefetched | null
}

const STEPS = ["About Product", "Structure", "Requirements", "Fees & Charges"]

/** Fallback when product-ms has no moratorium-duration labels yet (same key as mortgage configure). */
const DEFAULT_MORATORIUM_DURATION_OPTIONS: string[] = []

interface LoanTypeItem {
  name: string
  description: string
}

type OtherRequirementItem = OtherRequirementDraft

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

type DocumentRequirementUpload = { name: string; file?: File; fileUrl?: string }

function classifyEquityRequirementMode(selected: string): "zero" | "fixed" | "percentage" | "none" {
  const s = selected.trim().toLowerCase().replace(/\s+/g, " ")
  if (!s) return "none"
  if (s.includes("zero") && s.includes("down")) return "zero"
  if (s.includes("percentage") || (s.includes("percent") && s.includes("based"))) return "percentage"
  if (s.includes("fixed") && s.includes("amount")) return "fixed"
  return "none"
}

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

function normalizeOptionToken(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/->/g, " ")
    .replace(/[%]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function resolveOptionLabel(raw: unknown, options: string[]): string {
  const target = normalizeOptionToken(raw)
  if (!target) return ""
  const direct = options.find((o) => normalizeOptionToken(o) === target)
  if (direct) return direct
  const squeezedTarget = target.replace(/\s+/g, "")
  const fuzzy = options.find((o) => normalizeOptionToken(o).replace(/\s+/g, "") === squeezedTarget)
  return fuzzy ?? String(raw ?? "")
}

function extractMoratoriumPrefill(raw: unknown): string {
  if (raw == null) return ""
  if (typeof raw === "number" && Number.isFinite(raw)) return String(raw)
  if (typeof raw === "string") return raw.trim()
  if (typeof raw === "object") {
    const r = raw as Record<string, unknown>
    const val = r.value ?? r.duration ?? r.days
    if (val != null) return String(val).trim()
  }
  return ""
}

/** API may return numeric interest; drawer state expects a %-suffixed display string when applicable. */
function normalizeInterestRateHydrate(raw: unknown): string {
  if (raw == null || raw === "") return ""
  if (typeof raw === "number" && Number.isFinite(raw)) return `${raw}%`
  const s = String(raw).trim()
  if (!s) return ""
  if (s.includes("%")) return s
  const n = Number(s.replace(/%/g, ""))
  if (!Number.isNaN(n)) return `${n}%`
  return s
}

function pickRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>
  return {}
}

/** Product MS may return tabs at root or nested under `configuration`. */
function pickAboutFromLoan(loanData: Record<string, unknown>): Record<string, unknown> {
  const direct = pickRecord(loanData.about)
  if (Object.keys(direct).length) return direct
  const cfg = pickRecord(loanData.configuration)
  return pickRecord(cfg.about)
}

function pickStructureFromLoan(loanData: Record<string, unknown>): Record<string, unknown> {
  const direct = pickRecord(loanData.structure)
  if (Object.keys(direct).length) return direct
  const cfg = pickRecord(loanData.configuration)
  return pickRecord(cfg.structure)
}

function pickRequirementsFromLoan(loanData: Record<string, unknown>): Record<string, unknown> {
  const direct = pickRecord(loanData.requirements)
  if (Object.keys(direct).length) return direct
  const cfg = pickRecord(loanData.configuration)
  return pickRecord(cfg.requirements)
}

function pickFeesAndChargesFromLoan(loanData: Record<string, unknown>): Record<string, unknown> {
  const direct = pickRecord(loanData.feesAndCharges)
  if (Object.keys(direct).length) return direct
  const cfg = pickRecord(loanData.configuration)
  return pickRecord(cfg.feesAndCharges)
}

/** Stored enum / snake_case → UI workflow label used by `ProductConfigRepaymentWorkflowPanel`. */
function canonicalRepaymentWorkflowFromApi(raw: unknown): string {
  const k = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_")
  const map: Record<string, string> = {
    principal_interest_charges: DEFAULT_REPAYMENT_WORKFLOWS[0],
    principal_then_interest_then_charges: DEFAULT_REPAYMENT_WORKFLOWS[0],
    charges_principal_interest: DEFAULT_REPAYMENT_WORKFLOWS[1],
    charges_then_principal_then_interest: DEFAULT_REPAYMENT_WORKFLOWS[1],
    interest_charges_principal: DEFAULT_REPAYMENT_WORKFLOWS[2],
    interest_then_charges_then_principal: DEFAULT_REPAYMENT_WORKFLOWS[2],
  }
  return map[k] ?? String(raw ?? "").trim()
}

export default function ConfigureLoanDrawer({
  isOpen,
  onClose,
  onSubmit,
  loanData,
  prefetchedOptions = null,
}: ConfigureLoanDrawerProps) {
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [tenureOptions, setTenureOptions] = useState<string[]>([])
  const [interestMethodOptions, setInterestMethodOptions] = useState<string[]>([])
  const [moratoriumTypeOptions, setMoratoriumTypeOptions] = useState<string[]>([])
  const [moratoriumDurationOptions, setMoratoriumDurationOptions] = useState<string[]>(DEFAULT_MORATORIUM_DURATION_OPTIONS)
  const [repaymentScheduleOptions, setRepaymentScheduleOptions] = useState<string[]>([])
  const [amortizationScheduleOptions, setAmortizationScheduleOptions] = useState<string[]>([])
  const [repaymentFrequencyOptions, setRepaymentFrequencyOptions] = useState<string[]>([])
  const [acceptableNpaOptions, setAcceptableNpaOptions] = useState<string[]>([])
  const [equityRequirementOptions, setEquityRequirementOptions] = useState<string[]>([])
  const [otherRequirementOptions, setOtherRequirementOptions] = useState<string[]>([])
  const [contentTypeOptions, setContentTypeOptions] = useState<string[]>([])
  const [securityOptions, setSecurityOptions] = useState<string[]>([])
  const [feeTypeOptions, setFeeTypeOptions] = useState<string[]>([])
  const [penaltyTypeOptions, setPenaltyTypeOptions] = useState<string[]>([])
  const [repaymentWorkflowOptions, setRepaymentWorkflowOptions] = useState<string[]>([...DEFAULT_REPAYMENT_WORKFLOWS])

  const [name, setName] = useState(loanData?.name || "")
  const [tenure, setTenure] = useState("")
  const [description, setDescription] = useState(loanData?.description || "")
  const [loanTypeName, setLoanTypeName] = useState("")
  const [loanTypeDescription, setLoanTypeDescription] = useState("")
  const [loanTypes, setLoanTypes] = useState<LoanTypeItem[]>([])
  const [previewImage, setPreviewImage] = useState<File | null>(null)
  const [existingPreviewAssetUrl, setExistingPreviewAssetUrl] = useState("")

  const [interestRate, setInterestRate] = useState("")
  const [interestMethod, setInterestMethod] = useState("")
  const [allowMoratorium, setAllowMoratorium] = useState(false)
  const [moratoriumSelectDuration, setMoratoriumSelectDuration] = useState("")
  const [moratoriumDurationOf, setMoratoriumDurationOf] = useState("")
  const [moratoriumType, setMoratoriumType] = useState("")
  const [repaymentWorkflow, setRepaymentWorkflow] = useState<string>(DEFAULT_REPAYMENT_WORKFLOWS[0])
  const [minLoanAmount, setMinLoanAmount] = useState("")
  const [maxLoanAmount, setMaxLoanAmount] = useState("")
  const [repaymentSchedule, setRepaymentSchedule] = useState("")
  const [amortizationSchedule, setAmortizationSchedule] = useState("")
  const [repaymentFrequency, setRepaymentFrequency] = useState("")
  const [acceptableNpa, setAcceptableNpa] = useState("")
  const [equityRequirement, setEquityRequirement] = useState("")
  const [equityFixedAmount, setEquityFixedAmount] = useState("")
  const [equityPercentage, setEquityPercentage] = useState("")

  const equityRequirementMode = useMemo(() => classifyEquityRequirementMode(equityRequirement), [equityRequirement])

  const [selectedSecurities, setSelectedSecurities] = useState<string[]>([])
  const [securityOtherSpecification, setSecurityOtherSpecification] = useState("")
  const [documentName, setDocumentName] = useState("")
  const [documents, setDocuments] = useState<DocumentRequirementUpload[]>([])
  const [otherRequirementType, setOtherRequirementType] = useState("")
  const [otherRequirementContentType, setOtherRequirementContentType] = useState("")
  const [otherRequirementDescription, setOtherRequirementDescription] = useState("")
  const [otherRequirementFile, setOtherRequirementFile] = useState<File | null>(null)
  const [otherRequirements, setOtherRequirements] = useState<OtherRequirementItem[]>([])
  const documentsInputRef = useRef<HTMLInputElement>(null)
  const otherRequirementUploadRef = useRef<HTMLInputElement>(null)
  const loanHydratedKeyRef = useRef<string | null>(null)

  const [chargeName, setChargeName] = useState("")
  const [chargeFeeType, setChargeFeeType] = useState("")
  const [chargeValue, setChargeValue] = useState("")
  const [charges, setCharges] = useState<FeeItem[]>([])
  const [chargePaymentMode, setChargePaymentMode] = useState<"deduct" | "customer-pay">("deduct")
  const [enableLateRepaymentCharges, setEnableLateRepaymentCharges] = useState(true)
  const [penaltyName, setPenaltyName] = useState("")
  const [penaltyType, setPenaltyType] = useState("")
  const [penaltyValue, setPenaltyValue] = useState("")
  const [penaltyTriggerDuration, setPenaltyTriggerDuration] = useState("")
  const [penalties, setPenalties] = useState<PenaltyItem[]>([])
  const [stepErrors, setStepErrors] = useState<string[]>([])

  const mergedSecurityOptions = useMemo(
    () => mergeSecurityRequirementDisplayOptions(securityOptions),
    [securityOptions],
  )

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
    return isPercentType(type) ? `${numeric}%` : numeric
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

  const handleEquityRequirementChange = (value: string) => {
    setEquityRequirement(value)
    setEquityFixedAmount("")
    setEquityPercentage("")
  }

  const handleEquityFixedAmountChange = (value: string) => {
    setEquityFixedAmount(value)
  }

  const handleEquityPercentageChange = (value: string) => {
    setEquityPercentage(normalizePercentInput(value))
  }

  useEffect(() => {
    setStepErrors([])
  }, [step])

  useEffect(() => {
    if (!isOpen) return
    if (prefetchedOptions) {
      setTenureOptions(prefetchedOptions.tenure)
      setInterestMethodOptions(prefetchedOptions.interestMethods)
      setMoratoriumTypeOptions(prefetchedOptions.moratoriumType)
      setMoratoriumDurationOptions(prefetchedOptions.moratoriumDuration)
      setRepaymentScheduleOptions(withRepaymentStructureOptions(prefetchedOptions.repaymentSchedule))
      setAmortizationScheduleOptions(prefetchedOptions.amortizationSchedule)
      setRepaymentFrequencyOptions(prefetchedOptions.repaymentFrequency)
      setAcceptableNpaOptions(prefetchedOptions.acceptableNpa)
      setEquityRequirementOptions(prefetchedOptions.equityRequirement)
      setOtherRequirementOptions(prefetchedOptions.otherRequirementType)
      setContentTypeOptions(prefetchedOptions.requirementContentType)
      setSecurityOptions(prefetchedOptions.securities)
      setFeeTypeOptions(prefetchedOptions.feeType)
      setPenaltyTypeOptions(prefetchedOptions.penaltyType)
      setRepaymentWorkflowOptions(prefetchedOptions.repaymentWorkflow)
      return
    }
    const loadOptions = async () => {
      const [
        tenure,
        interestMethods,
        moratoriumType,
        moratoriumDuration,
        repaymentSchedule,
        amortizationSchedule,
        repaymentFrequency,
        acceptableNpa,
        equityRequirement,
        otherRequirementType,
        requirementContentType,
        securities,
        feeType,
        penaltyType,
        repaymentWorkflow,
      ] = await Promise.all([
        fetchOptionLabels("loan-tenure", []),
        fetchProductOptionLabels("interest-method", []),
        fetchOptionLabels("moratorium-type", []),
        fetchProductOptionLabels("moratorium-duration", DEFAULT_MORATORIUM_DURATION_OPTIONS),
        fetchOptionLabels("repayment-schedule", []),
        fetchOptionLabels("amortization", []),
        fetchOptionLabels("repayment-cycle", []),
        fetchOptionLabels("acceptable-npa", []),
        fetchOptionLabels("equity-requirement", []),
        fetchProductOptionLabels("loan-other-requirement-type", []),
        fetchProductOptionLabels("loan-other-requirement-content-type", []),
        fetchProductOptionLabels("security-requirements", [], { productType: "LOAN" }),
        fetchOptionLabels("fee-type", []),
        fetchOptionLabels("penalty-type", []),
        fetchOptionLabels("repayment-workflow", [...DEFAULT_REPAYMENT_WORKFLOWS]),
      ])

      setTenureOptions(tenure)
      setInterestMethodOptions(interestMethods)
      setMoratoriumTypeOptions(moratoriumType)
      setMoratoriumDurationOptions(moratoriumDuration)
      setRepaymentScheduleOptions(withRepaymentStructureOptions(repaymentSchedule))
      setAmortizationScheduleOptions(amortizationSchedule)
      setRepaymentFrequencyOptions(repaymentFrequency)
      setAcceptableNpaOptions(acceptableNpa)
      setEquityRequirementOptions(equityRequirement)
      setOtherRequirementOptions(otherRequirementType)
      setContentTypeOptions(requirementContentType)
      setSecurityOptions(securities)
      setFeeTypeOptions(feeType)
      setPenaltyTypeOptions(penaltyType)
      setRepaymentWorkflowOptions(repaymentWorkflow)
    }
    loadOptions()
  }, [isOpen, prefetchedOptions])

  useEffect(() => {
    if (!isOpen) {
      loanHydratedKeyRef.current = null
      return
    }
    if (!loanData) return
    const productKey = String(loanData.id ?? loanData.productId ?? "")
    if (productKey) {
      if (loanHydratedKeyRef.current === productKey) return
      loanHydratedKeyRef.current = productKey
    } else if (loanHydratedKeyRef.current === "__noid__") {
      return
    } else {
      loanHydratedKeyRef.current = "__noid__"
    }
    const loan = loanData as Record<string, unknown>
    const about = pickAboutFromLoan(loan) as Record<string, any>
    const structure = pickStructureFromLoan(loan) as Record<string, any>
    const requirements = pickRequirementsFromLoan(loan) as Record<string, any>
    const fees = pickFeesAndChargesFromLoan(loan) as Record<string, any>

    setName(String(loanData.name ?? ""))
    setTenure(String(loanData.tenure ?? about.tenure ?? ""))
    setExistingPreviewAssetUrl(
      String(about.previewAssetUrl ?? loanData.previewAssetUrl ?? loanData.previewImage?.url ?? ""),
    )
    setDescription(String(loanData.description ?? ""))
    const loanTypesHydrated: LoanTypeItem[] = Array.isArray(loanData.loanTypes ?? about.loanTypes)
      ? (loanData.loanTypes ?? about.loanTypes).map((t: any) => ({
          name: String(t?.name ?? "").trim(),
          description: String(t?.description ?? "").trim(),
        }))
      : []
    setLoanTypes(loanTypesHydrated)
    if (loanTypesHydrated.length >= 1) {
      setLoanTypeName(loanTypesHydrated[0].name)
      setLoanTypeDescription(loanTypesHydrated[0].description)
    } else {
      setLoanTypeName("")
      setLoanTypeDescription("")
    }

    setInterestRate(
      normalizeInterestRateHydrate(
        (loanData.interestRate as unknown) ??
          (structure.interestRate as unknown) ??
          (about as Record<string, unknown>).interestRate,
      ),
    )
    setInterestMethod(String(loanData.interestMethod ?? structure.interestMethod ?? ""))
    const allowMoratoriumValue = asBool(loanData.allowMoratorium ?? structure.allowMoratorium)
    const morStr = extractMoratoriumPrefill(
      loanData.moratorium ??
        structure.moratorium ??
        loanData.moratoriumSelectDuration ??
        structure.moratoriumSelectDuration ??
        loanData.moratoriumDurationOf ??
        structure.moratoriumDurationOf,
    )
    if (morStr != null && String(morStr).trim() !== "" && !Number.isNaN(Number(morStr))) {
      setAllowMoratorium(true)
      setMoratoriumSelectDuration(String(morStr))
      setMoratoriumDurationOf("")
    } else {
      setAllowMoratorium(allowMoratoriumValue)
      const selectDurationRaw =
        loanData.moratoriumSelectDuration ?? structure.moratoriumSelectDuration ?? morStr ?? ""
      setMoratoriumSelectDuration(String(selectDurationRaw))
      setMoratoriumDurationOf(String(loanData.moratoriumDurationOf ?? structure.moratoriumDurationOf ?? ""))
    }
    setMoratoriumType(String(loanData.moratoriumType ?? structure.moratoriumType ?? ""))
    const rwStored = loanData.repaymentWorkflow ?? structure.repaymentWorkflow
    const rwCanonical = rwStored ? canonicalRepaymentWorkflowFromApi(rwStored) : DEFAULT_REPAYMENT_WORKFLOWS[0]
    setRepaymentWorkflow(
      repaymentWorkflowOptions.length
        ? resolveOptionLabel(rwCanonical, repaymentWorkflowOptions) ||
            resolveOptionLabel(rwStored, repaymentWorkflowOptions) ||
            rwCanonical
        : rwCanonical,
    )
    const loanAmount = (structure.loanAmount ?? {}) as Record<string, unknown>
    setMinLoanAmount(
      formatAmountDisplayFromUnknown(loanData.minLoanAmount ?? structure.minLoanAmount ?? loanAmount.min ?? ""),
    )
    setMaxLoanAmount(
      formatAmountDisplayFromUnknown(loanData.maxLoanAmount ?? structure.maxLoanAmount ?? loanAmount.max ?? ""),
    )
    setRepaymentSchedule(String(loanData.repaymentSchedule ?? structure.repaymentSchedule ?? ""))
    const amortRaw =
      loanData.amortizationSchedule ??
      loanData.amortization ??
      structure.amortizationSchedule ??
      structure.amortization ??
      structure.amortizationType ??
      ""
    setAmortizationSchedule(String(amortRaw ?? ""))
    setRepaymentFrequency(String(loanData.repaymentFrequency ?? structure.repaymentFrequency ?? ""))
    setAcceptableNpa(
      String(loanData.acceptableNpa ?? structure.acceptableNPA ?? structure.acceptableNpa ?? ""),
    )
    setEquityRequirement(
      resolveOptionLabel(
        loanData.equityRequirement ?? structure.equityRequirement ?? "",
        equityRequirementOptions,
      ),
    )
    setEquityFixedAmount(
      formatAmountDisplayFromUnknown(loanData.equityFixedAmount ?? structure.equityFixedAmount ?? ""),
    )
    setEquityPercentage(String(loanData.equityPercentage ?? structure.equityPercentage ?? ""))

    const docsRaw = loanData.documentsToDownload ?? requirements.documentsToDownload
    setDocuments(
      Array.isArray(docsRaw)
        ? docsRaw
            .map((d: unknown) => {
              const r = d as Record<string, unknown>
              const name = String(r?.name ?? "").trim()
              const fileUrl =
                typeof r?.fileUrl === "string" && r.fileUrl.trim()
                  ? r.fileUrl.trim()
                  : typeof r?.url === "string" && r.url.trim()
                    ? r.url.trim()
                    : ""
              if (!name && !fileUrl) return null
              return { name: name || "Document", fileUrl: fileUrl || undefined } as DocumentRequirementUpload
            })
            .filter((x): x is DocumentRequirementUpload => !!x)
        : [],
    )

    const otherReqRaw = loanData.otherRequirements ?? requirements.otherRequirements
    setOtherRequirements(
      Array.isArray(otherReqRaw) ? otherReqRaw.map((row: unknown) => normalizeOtherRequirementRowFromApi(row)) : [],
    )
    const feesList = loanData.charges ?? fees.charges ?? fees.fees
    setCharges(
      Array.isArray(feesList)
        ? feesList.map((c: unknown) => {
            const r = c as Record<string, unknown>
            return {
              name: String(r?.name ?? "").trim(),
              feeType: String(r?.feeType ?? r?.type ?? "").trim(),
              value: String(r?.value ?? "").trim(),
            }
          })
        : [],
    )
    setChargePaymentMode(
      asBool(
        loanData.customerPaysChargesBeforeDisbursement ??
          fees.customerPaysChargesBeforeDisbursement ??
          loanData.customerPayChargesBeforeDisbursement,
      )
        ? "customer-pay"
        : "deduct",
    )
    const late = fees.lateRepayment as Record<string, unknown> | undefined
    setEnableLateRepaymentCharges(
      asBool(loanData.enableLateRepaymentCharges ?? late?.enabled ?? fees.enableLateRepaymentCharges),
    )
    const latePenList = Array.isArray(late?.penalties) ? (late.penalties as unknown[]) : []
    const rawPen = (loanData.penalties ?? fees.penalties ?? latePenList) as unknown[]
    setPenalties(
      Array.isArray(rawPen)
        ? rawPen.map((p) => {
            const r = p as Record<string, unknown>
            return {
              name: String(r?.name ?? ""),
              type: String(r?.type ?? r?.penaltyType ?? ""),
              value: String(r?.value ?? ""),
              triggerDuration: String(
                r?.triggerDuration ??
                  (r?.triggerDurationDays != null ? `${r.triggerDurationDays}` : ""),
              ),
            }
          })
        : [],
    )
  }, [isOpen, loanData])

  useEffect(() => {
    if (!isOpen || !loanData) return
    const requirements = pickRequirementsFromLoan(loanData as Record<string, unknown>) as Record<string, any>
    const sec = requirements.security
    const opts = mergeSecurityRequirementDisplayOptions(securityOptions)
    setSecurityOtherSpecification("")

    if (sec && typeof sec === "object") {
      const picked: string[] = []
      const secRec = sec as Record<string, unknown>
      if (asBool(sec.guarantor)) {
        const m = opts.find((o) => /guarantor/i.test(o))
        if (m) picked.push(m)
        else if (!opts.length) picked.push("Guarantor")
      }
      if (asBool(sec.savingsAccount)) {
        const m = opts.find((o) => /savings/i.test(o) && /account/i.test(o))
        if (m) picked.push(m)
        else if (!opts.length) picked.push("Savings Account")
      }
      if (asBool(sec.noSecurity)) {
        const m = opts.find((o) => /no security|no collateral|none/i.test(o))
        if (m) picked.push(m)
      }
      if (asBool(secRec.cheque)) {
        const m = opts.find((o) => /^cheque$/i.test(o.trim()))
        if (m) picked.push(m)
        else picked.push("Cheque")
      }
      if (asBool(secRec.bankGuarantee)) {
        const m = opts.find((o) => /bank/i.test(o) && /guarantee/i.test(o))
        if (m) picked.push(m)
        else picked.push("Bank Guarantee")
      }
      const otherSpecRaw = secRec.otherSpecification ?? secRec.otherSecurityDescription
      const otherText = typeof otherSpecRaw === "string" ? otherSpecRaw.trim() : ""
      if (asBool(secRec.other) || otherText) {
        const m = opts.find((o) => /^other$/i.test(o.trim()))
        picked.push(m ?? OTHER_SECURITY_CANONICAL_LABEL)
        if (otherText) setSecurityOtherSpecification(otherText)
      }
      setSelectedSecurities(picked)
      return
    }

    const rawArr = Array.isArray(loanData.securityRequirements ?? requirements.securityRequirements)
      ? (loanData.securityRequirements ?? requirements.securityRequirements).map((x: unknown) => String(x))
      : []
    const { toggles, otherSpecification } = splitStoredSecurityRequirements(rawArr)
    setSelectedSecurities(toggles)
    setSecurityOtherSpecification(otherSpecification)
  }, [isOpen, loanData, securityOptions])

  // When options arrive after hydration, remap enum-like stored values to displayed labels.
  useEffect(() => {
    if (!isOpen || !loanData) return
    const structure = pickStructureFromLoan(loanData as Record<string, unknown>)
    const eqRaw = loanData.equityRequirement ?? structure.equityRequirement ?? ""
    if (eqRaw) {
      setEquityRequirement((prev) => {
        const next = resolveOptionLabel(eqRaw, equityRequirementOptions)
        return next || prev
      })
    }
    const morRaw =
      loanData.moratoriumSelectDuration ??
      structure.moratoriumSelectDuration ??
      loanData.moratorium ??
      structure.moratorium
    const resolvedMor = resolveOptionLabel(extractMoratoriumPrefill(morRaw), moratoriumDurationOptions)
    if (resolvedMor) {
      setMoratoriumSelectDuration((prev) => (prev ? resolveOptionLabel(prev, moratoriumDurationOptions) : resolvedMor))
    }

    const imRaw = loanData.interestMethod ?? structure.interestMethod
    if (imRaw && interestMethodOptions.length) {
      setInterestMethod((prev) => resolveOptionLabel(imRaw, interestMethodOptions) || prev)
    }
    const morTypeRaw = loanData.moratoriumType ?? structure.moratoriumType
    if (morTypeRaw && moratoriumTypeOptions.length) {
      setMoratoriumType((prev) => resolveOptionLabel(morTypeRaw, moratoriumTypeOptions) || prev)
    }
    const rwRaw = loanData.repaymentWorkflow ?? structure.repaymentWorkflow
    if (rwRaw && repaymentWorkflowOptions.length) {
      const canonical = canonicalRepaymentWorkflowFromApi(rwRaw)
      setRepaymentWorkflow((prev) =>
        resolveOptionLabel(canonical, repaymentWorkflowOptions) ||
          resolveOptionLabel(rwRaw, repaymentWorkflowOptions) ||
          canonical ||
          prev,
      )
    }
    const rsRaw = loanData.repaymentSchedule ?? structure.repaymentSchedule
    if (rsRaw && repaymentScheduleOptions.length) {
      setRepaymentSchedule((prev) => resolveOptionLabel(rsRaw, repaymentScheduleOptions) || prev)
    }
    const amRaw =
      loanData.amortizationSchedule ??
      loanData.amortization ??
      structure.amortizationSchedule ??
      structure.amortization ??
      structure.amortizationType
    if (amRaw && amortizationScheduleOptions.length) {
      setAmortizationSchedule((prev) => resolveOptionLabel(amRaw, amortizationScheduleOptions) || prev)
    }
    const rfRaw = loanData.repaymentFrequency ?? structure.repaymentFrequency
    if (rfRaw && repaymentFrequencyOptions.length) {
      setRepaymentFrequency((prev) => resolveOptionLabel(rfRaw, repaymentFrequencyOptions) || prev)
    }
    const npaRaw = loanData.acceptableNpa ?? structure.acceptableNPA ?? structure.acceptableNpa
    if (npaRaw && acceptableNpaOptions.length) {
      setAcceptableNpa((prev) => resolveOptionLabel(npaRaw, acceptableNpaOptions) || prev)
    }
  }, [
    isOpen,
    loanData,
    equityRequirementOptions,
    moratoriumDurationOptions,
    interestMethodOptions,
    moratoriumTypeOptions,
    repaymentWorkflowOptions,
    repaymentScheduleOptions,
    amortizationScheduleOptions,
    repaymentFrequencyOptions,
    acceptableNpaOptions,
  ])

  const addLoanType = () => {
    if (!loanTypeName.trim() || !loanTypeDescription.trim()) return
    setLoanTypes((prev) => [...prev, { name: loanTypeName.trim(), description: loanTypeDescription.trim() }])
    setLoanTypeName("")
    setLoanTypeDescription("")
  }

  const removeLoanType = (index: number) => {
    setLoanTypes((prev) => prev.filter((_, i) => i !== index))
  }

  const toggleSecurity = (option: string, checked: boolean) => {
    if (!checked && option.trim().toLowerCase() === OTHER_SECURITY_CANONICAL_LABEL.toLowerCase()) {
      setSecurityOtherSpecification("")
    }
    setSelectedSecurities((prev) => {
      if (checked) return prev.includes(option) ? prev : [...prev, option]
      return prev.filter((item) => item !== option)
    })
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

  const addCharge = () => {
    if (!chargeName.trim() || !chargeFeeType || !chargeValue.trim()) return
    setCharges((prev) => [...prev, { name: chargeName.trim(), feeType: chargeFeeType, value: chargeValue.trim() }])
    setChargeName("")
    setChargeFeeType("")
    setChargeValue("")
  }

  const addPenalty = () => {
    if (!penaltyName.trim() || !penaltyType || !penaltyValue.trim() || !penaltyTriggerDuration.trim()) return
    setPenalties((prev) => [
      ...prev,
      {
        name: penaltyName.trim(),
        type: penaltyType,
        value: penaltyValue.trim(),
        triggerDuration: penaltyTriggerDuration.trim(),
      },
    ])
    setPenaltyName("")
    setPenaltyType("")
    setPenaltyValue("")
    setPenaltyTriggerDuration("")
  }

  const removeCharge = (index: number) => {
    setCharges((prev) => prev.filter((_, i) => i !== index))
  }

  const removePenalty = (index: number) => {
    setPenalties((prev) => prev.filter((_, i) => i !== index))
  }

  const handleDocumentUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const fileError = getPdfFileValidationError(file)
    if (fileError) {
      toast.error(fileError)
      event.target.value = ""
      return
    }
    const name = documentName.trim().length ? documentName.trim() : file.name
    setDocuments((prev) => [...prev, { file, name }])
    event.target.value = ""
  }

  const handleBack = () => {
    if (isSubmitting) return
    if (step > 1) setStep((prev) => prev - 1)
  }

  const loanValidationBase = () => ({
    name,
    tenure,
    description,
    loanTypes,
    previewImage,
    hasPreviewAsset: !!(
      existingPreviewAssetUrl ||
      (loanData?.about as Record<string, unknown> | undefined)?.previewAssetUrl ||
      loanData?.previewAssetUrl ||
      loanData?.previewImage?.url
    ),
    structure: {
      interestRate,
      interestMethod,
      repaymentWorkflow,
      minAmount: minLoanAmount,
      maxAmount: maxLoanAmount,
      repaymentSchedule,
      amortizationSchedule,
      repaymentFrequency,
      acceptableNpa,
      equityRequirement,
      equityRequirementMode,
      equityFixedAmount,
      equityPercentage,
    },
    selectedSecurities,
    securityOtherSpecification,
    documents,
    otherRequirements,
    charges,
    enableLateRepaymentCharges,
    penalties,
  })

  const handleNext = async () => {
    if (step < STEPS.length) {
      const { ok, errors } = validateLoanStep({ step, ...loanValidationBase() })
      if (!ok) {
        setStepErrors(errors)
        return
      }
      setStepErrors([])
      setStep((prev) => prev + 1)
      return
    }

    const finalCheck = validateAllLoanSteps(loanValidationBase())
    if (!finalCheck.ok) {
      setStepErrors(finalCheck.errors)
      return
    }
    setStepErrors([])

    setIsSubmitting(true)
    try {
      const documentsPayload = await Promise.all(
        documents.map(async (doc) => ({
          name: doc.name,
          fileUrl: doc.file
            ? await uploadProductDocumentTemplateToUrl(doc.file)
            : String(doc.fileUrl ?? "").trim(),
        })),
      )

      let previewAssetUrlSubmit = existingPreviewAssetUrl.trim() || undefined
      if (previewImage) {
        previewAssetUrlSubmit = await uploadProductMediaToUrl(previewImage)
      }

      const otherRequirementsPayload = await serializeOtherRequirementsForSubmit(otherRequirements)

      const loanPayload = { ...(loanData || {}) }
      delete loanPayload.moratoriumDuration
      delete loanPayload.moratoriumDays

      await Promise.resolve(
        onSubmit({
          ...loanPayload,
          name,
          tenure,
          description,
          loanTypes,
          previewImage: null,
          previewAssetUrl: previewAssetUrlSubmit,
          interestRate,
          interestMethod,
          allowMoratorium,
          moratoriumSelectDuration: allowMoratorium ? moratoriumSelectDuration : "",
          moratoriumDurationOf: allowMoratorium ? moratoriumDurationOf : "",
          moratoriumType: allowMoratorium ? moratoriumType : "",
          repaymentWorkflow,
          minLoanAmount,
          maxLoanAmount,
          repaymentSchedule,
          amortizationSchedule,
          repaymentFrequency,
          acceptableNpa,
          acceptableNPA: acceptableNpa,
          equityRequirement,
          equityFixedAmount: equityRequirementMode === "fixed" ? equityFixedAmount.trim() : "",
          equityPercentage: equityRequirementMode === "percentage" ? equityPercentage.trim() : "",
          securityRequirements: serializeSecurityRequirements(selectedSecurities, securityOtherSpecification),
          documentRequirements: documentsPayload,
          otherRequirements: otherRequirementsPayload,
          charges,
          chargePaymentMode,
          deductAllChargesOnLoan: chargePaymentMode === "deduct",
          customerPaysChargesBeforeDisbursement: chargePaymentMode === "customer-pay",
          customerPayChargesBeforeDisbursement: chargePaymentMode === "customer-pay",
          enableLateRepaymentCharges,
          penalties,
        }),
      )
      toast.success("Loan product configuration saved successfully.")
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
      title="Configure Loan Product"
      subtitle="Select the loan option you want to create with us"
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
          idPrefix="loan"
          nameLabel="Name of Product"
          name={name}
          onNameChange={setName}
          durationLabel="Tenure"
          durationPlaceholder="Select Tenure"
          durationValue={tenure}
          durationOptions={tenureOptions}
          onDurationChange={setTenure}
          description={description}
          onDescriptionChange={setDescription}
          typeSectionLabel="Loan Type"
          typeSectionRequirement="optional"
          typeSectionHelperText="Product type is already captured when you created this loan. Add types here only if you need extra variants."
          typeNameDraft={loanTypeName}
          typeDescDraft={loanTypeDescription}
          onTypeNameDraftChange={setLoanTypeName}
          onTypeDescDraftChange={setLoanTypeDescription}
          onAddType={addLoanType}
          onRemoveTypeRow={removeLoanType}
          typeRows={loanTypes}
          previewFile={previewImage}
          previewLabel={String(
            previewImage?.name ??
              ((existingPreviewAssetUrl ? previewLabelFromAssetUrl(existingPreviewAssetUrl) : "") ||
                loanData?.previewImage?.fileName ||
                loanData?.previewImageName ||
                ""),
          )}
          previewImageUrl={
            previewImage
              ? ""
              : String(
                  existingPreviewAssetUrl ||
                    (loanData ? pickAboutFromLoan(loanData as Record<string, unknown>).previewAssetUrl : "") ||
                    loanData?.previewImage?.url ||
                    loanData?.previewImageUrl ||
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
              placeholder="Select Section"
              value={interestMethod}
              options={interestMethodOptions}
              onChange={setInterestMethod}
              requirement="required"
            />
          </div>

          <div className="space-y-3">
            <ProductConfigToggle
              id="allow-moratorium"
              label="Allow Moratorium for this instrument"
              checked={allowMoratorium}
              onChange={setAllowMoratorium}
              requirement="optional"
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <ProductConfigSelect
                label="Select Duration"
                placeholder="Select Section"
                value={moratoriumSelectDuration}
                options={moratoriumDurationOptions}
                onChange={setMoratoriumSelectDuration}
                requirement="optional"
              />
              {allowMoratorium ? (
                <>
                <ProductConfigSelect
                  label="Duration of Moratorium"
                  placeholder="Select Section"
                  value={moratoriumDurationOf}
                  options={moratoriumDurationOptions}
                  onChange={setMoratoriumDurationOf}
                  requirement="optional"
                />
                <ProductConfigSelect
                  label="Type of Moratorium"
                  placeholder="Select type"
                  value={moratoriumType}
                  options={moratoriumTypeOptions}
                  onChange={setMoratoriumType}
                  requirement="optional"
                />
                </>
              ) : null}
            </div>
          </div>

          <ProductConfigRepaymentWorkflowPanel
            workflows={repaymentWorkflowOptions}
            selectedWorkflow={repaymentWorkflow}
            onSelectWorkflow={setRepaymentWorkflow}
            minAmount={minLoanAmount}
            maxAmount={maxLoanAmount}
            onMinAmountChange={setMinLoanAmount}
            onMaxAmountChange={setMaxLoanAmount}
            amountLabel="Loan Amount"
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ProductConfigSelect
              label="Repayment Structure"
              placeholder="Select Section"
              value={repaymentSchedule}
              options={repaymentScheduleOptions}
              onChange={setRepaymentSchedule}
              requirement="required"
            />
            <ProductConfigSelect
              label="Amortization Schedule"
              placeholder="Select Section"
              value={amortizationSchedule}
              options={amortizationScheduleOptions}
              onChange={setAmortizationSchedule}
              requirement="required"
            />
            <ProductConfigSelect
              label="Repayment Frequency"
              placeholder="Select Section"
              value={repaymentFrequency}
              options={repaymentFrequencyOptions}
              onChange={setRepaymentFrequency}
              requirement="required"
            />
            <ProductConfigSelect
              label="Acceptable NPA"
              placeholder="Select Section"
              value={acceptableNpa}
              options={acceptableNpaOptions}
              onChange={setAcceptableNpa}
              requirement="required"
            />
            <ProductConfigSelect
              label="Equity Requirement"
              placeholder="Select Section"
              value={equityRequirement}
              options={equityRequirementOptions}
              onChange={handleEquityRequirementChange}
              requirement="required"
            />
            {equityRequirementMode === "fixed" ? (
              <ProductConfigInput
                label="Equity amount"
                placeholder="e.g. 500000"
                value={equityFixedAmount}
                onChange={handleEquityFixedAmountChange}
                numericOnly
                formatThousands
                requirement="required"
              />
            ) : null}
            {equityRequirementMode === "percentage" ? (
              <ProductConfigInput
                label="Equity (%)"
                placeholder="e.g. 10%"
                value={equityPercentage}
                onChange={handleEquityPercentageChange}
                requirement="required"
              />
            ) : null}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Security Requirements <span className="font-normal text-gray-500">(Required)</span>
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {mergedSecurityOptions.map((option) => (
                <ProductConfigToggle
                  key={option}
                  id={`security-${option}`}
                  label={option}
                  checked={selectedSecurities.includes(option)}
                  onChange={(checked) => toggleSecurity(option, checked)}
                />
              ))}
            </div>
            {isOtherSecuritySelected(selectedSecurities) ? (
              <ProductConfigInput
                label="Specify other security"
                placeholder="Describe what “Other” means for this product"
                value={securityOtherSpecification}
                onChange={setSecurityOtherSpecification}
                requirement="required"
              />
            ) : null}
          </div>

          <ProductConfigDocumentRequirementsPanel
            documentName={documentName}
            onDocumentNameChange={setDocumentName}
            documents={documents}
            onDocumentsChange={setDocuments}
            uploadInputRef={documentsInputRef}
            onUpload={handleDocumentUpload}
            helperText="Requires customer to fill the form"
          />

          <ProductConfigOtherRequirementsPanel
            otherRequirementOptions={otherRequirementOptions}
            contentTypeOptions={contentTypeOptions}
            otherRequirementType={otherRequirementType}
            otherRequirementContentType={otherRequirementContentType}
            otherRequirementDescription={otherRequirementDescription}
            otherRequirementFile={otherRequirementFile}
            otherRequirements={otherRequirements}
            uploadInputRef={otherRequirementUploadRef}
            filePickerId="loan-other-requirement-file"
            onTypeChange={handleOtherRequirementTypeChange}
            onContentTypeChange={handleOtherRequirementContentTypeChange}
            onDescriptionChange={setOtherRequirementDescription}
            onFileChange={setOtherRequirementFile}
            onAdd={addOtherRequirement}
            onRemoveItem={removeOtherRequirement}
          />
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
            <ProductConfigInput
              label="Name of Charges or Fee"
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
                    <button
                      type="button"
                      onClick={() => removeCharge(index)}
                      className="text-red-600 hover:text-red-700"
                      aria-label={`Remove ${charge.name}`}
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ProductConfigToggle
              id="deduct-on-loan"
              label="Deduct all Charges on the loan"
              checked={chargePaymentMode === "deduct"}
              onChange={(checked) => checked && setChargePaymentMode("deduct")}
            />
            <ProductConfigToggle
              id="customer-pay"
              label="Customer Pay for all Charges before disbursement"
              checked={chargePaymentMode === "customer-pay"}
              onChange={(checked) => checked && setChargePaymentMode("customer-pay")}
            />
          </div>

          <ProductConfigToggle
            id="late-repayment"
            label="Charges for Late Repayment"
            checked={enableLateRepaymentCharges}
            onChange={setEnableLateRepaymentCharges}
            requirement="required"
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]">
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
            <ProductConfigInput
              label="Trigger Duration"
              placeholder="Select Section"
              value={penaltyTriggerDuration}
              onChange={setPenaltyTriggerDuration}
              numericOnly
              requirement="required"
              requirementMark="asterisk"
            />
            <Button type="button" onClick={addPenalty} className="h-10 self-end bg-[#9A813F] text-white hover:bg-[#8A7335]">
              Add
            </Button>
          </div>

          {penalties.length > 0 && (
            <div className="rounded-md border border-dashed border-[#cdbf8b] p-3">
              <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 border-b border-gray-100 pb-2 text-xs font-semibold text-gray-500">
                <span>Name</span>
                <span>Type</span>
                <span>Value</span>
                <span>Trigger Duration</span>
                <span className="text-right" />
              </div>
              {penalties.map((penalty, index) => (
                <div
                  key={`${penalty.name}-${index}`}
                  className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 border-b border-gray-100 py-2 text-sm last:border-0"
                >
                  <span className="pr-2">{penalty.name}</span>
                  <span>{penalty.type}</span>
                  <span>{penalty.value}</span>
                  <span>{penalty.triggerDuration}</span>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => removePenalty(index)}
                      className="text-red-600 hover:text-red-700"
                      aria-label={`Remove ${penalty.name}`}
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
