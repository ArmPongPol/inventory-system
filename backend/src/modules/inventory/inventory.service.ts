import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Paginated } from '@/common/dto/pagination-query.dto';
import {
  FindInventoryQueryDto,
  FindStockMovementsQueryDto,
  LowStockQueryDto,
} from './dto/inventory-query.dto';
import { Inventory } from './entities/inventory.entity';
import { StockMovement } from './entities/stock-movement.entity';

export interface LowStockItem {
  productId: string;
  sku: string;
  name: string;
  minimumStock: string;
  quantity: string;
  shortage: string;
}

// $1: optional warehouse id. GROUP BY p.id covers the other product columns
// (functionally dependent on the primary key).
const LOW_STOCK_SQL = `
  SELECT p.id AS "productId",
         p.sku,
         p.name,
         p.minimum_stock AS "minimumStock",
         COALESCE(SUM(i.quantity), 0) AS quantity,
         p.minimum_stock - COALESCE(SUM(i.quantity), 0) AS shortage
    FROM products p
    LEFT JOIN inventory i
      ON i.product_id = p.id
     AND ($1::uuid IS NULL OR i.warehouse_id = $1::uuid)
   WHERE p.is_active
   GROUP BY p.id
  HAVING COALESCE(SUM(i.quantity), 0) < p.minimum_stock`;

// Read side of the inventory tables. All writes go through StockService.
@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Inventory)
    private readonly inventoryRepository: Repository<Inventory>,
    @InjectRepository(StockMovement)
    private readonly movementRepository: Repository<StockMovement>,
  ) {}

  async findAll({
    page,
    limit,
    productId,
    warehouseId,
  }: FindInventoryQueryDto): Promise<Paginated<Inventory>> {
    const query = this.inventoryRepository
      .createQueryBuilder('inventory')
      .innerJoinAndSelect('inventory.product', 'product')
      .innerJoinAndSelect('inventory.warehouse', 'warehouse')
      .orderBy('product.sku', 'ASC')
      .addOrderBy('warehouse.code', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    if (productId) {
      query.andWhere('inventory.productId = :productId', { productId });
    }
    if (warehouseId) {
      query.andWhere('inventory.warehouseId = :warehouseId', { warehouseId });
    }

    const [items, total] = await query.getManyAndCount();
    return { items, total, page, limit };
  }

  /**
   * Active products whose quantity (summed over all warehouses, or in the
   * given one) is below their minimum stock. A product with no inventory row
   * counts as zero.
   */
  async findLowStock({
    page,
    limit,
    warehouseId,
  }: LowStockQueryDto): Promise<Paginated<LowStockItem>> {
    const warehouse = warehouseId ?? null;
    const [items, [{ total }]] = await Promise.all([
      this.inventoryRepository.query<LowStockItem[]>(
        `${LOW_STOCK_SQL} ORDER BY shortage DESC, p.sku LIMIT $2 OFFSET $3`,
        [warehouse, limit, (page - 1) * limit],
      ),
      this.inventoryRepository.query<{ total: string }[]>(
        `SELECT COUNT(*) AS total FROM (${LOW_STOCK_SQL}) low`,
        [warehouse],
      ),
    ]);

    return { items, total: Number(total), page, limit };
  }

  async findMovements({
    page,
    limit,
    productId,
    warehouseId,
    movementType,
    referenceType,
    referenceId,
    from,
    to,
  }: FindStockMovementsQueryDto): Promise<Paginated<StockMovement>> {
    const query = this.movementRepository
      .createQueryBuilder('movement')
      .innerJoinAndSelect('movement.product', 'product')
      .innerJoinAndSelect('movement.warehouse', 'warehouse')
      .orderBy('movement.createdAt', 'DESC')
      .addOrderBy('movement.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    // Equality filters; the keys are fixed property names, never user input.
    const filters = {
      productId,
      warehouseId,
      movementType,
      referenceType,
      referenceId,
    };
    for (const [field, value] of Object.entries(filters)) {
      if (value !== undefined) {
        query.andWhere(`movement.${field} = :${field}`, { [field]: value });
      }
    }
    if (from) query.andWhere('movement.createdAt >= :from', { from });
    if (to) query.andWhere('movement.createdAt < :to', { to });

    const [items, total] = await query.getManyAndCount();
    return { items, total, page, limit };
  }
}
