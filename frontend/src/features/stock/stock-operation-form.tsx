"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { AnimatePresence, motion } from "framer-motion"
import { Controller, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { TextAreaField, TextField } from "@/components/form/form-fields"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import {
  useInventory,
  useStockOperation,
  type StockOperation,
  type StockOperationInputs,
} from "@/features/inventory/queries"
import { OPERATIONS } from "@/features/stock/operations"
import { ProductCombobox } from "@/features/stock/product-combobox"
import { WarehouseSelect } from "@/features/stock/warehouse-select"
import { formatQty } from "@/lib/format"
import { compact, optionalText, quantitySchema } from "@/lib/validation"

function buildSchema(op: StockOperation) {
  const quantity = quantitySchema({ allowZero: op === "adjust" })
  return z
    .object({
      productId: z.string().min(1, "Select a product"),
      warehouseId: z.string().min(1, "Select a warehouse"),
      toWarehouseId: z.string(),
      quantity: z.string(),
      fromReserved: z.boolean(),
      referenceType: optionalText(50),
      referenceId: z.string().trim(),
      remark: optionalText(500),
    })
    .superRefine((v, ctx) => {
      const q = quantity.safeParse(v.quantity)
      if (!q.success) {
        ctx.addIssue({ code: "custom", path: ["quantity"], message: q.error.issues[0].message })
      }
      if (op === "transfer") {
        if (!v.toWarehouseId) {
          ctx.addIssue({ code: "custom", path: ["toWarehouseId"], message: "Select a destination" })
        } else if (v.toWarehouseId === v.warehouseId) {
          ctx.addIssue({
            code: "custom",
            path: ["toWarehouseId"],
            message: "Source and destination must differ",
          })
        }
      }
      if (v.referenceId && !z.string().uuid().safeParse(v.referenceId).success) {
        ctx.addIssue({ code: "custom", path: ["referenceId"], message: "Must be a UUID" })
      }
    })
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>

function toBody<Op extends StockOperation>(op: Op, v: FormValues): StockOperationInputs[Op] {
  const quantity = Number(v.quantity)
  const context = compact({
    referenceType: v.referenceType,
    referenceId: v.referenceId,
    remark: v.remark,
  })
  const base = { productId: v.productId, warehouseId: v.warehouseId }
  switch (op) {
    case "receive":
      return { ...base, quantity, ...context } as StockOperationInputs[Op]
    case "issue":
      return { ...base, quantity, fromReserved: v.fromReserved, ...context } as StockOperationInputs[Op]
    case "adjust":
      return { ...base, countedQuantity: quantity, ...context } as StockOperationInputs[Op]
    case "transfer":
      return {
        productId: v.productId,
        fromWarehouseId: v.warehouseId,
        toWarehouseId: v.toWarehouseId,
        quantity,
        ...compact({ remark: v.remark }),
      } as StockOperationInputs[Op]
    default:
      return { ...base, quantity } as StockOperationInputs[Op]
  }
}

interface StockOperationFormProps {
  operation: StockOperation
  defaults?: { productId?: string; warehouseId?: string }
  onSuccess?: () => void
  onCancel?: () => void
}

export function StockOperationForm({
  operation: op,
  defaults,
  onSuccess,
  onCancel,
}: StockOperationFormProps) {
  const meta = OPERATIONS[op]
  const mutation = useStockOperation(op)
  const hasContext = op === "receive" || op === "issue" || op === "adjust"

  const form = useForm<FormValues>({
    resolver: zodResolver(buildSchema(op)),
    defaultValues: {
      productId: defaults?.productId ?? "",
      warehouseId: defaults?.warehouseId ?? "",
      toWarehouseId: "",
      quantity: "",
      fromReserved: false,
      referenceType: "",
      referenceId: "",
      remark: "",
    },
  })

  const [productId, warehouseId] = useWatch({
    control: form.control,
    name: ["productId", "warehouseId"],
  })

  const onSubmit = form.handleSubmit((values) =>
    mutation.mutate(toBody(op, values), {
      onSuccess: () => {
        toast.success(`${meta.verb}: done`)
        form.reset({ ...form.getValues(), quantity: "", referenceId: "", remark: "" })
        onSuccess?.()
      },
    })
  )

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <FieldGroup className="gap-4">
        <Controller
          control={form.control}
          name="productId"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="productId">Product</FieldLabel>
              <ProductCombobox
                id="productId"
                value={field.value}
                onChange={field.onChange}
                invalid={fieldState.invalid}
                // Released reservations may sit on products that were deactivated since.
                activeOnly={op !== "release"}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <div className={op === "transfer" ? "grid gap-4 sm:grid-cols-2" : "grid gap-4"}>
          <Controller
            control={form.control}
            name="warehouseId"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="warehouseId">
                  {op === "transfer" ? "From warehouse" : "Warehouse"}
                </FieldLabel>
                <WarehouseSelect
                  id="warehouseId"
                  value={field.value}
                  onChange={field.onChange}
                  invalid={fieldState.invalid}
                  activeOnly={op !== "release"}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          {op === "transfer" && (
            <Controller
              control={form.control}
              name="toWarehouseId"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="toWarehouseId">To warehouse</FieldLabel>
                  <WarehouseSelect
                    id="toWarehouseId"
                    value={field.value}
                    onChange={field.onChange}
                    invalid={fieldState.invalid}
                    exclude={warehouseId}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
          )}
        </div>

        <StockSnapshot productId={productId} warehouseId={warehouseId} />

        <TextField
          control={form.control}
          name="quantity"
          label={op === "adjust" ? "Counted quantity" : "Quantity"}
          inputMode="decimal"
          placeholder="0"
          description={
            op === "adjust"
              ? "The on-hand quantity will be set to this value."
              : "Up to 4 decimal places."
          }
        />

        {op === "issue" && (
          <Controller
            control={form.control}
            name="fromReserved"
            render={({ field }) => (
              <Field orientation="horizontal" className="rounded-lg border p-3">
                <FieldContent>
                  <FieldLabel htmlFor="fromReserved">Issue from reserved stock</FieldLabel>
                  <FieldDescription>
                    Fulfil an existing reservation instead of available stock.
                  </FieldDescription>
                </FieldContent>
                <Switch
                  id="fromReserved"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </Field>
            )}
          />
        )}

        {hasContext && (
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              control={form.control}
              name="referenceType"
              label="Reference type"
              placeholder="e.g. PO, SO"
              maxLength={50}
              className="uppercase placeholder:normal-case"
            />
            <TextField
              control={form.control}
              name="referenceId"
              label="Reference ID"
              placeholder="UUID (optional)"
            />
          </div>
        )}

        {op !== "reserve" && op !== "release" && (
          <TextAreaField
            control={form.control}
            name="remark"
            label="Remark"
            placeholder="Optional note"
            maxLength={500}
            rows={2}
          />
        )}
      </FieldGroup>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? <Spinner /> : <meta.icon />}
          {meta.verb}
        </Button>
      </div>
    </form>
  )
}

/** Shows the current on-hand / reserved / available figures for the selection. */
function StockSnapshot({
  productId,
  warehouseId,
}: {
  productId: string
  warehouseId: string
}) {
  const enabled = !!productId && !!warehouseId
  const { data, isPlaceholderData } = useInventory(
    { productId, warehouseId, limit: 1 },
    { enabled }
  )
  const row = data?.items[0]
  const show = enabled && !!data && !isPlaceholderData

  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <div className="grid grid-cols-3 divide-x rounded-lg border bg-muted/50 text-center">
            {[
              ["On hand", row?.quantity ?? "0"],
              ["Reserved", row?.reservedQuantity ?? "0"],
              ["Available", row?.availableQuantity ?? "0"],
            ].map(([label, value]) => (
              <div key={label} className="px-2 py-2.5">
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className="tabular text-base font-semibold">{formatQty(value)}</div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
