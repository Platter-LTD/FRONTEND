"use client"

import type { RefObject } from "react"
import { Upload, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  ProductConfigInput,
  ProductConfigSelect,
} from "@/components/drawers/product-config-form-fields"
import { shouldUseOtherRequirementFileUpload, type OtherRequirementDraft } from "@/lib/otherRequirementPayload"
import { getPdfFileValidationError } from "@/lib/fileValidation"

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
  addButtonClassName = "h-10 w-full bg-[#9A813F] text-white hover:bg-[#8A7335]",
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
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-700">
        Other Requirements <span className="font-normal text-gray-500">(Optional)</span>
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-start">
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
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700" htmlFor={filePickerId}>
                Document
              </label>
              <button
                id={filePickerId}
                type="button"
                onClick={() => uploadInputRef.current?.click()}
                title={otherRequirementFile?.name || undefined}
                aria-label="Choose document file"
                className="flex h-10 w-full min-w-0 max-w-full items-center gap-2 rounded-md border border-[#e5e7eb] bg-white px-3 text-left text-sm outline-none transition hover:bg-gray-50/80 focus:border-[#9A813F] focus:ring-2 focus:ring-[#9A813F]/20"
              >
                <span
                  className={`min-w-0 flex-1 truncate ${otherRequirementFile ? "font-medium text-gray-900" : "text-gray-400"}`}
                >
                  {otherRequirementFile ? otherRequirementFile.name : "No file selected"}
                </span>
                <Upload className="h-4 w-4 shrink-0 text-[#9A813F]" aria-hidden />
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
        <div className="w-full space-y-2">
          <span className="invisible block text-sm font-medium text-gray-700 select-none" aria-hidden>
            Requirement type
          </span>
          <Button type="button" onClick={onAdd} className={addButtonClassName}>
            Add
          </Button>
        </div>
      </div>

      {otherRequirements.length > 0 ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {otherRequirements.map((item, index) => (
            <div
              key={`${item.type}-${index}`}
              className={`flex items-start gap-2 rounded-md bg-[#9A813F] px-3 py-3 text-sm text-white ${onRemoveItem ? "justify-between" : ""}`}
            >
              <span className="min-w-0 flex-1 leading-snug">{summarizeItem(item)}</span>
              {onRemoveItem ? (
                <button
                  type="button"
                  onClick={() => onRemoveItem(index)}
                  className="shrink-0 text-white/90 hover:text-white"
                  aria-label="Remove requirement"
                >
                  <X size={18} />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
