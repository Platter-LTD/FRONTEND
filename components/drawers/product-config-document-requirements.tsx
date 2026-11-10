"use client"

import type { ChangeEvent, RefObject } from "react"
import { FileText, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ProductConfigInput, ProductConfigSubsection } from "@/components/drawers/product-config-form-fields"

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
  const uploadButton = (
    <Button
      type="button"
      variant="outline"
      onClick={() => uploadInputRef.current?.click()}
      className="h-10 gap-1.5 rounded-lg border-brand/40 px-4 text-brand hover:bg-brand/5 hover:text-brand"
    >
      <Upload className="size-4" />
      Upload PDF
    </Button>
  )
  return (
    <ProductConfigSubsection
      title="Document requirements"
      requirement="optional"
      description={`${helperText}. You can skip this or add documents later.`}
    >
      <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_auto]">
        <ProductConfigInput
          label="Document name"
          placeholder="e.g. Loan agreement form"
          value={documentName}
          onChange={onDocumentNameChange}
        />
        {uploadVariant === "card" ? (
          <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-2 pl-3">
            <span className="text-xs text-gray-500">PDF · Max. 5MB</span>
            {uploadButton}
          </div>
        ) : (
          uploadButton
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
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {documents.map((doc, index) => (
            <li
              key={`${doc.file?.name ?? doc.fileUrl ?? doc.name}-${index}`}
              className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand/10 text-brand">
                <FileText className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-gray-900">{doc.name}</span>
                <span className="block truncate text-xs text-gray-500">
                  {doc.file?.name ?? (doc.fileUrl ? "Uploaded" : "PDF")}
                </span>
              </span>
              <button
                type="button"
                onClick={() => onDocumentsChange(documents.filter((_, current) => current !== index))}
                className="shrink-0 rounded-md p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                aria-label={`Remove ${doc.name}`}
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-gray-200 bg-white px-3 py-3 text-center text-xs text-gray-500">
          No documents added yet.
        </p>
      )}
    </ProductConfigSubsection>
  )
}
