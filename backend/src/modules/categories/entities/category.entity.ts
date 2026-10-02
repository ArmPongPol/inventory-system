import { Column, Entity, Unique } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

export const UQ_CATEGORIES_NAME = 'UQ_categories_name';

@Entity({ name: 'categories' })
@Unique(UQ_CATEGORIES_NAME, ['name'])
export class Category extends BaseEntity {
  @Column({ name: 'name', type: 'varchar', length: 100 })
  name: string;

  // Categories are deactivated, never deleted: products keep pointing at them.
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
