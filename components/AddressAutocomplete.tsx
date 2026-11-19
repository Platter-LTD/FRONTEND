"use client"

import * as React from "react"
import { CheckCircle2, Loader2, MapPin } from "lucide-react"
import { placesConfigured, usePlacesAutocomplete } from "@/hooks/usePlacesAutocomplete"

/**
 * Address field backed by Google Places. The address only counts as valid once the user
 * picks a Google suggestion: `onChange(text, true)`. Typing again clears it: `onChange(text, false)`.
 */
export function AddressAutocomplete({
  value,
  verified,
  onChange,
  placeholder = "Residential Address",
}: {
  value: string
  verified: boolean
  onChange: (text: string, verified: boolean) => void
  placeholder?: string
}) {
  const [open, setOpen] = React.useState(false)
  const [active, setActive] = React.useState(-1)
  const { suggestions, isLoading, error } = usePlacesAutocomplete(value, !verified)
  const listId = React.useId()

  const pick = (description: string) => {
    onChange(description, true)
    setOpen(false)
    setActive(-1)
  }

  const showList = open && !verified && value.trim().length >= 3

  return (
    <div className="relative">
      <div className="flex items-center gap-2 border rounded-lg p-5 bg-white shadow-sm">
        <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
        <input
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value, false)
            setOpen(true)
            setActive(-1)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (!showList || suggestions.length === 0) return
            if (e.key === "ArrowDown") {
              e.preventDefault()
              setActive((i) => (i + 1) % suggestions.length)
            } else if (e.key === "ArrowUp") {
              e.preventDefault()
              setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1))
            } else if (e.key === "Enter" && active >= 0) {
              e.preventDefault()
              pick(suggestions[active].description)
            } else if (e.key === "Escape") {
              setOpen(false)
            }
          }}
          className="w-full bg-transparent outline-none text-gray-900 placeholder-gray-400"
        />
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-gray-400 shrink-0" /> : null}
        {verified ? <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" aria-label="Address verified" /> : null}
      </div>

      {showList && (suggestions.length > 0 || error || (!isLoading && placesConfigured)) ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border bg-white py-1 shadow-lg"
        >
          {error ? (
            <li className="px-4 py-2 text-xs text-red-600">Address lookup failed: {error}</li>
          ) : suggestions.length === 0 ? (
            <li className="px-4 py-2 text-xs text-gray-500">No matching address found</li>
          ) : (
            suggestions.map((s, i) => (
              <li
                key={s.placeId}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault()
                  pick(s.description)
                }}
                className={`cursor-pointer px-4 py-2 text-sm ${i === active ? "bg-[#F5F0E8]" : "hover:bg-gray-50"}`}
              >
                <p className="font-medium text-gray-900">{s.mainText}</p>
                {s.secondaryText ? <p className="text-xs text-gray-500">{s.secondaryText}</p> : null}
              </li>
            ))
          )}
        </ul>
      ) : null}

      {!placesConfigured ? (
        <p className="mt-1 text-xs text-amber-700">Address lookup is not configured (NEXT_PUBLIC_GOOGLE_PLACES_KEY).</p>
      ) : !verified && value.trim() ? (
        <p className="mt-1 text-xs text-gray-500">Select an address from the suggestions to verify it.</p>
      ) : null}
    </div>
  )
}

export default AddressAutocomplete
