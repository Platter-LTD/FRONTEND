/**
 * Step validation for product configure drawers (merchant spec: required vs optional by section).
 * Returns human-readable messages for UI.
 */

import { isOtherSecuritySelected } from "@/lib/securityRequirementOptions"

const t = (s: string) => s.trim()
const has = (s: string) => t(s).length > 0
const parseNum = (s: string) => {
  const n = parseFloat(String(s).replace(/,/g, "").trim())
  return Number.isFinite(n) ? n : NaN
}

export type EquityMode = "zero" | "fixed" | "percentage" | "none"

export type LoanLikeStructureInput = {
  interestRate: string
  interestMethod: string
  repaymentWorkflow: string
  minAmount: string
  maxAmount: string
  repaymentSchedule: string
  amortizationSchedule: string
  repaymentFrequency: string
  acceptableNpa: string
  equityRequirement: string
  equityRequirementMode: EquityMode
  equityFixedAmount: string
  equityPercentage: string
}

function pushLoanLikeStructureErrors(prefix: string, s: LoanLikeStructureInput, errors: string[]) {
  if (!has(s.interestRate)) errors.push(`${prefix}Interest Rate is required.`)
  if (!has(s.interestMethod)) errors.push(`${prefix}Interest Method is required.`)
  if (!has(s.repaymentWorkflow)) errors.push(`${prefix}Repayment Workflow is required.`)
  if (!has(s.minAmount)) errors.push(`${prefix}Minimum loan amount is required.`)
  if (!has(s.maxAmount)) errors.push(`${prefix}Maximum loan amount is required.`)
  const minN = parseNum(s.minAmount)
  const maxN = parseNum(s.maxAmount)
  if (has(s.minAmount) && has(s.maxAmount) && Number.isFinite(minN) && Number.isFinite(maxN) && maxN < minN) {
    errors.push(`${prefix}Maximum loan amount must be greater than or equal to the minimum.`)
  }
  if (!has(s.repaymentSchedule)) errors.push(`${prefix}Repayment Structure is required.`)
  if (!has(s.amortizationSchedule)) errors.push(`${prefix}Amortization Schedule is required.`)
  if (!has(s.repaymentFrequency)) errors.push(`${prefix}Repayment Frequency is required.`)
  if (!has(s.acceptableNpa)) errors.push(`${prefix}Acceptable NPA is required.`)
  if (!has(s.equityRequirement)) errors.push(`${prefix}Equity Requirement is required.`)
  if (s.equityRequirementMode === "fixed" && !has(s.equityFixedAmount)) {
    errors.push(`${prefix}Equity amount is required for the selected equity requirement.`)
  }
  if (s.equityRequirementMode === "percentage" && !has(s.equityPercentage)) {
    errors.push(`${prefix}Equity percentage is required for the selected equity requirement.`)
  }
}

export type LoanStepCtx = {
  step: number
  name: string
  tenure: string
  description: string
  loanTypes: { name: string; description: string }[]
  previewImage: File | null
  hasPreviewAsset?: boolean
  structure: LoanLikeStructureInput
  selectedSecurities: string[]
  /** Free text when “Other” security is selected; required in that case. */
  securityOtherSpecification: string
  documents: unknown[]
  charges: { name?: string; feeType?: string; value?: string }[]
  enableLateRepaymentCharges: boolean
  penalties: { name?: string; type?: string; value?: string; triggerDurationDays?: number; triggerDuration?: string }[]
  contractId: string
  airSignSecretKey: string
  airSignUid: string
}

