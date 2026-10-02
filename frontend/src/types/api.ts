// Shapes returned by the NestJS backend (camelCase JSON).
// numeric(18,4) columns come back as strings, e.g. "12.5000".

export type Role = "ADMIN" | "USER"
export type UserStatus = "ACTIVE" | "INACTIVE"
export type MovementType =
  | "IN"
  | "OUT"
  | "ADJUSTMENT"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"

export const MOVEMENT_TYPES: MovementType[] = [
  "IN",
  "OUT",
  "ADJUSTMENT",
  "TRANSFER_IN",
  "TRANSFER_OUT",
]

export type Decimal = string

export interface ApiEnvelope<T> {
  status: number
  message: string
  data: T
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  limit: number
}

interface Timestamps {
  id: string
  createdAt: string
  updatedAt: string
}

export interface User extends Timestamps {
  username: string
  email: string
  firstName: string
  lastName: string
  role: Role
  status: UserStatus
}

export interface Category extends Timestamps {
  name: string
  isActive: boolean
}

export interface Unit extends Timestamps {
  name: string
  symbol: string
}

export interface Warehouse extends Timestamps {
  code: string
  name: string
  isActive: boolean
}

export interface Product extends Timestamps {
  sku: string
  name: string
  categoryId: string | null
  unitId: string | null
  minimumStock: Decimal
  isActive: boolean
  category?: Category | null
  unit?: Unit | null
}

export interface InventoryRow {
  id: string
  productId: string
  warehouseId: string
  quantity: Decimal
  reservedQuantity: Decimal
  availableQuantity: Decimal
  updatedAt: string
  product?: Product
  warehouse?: Warehouse
}

export interface LowStockRow {
  productId: string
  sku: string
  name: string
  minimumStock: Decimal
  quantity: Decimal
  shortage: Decimal
}

export interface StockMovement {
  id: string
  productId: string
  warehouseId: string
  movementType: MovementType
  quantity: Decimal
  beforeQuantity: Decimal
  afterQuantity: Decimal
  referenceType: string | null
  referenceId: string | null
  remark: string | null
  createdBy: string | null
  createdAt: string
  product?: Product
  warehouse?: Warehouse
}

export interface StockOperationResult {
  inventory: InventoryRow
  movements: StockMovement[]
}

export interface TransferResult {
  transferId: string
  from: InventoryRow
  to: InventoryRow
  movements: StockMovement[]
}
