"use client"

import { AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  pepClassificationLabel,
  pepLevelOfExposure,
  pepPresentPosition,
  pepPreviousPosition,
  pepSearchUiResult,
  pepSourceNote,
  type SanctionsScreening,
} from "@/lib/sanctionsScreening"

type PepSearchBlockProps = {
  screening: SanctionsScreening | null
  /** When true and screening is missing, show a Pending pill (loan/mortgage awaiting screen). */
  showPendingWhenMissing?: boolean
  /** Draw top divider when customer fields sit above this block. */
  withDivider?: boolean
}

const PILL_STYLES: Record<
  NonNullable<ReturnType<typeof pepSearchUiResult>>,
  { className: string; label: string }
> = {
  positive: {
    className: "bg-[#FEE4E2] text-[#B42318]",
    label: "Positive",
  },
  negative: {
    className: "bg-[#ECFDF3] text-[#067647]",
    label: "Negative",
  },
  pending: {
    className: "bg-[#F2F4F7] text-[#475467]",
    label: "Pending",
  },
  error: {
    className: "bg-[#FEF3F2] text-[#B42318]",
    label: "Error",
  },
  skipped: {
    className: "bg-[#F2F4F7] text-[#667085]",
    label: "Skipped",
  },
}

export function PepSearchBlock({
  screening,
  showPendingWhenMissing = false,
  withDivider = true,
}: PepSearchBlockProps) {
  const result = pepSearchUiResult(screening) ?? (showPendingWhenMissing ? "pending" : null)
  if (!result) return null

  const pill = PILL_STYLES[result]
  const showDetail = result === "positive" && screening

  return (
    <div className={cn(withDivider && "mt-6 border-t border-[#E4E7EC] pt-6")}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-[#98A2B3]">PEP Search</p>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
            pill.className,
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
          {pill.label}
        </span>
      </div>

      {showDetail ? (
        <div className="mt-4 rounded-[10px] border border-[#FDA29B] border-l-[3px] border-l-[#F04438] bg-[#FEF3F2] px-[18px] py-4">
          <div className="mb-3.5 flex items-center gap-2 text-[13px] font-bold text-[#B42318]">
            <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={2.2} />
            PEP match found — review required
          </div>

          <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
            <div>
              <dt className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[#912018]/75">
                Level of Exposure
              </dt>
              <dd className="text-[14.5px] text-[#1D2939]">{pepLevelOfExposure(screening)}</dd>
            </div>
            <div>
              <dt className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[#912018]/75">
                PEP Classification
              </dt>
              <dd className="text-[14.5px] text-[#1D2939]">{pepClassificationLabel(screening)}</dd>
            </div>
            <div>
              <dt className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[#912018]/75">
                Present Position
              </dt>
              <dd className="text-[14.5px] text-[#1D2939]">{pepPresentPosition(screening)}</dd>
            </div>
            <div>
              <dt className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[#912018]/75">
                Previous Position
              </dt>
              <dd className="text-[14.5px] text-[#1D2939]">{pepPreviousPosition(screening)}</dd>
            </div>
          </dl>

          {(screening.matches?.length ?? 0) > 0 ? (
            <div className="mt-4">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#912018]/75">
                Matches ({screening.matchCount ?? screening.matches?.length})
              </p>
              <ul className="space-y-1.5">
                {screening.matches!.map((m, i) => (
                  <li
                    key={m.id || `${m.caption}-${i}`}
                    className="rounded-md bg-white/60 px-2.5 py-1.5 text-[13px] text-[#1D2939]"
                  >
                    <span className="font-semibold">{m.caption || m.id || "Match"}</span>
                    {m.matchType ? (
                      <span className="ml-2 text-[11px] text-[#912018]/80">
                        {m.matchType.replaceAll("_", " ")}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {screening.message ? (
            <p className="mt-3 text-[12px] leading-relaxed text-[#912018]/90">{screening.message}</p>
          ) : null}

          <p className="mt-3.5 text-[11.5px] italic text-[#912018]/70">{pepSourceNote(screening)}</p>
        </div>
      ) : null}

      {result === "error" && screening?.message ? (
        <p className="mt-3 text-xs text-[#B42318]">{screening.message}</p>
      ) : null}
    </div>
  )
}
