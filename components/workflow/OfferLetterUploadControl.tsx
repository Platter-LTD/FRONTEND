"use client"

import { useRef, useState } from "react"
import { ExternalLink, FileUp, Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  canGenerateOfferLetter,
  canUploadOfferLetterChoice,
  extractOfferLetter,
  extractPostApprovalFulfillment,
  generateOfferLetter,
  isAwaitingOfferLetterChoice,
  merchantOfferLetterUploadBlockReason,
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
  const [busy, setBusy] = useState<"generate" | "upload" | null>(null)
  const offer = extractOfferLetter(detail)
  const fulfillment = extractPostApprovalFulfillment(detail)
  const awaitingChoice = isAwaitingOfferLetterChoice(detail)
  const canGenerate = canGenerateOfferLetter(detail)
  const canUpload = canUploadOfferLetterChoice(detail)
  const blockReason = merchantOfferLetterUploadBlockReason(detail)
  const letterAlreadySent = Boolean(fulfillment?.offerSentAt)
  const sourceLabel =
    fulfillment?.documentSource === "merchant_upload"
      ? "Custom PDF upload"
      : fulfillment?.documentSource
        ? "System-generated letter"
        : null

  if (!awaitingChoice && !offer?.pdfUrl && !letterAlreadySent) return null

  const handlePick = () => inputRef.current?.click()

  const handleGenerate = async () => {
    setBusy("generate")
    try {
      const res = await generateOfferLetter(applicationId)
      if (!res.success) throw new Error(res.error || "Generate failed")
      toast.success(
        letterAlreadySent
          ? "System letter regenerated — applicant notified"
          : "System-generated offer letter sent — applicant notified",
      )
      onUploaded?.()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Generate failed")
    } finally {
      setBusy(null)
    }
  }

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

    setBusy("upload")
    try {
      const res = await uploadOfferLetter(applicationId, file)
      if (!res.success) throw new Error(res.error || "Upload failed")
      toast.success(
        letterAlreadySent
          ? "Custom offer letter replaced — applicant notified"
          : "Custom offer letter uploaded — applicant notified",
      )
      onUploaded?.()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Upload failed")
    } finally {
      setBusy(null)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-2">
      {offer?.pdfUrl ? (
        <div className="space-y-1">
          <a
            href={offer.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8B7355] hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {offer.pdfFileName || "View current offer letter"}
          </a>
          {sourceLabel || letterAlreadySent ? (
            <p className="text-[11px] leading-relaxed text-gray-400">
              {sourceLabel ? `${sourceLabel}. ` : ""}
              {letterAlreadySent && fulfillment?.offerSentAt
                ? `Sent ${new Date(fulfillment.offerSentAt).toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}. `
                : ""}
              {awaitingChoice
                ? "The backend may auto-send a system letter when the applicant finishes the virtual tour — you did not have to click Generate. Use the buttons below to replace it before they accept."
                : "Waiting for applicant to accept or decline."}
            </p>
          ) : null}
        </div>
      ) : awaitingChoice ? (
        <p className="text-xs text-gray-500">
          Choose how to send the offer letter. Approval alone does not send a letter.
        </p>
      ) : null}

      {awaitingChoice && (canGenerate || canUpload) ? (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
          />
          <div className="flex flex-wrap gap-2">
            {canGenerate ? (
              <Button
                type="button"
                size="sm"
                disabled={busy !== null}
                onClick={() => void handleGenerate()}
                className="h-8 text-white hover:opacity-90"
                style={{ backgroundColor: PLATA_ACCENT }}
              >
                {busy === "generate" ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-3.5 w-3.5" />
                )}
                {letterAlreadySent ? "Regenerate system letter" : "Generate system letter"}
              </Button>
            ) : null}
            {canUpload ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy !== null}
                onClick={handlePick}
                className="h-8 border-[#E8DFCF] text-[#8B7355] hover:bg-[#FFFBF5]"
              >
                {busy === "upload" ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileUp className="mr-2 h-3.5 w-3.5" />
                )}
                {letterAlreadySent ? "Replace with custom PDF" : "Upload custom PDF"}
              </Button>
            ) : null}
          </div>
          <p className="text-[11px] leading-relaxed text-gray-400">
            PDF only for uploads, max 10 MB. Both options email and notify the applicant.
          </p>
        </>
      ) : !awaitingChoice && letterAlreadySent ? (
        <p className="text-[11px] leading-relaxed text-gray-400">
          Offer letter sent
          {fulfillment?.offerSentAt
            ? ` ${new Date(fulfillment.offerSentAt).toLocaleString("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              })}`
            : ""}
          . Waiting for applicant to accept or decline.
        </p>
      ) : blockReason ? (
        <p className="text-[11px] leading-relaxed text-amber-800">{blockReason}</p>
      ) : null}
    </div>
  )
}
