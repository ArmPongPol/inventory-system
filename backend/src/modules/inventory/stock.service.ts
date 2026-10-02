import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { EntityManager, Repository } from 'typeorm';
import { StockMovementTypeEnum } from '@/common/constants/enum';
import { ProductsService } from '../products/products.service';
import { WarehousesService } from '../warehouses/warehouses.service';
import {
  AdjustStockDto,
  IssueStockDto,
  MovementContextDto,
  ReceiveStockDto,
  ReservationDto,
  TransferStockDto,
} from './dto/stock-operation.dto';
import {
  Inventory,
  UQ_INVENTORY_PRODUCT_WAREHOUSE,
} from './entities/inventory.entity';
import { StockMovement } from './entities/stock-movement.entity';

export const INSUFFICIENT_AVAILABLE = 'Insufficient available stock';
export const INSUFFICIENT_RESERVED = 'Insufficient reserved stock';
export const COUNT_BELOW_RESERVED =
  'Counted quantity is below the reserved quantity; release reservations first';
export const COUNT_UNCHANGED = 'Counted quantity equals the current quantity';
export const SAME_WAREHOUSE = 'Source and destination warehouse are the same';
export const TRANSFER_REFERENCE_TYPE = 'TRANSFER';

export interface StockResult {
  inventory: Inventory;
  movements: StockMovement[];
}

export interface TransferResult {
  transferId: string;
  from: Inventory;
  to: Inventory;
  movements: StockMovement[];
}

interface Location {
  productId: string;
  warehouseId: string;
}

interface QuantityChange {
  before: string;
  after: string;
  change: string;
}

// Every operation is one transaction: the inventory row and its
// stock_movements row are written together or not at all.
//
// Quantities are numeric(18,4) and all arithmetic and comparisons happen in
// Postgres; JS only passes the request's numbers in as text. A conditional
// UPDATE ... RETURNING both checks and changes a row atomically: it takes the
// row lock, and a concurrent request waits and re-checks against the new
// values, so stock can't be oversold.
@Injectable()
export class StockService {
  constructor(
    @InjectRepository(Inventory)
    private readonly inventoryRepository: Repository<Inventory>,
    private readonly products: ProductsService,
    private readonly warehouses: WarehousesService,
  ) {}

  receive(dto: ReceiveStockDto, userId: string): Promise<StockResult> {
    return this.transaction(async (manager) => {
      await this.assertActive(manager, dto.productId, [dto.warehouseId]);
      await this.ensureRows(manager, dto.productId, [dto.warehouseId]);

      const movement = await this.move(manager, dto, {
        type: StockMovementTypeEnum.IN,
        delta: String(dto.quantity),
        userId,
      });

      return {
        inventory: await this.load(manager, dto),
        movements: [movement],
      };
    });
  }

  issue(dto: IssueStockDto, userId: string): Promise<StockResult> {
    const delta = String(-dto.quantity);

    return this.transaction(async (manager) => {
      await this.assertActive(manager, dto.productId, [dto.warehouseId]);

      // No row yet means nothing to issue; the UPDATE simply matches nothing.
      const movement = await this.move(manager, dto, {
        type: StockMovementTypeEnum.OUT,
        delta,
        reservedDelta: dto.fromReserved ? delta : '0',
        failure: dto.fromReserved
          ? INSUFFICIENT_RESERVED
          : INSUFFICIENT_AVAILABLE,
        userId,
      });

      return {
        inventory: await this.load(manager, dto),
        movements: [movement],
      };
    });
  }

