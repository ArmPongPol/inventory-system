"use client"

import { MoreHorizontal, Pencil, Power, PowerOff, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"

export function StatusFilter({
  value,
  onChange,
}: {
  value: string | undefined
  onChange: (value: string | null) => void
}) {
  return (
    <Select value={value ?? "all"} onValueChange={(v) => onChange(v === "all" ? null : v)}>
      <SelectTrigger className="w-full bg-card sm:w-40" aria-label="Status">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All statuses</SelectItem>
        <SelectItem value="true">Active</SelectItem>
        <SelectItem value="false">Inactive</SelectItem>
      </SelectContent>
    </Select>
  )
}

export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}

interface RowActionsProps {
  onEdit: () => void
  /** Soft delete (deactivate) or hard delete, depending on `removeKind`. */
  onRemove?: () => void
  onActivate?: () => void
  removeKind?: "deactivate" | "delete"
  active?: boolean
}

export function RowActions({
  onEdit,
  onRemove,
  onActivate,
  removeKind = "deactivate",
  active = true,
}: RowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Row actions">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil /> Edit
        </DropdownMenuItem>
        {(onRemove || onActivate) && <DropdownMenuSeparator />}
        {!active && onActivate ? (
          <DropdownMenuItem onSelect={onActivate}>
            <Power /> Activate
          </DropdownMenuItem>
        ) : (
          onRemove && (
            <DropdownMenuItem variant="destructive" onSelect={onRemove}>
              {removeKind === "delete" ? <Trash2 /> : <PowerOff />}
              {removeKind === "delete" ? "Delete" : "Deactivate"}
            </DropdownMenuItem>
          )
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function FormActions({
  pending,
  submitLabel,
  onCancel,
}: {
  pending: boolean
  submitLabel: string
  onCancel: () => void
}) {
  return (
    <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
      <Button type="button" variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="submit" disabled={pending}>
        {pending && <Spinner />}
        {submitLabel}
      </Button>
    </div>
  )
}
