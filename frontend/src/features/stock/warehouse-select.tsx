"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { warehouses } from "@/features/master-data/queries"
import { cn } from "@/lib/utils"

export const ALL = "__all__"

interface WarehouseSelectProps {
  id?: string
  value: string
  onChange: (warehouseId: string) => void
  invalid?: boolean
  /** Adds an "All warehouses" entry mapped to an empty string (for filters). */
  allowAll?: boolean
  activeOnly?: boolean
  exclude?: string
  placeholder?: string
  className?: string
}

export function WarehouseSelect({
  id,
  value,
  onChange,
  invalid,
  allowAll,
  activeOnly = true,
  exclude,
  placeholder = "Select a warehouse…",
  className,
}: WarehouseSelectProps) {
  const { data, isLoading } = warehouses.useList({
    limit: 100,
    isActive: activeOnly ? "true" : undefined,
  })

  return (
    <Select
      value={value || (allowAll ? ALL : "")}
      onValueChange={(v) => onChange(v === ALL ? "" : v)}
      disabled={isLoading}
    >
      <SelectTrigger id={id} aria-invalid={invalid} className={cn("w-full bg-card", className)}>
        <SelectValue placeholder={isLoading ? "Loading…" : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowAll && <SelectItem value={ALL}>All warehouses</SelectItem>}
        {data?.items
          .filter((w) => w.id !== exclude)
          .map((w) => (
            <SelectItem key={w.id} value={w.id}>
              <span className="font-mono text-xs font-semibold">{w.code}</span>
              <span className="text-muted-foreground">{w.name}</span>
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  )
}
