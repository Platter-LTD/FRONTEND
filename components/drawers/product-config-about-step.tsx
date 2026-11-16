"use client"

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react"
import { ImageIcon, Plus, Upload, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  ProductConfigInput,
  ProductConfigLabel,
  ProductConfigSelect,
  ProductConfigSubsection,
  productConfigTextareaClass,
} from "@/components/drawers/product-config-form-fields"
import { cn } from "@/lib/utils"
import { getImageFileValidationError } from "@/lib/fileValidation"

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
  /** Type section can differ from other About fields (e.g. optional when set at product creation). */
  typeSectionRequirement?: "required" | "optional"
  /** Shown under the type section when optional (e.g. product type already captured at creation). */
  typeSectionHelperText?: string
}

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
  typeSectionRequirement,
  typeSectionHelperText,
}: ProductConfigAboutStepProps) {
  const previewInputRef = useRef<HTMLInputElement>(null)
  const typeRequirement = typeSectionRequirement ?? fieldRequirement
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
      if (matchesPresetDuration(durationValue, presetTenureOptions)) {
        onDurationChange("")
      }
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

  const [dragging, setDragging] = useState(false)

  const acceptPreviewFile = (f: File | null) => {
    if (f) {
      const err = getImageFileValidationError(f)
      if (err) {
        toast.error(err)
        return
      }
    }
    onPreviewFileChange(f)
  }

  const handlePreviewInput = (e: ChangeEvent<HTMLInputElement>) => {
    acceptPreviewFile(e.target.files?.[0] ?? null)
    e.target.value = ""
  }

  const handlePreviewDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) acceptPreviewFile(f)
  }

  const previewName = previewFile?.name || previewLabel
  const previewSrc = thumbUrl && previewFile?.type.startsWith("image/") ? thumbUrl : previewImageUrl

  return (
    <div className={cn("space-y-5", className)}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ProductConfigInput
          label={nameLabel}
          placeholder={namePlaceholder}
          value={name}
          onChange={onNameChange}
          requirement={fieldRequirement}
        />
        <div className="min-w-0 space-y-3">
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

      <div className="space-y-1.5">
        <ProductConfigLabel htmlFor={`${idPrefix}-description`} requirement={fieldRequirement}>
          {descriptionLabel}
        </ProductConfigLabel>
        <textarea
          id={`${idPrefix}-description`}
          value={description}
          onChange={(ev) => onDescriptionChange(ev.target.value)}
          placeholder={descriptionPlaceholder}
          rows={descriptionRows}
          className={cn(productConfigTextareaClass, "resize-y")}
        />
        <p className="text-right text-xs text-gray-400">{description.length} characters</p>
      </div>

      <ProductConfigSubsection
        title={typeSectionLabel}
        requirement={typeRequirement}
        description={typeRequirement === "optional" && typeSectionHelperText ? typeSectionHelperText : undefined}
      >
        {typeInputMode === "select" ? (
          <ProductConfigSelect
            label=""
            placeholder={typeSelectPlaceholder}
            value={typeSelectedValue}
            options={typeSelectOptions}
            onChange={(value) => onTypeSelectedValueChange?.(value)}
            requirement={typeRequirement}
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <ProductConfigInput
              label="Type name"
              placeholder="Enter Name"
              value={typeNameDraft}
              onChange={onTypeNameDraftChange}
            />
            <ProductConfigInput
              label="Type description"
              placeholder="Enter Description"
              value={typeDescDraft}
              onChange={onTypeDescDraftChange}
            />
            <Button
              type="button"
              onClick={onAddType}
              disabled={!typeNameDraft.trim() || !typeDescDraft.trim()}
              className="h-10 gap-1.5 self-end rounded-lg bg-brand px-4 text-brand-foreground hover:bg-brand/90"
              style={accentColor !== "#9A813F" ? { backgroundColor: accentColor } : undefined}
            >
              <Plus className="size-4" />
              Add
            </Button>
          </div>
        )}

        {typeInputMode !== "select" && typeRows.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-gray-500">
              {addMoreLabel} · {typeRows.length}
            </p>
            <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white">
              {typeRows.map((row, index) => (
                <li
                  key={`${idPrefix}-type-${row.name}-${index}`}
                  className={cn(
                    "flex items-start gap-3 px-3 py-2.5 text-sm",
                    typeListVariant === "split" && "sm:items-center",
                  )}
                >
                  <div
                    className={cn(
                      "min-w-0 flex-1",
                      typeListVariant === "split" && "sm:grid sm:grid-cols-2 sm:gap-3",
                    )}
                  >
                    <p className="font-medium text-gray-900">{row.name}</p>
                    <p className="text-gray-500">{row.description || "—"}</p>
                  </div>
                  {onRemoveTypeRow ? (
                    <button
                      type="button"
                      onClick={() => onRemoveTypeRow(index)}
                      className="shrink-0 rounded-md p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:outline-none"
                      aria-label={`Remove ${row.name?.trim() || "type"}`}
                    >
                      <X className="size-4" aria-hidden />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        )}
      </ProductConfigSubsection>

      <div className="space-y-1.5">
        <ProductConfigLabel requirement={fieldRequirement}>Preview image</ProductConfigLabel>
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handlePreviewDrop}
          className={cn(
            "flex flex-col items-center gap-4 rounded-xl border-2 border-dashed p-4 transition-colors sm:flex-row",
            dragging
              ? "border-brand bg-brand/5"
              : previewOuterStyle === "solid"
                ? "border-gray-200 bg-white"
                : "border-gray-300 bg-gray-50/60 hover:border-brand/50",
          )}
        >
          {showPreviewThumbnail ? (
            <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white">
              {previewSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewSrc} alt="Preview" className="size-full object-cover" />
              ) : (
                <ImageIcon className="size-7 text-gray-300" aria-hidden />
              )}
            </div>
          ) : null}
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="truncate text-sm font-medium text-gray-900">
              {previewName || "Drag an image here, or upload one"}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">PNG, JPEG, JPG, SVG or WebP · Max. 5MB</p>
          </div>
          <input
            ref={previewInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
            className="hidden"
            onChange={handlePreviewInput}
          />
          <div className="flex shrink-0 gap-2">
            {previewFile ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => onPreviewFileChange(null)}
                className="h-9 rounded-lg px-3 text-gray-600"
              >
                Remove
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={() => previewInputRef.current?.click()}
              className="h-9 gap-1.5 rounded-lg border-brand/40 px-3 text-brand hover:bg-brand/5 hover:text-brand"
            >
              <Upload className="size-4" />
              {previewName ? "Replace" : "Upload"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
