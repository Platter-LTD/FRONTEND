"use client"

import type React from "react"
import { useRef, useState, useEffect } from "react"
import { UploadCloud, Check, AlertCircle } from "lucide-react"
import { isPdfFile } from "@/lib/isPdfFile"

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024

export interface UploadCardProps {
  id: string
  title: string
  hint?: string
  accept?: string
  maxSizeBytes?: number
  buttonColor?: string
  onFileSelected?: (file: File | null) => void
  error?: boolean
  initialFile?: File | null
}

function validateFile(file: File, maxSizeBytes: number): string | null {
  if (!isPdfFile(file)) {
    return "Only PDF files are allowed."
  }
  if (file.size > maxSizeBytes) {
    return `File must be ${Math.round(maxSizeBytes / (1024 * 1024))}MB or smaller.`
  }
  return null
}

const UploadCard: React.FC<UploadCardProps> = ({
  id,
  title,
  hint = "PDF format • Max. 5MB",
  accept = ".pdf,application/pdf",
  maxSizeBytes = DEFAULT_MAX_BYTES,
  buttonColor = "#7C3AED",
  onFileSelected,
  error = false,
  initialFile = null,
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(initialFile?.name ?? null)
  const [isUploaded, setIsUploaded] = useState(Boolean(initialFile))
  const [selectionError, setSelectionError] = useState<string | null>(null)

  useEffect(() => {
    setFileName(initialFile?.name ?? null)
    setIsUploaded(Boolean(initialFile))
    if (initialFile) setSelectionError(null)
  }, [initialFile])

  const handleClick = () => inputRef.current?.click()

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target
    const file = input.files?.[0] ?? null
    input.value = ""

    if (!file) {
      setFileName(null)
      setIsUploaded(false)
      setSelectionError(null)
      onFileSelected?.(null)
      return
    }

    const msg = validateFile(file, maxSizeBytes)
    if (msg) {
      setSelectionError(msg)
      setFileName(file.name)
      setIsUploaded(false)
      onFileSelected?.(null)
      return
    }

    setSelectionError(null)
    setFileName(file.name)
    setIsUploaded(true)
    onFileSelected?.(file)
  }

  const showErrorStyle = error || !!selectionError
  const showSuccessRow = fileName && isUploaded && !selectionError

  return (
    <div
      className={`flex items-center justify-between p-4 rounded-lg border-2 ${
        showErrorStyle ? "border-red-500 bg-red-50" : "border-gray-200 bg-white"
      }`}
    >
      <div className="flex items-center gap-4 flex-1">
        <div
          className={`w-12 h-12 rounded-lg flex items-center justify-center ${showErrorStyle ? "bg-red-100" : "bg-gray-100"}`}
        >
          <UploadCloud className={`w-6 h-6 ${showErrorStyle ? "text-red-600" : "text-gray-600"}`} />
        </div>

        <div className="flex-1">
          <div className={`font-medium ${showErrorStyle ? "text-red-900" : "text-gray-900"}`}>{title}</div>
          <div className={`text-sm ${selectionError ? "text-red-700" : "text-gray-500"}`}>{hint}</div>
          {selectionError && fileName && (
            <div className="text-sm mt-1 flex items-start gap-1 text-red-600">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
              <span>
                <span className="font-medium">{fileName}</span>
                <span className="block text-red-600">{selectionError}</span>
              </span>
            </div>
          )}
          {showSuccessRow && (
            <div className="text-sm mt-1">
              <Check className="w-4 h-4 inline text-green-600 mr-1" aria-hidden />
              <span className="text-green-600">{fileName}</span>
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={handleClick}
        className="px-6 py-2 rounded-lg text-white font-medium hover:opacity-90 transition"
        style={{ backgroundColor: buttonColor }}
      >
        {isUploaded ? "Replace" : "Upload"}
      </button>

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        onChange={onChange}
        className="hidden"
      />
    </div>
  )
}

export default UploadCard
