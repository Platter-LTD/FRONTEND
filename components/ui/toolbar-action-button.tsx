"use client"

import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  showTableHeaderLabel,
  tableHeaderLabelsPref,
  usePreference,
  type TableHeaderActionId,
} from "@/lib/table-preferences"

/**
 * A table-header toolbar button whose label visibility follows the user's
 * "header labels" preference: icon-only (with a tooltip) by default, or
 * icon + label when enabled. Shared by `TableCardHeader` and the full view.
 */
export function ToolbarActionButton({
  id,
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  id: TableHeaderActionId
  icon: LucideIcon
  label: string
  onClick?: () => void
  disabled?: boolean
}) {
  const [labels] = usePreference(tableHeaderLabelsPref)
  const withLabel = showTableHeaderLabel(labels, id)

  const button = (
    <Button
      type="button"
      variant="outline"
      size={withLabel ? "default" : "icon"}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="text-gray-700"
    >
      <Icon />
      {withLabel && label}
    </Button>
  )

  if (withLabel) return button
  return (
    <TooltipProvider delayDuration={600}>
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