  adjust(dto: AdjustStockDto, userId: string): Promise<StockResult> {
    const counted = String(dto.countedQuantity);

    return this.transaction(async (manager) => {
      await this.assertActive(manager, dto.productId, [dto.warehouseId]);
      await this.ensureRows(manager, dto.productId, [dto.warehouseId]);

      const [{ quantity: before }] = await manager.query<
        { quantity: string }[]
      >(
        `SELECT quantity FROM inventory
          WHERE product_id = $1 AND warehouse_id = $2
          FOR UPDATE`,
        [dto.productId, dto.warehouseId],
      );

      const [rows] = await manager.query<
        [{ after: string; change: string }[], number]
      >(
        `UPDATE inventory
            SET quantity = $3::numeric, updated_at = now()
          WHERE product_id = $1 AND warehouse_id = $2
            AND $3::numeric >= reserved_quantity
          RETURNING quantity AS after, quantity - $4::numeric AS change`,
        [dto.productId, dto.warehouseId, counted, before],
      );

      if (!rows.length) throw new ConflictException(COUNT_BELOW_RESERVED);
      const [{ after, change }] = rows;
      if (Number(change) === 0) throw new BadRequestException(COUNT_UNCHANGED);

      const movement = await this.record(manager, dto, {
        type: StockMovementTypeEnum.ADJUSTMENT,
        change: { before, after, change },
        context: dto,
        userId,
      });

      return {
        inventory: await this.load(manager, dto),
        movements: [movement],
      };
    });
  }

  transfer(dto: TransferStockDto, userId: string): Promise<TransferResult> {
    if (dto.fromWarehouseId === dto.toWarehouseId) {
      return Promise.reject(new BadRequestException(SAME_WAREHOUSE));
    }

    const from = { productId: dto.productId, warehouseId: dto.fromWarehouseId };
    const to = { productId: dto.productId, warehouseId: dto.toWarehouseId };
    const transferId = randomUUID();
    const context: MovementContextDto = {
      referenceType: TRANSFER_REFERENCE_TYPE,
      referenceId: transferId,
      remark: dto.remark,
    };

    return this.transaction(async (manager) => {
      const warehouseIds = [from.warehouseId, to.warehouseId];
      await this.assertActive(manager, dto.productId, warehouseIds);
      await this.ensureRows(manager, dto.productId, warehouseIds);
      // Both rows locked up front, in a fixed order, so two opposite transfers
      // running at once can't deadlock.
      await this.lockRows(manager, dto.productId, warehouseIds);

      const out = await this.move(manager, from, {
        type: StockMovementTypeEnum.TRANSFER_OUT,
        delta: String(-dto.quantity),
        context,
        userId,
      });
      const into = await this.move(manager, to, {
        type: StockMovementTypeEnum.TRANSFER_IN,
        delta: String(dto.quantity),
        context,
        userId,
      });

      return {
        transferId,
        from: await this.load(manager, from),
        to: await this.load(manager, to),
        movements: [out, into],
      };
    });
  }

  reserve(dto: ReservationDto): Promise<StockResult> {
    return this.transaction(async (manager) => {
      await this.assertActive(manager, dto.productId, [dto.warehouseId]);
      await this.changeQuantity(manager, dto, {
        delta: '0',
        reservedDelta: String(dto.quantity),
        failure: INSUFFICIENT_AVAILABLE,
      });

      return { inventory: await this.load(manager, dto), movements: [] };
    });
  }

  // No active check: releasing must stay possible after a product or
  // warehouse is deactivated.
  release(dto: ReservationDto): Promise<StockResult> {
    return this.transaction(async (manager) => {
      await this.changeQuantity(manager, dto, {
        delta: '0',
        reservedDelta: String(-dto.quantity),
        failure: INSUFFICIENT_RESERVED,
      });

      return { inventory: await this.load(manager, dto), movements: [] };
    });
  }

  private transaction<T>(work: (manager: EntityManager) => Promise<T>) {
    return this.inventoryRepository.manager.transaction(work);
  }

  private async assertActive(
    manager: EntityManager,
    productId: string,
    warehouseIds: string[],
  ): Promise<void> {
    await this.products.findActiveOrFail(productId, manager);
    for (const warehouseId of warehouseIds) {
      await this.warehouses.findActiveOrFail(warehouseId, manager);
    }
  }

