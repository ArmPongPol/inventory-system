"use client"

import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from "react-hook-form"

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

interface BaseProps<T extends FieldValues> {
  control: Control<T>
  name: FieldPath<T>
  label: string
  description?: string
}

type TextFieldProps<T extends FieldValues> = BaseProps<T> &
  Omit<React.ComponentProps<typeof Input>, "name" | "value" | "onChange" | "onBlur">

export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  ...inputProps
}: TextFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={name}>{label}</FieldLabel>
          <Input
            {...inputProps}
            {...field}
            value={field.value ?? ""}
            id={name}
            aria-invalid={fieldState.invalid}
          />
          {description && <FieldDescription>{description}</FieldDescription>}
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  )
}

type TextAreaFieldProps<T extends FieldValues> = BaseProps<T> &
  Omit<React.ComponentProps<typeof Textarea>, "name" | "value" | "onChange" | "onBlur">

export function TextAreaField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  ...props
}: TextAreaFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={name}>{label}</FieldLabel>
          <Textarea
            {...props}
            {...field}
            value={field.value ?? ""}
            id={name}
            aria-invalid={fieldState.invalid}
          />
          {description && <FieldDescription>{description}</FieldDescription>}
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  )
}

export interface Option {
  value: string
  label: string
}

/** Sentinel for "no selection", since Radix Select doesn't allow empty values. */
export const NONE = "__none__"

export function SelectField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  options,
  placeholder = "Select…",
  noneLabel,
  disabled,
}: BaseProps<T> & {
  options: Option[]
  placeholder?: string
  /** When set, adds a "none" entry that maps to an empty string. */
  noneLabel?: string
  disabled?: boolean
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={name}>{label}</FieldLabel>
          <Select
            value={field.value ? String(field.value) : noneLabel ? NONE : ""}
            onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
            disabled={disabled}
          >
            <SelectTrigger id={name} className="w-full" aria-invalid={fieldState.invalid}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {noneLabel && <SelectItem value={NONE}>{noneLabel}</SelectItem>}
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {description && <FieldDescription>{description}</FieldDescription>}
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  )
}

export function SwitchField<T extends FieldValues>({
  control,
  name,
  label,
  description,
}: BaseProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Field orientation="horizontal" className="rounded-lg border p-3">
          <FieldContent>
            <FieldLabel htmlFor={name}>{label}</FieldLabel>
            {description && <FieldDescription>{description}</FieldDescription>}
          </FieldContent>
          <Switch id={name} checked={!!field.value} onCheckedChange={field.onChange} />
        </Field>
      )}
    />
  )
}
