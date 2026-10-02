import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StockMovementTypeEnum } from '@/common/constants/enum';
import { ProductsService } from '../products/products.service';
import { WarehousesService } from '../warehouses/warehouses.service';
import { Inventory } from './entities/inventory.entity';
import { StockMovement } from './entities/stock-movement.entity';
import {
  COUNT_BELOW_RESERVED,
  COUNT_UNCHANGED,
  INSUFFICIENT_AVAILABLE,
  INSUFFICIENT_RESERVED,
  SAME_WAREHOUSE,
  StockService,
  TRANSFER_REFERENCE_TYPE,
} from './stock.service';

const PRODUCT = 'p1';
const WH_A = 'a0000000-0000-0000-0000-000000000000';
const WH_B = 'b0000000-0000-0000-0000-000000000000';
const USER = 'u1';

describe('StockService', () => {
  let service: StockService;

  // manager.query answers by statement kind; UPDATEs resolve to [rows, count]
  // like the real Postgres driver.
  const updateRows: unknown[][] = [];
  let selectRows: unknown[] = [];
  const query = jest.fn<Promise<unknown>, [string, unknown[]?]>((sql) => {
    if (sql.trimStart().startsWith('UPDATE')) {
      const rows = updateRows.shift() ?? [];
      return Promise.resolve([rows, rows.length]);
    }
    if (sql.includes('FOR UPDATE') && sql.includes('SELECT quantity')) {
      return Promise.resolve(selectRows);
    }
    return Promise.resolve([]);
  });

  const movementRepo = {
    create: jest.fn((fields: Partial<StockMovement>) => fields),
    save: jest.fn((movement: Partial<StockMovement>) =>
      Promise.resolve({ id: 'm', ...movement }),
    ),
  };
  const inventoryRepo = {
    findOneOrFail: jest.fn(({ where }: { where: Partial<Inventory> }) =>
      Promise.resolve({ ...where, quantity: '0' }),
    ),
  };
  const manager = {
    query,
    getRepository: (entity: unknown) =>
      entity === StockMovement ? movementRepo : inventoryRepo,
  };
  const repo = {
    manager: {
      transaction: jest.fn((work: (m: typeof manager) => unknown) =>
        work(manager),
      ),
    },
  };

  const products = { findActiveOrFail: jest.fn() };
  const warehouses = { findActiveOrFail: jest.fn() };

  const sqlCalls = () => query.mock.calls.map(([sql]) => sql);
  const savedMovements = () =>
    movementRepo.save.mock.calls.map(([movement]) => movement);

  beforeEach(async () => {
    jest.clearAllMocks();
    updateRows.length = 0;
    selectRows = [];
    products.findActiveOrFail.mockResolvedValue({ id: PRODUCT });
    warehouses.findActiveOrFail.mockResolvedValue({});

    const moduleRef = await Test.createTestingModule({
      providers: [
        StockService,
        { provide: getRepositoryToken(Inventory), useValue: repo },
        { provide: ProductsService, useValue: products },
        { provide: WarehousesService, useValue: warehouses },
      ],
    }).compile();

    service = moduleRef.get(StockService);
  });

  describe('receive', () => {
    it('creates the row if missing, adds the quantity and records an IN movement', async () => {
      updateRows.push([{ before: '2.0000', after: '12.0000', change: '10' }]);

      const result = await service.receive(
        {
          productId: PRODUCT,
          warehouseId: WH_A,
          quantity: 10,
          referenceType: 'PO',
          remark: 'lot 1',
        },
        USER,
      );

      expect(sqlCalls()[0]).toContain('ON CONFLICT');
      expect(query.mock.calls[1][1]).toEqual([PRODUCT, WH_A, '10', '0']);
      expect(savedMovements()).toEqual([
        expect.objectContaining({
          movementType: StockMovementTypeEnum.IN,
          quantity: '10',
          beforeQuantity: '2.0000',
          afterQuantity: '12.0000',
          referenceType: 'PO',
          referenceId: null,
          remark: 'lot 1',
          createdBy: USER,
        }),
      ]);
      expect(result.movements).toHaveLength(1);
    });

    it('rejects an inactive product before touching inventory', async () => {
      products.findActiveOrFail.mockRejectedValue(new ConflictException());

      await expect(
        service.receive(
          { productId: PRODUCT, warehouseId: WH_A, quantity: 1 },
          USER,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(query).not.toHaveBeenCalled();
    });
  });

  describe('issue', () => {
    it('subtracts from quantity only', async () => {
      updateRows.push([{ before: '5', after: '2', change: '-3' }]);

      await service.issue(
        { productId: PRODUCT, warehouseId: WH_A, quantity: 3 },
        USER,
      );

      expect(query.mock.calls[0][1]).toEqual([PRODUCT, WH_A, '-3', '0']);
      expect(savedMovements()[0]).toMatchObject({
        movementType: StockMovementTypeEnum.OUT,
        quantity: '-3',
      });
    });

    it('lowers the reservation too when issuing from reserved stock', async () => {
      updateRows.push([{ before: '5', after: '2', change: '-3' }]);

      await service.issue(
        {
          productId: PRODUCT,
          warehouseId: WH_A,
          quantity: 3,
          fromReserved: true,
        },
        USER,
      );

      expect(query.mock.calls[0][1]).toEqual([PRODUCT, WH_A, '-3', '-3']);
    });

    it.each([
      [false, INSUFFICIENT_AVAILABLE],
      [true, INSUFFICIENT_RESERVED],
    ])(
      'returns 409 and records nothing when the update matches no row (fromReserved=%s)',
      async (fromReserved, message) => {
        await expect(
          service.issue(
            {
              productId: PRODUCT,
              warehouseId: WH_A,
              quantity: 3,
              fromReserved,
            },
            USER,
          ),
        ).rejects.toThrow(new ConflictException(message));
        expect(movementRepo.save).not.toHaveBeenCalled();
      },
    );
  });

  describe('adjust', () => {
    const dto = { productId: PRODUCT, warehouseId: WH_A, countedQuantity: 8 };

    it('sets the counted quantity and records the difference', async () => {
      selectRows = [{ quantity: '10.0000' }];
      updateRows.push([{ after: '8.0000', change: '-2.0000' }]);

      await service.adjust(dto, USER);

      expect(sqlCalls()[1]).toContain('FOR UPDATE');
      expect(savedMovements()[0]).toMatchObject({
        movementType: StockMovementTypeEnum.ADJUSTMENT,
        quantity: '-2.0000',
        beforeQuantity: '10.0000',
        afterQuantity: '8.0000',
      });
    });

    it('returns 409 when the count is below the reserved quantity', async () => {
      selectRows = [{ quantity: '10.0000' }];

      await expect(service.adjust(dto, USER)).rejects.toThrow(
        new ConflictException(COUNT_BELOW_RESERVED),
      );
    });

    it('returns 400 when the count equals the current quantity', async () => {
      selectRows = [{ quantity: '8.0000' }];
      updateRows.push([{ after: '8.0000', change: '0.0000' }]);

      await expect(service.adjust(dto, USER)).rejects.toThrow(
        new BadRequestException(COUNT_UNCHANGED),
      );
      expect(movementRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('transfer', () => {
    const dto = {
      productId: PRODUCT,
      fromWarehouseId: WH_B,
      toWarehouseId: WH_A,
      quantity: 2,
    };

    it('rejects the same warehouse on both sides', async () => {
      await expect(
        service.transfer({ ...dto, toWarehouseId: WH_B }, USER),
      ).rejects.toThrow(new BadRequestException(SAME_WAREHOUSE));
      expect(repo.manager.transaction).not.toHaveBeenCalled();
    });

    it('creates and locks both rows in warehouse id order, then moves out and in', async () => {
      updateRows.push(
        [{ before: '5', after: '3', change: '-2' }],
        [{ before: '0', after: '2', change: '2' }],
      );

      const result = await service.transfer(dto, USER);

      const [insertA, insertB, lock, out, into] = query.mock.calls;
      expect(insertA[1]).toEqual([PRODUCT, WH_A]);
      expect(insertB[1]).toEqual([PRODUCT, WH_B]);
      expect(lock[0]).toContain('ORDER BY warehouse_id');
      expect(out[1]).toEqual([PRODUCT, WH_B, '-2', '0']);
      expect(into[1]).toEqual([PRODUCT, WH_A, '2', '0']);

      const reference = {
        referenceType: TRANSFER_REFERENCE_TYPE,
        referenceId: result.transferId,
      };
      expect(savedMovements()).toEqual([
        expect.objectContaining({
          ...reference,
          warehouseId: WH_B,
          movementType: StockMovementTypeEnum.TRANSFER_OUT,
        }),
        expect.objectContaining({
          ...reference,
          warehouseId: WH_A,
          movementType: StockMovementTypeEnum.TRANSFER_IN,
        }),
      ]);
    });

    it('fails without recording anything when the source lacks stock', async () => {
      await expect(service.transfer(dto, USER)).rejects.toThrow(
        new ConflictException(INSUFFICIENT_AVAILABLE),
      );
      expect(movementRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('reservations', () => {
    const dto = { productId: PRODUCT, warehouseId: WH_A, quantity: 4 };

    it('reserve raises reserved_quantity and records no movement', async () => {
      updateRows.push([{ before: '5', after: '5', change: '0' }]);

      const result = await service.reserve(dto);

      expect(query.mock.calls[0][1]).toEqual([PRODUCT, WH_A, '0', '4']);
      expect(result.movements).toEqual([]);
      expect(movementRepo.save).not.toHaveBeenCalled();
    });

    it('release lowers reserved_quantity without checking the product is active', async () => {
      updateRows.push([{ before: '5', after: '5', change: '0' }]);

      await service.release(dto);

      expect(query.mock.calls[0][1]).toEqual([PRODUCT, WH_A, '0', '-4']);
      expect(products.findActiveOrFail).not.toHaveBeenCalled();
    });

    it('release returns 409 when less is reserved', async () => {
      await expect(service.release(dto)).rejects.toThrow(
        new ConflictException(INSUFFICIENT_RESERVED),
      );
    });

    it('reserve propagates a missing warehouse', async () => {
      warehouses.findActiveOrFail.mockRejectedValue(new NotFoundException());

      await expect(service.reserve(dto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
