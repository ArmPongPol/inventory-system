"use client"

import { AnimatePresence, motion } from "framer-motion"

import { PageHeader } from "@/components/layout/page-header"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  OPERATIONS,
  OPERATION_ORDER,
  isStockOperation,
} from "@/features/stock/operations"
import { StockOperationForm } from "@/features/stock/stock-operation-form"
import { useMe } from "@/hooks/use-me"
import { useUrlState } from "@/hooks/use-url-state"

export function StockView() {
  const { get, set } = useUrlState()
  const { isAdmin } = useMe()

  const available = OPERATION_ORDER.filter((op) => !OPERATIONS[op].adminOnly || isAdmin)
  const requested = get("op")
  const op =
    isStockOperation(requested) && available.includes(requested) ? requested : "receive"
  const meta = OPERATIONS[op]

  return (
    <>
      <PageHeader
        title="Stock operations"
        description="Every operation is recorded in the movement ledger and applied atomically."
      />

      <Tabs value={op} onValueChange={(v) => set({ op: v })}>
        <TabsList className="h-auto flex-wrap justify-start">
          {available.map((key) => {
            const m = OPERATIONS[key]
            return (
              <TabsTrigger key={key} value={key} className="gap-1.5">
                <m.icon />
                {m.label}
              </TabsTrigger>
            )
          })}
        </TabsList>
      </Tabs>

      <AnimatePresence mode="wait">
        <motion.div
          key={op}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.2 }}
          className="max-w-2xl"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <meta.icon className="size-4" />
                </span>
                {meta.verb}
              </CardTitle>
              <CardDescription>{meta.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <StockOperationForm
                key={op}
                operation={op}
                defaults={{
                  productId: get("productId"),
                  warehouseId: get("warehouseId"),
                }}
              />
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </>
  )
}
