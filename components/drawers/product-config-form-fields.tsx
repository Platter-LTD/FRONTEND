"use client"

import type { ChangeEvent } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { formatThousandsFromDigits, sanitizeAmountDigits } from "@/lib/formatAmountInput"

interface ProductConfigTabsProps {
  steps: string[]
  activeStep: number
  onStepChange: (step: number) => void
}

export function ProductConfigTabs({ steps, activeStep, onStepChange }: ProductConfigTabsProps) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-5 border-b border-gray-200">
      {steps.map((step, index) => {
        const current = index + 1
        const isActive = current === activeStep
        return (
          <button
            key={step}
            type="button"
            onClick={() => onStepChange(current)}
            className={cn(
              "border-b-2 pb-2 text-sm font-medium transition-colors",
              isActive ? "border-[#9A813F] text-[#9A813F]" : "border-transparent text-gray-600 hover:text-gray-900",
            )}
          >
            {step}
          </button>
        )
      })}
    </div>
  )
}

function requirementSuffix(requirement?: "required" | "optional") {
  if (requirement === "required") return " (Required)"
  if (requirement === "optional") return " (Optional)"
  return ""
}

interface ProductConfigInputProps {
  label: string
  placeholder?: string
  value: string
  onChange: (value: string) => void
  type?: "text" | "number"
  numericOnly?: boolean
  /** When set, formats integer part with commas (money / facility amounts). Implies digit sanitization. */
  formatThousands?: boolean
  disabled?: boolean
  /** Shown next to the label per merchant validation spec */
  requirement?: "required" | "optional"
  /** Use a red * instead of “ (Required)” so labels stay on one line in tight grids. */
  requirementMark?: "text" | "asterisk"
}

export function ProductConfigInput({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
  numericOnly = false,
  formatThousands = false,
  disabled = false,
  requirement,
  requirementMark = "text",
}: ProductConfigInputProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (formatThousands) {
      const digits = sanitizeAmountDigits(event.target.value)
      onChange(formatThousandsFromDigits(digits))
      return
    }
    if (!numericOnly) {
      onChange(event.target.value)
      return
    }
    const cleaned = event.target.value.replace(/[^0-9.,]/g, "")
    onChange(cleaned)
  }

  return (
    <div className="min-w-0 w-full space-y-2">
      {label.trim() ? (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {requirement === "required" && requirementMark === "asterisk" ? (
            <>
              <span className="ml-0.5 font-normal text-red-600" title="Required" aria-hidden="true">
                *
              </span>
              <span className="sr-only"> required</span>
            </>
          ) : (
            <span className="font-normal text-gray-500">{requirementSuffix(requirement)}</span>
          )}
        </label>
      ) : null}
      <input
        type={type}
        value={value}
        onChange={handleChange}
        inputMode={numericOnly || formatThousands ? "decimal" : undefined}
        disabled={disabled}
        placeholder={placeholder}
        className="h-10 min-w-0 w-full max-w-full rounded-md border border-[#e5e7eb] bg-white px-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-[#9A813F] focus:ring-2 focus:ring-[#9A813F]/20 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
      />
    </div>
  )
}

interface ProductConfigSelectProps {
  label: string
  placeholder: string
  value: string
  /** String labels (value === label) or explicit `{ value, label }` from product options APIs. */
  options: string[] | Array<{ value: string; label: string }>
  onChange: (value: string) => void
  requirement?: "required" | "optional"
  requirementMark?: "text" | "asterisk"
}

