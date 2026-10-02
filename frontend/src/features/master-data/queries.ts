"use client"

import { createResource } from "@/lib/resource"
import type { Category, Product, Unit, Warehouse } from "@/types/api"

export interface CategoryInput {
  name: string
  isActive?: boolean
}

export interface UnitInput {
  name: string
  symbol: string
}

export interface WarehouseInput {
  code: string
  name: string
  isActive?: boolean
}

export interface ProductInput {
  sku: string
  name: string
  categoryId?: string | null
  unitId?: string | null
  minimumStock?: number
  isActive?: boolean
}

export const categories = createResource<Category, CategoryInput>("categories")
export const units = createResource<Unit, UnitInput>("units")
export const warehouses = createResource<Warehouse, WarehouseInput>("warehouses")
export const products = createResource<Product, ProductInput>("products")
