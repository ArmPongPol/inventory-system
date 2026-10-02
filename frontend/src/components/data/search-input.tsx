"use client"

import { useEffect, useRef, useState } from "react"
import { Search, X } from "lucide-react"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { cn } from "@/lib/utils"

interface SearchInputProps {
  value: string | undefined
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  maxLength?: number
}

/** Search box that reports changes after the user stops typing for 300 ms. */
export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className,
  maxLength = 100,
}: SearchInputProps) {
  const [text, setText] = useState(value ?? "")
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  })

  useEffect(() => {
    if (text.trim() === (value ?? "")) return
    const id = setTimeout(() => onChangeRef.current(text.trim()), 300)
    return () => clearTimeout(id)
  }, [text, value])

  return (
    <InputGroup className={cn("w-full sm:w-72 bg-card", className)}>
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
      <InputGroupInput
        value={text}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        aria-label={placeholder}
      />
      {text && (
        <InputGroupAddon align="inline-end">
          <InputGroupButton size="icon-xs" aria-label="Clear search" onClick={() => setText("")}>
            <X />
          </InputGroupButton>
        </InputGroupAddon>
      )}
    </InputGroup>
  )
}
