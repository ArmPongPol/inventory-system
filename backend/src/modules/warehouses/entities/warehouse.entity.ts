import { Column, Entity, Unique } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

export const UQ_WAREHOUSES_CODE = 'UQ_warehouses_code';

@Entity({ name: 'warehouses' })
@Unique(UQ_WAREHOUSES_CODE, ['code'])
export class Warehouse extends BaseEntity {
  // Stored uppercased (normalizeCode), so unique ignoring case.
  @Column({ name: 'code', type: 'varchar', length: 50 })
  code: string;

  @Column({ name: 'name', type: 'varchar', length: 150 })
  name: string;

  // Deactivated, never deleted: inventory and movement history point at it.
  // An inactive warehouse accepts no new stock movements.
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
