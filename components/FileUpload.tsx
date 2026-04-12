"use client"

import type React from "react"
import { useState } from "react"
import { UploadCloud, Check, AlertCircle } from "lucide-react"

interface FileUploadProps {
  label: string
  description: string
  /** Called with a file on success, or null when the selection is cleared or invalid. */
  onFileSelect?: (file: File | null) => void
  buttonColor?: string
  accept?: string
  maxSizeBytes?: number
}

function validateByAccept(file: File, accept: string): boolean {
  const tokens = accept.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean)
  const name = file.name.toLowerCase()
  const mime = (file.type || "").toLowerCase()
  for (const t of tokens) {
    if (t.startsWith(".")) {
      if (name.endsWith(t)) return true
    } else if (t.endsWith("/*")) {
      const prefix = t.slice(0, -1)
      if (mime.startsWith(prefix)) return true
    } else if (mime === t) {
      return true
    }
  }
  return false
}

const FileUpload: React.FC<FileUploadProps> = ({
  label,
  description,
  onFileSelect,
  buttonColor = "#9A813F",
  accept = "image/png,image/jpeg,image/jpg,.png,.jpg,.jpeg",
  maxSizeBytes = 5 * 1024 * 1024,
}) => {
  const [fileName, setFileName] = useState<string | null>(null)
  const [isUploaded, setIsUploaded] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target
    const file = input.files?.[0] ?? null
    input.value = ""

    if (!file) {
      setFileName(null)
      setIsUploaded(false)
      setErrorMessage(null)
      onFileSelect?.(null)
      return
    }

    if (!validateByAccept(file, accept)) {
      setErrorMessage("This file type is not allowed for this upload.")
      setFileName(file.name)
      setIsUploaded(false)
      onFileSelect?.(null)
      return
    }

    if (file.size > maxSizeBytes) {
      setErrorMessage(`File must be ${Math.round(maxSizeBytes / (1024 * 1024))}MB or smaller.`)
      setFileName(file.name)
      setIsUploaded(false)
      onFileSelect?.(null)
      return
    }

    setErrorMessage(null)
    setFileName(file.name)
    setIsUploaded(true)
    onFileSelect?.(file)
  }

  const inputId = `file-upload-${label.replace(/\s+/g, "-").toLowerCase()}`
  const showError = !!errorMessage

  return (
    <div
      className={`flex items-center justify-between border rounded-lg p-5 shadow-sm ${
        showError ? "border-red-400 bg-red-50" : "border-gray-200 bg-white"
      }`}
    >
      <div className="flex items-center space-x-3 flex-1">
        <div
          className={`w-12 h-12 rounded-full border flex items-center justify-center ${
            showError ? "bg-red-100 border-red-200" : "bg-gray-50 border-gray-100"
          }`}
        >
          <UploadCloud className={`w-5 h-5 ${showError ? "text-red-600" : "text-gray-900"}`} />
        </div>

        <div className="flex-1">
          <p className={`text-sm font-medium ${showError ? "text-red-900" : "text-gray-700"}`}>{label}</p>
          <p className={`text-xs ${showError ? "text-red-700" : "text-gray-500"}`}>{description}</p>
          {showError && fileName && (
            <div className="text-sm mt-1 flex items-start gap-1 text-red-600">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
              <span>
                <span className="font-medium">{fileName}</span>
                <span className="block">{errorMessage}</span>
              </span>
            </div>
          )}
          {fileName && isUploaded && !showError && (
            <div className="text-sm mt-1">
              <Check className="w-4 h-4 inline text-green-600 mr-1" aria-hidden />
              <span className="text-green-600">{fileName}</span>
            </div>
          )}
        </div>
      </div>

      <div>
        <label htmlFor={inputId} className="cursor-pointer">
          <input id={inputId} type="file" className="hidden" accept={accept} onChange={handleFileChange} />
          <span
            className="px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-colors inline-flex items-center"
            style={{ backgroundColor: buttonColor, color: "#fff" }}
          >
            {isUploaded ? "Replace" : "Upload"}
          </span>
        </label>
      </div>
    </div>
  )
}

export default FileUpload
