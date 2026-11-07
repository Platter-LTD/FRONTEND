"use client";

import { useMemo, useState } from "react";
import { CheckIcon, ChevronsUpDownIcon, GlobeIcon, Loader2Icon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useCountries } from "@/hooks/useCountries";
import { cn } from "@/lib/utils";

interface CountrySelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  /** Applied to the dropdown panel. */
  className?: string;
  /** Applied to the trigger button (same role as before, so existing callers keep their look). */
  triggerClassName?: string;
  disabled?: boolean;
}

/** ISO 3166 alpha-2 code → flag emoji (e.g. "ng" → 🇳🇬). */
function flagEmoji(code: string): string {
  if (!/^[a-z]{2}$/i.test(code)) return "";
  return String.fromCodePoint(...code.toUpperCase().split("").map((c) => 0x1f1a5 + c.charCodeAt(0)));
}

/** Lowercase and strip accents, so "aland" finds "Åland Islands". */
function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/**
 * Ranks a country for the search text (cmdk's default is fuzzy, which makes "+234" match "+423").
 * Higher is better; 0 hides the row.
 */
function scoreCountry(name: string, search: string, keywords: string[] = []): number {
  const q = normalize(search);
  if (!q) return 1;
  const n = normalize(name);
  const [code = "", dial = ""] = keywords.map(normalize);
  const digits = q.replace(/^\+/, "");

  if (n.startsWith(q)) return 1;
  if (n.split(/[\s,()-]+/).some((word) => word.startsWith(q))) return 0.8;
  if (code === q) return 0.75;
  if (digits && /^\d+$/.test(digits) && dial.replace("+", "").startsWith(digits)) return 0.7;
  if (q.length >= 3 && n.includes(q)) return 0.5;
  return 0;
}

/**
 * Searchable country picker. Search matches country name, ISO code ("ng") and dial code ("+234").
 * Keyboard: type to filter, ↑/↓ to move, Enter to pick, Esc to close.
 */
export function CountrySelect({
  value,
  onValueChange,
  placeholder = "Select country",
  className,
  triggerClassName,
  disabled,
}: CountrySelectProps) {
  const { countries, loading, error } = useCountries();
  const [open, setOpen] = useState(false);

  const selected = useMemo(() => countries.find((c) => c.code === value), [countries, value]);

  const label = selected ? selected.name : loading ? "Loading…" : (error ?? placeholder);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          disabled={disabled || loading}
          data-placeholder={selected ? undefined : ""}
          data-state={error ? "error" : open ? "open" : "closed"}
          className={cn(
            // Mirrors SelectTrigger so callers' triggerClassName overrides look the same as before.
            "border-input data-[placeholder]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 dark:hover:bg-input/50 flex h-9 w-fit items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-left text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
            triggerClassName,
          )}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            {selected ? (
              <span className="text-lg leading-none" aria-hidden="true">
                {flagEmoji(selected.code)}
              </span>
            ) : loading ? (
              <Loader2Icon className="size-4 shrink-0 animate-spin opacity-60" aria-hidden="true" />
            ) : (
              <GlobeIcon className="size-4 shrink-0 opacity-50" aria-hidden="true" />
            )}
            <span className="truncate">{label}</span>
          </span>
          <ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" aria-hidden="true" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={6}
        className={cn(
          "w-[var(--radix-popover-trigger-width)] min-w-[280px] overflow-hidden rounded-xl p-0 shadow-xl",
          className,
        )}
      >
        {/* defaultValue highlights (and scrolls to) the current country when the list opens. */}
        <Command defaultValue={selected?.name} filter={scoreCountry}>
          <CommandInput placeholder="Search country, code or +dial…" className="h-11 text-[15px]" />
          <CommandList className="max-h-72 p-1">
            <CommandEmpty>
              <span className="flex flex-col items-center gap-1 text-muted-foreground">
                <GlobeIcon className="size-5 opacity-50" aria-hidden="true" />
                No country found
              </span>
            </CommandEmpty>
            <CommandGroup className="p-0">
              {countries.map((c) => {
                const isSelected = c.code === value;
                return (
                  <CommandItem
                    key={c.code}
                    value={c.name}
                    keywords={[c.code, c.dialCode]}
                    onSelect={() => {
                      onValueChange(c.code);
                      setOpen(false);
                    }}
                    className={cn(
                      "gap-3 rounded-lg px-2.5 py-2.5 text-[15px]",
                      isSelected && "font-medium",
                    )}
                  >
                    <span className="w-6 text-center text-lg leading-none" aria-hidden="true">
                      {flagEmoji(c.code)}
                    </span>
                    <span className="flex-1 truncate">{c.name}</span>
                    {c.dialCode && (
                      <span className="text-xs tabular-nums text-muted-foreground">{c.dialCode}</span>
                    )}
                    <CheckIcon
                      className={cn("size-4 text-primary", isSelected ? "opacity-100" : "opacity-0")}
                      aria-hidden="true"
                    />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
