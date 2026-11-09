"use client"

import { Settings2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  TABLE_HEADER_ACTIONS,
  tableDensityPref,
  tableFilterModePref,
  tableHeaderLabelsPref,
  tableRememberLayoutsPref,
  tableScrollbarPositionPref,
  tableSizePref,
  usePreference,
} from "@/lib/table-preferences"
import { cn } from "@/lib/utils"

function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex-1 cursor-pointer rounded-md px-2 py-1 text-xs font-medium transition-colors",
            value === o.value ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-700"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Row({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div>
        <p className="text-xs font-medium text-gray-700">{label}</p>
        {description && <p className="text-[11px] leading-snug text-gray-400">{description}</p>}
      </div>
      {children}
    </div>
  )
}

/**
 * Table preferences (size, density, filter placement, scrollbar, remembered
 * layouts, button labels). Applies to every table in the app and is saved in
 * this browser. Lives in the table toolbar because the app has no
 * preferences page to host it.
 */
export function TableSettings({ container }: { container?: HTMLElement | null }) {
  const [size, setSize] = usePreference(tableSizePref)
  const [density, setDensity] = usePreference(tableDensityPref)
  const [filterMode, setFilterMode] = usePreference(tableFilterModePref)
  const [scrollbar, setScrollbar] = usePreference(tableScrollbarPositionPref)
  const [remember, setRemember] = usePreference(tableRememberLayoutsPref)
  const [labels, setLabels] = usePreference(tableHeaderLabelsPref)
  const allLabelled = TABLE_HEADER_ACTIONS.every((a) => labels[a.id] === true)

  return (
    <Popover>
      <TooltipProvider delayDuration={600}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="icon" aria-label="Table settings" className="text-gray-700">
                <Settings2 />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>Table settings</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent align="end" container={container} className="w-72 space-y-4 p-4">
        <div>
          <p className="text-sm font-medium text-gray-900">Table settings</p>
          <p className="text-xs text-gray-500">Applies to every table, saved in this browser.</p>
        </div>
        <Row label="Table size" description="Smaller fits more columns before any are hidden.">
          <Segmented
            label="Table size"
            value={size}
            onChange={setSize}
            options={[
              { value: "small", label: "Small" },
              { value: "medium", label: "Medium" },
              { value: "large", label: "Large" },
            ]}
          />
        </Row>
        <Row label="Row density">
          <Segmented
            label="Row density"
            value={density}
            onChange={setDensity}
            options={[
              { value: "comfortable", label: "Comfortable" },
              { value: "compact", label: "Compact" },
            ]}
          />
        </Row>
        <Row label="Filters">
          <Segmented
            label="Filters"
            value={filterMode}
            onChange={setFilterMode}
            options={[
              { value: "inline", label: "Visible" },
              { value: "collapsible", label: "Collapsible" },
              { value: "modal", label: "Dialog" },
            ]}
          />
        </Row>
        <Row label="Horizontal scrollbar">
          <Segmented
            label="Horizontal scrollbar"
            value={scrollbar}
            onChange={setScrollbar}
            options={[
              { value: "bottom", label: "Bottom" },
              { value: "top", label: "Top" },
            ]}
          />
        </Row>
        <div className="space-y-3 border-t border-gray-100 pt-3">
          <label className="flex cursor-pointer items-center justify-between gap-3 text-xs font-medium text-gray-700">
            Remember column layouts
            <Switch checked={remember} onCheckedChange={setRemember} />
          </label>
          <label className="flex cursor-pointer items-center justify-between gap-3 text-xs font-medium text-gray-700">
            Show button labels
            <Switch
              checked={allLabelled}
              onCheckedChange={(on) =>
                setLabels(on ? Object.fromEntries(TABLE_HEADER_ACTIONS.map((a) => [a.id, true])) : {})
              }
            />
          </label>
        </div>
      </PopoverContent>
    </Popover>
  )
}
