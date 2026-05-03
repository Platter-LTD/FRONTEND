"use client"

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"
import { Upload, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ProductConfigInput, ProductConfigSelect } from "@/components/drawers/product-config-form-fields"
import { getImageFileValidationError } from "@/lib/fileValidation"

function requirementSuffix(requirement?: "required" | "optional") {
  if (requirement === "required") return " (Required)"
  if (requirement === "optional") return " (Optional)"
  return ""
}

/** Align with ProductConfigSelect preset matching so “6 months” vs “6 Months” still counts as preset. */
function normalizeOptionToken(input: string) {
  return input
    .toLowerCase()
    .replace(/->/g, " ")
    .replace(/[()%]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function matchesPresetDuration(value: string, presets: string[]) {
  if (!value.trim()) return false
  if (presets.includes(value)) return true
  const t = normalizeOptionToken(value)
  return presets.some((p) => normalizeOptionToken(p) === t)
}

const CUSTOM_TENURE_LABEL = "Custom"

/** One row in the “add name + description” list (loan type, savings type, commodity type, etc.) */
export interface ProductAboutTypeRow {
  name: string
  description: string
}

export interface ProductConfigAboutStepProps {
  /** Prefix for React keys (unique per drawer) */
  idPrefix?: string

  nameLabel: string
  name: string
  onNameChange: (value: string) => void
  namePlaceholder?: string

  durationLabel: string
  durationValue: string
  durationOptions: string[]
  onDurationChange: (value: string) => void
  durationPlaceholder?: string

  description: string
  onDescriptionChange: (value: string) => void
  descriptionLabel?: string
  descriptionPlaceholder?: string
  descriptionRows?: number

  /** e.g. Loan Type, Savings Type, Commodity Type */
  typeSectionLabel: string
  typeNameDraft: string
  typeDescDraft: string
  onTypeNameDraftChange: (value: string) => void
  onTypeDescDraftChange: (value: string) => void
  onAddType: () => void
  typeRows: ProductAboutTypeRow[]
  /** Remove row at index (shows X on hover when set). */
  onRemoveTypeRow?: (index: number) => void
  typeInputMode?: "add-list" | "select"
  typeSelectOptions?: string[]
  typeSelectPlaceholder?: string
  typeSelectedValue?: string
  onTypeSelectedValueChange?: (value: string) => void

  /**
   * How added rows render:
   * - `split`: two grey cells (name | description) — default, matches most mocks
   * - `stacked`: single card with title + subtitle (legacy loan layout)
   */
  typeListVariant?: "split" | "stacked"
  addMoreLabel?: string

  previewFile: File | null
  onPreviewFileChange: (file: File | null) => void
  /** Existing backend file name when editing (no local File yet). */
  previewLabel?: string
  /** Existing backend image URL when editing (optional). */
  previewImageUrl?: string
  showPreviewThumbnail?: boolean
  /** Outer preview container border */
  previewOuterStyle?: "dashed" | "solid"

  accentColor?: string
  className?: string
  /** Marks About fields per merchant spec (default: all required). */
  fieldRequirement?: "required" | "optional"
}

const TEXTAREA_CLASS =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-[#9A813F] focus:ring-2 focus:ring-[#9A813F]/20"

/**
 * Shared **About Product** step for all product configure drawers.
 * Same layout everywhere; labels/options/lists are driven by props per product type.
 */
export function ProductConfigAboutStep({
  idPrefix = "about",
  nameLabel,
  name,
  onNameChange,
  namePlaceholder = "Enter Name",
  durationLabel,
  durationValue,
  durationOptions,
  onDurationChange,
  durationPlaceholder = "Select",
  description,
  onDescriptionChange,
  descriptionLabel = "Product Description",
  descriptionPlaceholder = "Enter Description",
  descriptionRows = 4,
  typeSectionLabel,
  typeNameDraft,
  typeDescDraft,
  onTypeNameDraftChange,
  onTypeDescDraftChange,
  onAddType,
  typeRows,
  onRemoveTypeRow,
  typeInputMode = "add-list",
  typeSelectOptions = [],
  typeSelectPlaceholder = "Select type",
  typeSelectedValue = "",
  onTypeSelectedValueChange,
  typeListVariant = "split",
  addMoreLabel = "Add More",
  previewFile,
  onPreviewFileChange,
  previewLabel = "",
  previewImageUrl = "",
  showPreviewThumbnail = true,
  previewOuterStyle = "dashed",
  accentColor = "#9A813F",
  className = "",
  fieldRequirement = "required",
}: ProductConfigAboutStepProps) {
  const previewInputRef = useRef<HTMLInputElement>(null)
  const [thumbUrl, setThumbUrl] = useState<string | null>(null)

  /** True after user picks “Custom” or when loaded value is not a preset (e.g. saved custom tenure). */
  const [customTenureActive, setCustomTenureActive] = useState(false)

  const durationOptionsWithCustom = useMemo(() => {
    const next = [...durationOptions]
    const hasCustom = next.some((o) => o.trim().toLowerCase() === "custom")
    if (!hasCustom) next.push(CUSTOM_TENURE_LABEL)
    return next
  }, [durationOptions])

  const presetTenureOptions = useMemo(
    () => durationOptionsWithCustom.filter((o) => o.trim().toLowerCase() !== "custom"),
    [durationOptionsWithCustom],
  )

  useEffect(() => {
    if (!durationValue.trim()) return
    if (matchesPresetDuration(durationValue, presetTenureOptions)) {
      setCustomTenureActive(false)
    } else {
      setCustomTenureActive(true)
    }
  }, [durationValue, presetTenureOptions])

  const tenureSelectValue = useMemo(() => {
    if (customTenureActive) return CUSTOM_TENURE_LABEL
    if (!durationValue.trim()) return ""
    if (matchesPresetDuration(durationValue, presetTenureOptions)) {
      const exact = presetTenureOptions.find((p) => p === durationValue)
      if (exact) return exact
      const t = normalizeOptionToken(durationValue)
      return presetTenureOptions.find((p) => normalizeOptionToken(p) === t) ?? durationValue
    }
    return ""
  }, [customTenureActive, durationValue, presetTenureOptions])

  const handleTenureSelectChange = (value: string) => {
    if (value.trim().toLowerCase() === "custom") {
      setCustomTenureActive(true)
      onDurationChange("")
      return
    }
    setCustomTenureActive(false)
    onDurationChange(value)
  }

  useEffect(() => {
    if (!previewFile) {
      setThumbUrl(null)
      return undefined
    }
    const url = URL.createObjectURL(previewFile)
    setThumbUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [previewFile])

  const handlePreviewInput = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    if (f) {
      const err = getImageFileValidationError(f)
      if (err) {
        toast.error(err)
        e.target.value = ""
        return
      }
    }
    onPreviewFileChange(f)
    e.target.value = ""
  }

  const outerPreviewClass =
    previewOuterStyle === "solid"
      ? "rounded-md border border-[#e5e7eb] p-3"
      : "rounded-md border border-dashed border-[#cdbf8b] p-3"

  return (
    <div className={`space-y-4 ${className}`.trim()}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ProductConfigInput
          label={nameLabel}
          placeholder={namePlaceholder}
          value={name}
          onChange={onNameChange}
          requirement={fieldRequirement}
        />
        <div className="min-w-0 space-y-2">
          <ProductConfigSelect
            label={durationLabel}
            placeholder={durationPlaceholder}
            value={tenureSelectValue}
            options={durationOptionsWithCustom}
            onChange={handleTenureSelectChange}
            requirement={fieldRequirement}
          />
          {customTenureActive ? (
            <ProductConfigInput
              label="Custom tenure"
              placeholder="e.g. 18 months, 90 days, 2 years"
              value={durationValue}
              onChange={onDurationChange}
              requirement={fieldRequirement}
            />
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          {descriptionLabel}
          <span className="font-normal text-gray-500">{requirementSuffix(fieldRequirement)}</span>
        </label>
        <textarea
          value={description}
          onChange={(ev) => onDescriptionChange(ev.target.value)}
          placeholder={descriptionPlaceholder}
          rows={descriptionRows}
          className={TEXTAREA_CLASS}
        />
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          {typeSectionLabel}
          <span className="font-normal text-gray-500">{requirementSuffix(fieldRequirement)}</span>
        </label>
        {typeInputMode === "select" ? (
          <ProductConfigSelect
            label=""
            placeholder={typeSelectPlaceholder}
            value={typeSelectedValue}
            options={typeSelectOptions}
            onChange={(value) => onTypeSelectedValueChange?.(value)}
            requirement={fieldRequirement}
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <ProductConfigInput
              label="Type name"
              placeholder="Enter Name"
              value={typeNameDraft}
              onChange={onTypeNameDraftChange}
              requirement={fieldRequirement}
            />
            <ProductConfigInput
              label="Type description"
              placeholder="Enter Description"
              value={typeDescDraft}
              onChange={onTypeDescDraftChange}
              requirement={fieldRequirement}
            />
            <Button
              type="button"
              onClick={onAddType}
              className="h-10 text-white hover:opacity-95"
              style={{ backgroundColor: accentColor }}
            >
              Add
            </Button>
          </div>
        )}

        {typeInputMode !== "select" && typeRows.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600">{addMoreLabel}</p>
            <div className="space-y-2">
              {typeRows.map((row, index) =>
                typeListVariant === "stacked" ? (
                  <div
                    key={`${idPrefix}-type-${row.name}-${index}`}
                    className="group relative rounded-md bg-gray-100 px-3 py-2 pr-10 text-sm"
                  >
                    <p className="font-medium text-gray-800">{row.name}</p>
                    <p className="text-xs text-gray-600">{row.description}</p>
                    {onRemoveTypeRow ? (
                      <button
                        type="button"
                        onClick={() => onRemoveTypeRow(index)}
                        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-md text-gray-500 opacity-0 transition-opacity hover:bg-gray-200 hover:text-gray-900 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#9A813F]/50"
                        aria-label={`Remove ${row.name?.trim() || "type"}`}
                      >
                        <X className="h-4 w-4 shrink-0" aria-hidden />
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <div
                    key={`${idPrefix}-type-${row.name}-${index}`}
                    className="group relative grid w-full grid-cols-1 gap-2 sm:grid-cols-2 sm:pr-10"
                  >
                    <div className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-800">{row.name}</div>
                    <div className="rounded-md bg-gray-100 px-3 py-2 text-xs text-gray-600 sm:text-sm">{row.description}</div>
                    {onRemoveTypeRow ? (
                      <button
                        type="button"
                        onClick={() => onRemoveTypeRow(index)}
                        className="absolute right-0 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-gray-500 opacity-0 transition-opacity hover:bg-gray-200 hover:text-gray-900 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#9A813F]/50"
                        aria-label={`Remove ${row.name?.trim() || "type"}`}
                      >
                        <X className="h-4 w-4 shrink-0" aria-hidden />
                      </button>
                    ) : null}
                  </div>
                ),
              )}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Preview Image
          <span className="font-normal text-gray-500">{requirementSuffix(fieldRequirement)}</span>
        </label>
        <div className={`flex flex-col gap-3 sm:flex-row sm:items-stretch ${outerPreviewClass}`}>
          <div className="flex flex-1 flex-col justify-center gap-2 rounded-md border border-gray-200 p-3 sm:flex-row sm:items-center">
            <Upload className="shrink-0 text-gray-500" size={18} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-700">{previewFile?.name || previewLabel || "Add image"}</p>
              <p className="text-xs text-gray-500">PNG, JPEG, JPG, SVG, WebP • Max. 5MB</p>
            </div>
            <input
              ref={previewInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
              className="hidden"
              onChange={handlePreviewInput}
            />
            <Button
              type="button"
              onClick={() => previewInputRef.current?.click()}
              className="h-10 shrink-0 text-white hover:opacity-95"
              style={{ backgroundColor: accentColor }}
            >
              Upload
            </Button>
          </div>
          {showPreviewThumbnail ? (
            <div className="mx-auto flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-gray-50 sm:mx-0">
              {thumbUrl && previewFile?.type.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbUrl} alt="" className="h-full w-full object-cover" />
              ) : previewImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewImageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="px-1 text-center text-[10px] text-gray-400">Preview</span>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
