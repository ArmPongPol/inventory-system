"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { StockOperation } from "@/features/inventory/queries"
import { OPERATIONS } from "@/features/stock/operations"
import { StockOperationForm } from "@/features/stock/stock-operation-form"

interface StockOperationDialogProps {
  operation: StockOperation | null
  defaults?: { productId?: string; warehouseId?: string }
  onOpenChange: (open: boolean) => void
}

export function StockOperationDialog({
  operation,
  defaults,
  onOpenChange,
}: StockOperationDialogProps) {
  const meta = operation ? OPERATIONS[operation] : null

  return (
    <Dialog open={!!operation} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        {operation && meta && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <meta.icon className="size-4" />
                </span>
                {meta.verb}
              </DialogTitle>
              <DialogDescription>{meta.description}</DialogDescription>
            </DialogHeader>
            <StockOperationForm
              key={operation}
              operation={operation}
              defaults={defaults}
              onSuccess={() => onOpenChange(false)}
              onCancel={() => onOpenChange(false)}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
