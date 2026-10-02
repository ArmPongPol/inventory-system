import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { StockMovementTypeEnum } from '@/common/constants/enum';
import { Product } from '@/modules/products/entities/product.entity';
import { User } from '@/modules/users/entities/user.entity';
import { Warehouse } from '@/modules/warehouses/entities/warehouse.entity';

// Append-only ledger: one row per change of inventory.quantity, never updated
// or deleted. `quantity` is the signed change, so for a product/warehouse the
// rows chain: each before_quantity is the previous after_quantity.
// Reservations change only reserved_quantity and are not recorded here.
@Entity({ name: 'stock_movements' })
@Index(['productId', 'createdAt'])
@Index(['warehouseId', 'createdAt'])
@Index(['referenceType', 'referenceId'])
@Check('CHK_stock_movements_quantity_nonzero', '"quantity" <> 0')
@Check(
  'CHK_stock_movements_after_quantity',
  '"after_quantity" = "before_quantity" + "quantity"',
)
@Check(
  'CHK_stock_movements_non_negative',
  '"before_quantity" >= 0 AND "after_quantity" >= 0',
)
export class StockMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product?: Product;

  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId: string;

  @ManyToOne(() => Warehouse, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse?: Warehouse;

  @Column({
    name: 'movement_type',
    type: 'enum',
    enum: StockMovementTypeEnum,
    enumName: 'stock_movement_type_enum',
  })
  movementType: StockMovementTypeEnum;

  // Signed: positive into the warehouse, negative out of it.
  @Column({ name: 'quantity', type: 'numeric', precision: 18, scale: 4 })
  quantity: string;

  @Column({ name: 'before_quantity', type: 'numeric', precision: 18, scale: 4 })
  beforeQuantity: string;

  @Column({ name: 'after_quantity', type: 'numeric', precision: 18, scale: 4 })
  afterQuantity: string;

  // What caused the movement, e.g. ("PURCHASE_ORDER", <its id>). Transfers set
  // ("TRANSFER", <transfer id>) on both of their rows.
  @Column({
    name: 'reference_type',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  referenceType: string | null;

  @Column({ name: 'reference_id', type: 'uuid', nullable: true })
  referenceId: string | null;

  @Column({ name: 'remark', type: 'varchar', length: 500, nullable: true })
  remark: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator?: User | null;

  // clock_timestamp(), not now(): now() is the transaction's start time, so
  // concurrent movements would sort in the order their transactions began.
  // The insert follows the inventory row lock, so this orders the ledger the
  // way the stock actually changed.
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'clock_timestamp()',
  })
  createdAt: Date;
}
