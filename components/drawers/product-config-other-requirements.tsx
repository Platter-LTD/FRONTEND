"use client"

import type { RefObject } from "react"
import { ListChecks, Plus, Upload, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  ProductConfigInput,
  ProductConfigSelect,
  ProductConfigSubsection,
  productConfigControlClass,
} from "@/components/drawers/product-config-form-fields"
import { shouldUseOtherRequirementFileUpload, type OtherRequirementDraft } from "@/lib/otherRequirementPayload"
import { getPdfFileValidationError } from "@/lib/fileValidation"
import { cn } from "@/lib/utils"

export type ProductConfigOtherRequirementsPanelProps = {
  otherRequirementOptions: string[]
  contentTypeOptions: string[]
  otherRequirementType: string
  otherRequirementContentType: string
  otherRequirementDescription: string
  otherRequirementFile: File | null
  otherRequirements: OtherRequirementDraft[]
  uploadInputRef: RefObject<HTMLInputElement>
  /** Unique id for the file picker control (a11y). */
  filePickerId: string
  addButtonClassName?: string
  onTypeChange: (v: string) => void
  onContentTypeChange: (v: string) => void
  onDescriptionChange: (v: string) => void
  onFileChange: (file: File | null) => void
  onAdd: () => void
  onRemoveItem?: (index: number) => void
  summarizeItem?: (item: OtherRequirementDraft) => string
}

function defaultSummarize(item: OtherRequirementDraft) {
  return item.file
    ? `${item.type} — ${item.file.name} — ${item.contentType}`
    : `${item.type} — ${item.description} — ${item.contentType}`
}

export function ProductConfigOtherRequirementsPanel({
  otherRequirementOptions,
  contentTypeOptions,
  otherRequirementType,
  otherRequirementContentType,
  otherRequirementDescription,
  otherRequirementFile,
  otherRequirements,
  uploadInputRef,
  filePickerId,
  addButtonClassName = "h-10 w-full gap-1.5 rounded-lg bg-brand text-brand-foreground hover:bg-brand/90",
  onTypeChange,
  onContentTypeChange,
  onDescriptionChange,
  onFileChange,
  onAdd,
  onRemoveItem,
  summarizeItem = defaultSummarize,
}: ProductConfigOtherRequirementsPanelProps) {
  const useFile = shouldUseOtherRequirementFileUpload(otherRequirementType, otherRequirementContentType)

  return (
    <ProductConfigSubsection
      title="Other requirements"
      requirement="optional"
      description="Extra items applicants must provide, as text or a document."
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-start">
        <ProductConfigSelect
          label="Requirement type"
          placeholder="Requirement type"
          value={otherRequirementType}
          options={otherRequirementOptions}
          onChange={onTypeChange}
          requirement="optional"
        />
        <ProductConfigSelect
          label="Content Type"
          placeholder="Content type"
          value={otherRequirementContentType}
          options={contentTypeOptions}
          onChange={onContentTypeChange}
          requirement="optional"
        />
        {useFile ? (
          <div className="min-w-0 w-full">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700" htmlFor={filePickerId}>
                Document
              </label>
              <button
                id={filePickerId}
                type="button"
                onClick={() => uploadInputRef.current?.click()}
                title={otherRequirementFile?.name || undefined}
                aria-label="Choose document file"
                className={cn(productConfigControlClass, "flex items-center gap-2 text-left")}
              >
                <span
                  className={`min-w-0 flex-1 truncate ${otherRequirementFile ? "font-medium text-gray-900" : "text-gray-400"}`}
                >
                  {otherRequirementFile ? otherRequirementFile.name : "No file selected"}
                </span>
                <Upload className="size-4 shrink-0 text-brand" aria-hidden />
              </button>
            </div>
            <input
              ref={uploadInputRef}
              type="file"
              className="hidden"
              accept=".pdf,application/pdf"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null
                if (f) {
                  const err = getPdfFileValidationError(f)
                  if (err) {
                    toast.error(err)
                    e.target.value = ""
                    return
                  }
                }
                onFileChange(f)
                if (f && !otherRequirementDescription.trim()) {
                  onDescriptionChange(f.name)
                }
                e.target.value = ""
              }}
            />
          </div>
        ) : (
          <ProductConfigInput
            label="Description"
            placeholder="Description"
            value={otherRequirementDescription}
            onChange={onDescriptionChange}
            requirement="optional"
          />
        )}
        <div className="w-full space-y-1.5">
          <span className="invisible hidden text-sm font-medium text-gray-700 select-none lg:block" aria-hidden>
            Add
          </span>
          <Button type="button" onClick={onAdd} className={addButtonClassName}>
            <Plus className="size-4" />
            Add
          </Button>
        </div>
      </div>

      {otherRequirements.length > 0 ? (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {otherRequirements.map((item, index) => (
            <li
              key={`${item.type}-${index}`}
              className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand/10 text-brand">
                <ListChecks className="size-4" />
              </span>
              <span className="min-w-0 flex-1 text-sm leading-snug text-gray-800">{summarizeItem(item)}</span>
              {onRemoveItem ? (
                <button
                  type="button"
                  onClick={() => onRemoveItem(index)}
                  className="shrink-0 rounded-md p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  aria-label="Remove requirement"
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </ProductConfigSubsection>
  )
}
