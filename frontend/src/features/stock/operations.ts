import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  Lock,
  LockOpen,
  Scale,
  type LucideIcon,
} from "lucide-react"

import type { StockOperation } from "@/features/inventory/queries"

export interface OperationMeta {
  label: string
  verb: string
  description: string
  icon: LucideIcon
  adminOnly?: boolean
}

export const OPERATIONS: Record<StockOperation, OperationMeta> = {
  receive: {
    label: "Receive",
    verb: "Receive stock",
    description: "Add incoming goods to a warehouse.",
    icon: ArrowDownToLine,
  },
  issue: {
    label: "Issue",
    verb: "Issue stock",
    description: "Take goods out of a warehouse, optionally from reserved stock.",
    icon: ArrowUpFromLine,
  },
  transfer: {
    label: "Transfer",
    verb: "Transfer stock",
    description: "Move goods from one warehouse to another.",
    icon: ArrowLeftRight,
  },
  reserve: {
    label: "Reserve",
    verb: "Reserve stock",
    description: "Hold available stock for an order without moving it.",
    icon: Lock,
  },
  release: {
    label: "Release",
    verb: "Release reservation",
    description: "Return reserved stock to available.",
    icon: LockOpen,
  },
  adjust: {
    label: "Adjust",
    verb: "Adjust stock",
    description: "Set the on-hand quantity to a physical count.",
    icon: Scale,
    adminOnly: true,
  },
}

export const OPERATION_ORDER: StockOperation[] = [
  "receive",
  "issue",
  "transfer",
  "reserve",
  "release",
  "adjust",
]

export function isStockOperation(value: string | undefined): value is StockOperation {
  return !!value && value in OPERATIONS
}