export function validateLoanStep(ctx: LoanStepCtx): { ok: boolean; errors: string[] } {
  const errors: string[] = []
  const { step } = ctx

  if (step === 1) {
    if (!has(ctx.name)) errors.push("About Product: Product name is required.")
    if (!has(ctx.tenure)) errors.push("About Product: Tenure is required.")
    if (!has(ctx.description)) errors.push("About Product: Product description is required.")
    // Loan type rows are optional — product type is captured at product creation.
    if (!ctx.previewImage && !ctx.hasPreviewAsset) errors.push("About Product: Preview file upload is required.")
  }

  if (step === 2) {
    pushLoanLikeStructureErrors("Structure: ", ctx.structure, errors)
    // Moratorium block is optional per spec — no validation for moratorium fields.
  }

  if (step === 3) {
    if (!ctx.selectedSecurities.length) errors.push("Requirements: Select at least one security requirement.")
    if (isOtherSecuritySelected(ctx.selectedSecurities) && !has(ctx.securityOtherSpecification)) {
      errors.push('Requirements: Describe the “Other” security requirement (text field below).')
    }
    // Document requirements are optional — customers may satisfy docs via Other Requirements instead.
    if (!has(ctx.contractId)) errors.push("Requirements: Contract ID is required.")
    if (!has(ctx.airSignSecretKey)) errors.push("Requirements: AirSign Secret Key is required.")
    if (!has(ctx.airSignUid)) errors.push("Requirements: AirSign UID is required.")
  }

  if (step === 4) {
    if (!ctx.charges.length) errors.push("Fees & Charges: Add at least one fee (name, type, and value).")
    if (ctx.enableLateRepaymentCharges && !ctx.penalties.length) {
      errors.push("Fees & Charges: Add at least one late repayment penalty, or turn off “Charges for Late Repayment”.")
    }
  }

  return { ok: errors.length === 0, errors }
}

export function validateAllLoanSteps(base: Omit<LoanStepCtx, "step">): { ok: boolean; errors: string[] } {
  const all: string[] = []
  for (let s = 1; s <= 4; s += 1) {
    all.push(...validateLoanStep({ ...base, step: s }).errors)
  }
  return { ok: all.length === 0, errors: all }
}

export type MortgageStepCtx = {
  step: number
  name: string
  tenure: string
  description: string
  mortgageTypeSelected: string
  previewImage: File | null
  structure: LoanLikeStructureInput
  selectedSecurities: string[]
  securityOtherSpecification: string
  documents: unknown[]
  charges: { name?: string; feeType?: string; value?: string }[]
  enableLateRepaymentCharges: boolean
  penalties: { name?: string; type?: string; value?: string; triggerDurationDays?: number; triggerDuration?: string }[]
  contractId: string
  airSignSecretKey: string
  airSignUid: string
  properties: {
    name: string
    type: string
    value: string
    location: string
    description: string
    facilities: string[]
    previewFiles: unknown[]
    videoUrl: string
  }[]
  inspectionDates: {
    scheduledFor: string
    label?: string
    location?: string
    notes?: string
  }[]
}

export function validateMortgageStep(ctx: MortgageStepCtx): { ok: boolean; errors: string[] } {
  const errors: string[] = []
  const { step } = ctx

  if (step === 1) {
    if (!has(ctx.name)) errors.push("About Product: Product name is required.")
    if (!has(ctx.tenure)) errors.push("About Product: Tenure is required.")
    if (!has(ctx.description)) errors.push("About Product: Product description is required.")
    // Mortgage type is optional — product type is captured at product creation.
    if (!ctx.previewImage) errors.push("About Product: Preview file upload is required.")
  }

  if (step === 2) {
    pushLoanLikeStructureErrors("Structure: ", ctx.structure, errors)
  }

  if (step === 3) {
    if (!ctx.selectedSecurities.length) errors.push("Requirements: Select at least one security requirement.")
    if (isOtherSecuritySelected(ctx.selectedSecurities) && !has(ctx.securityOtherSpecification)) {
      errors.push('Requirements: Describe the “Other” security requirement (text field below).')
    }
    // Document requirements are optional.
    if (!has(ctx.contractId)) errors.push("Requirements: Contract ID is required.")
    if (!has(ctx.airSignSecretKey)) errors.push("Requirements: AirSign Secret Key is required.")
    if (!has(ctx.airSignUid)) errors.push("Requirements: AirSign UID is required.")
  }

  if (step === 4) {
    if (!ctx.charges.length) errors.push("Fees & Charges: Add at least one fee (name, type, and value).")
    // Name of Penalty optional per spec — do not require penalty rows when late repayment is on.
  }

  if (step === 5) {
    if (!ctx.properties.length) errors.push("Properties: Add at least one property.")
    ctx.properties.forEach((p, i) => {
      const n = i + 1
      if (!has(p.name)) errors.push(`Properties: Property #${n} — Name is required.`)
      if (!has(p.type)) errors.push(`Properties: Property #${n} — Property type is required.`)
      if (!has(p.value)) errors.push(`Properties: Property #${n} — Value is required.`)
      if (!has(p.location)) errors.push(`Properties: Property #${n} — Location is required.`)
      if (!has(p.description)) errors.push(`Properties: Property #${n} — Description is required.`)
      if (!Array.isArray(p.facilities) || p.facilities.length === 0) {
        errors.push(`Properties: Property #${n} — Select at least one facility.`)
      }
      if (!p.previewFiles?.length) errors.push(`Properties: Property #${n} — At least one property image is required.`)
      if (!has(p.videoUrl)) errors.push(`Properties: Property #${n} — Property video URL is required.`)
    })
  }

  if (step === 6) {
    if (!ctx.inspectionDates.length) {
      errors.push("Inspection Dates: Add at least one bookable inspection slot for borrowers.")
    }
    ctx.inspectionDates.forEach((slot, i) => {
      const n = i + 1
      if (!has(slot.scheduledFor)) {
        errors.push(`Inspection Dates: Slot #${n} — Date & time is required.`)
        return
      }
      const when = new Date(slot.scheduledFor)
      if (Number.isNaN(when.getTime())) {
        errors.push(`Inspection Dates: Slot #${n} — Invalid date & time.`)
      }
      if (slot.label && slot.label.length > 200) {
        errors.push(`Inspection Dates: Slot #${n} — Label must be 200 characters or fewer.`)
      }
      if (slot.location && slot.location.length > 300) {
        errors.push(`Inspection Dates: Slot #${n} — Location must be 300 characters or fewer.`)
      }
      if (slot.notes && slot.notes.length > 500) {
        errors.push(`Inspection Dates: Slot #${n} — Notes must be 500 characters or fewer.`)
      }
    })
  }

  return { ok: errors.length === 0, errors }
}

