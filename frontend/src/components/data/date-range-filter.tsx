"use client"

import { format, parseISO } from "date-fns"
import { CalendarDays, X } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface DateRangeFilterProps {
  /** Inclusive dates as yyyy-MM-dd. */
  from: string | undefined
  to: string | undefined
  onChange: (range: { from?: string; to?: string }) => void
  className?: string
}

const toKey = (d: Date | undefined) => (d ? format(d, "yyyy-MM-dd") : undefined)

export function DateRangeFilter({ from, to, onChange, className }: DateRangeFilterProps) {
  const selected: DateRange | undefined = from
    ? { from: parseISO(from), to: to ? parseISO(to) : undefined }
    : undefined

  const label = from
    ? to && to !== from
      ? `${format(parseISO(from), "d MMM yyyy")} – ${format(parseISO(to), "d MMM yyyy")}`
      : format(parseISO(from), "d MMM yyyy")
    : "Any date"

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn("w-full justify-start bg-card font-normal sm:w-60", !from && "text-muted-foreground")}
          >
            <CalendarDays />
            <span className="truncate">{label}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            numberOfMonths={2}
            selected={selected}
            defaultMonth={selected?.from}
            onSelect={(range) => onChange({ from: toKey(range?.from), to: toKey(range?.to) })}
            disabled={{ after: new Date() }}
          />
        </PopoverContent>
      </Popover>
      {from && (
        <Button
          variant="ghost"
          size="icon"
          aria-label="Clear dates"
          onClick={() => onChange({ from: undefined, to: undefined })}
        >
          <X />
        </Button>
      )}
    </div>
  )
}
