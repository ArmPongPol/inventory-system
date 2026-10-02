import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryFailedError } from 'typeorm';
import { CategoriesService } from '../categories/categories.service';
import { UNIT_NOT_FOUND, UnitsService } from '../units/units.service';
import { Product, UQ_PRODUCTS_SKU } from './entities/product.entity';
import {
  PRODUCT_INACTIVE,
  ProductsService,
  SKU_TAKEN,
} from './products.service';

const pgError = (code: string, constraint?: string) =>
  new QueryFailedError(
    'INSERT',
    [],
    Object.assign(new Error(code), { code, constraint }),
  );

const product = (overrides: Partial<Product> = {}) =>
  ({
    id: 'p1',
    sku: 'SKU-1',
    name: 'Water',
    categoryId: 'c1',
    unitId: null,
    minimumStock: '0',
    isActive: true,
    ...overrides,
  }) as Product;

describe('ProductsService', () => {
  let service: ProductsService;

  const repo = {
    create: jest.fn((fields: Partial<Product>) => fields as Product),
    merge: jest.fn((target: Product, fields: Partial<Product>) =>
      Object.assign(target, fields),
    ),
    save: jest.fn<Promise<Product>, [Product]>(),
    findOne: jest.fn<Promise<Product | null>, []>(),
    update: jest.fn<
      Promise<{ affected?: number }>,
      [string, Partial<Product>]
    >(),
  };
  const categories = { findActiveOrFail: jest.fn() };
  const units = { findOneOrFail: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    repo.save.mockImplementation((p) => Promise.resolve({ ...p, id: 'p1' }));
    repo.findOne.mockResolvedValue(product());
    repo.update.mockResolvedValue({ affected: 1 });
    categories.findActiveOrFail.mockResolvedValue({});
    units.findOneOrFail.mockResolvedValue({});

    const moduleRef = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getRepositoryToken(Product), useValue: repo },
        { provide: CategoriesService, useValue: categories },
        { provide: UnitsService, useValue: units },
      ],
    }).compile();

    service = moduleRef.get(ProductsService);
  });

  it('create checks category and unit, and stores minimum stock as text', async () => {
    await service.create({
      sku: 'SKU-1',
      name: 'Water',
      categoryId: 'c1',
      unitId: 'u1',
      minimumStock: 2.5,
    });

    expect(categories.findActiveOrFail).toHaveBeenCalledWith('c1');
    expect(units.findOneOrFail).toHaveBeenCalledWith('u1');
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ minimumStock: '2.5' }),
    );
  });

  it('maps a duplicate SKU to 409', async () => {
    repo.save.mockRejectedValue(pgError('23505', UQ_PRODUCTS_SKU));

    await expect(
      service.create({ sku: 'SKU-1', name: 'Water' }),
    ).rejects.toThrow(new ConflictException(SKU_TAKEN));
  });

  it('maps a unit deleted mid-request to 404', async () => {
    repo.save.mockRejectedValue(pgError('23503'));

    await expect(
      service.create({ sku: 'SKU-1', name: 'Water', unitId: 'u1' }),
    ).rejects.toThrow(new NotFoundException(UNIT_NOT_FOUND));
  });

  it('update only checks a category that changes', async () => {
    await service.update('p1', { categoryId: 'c1', name: 'Still water' });
    expect(categories.findActiveOrFail).not.toHaveBeenCalled();

    await service.update('p1', { categoryId: 'c2' });
    expect(categories.findActiveOrFail).toHaveBeenCalledWith('c2');
  });

  it('remove deactivates instead of deleting', async () => {
    await service.remove('p1');
    expect(repo.update).toHaveBeenCalledWith('p1', { isActive: false });
  });

  it('remove of an unknown product is 404', async () => {
    repo.update.mockResolvedValue({ affected: 0 });
    await expect(service.remove('p1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('findActiveOrFail rejects an inactive product', async () => {
    repo.findOne.mockResolvedValue(product({ isActive: false }));
    await expect(service.findActiveOrFail('p1')).rejects.toThrow(
      new ConflictException(PRODUCT_INACTIVE),
    );
  });
});