export function validateAllMortgageSteps(base: Omit<MortgageStepCtx, "step">): { ok: boolean; errors: string[] } {
  const all: string[] = []
  for (let s = 1; s <= 6; s += 1) {
    all.push(...validateMortgageStep({ ...base, step: s }).errors)
  }
  return { ok: all.length === 0, errors: all }
}

export type SavingsStepCtx = {
  step: number
  name: string
  duration: string
  description: string
  savingsTypes: { name: string; description: string }[]
  previewImage: File | null
  interestRate: string
  interestMethod: string
  savingsType: string
  withdrawalFlexibility: string
  minSavingsAmount: string
  maxSavingsAmount: string
  termsAndConditions: string
  contractId: string
  airSignSecretKey: string
  airSignUid: string
  charges: { name?: string; feeType?: string; value?: string }[]
  chargeForcefulWithdrawal: boolean
  withdrawalPenalties: unknown[]
}

export function validateSavingsStep(ctx: SavingsStepCtx): { ok: boolean; errors: string[] } {
  const errors: string[] = []
  if (ctx.step === 1) {
    if (!has(ctx.name)) errors.push("About Product: Product name is required.")
    if (!has(ctx.duration)) errors.push("About Product: Duration is required.")
    if (!has(ctx.description)) errors.push("About Product: Product description is required.")
    // Savings type rows are optional — product type is captured at product creation.
    if (!ctx.previewImage) errors.push("About Product: Preview file upload is required.")
  }
  if (ctx.step === 2) {
    if (!has(ctx.interestRate)) errors.push("Structure: Interest rate is required.")
    if (!has(ctx.interestMethod)) errors.push("Structure: Yield method is required.")
    if (!has(ctx.savingsType)) errors.push("Structure: Savings type is required.")
    if (!has(ctx.withdrawalFlexibility)) errors.push("Structure: Withdrawal flexibility is required.")
    if (!has(ctx.minSavingsAmount)) errors.push("Structure: Minimum savings amount is required.")
    if (!has(ctx.maxSavingsAmount)) errors.push("Structure: Maximum savings amount is required.")
    const minN = parseNum(ctx.minSavingsAmount)
    const maxN = parseNum(ctx.maxSavingsAmount)
    if (has(ctx.minSavingsAmount) && has(ctx.maxSavingsAmount) && Number.isFinite(minN) && Number.isFinite(maxN) && maxN < minN) {
      errors.push("Structure: Maximum savings amount must be greater than or equal to the minimum.")
    }
    if (!has(ctx.termsAndConditions)) errors.push("Structure: Terms and conditions are required.")
    if (!has(ctx.contractId)) errors.push("Structure: Contract ID is required.")
    if (!has(ctx.airSignSecretKey)) errors.push("Structure: AirSign Secret Key is required.")
    if (!has(ctx.airSignUid)) errors.push("Structure: AirSign UID is required.")
  }
  if (ctx.step === 3) {
    if (!ctx.charges.length) errors.push("Fees & Charges: Add at least one fee (name, type, and value).")
    if (ctx.chargeForcefulWithdrawal && !ctx.withdrawalPenalties.length) {
      errors.push(
        "Fees & Charges: Add at least one forceful-withdrawal penalty, or turn off “Charge for Forceful Withdrawal”.",
      )
    }
  }
  return { ok: errors.length === 0, errors }
}

