"use client"

import { useState } from "react"
import { Check, ChevronsUpDown, Package } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Spinner } from "@/components/ui/spinner"
import { products } from "@/features/master-data/queries"
import { useDebounced } from "@/hooks/use-debounced"
import { cn } from "@/lib/utils"

interface ProductComboboxProps {
  id?: string
  value: string
  onChange: (productId: string) => void
  invalid?: boolean
  /** Only offer active products (stock movements reject inactive ones). */
  activeOnly?: boolean
  placeholder?: string
  className?: string
}

/** Searchable product picker backed by `GET /products?search=`. */
export function ProductCombobox({
  id,
  value,
  onChange,
  invalid,
  activeOnly = true,
  placeholder = "Select a product…",
  className,
}: ProductComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const debounced = useDebounced(search.trim(), 250)

  const list = products.useList(
    { search: debounced || undefined, limit: 20, isActive: activeOnly ? "true" : undefined },
    { enabled: open }
  )
  const selected = products.useDetail(value || undefined)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid}
          className={cn(
            "w-full justify-between bg-card font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            <Package className="text-muted-foreground" />
            {value && selected.data ? (
              <span className="truncate">
                <span className="font-mono text-xs font-semibold">{selected.data.sku}</span>
                <span className="mx-1.5 text-muted-foreground">·</span>
                {selected.data.name}
              </span>
            ) : (
              <span className="truncate">{value ? "Loading…" : placeholder}</span>
            )}
          </span>
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-72 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search SKU or name…"
            value={search}
            onValueChange={setSearch}
            maxLength={100}
          />
          <CommandList>
            {list.isFetching && !list.data ? (
              <div className="flex justify-center py-6">
                <Spinner />
              </div>
            ) : (
              <CommandEmpty>No products found.</CommandEmpty>
            )}
            <CommandGroup>
              {list.data?.items.map((p) => (
                <CommandItem
                  key={p.id}
                  value={p.id}
                  onSelect={() => {
                    onChange(p.id)
                    setOpen(false)
                  }}
                >
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="font-mono text-xs font-semibold">{p.sku}</span>
                    <span className="truncate text-sm">{p.name}</span>
                  </div>
                  <Check className={cn("ml-auto", value === p.id ? "opacity-100" : "opacity-0")} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
