"use client"

import type { ChangeEvent, RefObject } from "react"
import { Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ProductConfigInput } from "@/components/drawers/product-config-form-fields"

export type ProductDocumentDraft = {
  name: string
  file?: File
  fileUrl?: string
}

type ProductConfigDocumentRequirementsPanelProps = {
  documentName: string
  onDocumentNameChange: (value: string) => void
  documents: ProductDocumentDraft[]
  onDocumentsChange: (documents: ProductDocumentDraft[]) => void
  uploadInputRef: RefObject<HTMLInputElement>
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void
  /** e.g. “Requires customer to fill the form” */
  helperText?: string
  uploadVariant?: "button" | "card"
}

export function ProductConfigDocumentRequirementsPanel({
  documentName,
  onDocumentNameChange,
  documents,
  onDocumentsChange,
  uploadInputRef,
  onUpload,
  helperText = "Requires customer to fill the form",
  uploadVariant = "button",
}: ProductConfigDocumentRequirementsPanelProps) {
  return (
    <div className="space-y-2 rounded-md border border-dashed border-[#cdbf8b] p-4">
      <p className="text-sm font-medium text-gray-700">
        Document Requirements{" "}
        <span className="font-normal text-gray-500">(Optional)</span>
      </p>
      <p className="text-xs text-gray-500">
        {helperText}. You can skip this section or add documents later.
      </p>

      <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_auto]">
        <ProductConfigInput
          label="Name Document"
          placeholder="Name document"
          value={documentName}
          onChange={onDocumentNameChange}
          requirement="optional"
        />
        {uploadVariant === "card" ? (
          <div className="flex flex-col gap-2 rounded-md border border-gray-200 p-3 sm:flex-row sm:items-center">
            <Upload className="shrink-0 text-gray-500" size={18} />
            <div className="min-w-0 flex-1 text-xs text-gray-600">
              Add document <span className="text-gray-400">PDF format • Max. 5MB</span>
            </div>
            <Button
              type="button"
              onClick={() => uploadInputRef.current?.click()}
              className="h-10 shrink-0 bg-[#9A813F] text-white hover:bg-[#8A7335]"
            >
              Upload
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            onClick={() => uploadInputRef.current?.click()}
            className="h-10 bg-[#9A813F] text-white hover:bg-[#8A7335]"
          >
            Upload
          </Button>
        )}
        <input
          ref={uploadInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={onUpload}
          className="hidden"
        />
      </div>

      {documents.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {documents.map((doc, index) => (
            <span
              key={`${doc.file?.name ?? doc.fileUrl ?? doc.name}-${index}`}
              className="inline-flex items-center gap-2 rounded-md bg-[#9A813F] px-3 py-2 text-xs text-white"
            >
              {doc.name}
              <button
                type="button"
                onClick={() => onDocumentsChange(documents.filter((_, current) => current !== index))}
                className="text-white/90 hover:text-white"
                aria-label={`Remove ${doc.name}`}
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-500">No documents added yet.</p>
      )}
    </div>
  )
}