export function validateAllSavingsSteps(base: Omit<SavingsStepCtx, "step">): { ok: boolean; errors: string[] } {
  const all: string[] = []
  for (let s = 1; s <= 3; s += 1) {
    all.push(...validateSavingsStep({ ...base, step: s }).errors)
  }
  return { ok: all.length === 0, errors: all }
}

export type InvestmentStepCtx = {
  step: number
  name: string
  duration: string
  description: string
  investmentTypes: { name: string; description: string }[]
  previewImage: File | null
  roi: string
  interestMethod: string
  investmentType: string
  withdrawalFlexibility: string
  minAmount: string
  maxAmount: string
  termsAndConditions: string
  enableUnitInvestment: boolean
  unitAmount: string
  minQuantity: string
  charges: { name?: string; feeType?: string; value?: string }[]
  chargeForcefulWithdrawal: boolean
  withdrawalPenalties: unknown[]
  contractId: string
  airSignSecretKey: string
  airSignUid: string
}

export function validateInvestmentStep(ctx: InvestmentStepCtx): { ok: boolean; errors: string[] } {
  const errors: string[] = []
  if (ctx.step === 1) {
    if (!has(ctx.name)) errors.push("About Product: Investment name is required.")
    if (!has(ctx.duration)) errors.push("About Product: Duration is required.")
    if (!has(ctx.description)) errors.push("About Product: Description is required.")
    // Investment type rows are optional — product type is captured at product creation.
    if (!ctx.previewImage) errors.push("About Product: Preview file upload is required.")
  }
  if (ctx.step === 2) {
    if (!has(ctx.roi)) errors.push("Structure: Returns on Investment (ROI) is required.")
    if (!has(ctx.interestMethod)) errors.push("Structure: Yield method is required.")
    if (!has(ctx.investmentType)) errors.push("Structure: Investment type is required.")
    if (!has(ctx.withdrawalFlexibility)) errors.push("Structure: Withdrawal flexibility is required.")
    if (!has(ctx.minAmount)) errors.push("Structure: Minimum investment amount is required.")
    if (!has(ctx.maxAmount)) errors.push("Structure: Maximum investment amount is required.")
    const minN = parseNum(ctx.minAmount)
    const maxN = parseNum(ctx.maxAmount)
    if (has(ctx.minAmount) && has(ctx.maxAmount) && Number.isFinite(minN) && Number.isFinite(maxN) && maxN < minN) {
      errors.push("Structure: Maximum amount must be greater than or equal to the minimum.")
    }
    if (!has(ctx.termsAndConditions)) errors.push("Structure: Terms and conditions are required.")
    if (ctx.enableUnitInvestment) {
      if (!has(ctx.minQuantity)) errors.push("Unit: Minimum quantity is required when unit investment is enabled.")
    }
  }
  if (ctx.step === 3) {
    if (!ctx.charges.length) errors.push("Fees & Charges: Add at least one fee (name, type, and value).")
    if (!has(ctx.contractId)) errors.push("Fees & Charges: Contract ID is required.")
    if (!has(ctx.airSignSecretKey)) errors.push("Fees & Charges: AirSign Secret Key is required.")
    if (!has(ctx.airSignUid)) errors.push("Fees & Charges: AirSign UID is required.")
    // Charge for Forceful Withdrawal — penalties optional per spec
  }
  return { ok: errors.length === 0, errors }
}

export function validateAllInvestmentSteps(base: Omit<InvestmentStepCtx, "step">): { ok: boolean; errors: string[] } {
  const all: string[] = []
  for (let s = 1; s <= 3; s += 1) {
    all.push(...validateInvestmentStep({ ...base, step: s }).errors)
  }
  return { ok: all.length === 0, errors: all }
}

