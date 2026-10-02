"use client"

import { useMemo } from "react"
import Link from "next/link"
import { startOfDay } from "date-fns"
import { motion } from "framer-motion"
import {
  ArrowRight,
  CircleCheck,
  History,
  Package,
  TriangleAlert,
  Warehouse,
  type LucideIcon,
} from "lucide-react"

import { MovementTypeBadge } from "@/components/data/badges"
import { CountUp } from "@/components/motion/count-up"
import { Stagger, StaggerItem } from "@/components/motion/stagger"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { products, warehouses } from "@/features/master-data/queries"
import { useLowStock, useMovements } from "@/features/inventory/queries"
import { OPERATIONS, OPERATION_ORDER } from "@/features/stock/operations"
import { useMe } from "@/hooks/use-me"
import { formatQty, formatRelative, formatSignedQty, isNegative } from "@/lib/format"
import { cn } from "@/lib/utils"

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 18) return "Good afternoon"
  return "Good evening"
}

export function DashboardView() {
  const { user, isAdmin } = useMe()
  // Fixed for the lifetime of the page so the query key stays stable.
  const todayIso = useMemo(() => startOfDay(new Date()).toISOString(), [])

  const productCount = products.useList({ limit: 1, isActive: "true" })
  const warehouseCount = warehouses.useList({ limit: 1, isActive: "true" })
  const lowStock = useLowStock({ limit: 5 })
  const today = useMovements({ limit: 1, from: todayIso })
  const recent = useMovements({ limit: 8 })

  const kpis: {
    label: string
    value: number | undefined
    icon: LucideIcon
    href: string
    tone: string
  }[] = [
    {
      label: "Active products",
      value: productCount.data?.total,
      icon: Package,
      href: "/products",
      tone: "from-crimson to-maroon text-cream",
    },
    {
      label: "Active warehouses",
      value: warehouseCount.data?.total,
      icon: Warehouse,
      href: "/warehouses",
      tone: "from-maroon to-[#4a1717] text-cream",
    },
    {
      label: "Low-stock products",
      value: lowStock.data?.total,
      icon: TriangleAlert,
      href: "/low-stock",
      tone: "from-sand to-[#d6bb8e] text-maroon",
    },
    {
      label: "Movements today",
      value: today.data?.total,
      icon: History,
      href: "/movements",
      tone: "from-[#f6ecd0] to-sand text-maroon",
    },
  ]

  return (
    <>
      <div className="flex flex-col gap-1">
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          suppressHydrationWarning
          className="font-heading text-2xl font-semibold tracking-tight md:text-3xl"
        >
          {greeting()}
          {user ? `, ${user.firstName}` : ""}
        </motion.h1>
        <p className="text-sm text-muted-foreground">
          Here&apos;s what&apos;s happening across your warehouses.
        </p>
      </div>

      <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <StaggerItem key={kpi.label} whileHover={{ y: -3 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
            <Link href={kpi.href} className="block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
              <div
                className={cn(
                  "relative overflow-hidden rounded-xl bg-gradient-to-br p-5 shadow-sm",
                  kpi.tone
                )}
              >
                <kpi.icon className="absolute -right-3 -bottom-3 size-24 opacity-10" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium opacity-85">{kpi.label}</span>
                  <kpi.icon className="size-5 opacity-80" />
                </div>
                <div className="mt-3 font-heading text-3xl font-semibold tabular">
                  {kpi.value === undefined ? (
                    <Skeleton className="h-9 w-16 bg-current/15" />
                  ) : (
                    <CountUp value={kpi.value} />
                  )}
                </div>
              </div>
            </Link>
          </StaggerItem>
        ))}
      </Stagger>

      <Stagger className="flex flex-wrap gap-2">
        {OPERATION_ORDER.filter((op) => !OPERATIONS[op].adminOnly || isAdmin).map((op) => {
          const meta = OPERATIONS[op]
          return (
            <StaggerItem key={op}>
              <Button asChild variant="outline" className="bg-card">
                <Link href={`/stock?op=${op}`}>
                  <meta.icon className="text-primary" />
                  {meta.label}
                </Link>
              </Button>
            </StaggerItem>
          )
        })}
      </Stagger>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TriangleAlert className="size-4 text-warning" />
              Needs restocking
            </CardTitle>
            <CardDescription>Products below their minimum stock.</CardDescription>
            <CardAction>
              <Button asChild variant="ghost" size="sm">
                <Link href="/low-stock">
                  View all <ArrowRight />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {lowStock.isLoading ? (
              <ListSkeleton />
            ) : !lowStock.data?.items.length ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
                <CircleCheck className="size-8 text-success" />
                Every product is above its minimum.
              </div>
            ) : (
              <Stagger className="space-y-2">
                {lowStock.data.items.map((row) => {
                  const min = Number(row.minimumStock)
                  const pct = min > 0 ? Math.min(100, (Number(row.quantity) / min) * 100) : 0
                  return (
                    <StaggerItem key={row.productId} className="rounded-lg border bg-muted/30 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{row.name}</div>
                          <div className="font-mono text-xs text-muted-foreground">{row.sku}</div>
                        </div>
                        <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive">
                          −{formatQty(row.shortage)}
                        </Badge>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                        <motion.div
                          className="h-full rounded-full bg-primary"
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground tabular">
                        {formatQty(row.quantity)} of {formatQty(row.minimumStock)} minimum
                      </div>
                    </StaggerItem>
                  )
                })}
              </Stagger>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="size-4 text-primary" />
              Recent movements
            </CardTitle>
            <CardDescription>The latest entries in the stock ledger.</CardDescription>
            <CardAction>
              <Button asChild variant="ghost" size="sm">
                <Link href="/movements">
                  View ledger <ArrowRight />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {recent.isLoading ? (
              <ListSkeleton rows={6} />
            ) : !recent.data?.items.length ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No stock movements yet. Receive some stock to get started.
              </div>
            ) : (
              <Stagger className="divide-y">
                {recent.data.items.map((m) => (
                  <StaggerItem key={m.id} className="flex items-center gap-3 py-2.5">
                    <MovementTypeBadge type={m.movementType} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {m.product?.name ?? "—"}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {m.warehouse?.code} · {formatRelative(m.createdAt)}
                      </div>
                    </div>
                    <span
                      className={cn(
                        "font-mono text-sm font-semibold tabular",
                        isNegative(m.quantity) ? "text-destructive" : "text-success"
                      )}
                    >
                      {formatSignedQty(m.quantity)}
                    </span>
                  </StaggerItem>
                ))}
              </Stagger>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}

function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}