  // Creates missing rows at zero. In warehouse id order, like lockRows: two
  // transactions inserting the same new keys wait on each other in the same
  // order instead of deadlocking.
  private async ensureRows(
    manager: EntityManager,
    productId: string,
    warehouseIds: string[],
  ): Promise<void> {
    for (const warehouseId of [...warehouseIds].sort()) {
      await manager.query(
        `INSERT INTO inventory (product_id, warehouse_id) VALUES ($1, $2)
         ON CONFLICT ON CONSTRAINT "${UQ_INVENTORY_PRODUCT_WAREHOUSE}" DO NOTHING`,
        [productId, warehouseId],
      );
    }
  }

  private async lockRows(
    manager: EntityManager,
    productId: string,
    warehouseIds: string[],
  ): Promise<void> {
    await manager.query(
      `SELECT id FROM inventory
        WHERE product_id = $1 AND warehouse_id = ANY($2::uuid[])
        ORDER BY warehouse_id
        FOR UPDATE`,
      [productId, warehouseIds],
    );
  }

  /** Changes quantity by `delta` and records the movement. */
  private async move(
    manager: EntityManager,
    location: Location & MovementContextDto,
    options: {
      type: StockMovementTypeEnum;
      delta: string;
      reservedDelta?: string;
      failure?: string;
      context?: MovementContextDto;
      userId: string;
    },
  ): Promise<StockMovement> {
    const change = await this.changeQuantity(manager, location, {
      delta: options.delta,
      reservedDelta: options.reservedDelta ?? '0',
      failure: options.failure ?? INSUFFICIENT_AVAILABLE,
    });

    return this.record(manager, location, {
      type: options.type,
      change,
      context: options.context ?? location,
      userId: options.userId,
    });
  }

  /**
   * Adds the deltas to quantity and reserved_quantity, provided the result
   * keeps 0 <= reserved_quantity <= quantity. Throws a 409 with `failure` when
   * it wouldn't (or there is no row).
   */
  private async changeQuantity(
    manager: EntityManager,
    { productId, warehouseId }: Location,
    {
      delta,
      reservedDelta,
      failure,
    }: { delta: string; reservedDelta: string; failure: string },
  ): Promise<QuantityChange> {
    // UPDATE through manager.query resolves to [rows, affected count].
    const [rows] = await manager.query<[QuantityChange[], number]>(
      `UPDATE inventory
          SET quantity = quantity + $3::numeric,
              reserved_quantity = reserved_quantity + $4::numeric,
              updated_at = now()
        WHERE product_id = $1 AND warehouse_id = $2
          AND quantity + $3::numeric >= reserved_quantity + $4::numeric
          AND reserved_quantity + $4::numeric >= 0
        RETURNING quantity - $3::numeric AS before,
                  quantity AS after,
                  $3::numeric AS change`,
      [productId, warehouseId, delta, reservedDelta],
    );

    if (!rows.length) throw new ConflictException(failure);
    return rows[0];
  }

  private record(
    manager: EntityManager,
    { productId, warehouseId }: Location,
    options: {
      type: StockMovementTypeEnum;
      change: QuantityChange;
      context: MovementContextDto;
      userId: string;
    },
  ): Promise<StockMovement> {
    const repository = manager.getRepository(StockMovement);
    const { change, context } = options;

    return repository.save(
      repository.create({
        productId,
        warehouseId,
        movementType: options.type,
        quantity: change.change,
        beforeQuantity: change.before,
        afterQuantity: change.after,
        referenceType: context.referenceType ?? null,
        referenceId: context.referenceId ?? null,
        remark: context.remark ?? null,
        createdBy: options.userId,
      }),
    );
  }

  private load(
    manager: EntityManager,
    { productId, warehouseId }: Location,
  ): Promise<Inventory> {
    return manager
      .getRepository(Inventory)
      .findOneOrFail({ where: { productId, warehouseId } });
  }
}