export type CommodityStepCtx = {
  step: number
  isInvestment: boolean
  name: string
  duration: string
  description: string
  typeRows: { name: string; description: string }[]
  previewImage: File | null
  hasPreviewAsset?: boolean
  yieldMethod: string
  offerYieldOn: boolean
  offerYieldValue: string
  withdrawalFlexibility: string
  minInvestmentAmount: string
  enableUnitInvestmentPurchase?: boolean
  unitAmount: string
  minQuantityPurchase: string
  maxAmount: string
  termsAndConditions: string
  moratoriumEnabled: boolean
  moratoriumDays: string
  contractId: string
  airSignSecretKey: string
  airSignUid: string
  charges: { name?: string; feeType?: string; value?: string }[]
  priceRows: { price: string; date: string; source: string }[]
}

export function validateCommodityStep(ctx: CommodityStepCtx): { ok: boolean; errors: string[] } {
  const errors: string[] = []
  const aboutLabel = ctx.isInvestment ? "About Product" : "About Product"

  if (ctx.step === 1) {
    if (!has(ctx.name)) errors.push(`${aboutLabel}: Product name is required.`)
    if (!has(ctx.duration)) errors.push(`${aboutLabel}: Duration is required.`)
    if (!has(ctx.description)) errors.push(`${aboutLabel}: Description is required.`)
    // Commodity / investment type rows are optional — product type is captured at product creation.
    if (!ctx.previewImage && !ctx.hasPreviewAsset) errors.push(`${aboutLabel}: Preview file upload is required.`)
  }

  if (ctx.step === 2) {
    if (!has(ctx.yieldMethod)) errors.push("Structure: Yield method is required.")
    if (ctx.offerYieldOn && !has(ctx.offerYieldValue)) errors.push("Structure: Offer yield value is required when offer yield is enabled.")
    if (!has(ctx.withdrawalFlexibility)) errors.push("Structure: Withdrawal flexibility is required.")
    if (ctx.isInvestment && !has(ctx.minInvestmentAmount))
      errors.push("Structure: Minimum investment amount is required.")
    if (!ctx.isInvestment && !has(ctx.unitAmount)) {
      errors.push("Structure: Unit amount is required.")
    }
    if (ctx.isInvestment && ctx.enableUnitInvestmentPurchase && !has(ctx.unitAmount)) {
      /* Unit price optional when unit investment is enabled */
    }
    if (ctx.isInvestment) {
      if (ctx.enableUnitInvestmentPurchase && !has(ctx.minQuantityPurchase)) {
        errors.push("Structure: Minimum quantity purchase is required when unit investment is enabled.")
      }
    } else if (!has(ctx.minQuantityPurchase)) {
      errors.push("Structure: Minimum quantity purchase is required.")
    }
    if (!has(ctx.maxAmount))
      errors.push(ctx.isInvestment ? "Structure: Maximum investment amount is required." : "Structure: Max amount is required.")
    if (!has(ctx.termsAndConditions)) errors.push("Structure: Terms and conditions are required.")
    // Minimum holding period / moratorium days — optional per spec
    if (!has(ctx.contractId)) errors.push("Structure: Contract ID is required.")
    if (!has(ctx.airSignSecretKey)) errors.push("Structure: AirSign Secret Key is required.")
    if (!has(ctx.airSignUid)) errors.push("Structure: AirSign UID is required.")
  }

  if (ctx.step === 3) {
    if (!ctx.charges.length) errors.push("Fees & Charges: Add at least one fee (name, type, and value).")
    // Forceful withdrawal block optional
  }

  if (ctx.step === 4) {
    if (!ctx.priceRows.length) {
      errors.push(ctx.isInvestment ? "Unit Price: Add at least one price row." : "Commodity Price: Add at least one price row.")
    }
    ctx.priceRows.forEach((row, i) => {
      const n = i + 1
      if (!has(row.price)) errors.push(`Price row #${n}: Price is required.`)
      if (!has(row.date)) errors.push(`Price row #${n}: Date is required.`)
      if (!has(row.source)) errors.push(`Price row #${n}: Source is required.`)
    })
  }

  return { ok: errors.length === 0, errors }
}

export function validateAllCommoditySteps(base: Omit<CommodityStepCtx, "step">): { ok: boolean; errors: string[] } {
  const all: string[] = []
  for (let s = 1; s <= 4; s += 1) {
    all.push(...validateCommodityStep({ ...base, step: s }).errors)
  }
  return { ok: all.length === 0, errors: all }
}
