"use client"

import { useRef, useState } from "react"
import { ExternalLink, FileUp, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  canMerchantUploadOfferLetter,
  extractOfferLetter,
  uploadOfferLetter,
} from "@/lib/offerLetterApi"
import { isPdfFile } from "@/lib/isPdfFile"

const PLATA_ACCENT = "#9A813F"

type OfferLetterUploadControlProps = {
  applicationId: string
  detail: Record<string, unknown> | null
  onUploaded?: () => void
}

export function OfferLetterUploadControl({
  applicationId,
  detail,
  onUploaded,
}: OfferLetterUploadControlProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const offer = extractOfferLetter(detail)
  const canUpload = canMerchantUploadOfferLetter(detail)

  if (!canUpload && !offer?.pdfUrl) return null

  const handlePick = () => inputRef.current?.click()

  const handleFile = async (file: File | null) => {
    if (!file) return
    if (!isPdfFile(file)) {
      toast.error("Offer letter must be a PDF file")
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Offer letter must be 10 MB or smaller")
      return
    }

    setBusy(true)
    try {
      const res = await uploadOfferLetter(applicationId, file)
      if (!res.success) throw new Error(res.error || "Upload failed")
      toast.success("Offer letter uploaded — applicant notified")
      onUploaded?.()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Upload failed")
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-2">
      {offer?.pdfUrl ? (
        <a
          href={offer.pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8B7355] hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {offer.pdfFileName || "View current offer letter"}
        </a>
      ) : (
        <p className="text-xs text-gray-500">No custom offer letter uploaded yet.</p>
      )}

      {canUpload ? (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={handlePick}
            className="h-8 text-white hover:opacity-90"
            style={{ backgroundColor: PLATA_ACCENT }}
          >
            {busy ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileUp className="mr-2 h-3.5 w-3.5" />
            )}
            {offer?.pdfUrl ? "Replace offer letter PDF" : "Upload offer letter PDF"}
          </Button>
          <p className="text-[11px] leading-relaxed text-gray-400">
            PDF only, max 10 MB. Replaces the system-generated letter while the offer is pending
            acceptance.
          </p>
        </>
      ) : null}
    </div>
  )
}
