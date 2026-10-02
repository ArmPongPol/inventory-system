import { Column, Entity, Unique } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

export const UQ_UNITS_NAME = 'UQ_units_name';
export const UQ_UNITS_SYMBOL = 'UQ_units_symbol';

// Units of measure (piece, kilogram, box...). No is_active flag: a unit is
// deleted outright, which the products foreign key refuses while it's in use.
@Entity({ name: 'units' })
@Unique(UQ_UNITS_NAME, ['name'])
@Unique(UQ_UNITS_SYMBOL, ['symbol'])
export class Unit extends BaseEntity {
  @Column({ name: 'name', type: 'varchar', length: 50 })
  name: string;

  @Column({ name: 'symbol', type: 'varchar', length: 20 })
  symbol: string;
}
