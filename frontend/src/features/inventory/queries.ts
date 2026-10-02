"use client"

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { api, type QueryParams } from "@/lib/api-client"
import type {
  InventoryRow,
  LowStockRow,
  Paginated,
  StockMovement,
  StockOperationResult,
  TransferResult,
} from "@/types/api"

export function useInventory(params?: QueryParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["inventory", params ?? {}],
    queryFn: () => api.get<Paginated<InventoryRow>>("/inventory", params),
    placeholderData: keepPreviousData,
    ...options,
  })
}

export function useLowStock(params?: QueryParams) {
  return useQuery({
    queryKey: ["low-stock", params ?? {}],
    queryFn: () => api.get<Paginated<LowStockRow>>("/inventory/low-stock", params),
    placeholderData: keepPreviousData,
  })
}

export function useMovements(params?: QueryParams) {
  return useQuery({
    queryKey: ["stock-movements", params ?? {}],
    queryFn: () => api.get<Paginated<StockMovement>>("/stock-movements", params),
    placeholderData: keepPreviousData,
  })
}

// ---- Stock operations ----

interface Context {
  referenceType?: string
  referenceId?: string
  remark?: string
}

export interface ReceiveInput extends Context {
  productId: string
  warehouseId: string
  quantity: number
}

export interface IssueInput extends ReceiveInput {
  fromReserved?: boolean
}

export interface AdjustInput extends Context {
  productId: string
  warehouseId: string
  countedQuantity: number
}

export interface TransferInput {
  productId: string
  fromWarehouseId: string
  toWarehouseId: string
  quantity: number
  remark?: string
}

export interface ReserveInput {
  productId: string
  warehouseId: string
  quantity: number
}

export interface StockOperationInputs {
  receive: ReceiveInput
  issue: IssueInput
  adjust: AdjustInput
  transfer: TransferInput
  reserve: ReserveInput
  release: ReserveInput
}

export type StockOperation = keyof StockOperationInputs

export function useStockOperation<Op extends StockOperation>(op: Op) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: StockOperationInputs[Op]) =>
      api.post<Op extends "transfer" ? TransferResult : StockOperationResult>(
        `/stock/${op}`,
        body
      ),
    onSuccess: () => qc.invalidateQueries(),
  })
}