function normalizeOptionToken(input: string) {
  return input
    .toLowerCase()
    .replace(/->/g, " ")
    .replace(/[()%]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function normalizeSelectOptions(
  options: string[] | Array<{ value: string; label: string }>,
): Array<{ value: string; label: string }> {
  return options.map((option) =>
    typeof option === "string" ? { value: option, label: option } : option,
  )
}

export function ProductConfigSelect({
  label,
  placeholder,
  value,
  options,
  onChange,
  requirement,
  requirementMark = "text",
}: ProductConfigSelectProps) {
  const normalized = normalizeSelectOptions(options)
  const resolvedValue = (() => {
    if (!value) return ""
    if (normalized.some((option) => option.value === value)) return value
    const target = normalizeOptionToken(value)
    const byValue = normalized.find((option) => normalizeOptionToken(option.value) === target)
    if (byValue) return byValue.value
    const byLabel = normalized.find((option) => normalizeOptionToken(option.label) === target)
    return byLabel?.value ?? ""
  })()

  return (
    <div className="min-w-0 w-full space-y-2">
      {label.trim() ? (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {requirement === "required" && requirementMark === "asterisk" ? (
            <>
              <span className="ml-0.5 font-normal text-red-600" title="Required" aria-hidden="true">
                *
              </span>
              <span className="sr-only"> required</span>
            </>
          ) : (
            <span className="font-normal text-gray-500">{requirementSuffix(requirement)}</span>
          )}
        </label>
      ) : null}
      <Select value={resolvedValue} onValueChange={onChange}>
        <SelectTrigger
          className="h-10 min-w-0 w-full max-w-full data-[size=default]:h-10 rounded-md border border-[#e5e7eb] bg-white px-3 py-0 text-sm outline-none transition focus:border-[#9A813F] focus:ring-2 focus:ring-[#9A813F]/20 shadow-none"
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="py-4">
          {normalized.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

interface ProductConfigToggleProps {
  id: string
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  requirement?: "required" | "optional"
}

export function ProductConfigToggle({ id, label, checked, onChange, requirement }: ProductConfigToggleProps) {
  return (
    <div className="flex items-center gap-3">
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        className="h-5 w-9 shrink-0 data-[state=checked]:bg-[#9A813F] data-[state=unchecked]:bg-slate-200"
      />
      <label htmlFor={id} className="cursor-pointer text-sm leading-snug text-gray-700">
        {label}
        <span className="font-normal text-gray-500">{requirementSuffix(requirement)}</span>
      </label>
    </div>
  )
}

/** Default sequences for loan / mortgage Structure step (stored value uses `->`). */
export const DEFAULT_REPAYMENT_WORKFLOWS = [
  "Principal -> Interest -> Charges",
  "Charges -> Principal -> Interest",
  "Interest -> Charges -> Principal",
] as const

/** Savings Structure — interest accrual frequency (merchant spec). */
export const SAVINGS_INTEREST_METHOD_OPTIONS = ["Daily", "Monthly", "Quarterly", "Annually"] as const

/** Repayment Structure option added per mortgage/loan merchant spec. */
export const REPAYMENT_STRUCTURE_ANNUITY = "Annuity"

/** Ensure Annuity appears in repayment structure dropdowns. */
export function withRepaymentStructureOptions(options: string[]): string[] {
  const merged = [...options]
  const hasAnnuity = merged.some((o) => o.trim().toLowerCase() === "annuity")
  if (!hasAnnuity) merged.push(REPAYMENT_STRUCTURE_ANNUITY)
  return merged
}

/** Shown when product type on About step is optional (captured at product creation). */
export const PRODUCT_TYPE_SECTION_HELPER =
  "Product type is already captured when you created this product. Add types here only if you need extra variants."

function formatWorkflowLabel(workflow: string) {
  return workflow.replace(/->/g, " → ")
}

export interface ProductConfigRepaymentWorkflowPanelProps {
  workflows?: readonly string[]
  selectedWorkflow: string
  onSelectWorkflow: (workflow: string) => void
  minAmount: string
  maxAmount: string
  onMinAmountChange: (value: string) => void
  onMaxAmountChange: (value: string) => void
  /** Right column title (default: Loan Amount) */
  amountLabel?: string
  minPlaceholder?: string
  maxPlaceholder?: string
  workflowRequirement?: "required" | "optional"
  amountFieldsRequirement?: "required" | "optional"
}

/**
 * Single container: left = repayment options as mutually exclusive switches; right = min/max amount.
 * Use on loan & mortgage configure drawers (and any future product with the same pattern).
 */
export function ProductConfigRepaymentWorkflowPanel({
  workflows = [...DEFAULT_REPAYMENT_WORKFLOWS],
  selectedWorkflow,
  onSelectWorkflow,
  minAmount,
  maxAmount,
  onMinAmountChange,
  onMaxAmountChange,
  amountLabel = "Loan Amount",
  minPlaceholder = "Min Amount",
  maxPlaceholder = "Max Amount",
  workflowRequirement = "required",
  amountFieldsRequirement = "required",
}: ProductConfigRepaymentWorkflowPanelProps) {
  const list = workflows.length ? workflows : [...DEFAULT_REPAYMENT_WORKFLOWS]

  const handleSwitchChange = (workflow: string, checked: boolean) => {
    if (checked) {
      onSelectWorkflow(workflow)
      return
    }
    if (selectedWorkflow !== workflow) return
    const other = list.find((w) => w !== workflow)
    if (other) onSelectWorkflow(other)
  }

  return (
    <div className="rounded-xl bg-white ">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-4 sm:items-start">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-800">
            Repayment Workflow
            <span className="font-normal text-gray-500">{requirementSuffix(workflowRequirement)}</span>
          </h3>
          <div className="flex flex-col gap-3">
            {list.map((wf) => {
              const id = `repayment-workflow-${wf.replace(/\s/g, "-")}`
              return (
                <div key={wf} className="flex items-center gap-3">
                  <Switch
                    id={id}
                    checked={selectedWorkflow === wf}
                    onCheckedChange={(on) => handleSwitchChange(wf, on)}
                    className="h-5 w-9 shrink-0 data-[state=checked]:bg-[#9A813F] data-[state=unchecked]:bg-slate-200"
                  />
                  <label htmlFor={id} className="cursor-pointer text-sm leading-snug text-slate-700">
                    {formatWorkflowLabel(wf)}
                  </label>
                </div>
              )
            })}
          </div>
        </div>
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-800">
            {amountLabel}
            <span className="font-normal text-gray-500">{requirementSuffix(amountFieldsRequirement)}</span>
          </h3>
          <div className="space-y-2">
            <ProductConfigInput
              label="Minimum"
              placeholder={minPlaceholder}
              value={minAmount}
              onChange={onMinAmountChange}
              numericOnly
              formatThousands
              requirement={amountFieldsRequirement}
            />
            <ProductConfigInput
              label="Maximum"
              placeholder={maxPlaceholder}
              value={maxAmount}
              onChange={onMaxAmountChange}
              numericOnly
              formatThousands
              requirement={amountFieldsRequirement}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export { ProductConfigAboutStep, type ProductAboutTypeRow } from "./product-config-about-step"
