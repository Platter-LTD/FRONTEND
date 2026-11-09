"use client"

import { useEffect, useRef, type ChangeEvent, type ReactNode } from "react"
import { AlertCircle, ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { formatThousandsFromDigits, sanitizeAmountDigits } from "@/lib/formatAmountInput"

/* ------------------------------------------------------------------ */
/* Shared look                                                          */
/* ------------------------------------------------------------------ */

/** Base classes for every text-like control in the configure drawers. */
export const productConfigControlClass =
  "h-10 min-w-0 w-full max-w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 shadow-xs outline-none transition-[color,box-shadow,border-color] placeholder:text-gray-400 hover:border-gray-400 focus:border-brand focus:ring-[3px] focus:ring-brand/20 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"

/** Multi-line variant of `productConfigControlClass`. */
export const productConfigTextareaClass =
  "w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-xs outline-none transition-[color,box-shadow,border-color] placeholder:text-gray-400 hover:border-gray-400 focus:border-brand focus:ring-[3px] focus:ring-brand/20"

const STEP_DESCRIPTIONS: Record<string, string> = {
  "about product": "Name, tenure, description and how the product appears to customers.",
  structure: "Rates, limits and how the product behaves over its lifetime.",
  requirements: "Security, documents and anything else applicants must provide.",
  "fees & charges": "Charges, penalties and how they are collected.",
  properties: "Properties customers can apply for under this product.",
  "inspection dates": "Slots customers can book to inspect a property.",
  "unit price": "How the unit price is set and where it comes from.",
  "commodity price": "How the commodity price is set and where it comes from.",
}

/* ------------------------------------------------------------------ */
/* Step navigation                                                     */
/* ------------------------------------------------------------------ */

interface ProductConfigTabsProps {
  steps: readonly string[]
  activeStep: number
  onStepChange: (step: number) => void
}

/**
 * Numbered step tabs. Rendered in the drawer's sticky `subHeader` slot so they
 * stay visible while the step scrolls. Earlier steps show a check.
 */
export function ProductConfigTabs({ steps, activeStep, onStepChange }: ProductConfigTabsProps) {
  const navRef = useRef<HTMLElement>(null)
  // Keep the active tab visible when the strip scrolls horizontally (narrow screens).
  useEffect(() => {
    navRef.current
      ?.querySelector<HTMLElement>('[aria-current="step"]')
      ?.scrollIntoView({ block: "nearest", inline: "nearest" })
  }, [activeStep])
  return (
    <div className="shrink-0 border-b border-gray-200 bg-white">
      <nav ref={navRef} aria-label="Configuration steps" className="flex gap-1 overflow-x-auto px-4 pt-3 sm:px-6 [scrollbar-width:none]">
        {steps.map((label, index) => {
          const current = index + 1
          const isActive = current === activeStep
          const isDone = current < activeStep
          return (
            <button
              key={label}
              type="button"
              onClick={() => onStepChange(current)}
              aria-current={isActive ? "step" : undefined}
              className={cn(
                "group flex shrink-0 items-center gap-2 border-b-2 px-2.5 pt-1.5 pb-3 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 rounded-t-md",
                isActive ? "border-brand text-gray-900" : "border-transparent text-gray-500 hover:text-gray-900",
              )}
            >
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                  isActive && "bg-brand text-brand-foreground shadow-sm",
                  isDone && "bg-brand/15 text-brand",
                  !isActive && !isDone && "bg-gray-100 text-gray-500 group-hover:bg-gray-200",
                )}
              >
                {isDone ? <Check className="size-3.5" strokeWidth={3} /> : current}
              </span>
              {label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

/** White card holding one step: eyebrow, title, description, then the fields. */
export function ProductConfigStepCard({
  steps,
  activeStep,
  children,
}: {
  steps: readonly string[]
  activeStep: number
  children: ReactNode
}) {
  const title = steps[activeStep - 1] ?? ""
  const description = STEP_DESCRIPTIONS[title.trim().toLowerCase()]
  const ref = useRef<HTMLElement>(null)
  // A new step starts at the top of the scrolling drawer body.
  useEffect(() => {
    ref.current?.parentElement?.scrollTo({ top: 0 })
  }, [activeStep])
  return (
    <section ref={ref} className="w-full rounded-xl border border-gray-200 bg-white shadow-xs">
      <header className="border-b border-gray-100 px-5 py-4">
        <p className="text-xs font-semibold tracking-wide text-brand uppercase">
          Step {activeStep} of {steps.length}
        </p>
        <h3 className="mt-0.5 text-base font-semibold text-gray-900">{title}</h3>
        {description ? <p className="mt-0.5 text-sm text-gray-500">{description}</p> : null}
      </header>
      <div className="space-y-5 p-5">{children}</div>
    </section>
  )
}

/** Validation summary shown at the top of a step. */
export function ProductConfigStepErrors({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null
  return (
    <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
      <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-600" aria-hidden />
      <div>
        <p className="font-medium">Please fix the following before continuing:</p>
        <ul className="mt-1.5 list-inside list-disc space-y-1 text-red-700">
          {errors.map((msg) => (
            <li key={msg}>{msg}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/** Sticky Back / Next (Submit on the last step) row for the drawer footer. */
export function ProductConfigFooter({
  step,
  total,
  isSubmitting,
  onBack,
  onNext,
  submitLabel = "Save product",
}: {
  step: number
  total: number
  isSubmitting: boolean
  onBack: () => void
  onNext: () => void
  submitLabel?: string
}) {
  const isLast = step === total
  return (
    <div className="flex items-center justify-between gap-3">
      <Button
        type="button"
        variant="outline"
        onClick={onBack}
        disabled={isSubmitting || step === 1}
        className="h-10 gap-1.5 rounded-lg border-gray-300 px-4 text-gray-700"
      >
        <ArrowLeft className="size-4" />
        Back
      </Button>
      <span className="hidden text-sm text-gray-500 sm:block">
        Step <span className="font-medium text-gray-900">{step}</span> of {total}
      </span>
      <Button
        type="button"
        onClick={onNext}
        disabled={isSubmitting}
        className="h-10 min-w-[9rem] gap-1.5 rounded-lg bg-brand px-5 text-brand-foreground shadow-sm hover:bg-brand/90 disabled:opacity-70"
      >
        {isSubmitting && isLast ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Saving…
          </>
        ) : isLast ? (
          <>
            <Check className="size-4" />
            {submitLabel}
          </>
        ) : (
          <>
            Continue
            <ArrowRight className="size-4" />
          </>
        )}
      </Button>
    </div>
  )
}

/** Titled group inside a step (e.g. "Document requirements"). */
export function ProductConfigSubsection({
  title,
  requirement,
  description,
  action,
  children,
  className,
}: {
  title: ReactNode
  requirement?: "required" | "optional"
  description?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("space-y-3 rounded-lg border border-gray-200 bg-gray-50/50 p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {title}
            <RequirementMark requirement={requirement} />
          </p>
          {description ? <p className="mt-0.5 text-xs text-gray-500">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Fields                                                              */
/* ------------------------------------------------------------------ */

/** Red asterisk for required, muted "Optional" for optional. */
export function RequirementMark({ requirement }: { requirement?: "required" | "optional" }) {
  if (requirement === "required")
    return (
      <>
        <span className="ml-0.5 text-red-600" title="Required" aria-hidden="true">
          *
        </span>
        <span className="sr-only"> (required)</span>
      </>
    )
  if (requirement === "optional") return <span className="ml-1.5 text-[11px] font-normal text-gray-400">Optional</span>
  return null
}

export function ProductConfigLabel({
  children,
  requirement,
  htmlFor,
}: {
  children: ReactNode
  requirement?: "required" | "optional"
  htmlFor?: string
}) {
  return (
    <label
      htmlFor={htmlFor}
      title={typeof children === "string" ? children : undefined}
      className="block truncate text-[13px] leading-5 font-medium text-gray-700"
    >
      {children}
      <RequirementMark requirement={requirement} />
    </label>
  )
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
  /** Kept for compatibility; required fields always show a red asterisk. */
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
    <div className="min-w-0 w-full space-y-1.5">
      {label.trim() ? <ProductConfigLabel requirement={requirement}>{label}</ProductConfigLabel> : null}
      <input
        type={type}
        value={value}
        onChange={handleChange}
        inputMode={numericOnly || formatThousands ? "decimal" : undefined}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={label.trim() ? label : placeholder}
        className={productConfigControlClass}
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
  /** Kept for compatibility; required fields always show a red asterisk. */
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
}: ProductConfigSelectProps) {
  const normalized = normalizeSelectOptions(options)
  const optionsWithCurrent = (() => {
    if (!value) return normalized
    const target = normalizeOptionToken(value)
    const matched = normalized.some(
      (option) =>
        option.value === value ||
        normalizeOptionToken(option.value) === target ||
        normalizeOptionToken(option.label) === target,
    )
    if (matched) return normalized
    return [...normalized, { value, label: value }]
  })()
  const resolvedValue = (() => {
    if (!value) return ""
    if (optionsWithCurrent.some((option) => option.value === value)) return value
    const target = normalizeOptionToken(value)
    const byValue = optionsWithCurrent.find((option) => normalizeOptionToken(option.value) === target)
    if (byValue) return byValue.value
    const byLabel = optionsWithCurrent.find((option) => normalizeOptionToken(option.label) === target)
    return byLabel?.value ?? value
  })()

  return (
    <div className="min-w-0 w-full space-y-1.5">
      {label.trim() ? <ProductConfigLabel requirement={requirement}>{label}</ProductConfigLabel> : null}
      <Select value={resolvedValue} onValueChange={onChange}>
        <SelectTrigger
          aria-label={label.trim() ? label : placeholder}
          className={cn(productConfigControlClass, "py-0 data-[size=default]:h-10 data-[placeholder]:text-gray-400")}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {optionsWithCurrent.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">No options available</div>
          ) : (
            optionsWithCurrent.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  )
}

const SWITCH_CLASS = "h-5 w-9 shrink-0 data-[state=checked]:bg-brand data-[state=unchecked]:bg-gray-200"

interface ProductConfigToggleProps {
  id: string
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  requirement?: "required" | "optional"
  /** Smaller help text under the label. */
  description?: string
}

/** A whole-row toggle card: label on the left, switch on the right, tinted when on. */
export function ProductConfigToggle({ id, label, checked, onChange, requirement, description }: ProductConfigToggleProps) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5 transition-colors",
        checked ? "border-brand/40 bg-brand/5" : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/60",
      )}
    >
      <span className="min-w-0 text-sm leading-snug text-gray-800">
        {label}
        <RequirementMark requirement={requirement} />
        {description ? <span className="mt-0.5 block text-xs text-gray-500">{description}</span> : null}
      </span>
      <Switch id={id} checked={checked} onCheckedChange={onChange} className={SWITCH_CLASS} />
    </label>
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
  /**
   * `range` (default): Minimum + Maximum — used by LOAN.
   * `single`: one amount field — used by MORTGAGE (`structure.mortgageAmount`).
   */
  amountMode?: "range" | "single"
  singleAmount?: string
  onSingleAmountChange?: (value: string) => void
  singleAmountPlaceholder?: string
}

/**
 * Repayment order as selectable cards (left) next to the amount fields (right).
 * Used on loan & mortgage configure drawers.
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
  amountMode = "range",
  singleAmount = "",
  onSingleAmountChange,
  singleAmountPlaceholder = "Enter amount",
}: ProductConfigRepaymentWorkflowPanelProps) {
  const list = workflows.length ? workflows : [...DEFAULT_REPAYMENT_WORKFLOWS]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-start">
      <ProductConfigSubsection
        title="Repayment workflow"
        requirement={workflowRequirement}
        description="The order repayments are applied in."
      >
        <div role="radiogroup" aria-label="Repayment workflow" className="flex flex-col gap-2">
          {list.map((wf) => {
            const selected = selectedWorkflow === wf
            const parts = wf.split("->").map((p) => p.trim()).filter(Boolean)
            return (
              <button
                key={wf}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={formatWorkflowLabel(wf)}
                onClick={() => onSelectWorkflow(wf)}
                className={cn(
                  "flex items-center gap-3 rounded-lg border bg-white px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30",
                  selected ? "border-brand ring-1 ring-brand/30" : "border-gray-200 hover:border-gray-300",
                )}
              >
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded-full border",
                    selected ? "border-brand" : "border-gray-300",
                  )}
                >
                  {selected ? <span className="size-2 rounded-full bg-brand" /> : null}
                </span>
                <span className="flex flex-wrap items-center gap-1 text-xs">
                  {parts.map((part, i) => (
                    <span key={`${part}-${i}`} className="flex items-center gap-1">
                      {i > 0 ? <ArrowRight className="size-3 text-gray-400" aria-hidden /> : null}
                      <span
                        className={cn(
                          "rounded-md px-1.5 py-0.5 font-medium",
                          selected ? "bg-brand/10 text-brand" : "bg-gray-100 text-gray-700",
                        )}
                      >
                        {part}
                      </span>
                    </span>
                  ))}
                </span>
              </button>
            )
          })}
        </div>
      </ProductConfigSubsection>
      <ProductConfigSubsection title={amountLabel} requirement={amountFieldsRequirement} description="Limits customers can apply for.">
        {amountMode === "single" ? (
          <ProductConfigInput
            label="Amount"
            placeholder={singleAmountPlaceholder}
            value={singleAmount}
            onChange={onSingleAmountChange ?? (() => {})}
            numericOnly
            formatThousands
            requirement={amountFieldsRequirement}
          />
        ) : (
          <div className="space-y-3">
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
        )}
      </ProductConfigSubsection>
    </div>
  )
}

export { ProductConfigAboutStep, type ProductAboutTypeRow } from "./product-config-about-step"
