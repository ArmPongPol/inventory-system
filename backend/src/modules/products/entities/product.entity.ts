import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  Unique,
} from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Category } from '@/modules/categories/entities/category.entity';
import { Unit } from '@/modules/units/entities/unit.entity';

export const UQ_PRODUCTS_SKU = 'UQ_products_sku';

// Quantities (minimum_stock here, and the inventory tables) are numeric(18,4).
// The pg driver returns numeric as a string, which is what the API sends too:
// no float rounding on the way in or out.
@Entity({ name: 'products' })
@Unique(UQ_PRODUCTS_SKU, ['sku'])
@Check('CHK_products_minimum_stock', '"minimum_stock" >= 0')
export class Product extends BaseEntity {
  // Stored uppercased (normalizeCode), so unique ignoring case.
  @Column({ name: 'sku', type: 'varchar', length: 50 })
  sku: string;

  @Column({ name: 'name', type: 'varchar', length: 255 })
  name: string;

  @Index()
  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId: string | null;

  @ManyToOne(() => Category, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'category_id' })
  category?: Category | null;

  @Index()
  @Column({ name: 'unit_id', type: 'uuid', nullable: true })
  unitId: string | null;

  @ManyToOne(() => Unit, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'unit_id' })
  unit?: Unit | null;

  // Reorder point: the product shows in /inventory/low-stock while its total
  // quantity across warehouses is below this.
  @Column({
    name: 'minimum_stock',
    type: 'numeric',
    precision: 18,
    scale: 4,
    default: 0,
  })
  minimumStock: string;

  // Deactivated, never deleted. An inactive product accepts no new movements.
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
