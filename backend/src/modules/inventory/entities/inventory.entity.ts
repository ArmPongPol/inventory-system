import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
  VirtualColumn,
} from 'typeorm';
import { Product } from '@/modules/products/entities/product.entity';
import { Warehouse } from '@/modules/warehouses/entities/warehouse.entity';

export const UQ_INVENTORY_PRODUCT_WAREHOUSE = 'UQ_inventory_product_warehouse';

// Current stock of one product in one warehouse. Only StockService writes it,
// always together with a stock_movements row, so the two never disagree.
// The unique constraint's index (product_id first) also serves lookups by
// product; warehouse_id gets its own.
@Entity({ name: 'inventory' })
@Unique(UQ_INVENTORY_PRODUCT_WAREHOUSE, ['productId', 'warehouseId'])
@Check('CHK_inventory_quantity', '"quantity" >= 0')
@Check('CHK_inventory_reserved_quantity', '"reserved_quantity" >= 0')
@Check(
  'CHK_inventory_reserved_within_quantity',
  '"reserved_quantity" <= "quantity"',
)
export class Inventory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product?: Product;

  @Index()
  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId: string;

  @ManyToOne(() => Warehouse, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse?: Warehouse;

  // On hand, including what is reserved.
  @Column({
    name: 'quantity',
    type: 'numeric',
    precision: 18,
    scale: 4,
    default: 0,
  })
  quantity: string;

  // Promised (e.g. to an order) but not yet issued.
  @Column({
    name: 'reserved_quantity',
    type: 'numeric',
    precision: 18,
    scale: 4,
    default: 0,
  })
  reservedQuantity: string;

  // quantity - reserved_quantity, computed by Postgres on every read.
  @VirtualColumn({
    type: 'numeric',
    query: (alias) =>
      `SELECT ${alias}."quantity" - ${alias}."reserved_quantity"`,
  })
  availableQuantity: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
