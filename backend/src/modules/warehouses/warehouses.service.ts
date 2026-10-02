import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, ILike, Repository } from 'typeorm';
import { MasterDataQueryDto } from '@/common/dto/master-data-query.dto';
import { Paginated } from '@/common/dto/pagination-query.dto';
import { containsPattern } from '@/common/utils/like-pattern';
import { rethrowUniqueViolation } from '@/common/utils/pg-errors';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { UQ_WAREHOUSES_CODE, Warehouse } from './entities/warehouse.entity';

export const WAREHOUSE_CODE_TAKEN =
  'A warehouse with that code already exists.';
export const WAREHOUSE_NOT_FOUND = 'Warehouse not found';
export const WAREHOUSE_INACTIVE = 'Warehouse is inactive';

@Injectable()
export class WarehousesService {
  constructor(
    @InjectRepository(Warehouse)
    private readonly warehouseRepository: Repository<Warehouse>,
  ) {}

  create(dto: CreateWarehouseDto): Promise<Warehouse> {
    return this.save(this.warehouseRepository.create(dto));
  }

  async findAll({
    page,
    limit,
    search,
    isActive,
  }: MasterDataQueryDto): Promise<Paginated<Warehouse>> {
    const base: FindOptionsWhere<Warehouse> = {};
    if (isActive !== undefined) base.isActive = isActive;
    const pattern = search ? ILike(containsPattern(search)) : undefined;

    const [items, total] = await this.warehouseRepository.findAndCount({
      where: pattern
        ? [
            { ...base, code: pattern },
            { ...base, name: pattern },
          ]
        : base,
      order: { code: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  async findOneOrFail(id: string): Promise<Warehouse> {
    const warehouse = await this.warehouseRepository.findOne({ where: { id } });
    if (!warehouse) throw new NotFoundException(WAREHOUSE_NOT_FOUND);

    return warehouse;
  }

  /**
   * For a stock movement: the warehouse must exist and be active. Pass the
   * transaction's manager to read inside it.
   */
  async findActiveOrFail(
    id: string,
    manager?: EntityManager,
  ): Promise<Warehouse> {
    const repository =
      manager?.getRepository(Warehouse) ?? this.warehouseRepository;
    const warehouse = await repository.findOne({ where: { id } });
    if (!warehouse) throw new NotFoundException(WAREHOUSE_NOT_FOUND);
    if (!warehouse.isActive) throw new ConflictException(WAREHOUSE_INACTIVE);

    return warehouse;
  }

  async update(id: string, dto: UpdateWarehouseDto): Promise<Warehouse> {
    const warehouse = await this.warehouseRepository.preload({ id, ...dto });
    if (!warehouse) throw new NotFoundException(WAREHOUSE_NOT_FOUND);

    return this.save(warehouse);
  }

  // Soft delete: inventory and movement history keep pointing at it.
  async remove(id: string): Promise<void> {
    const { affected } = await this.warehouseRepository.update(id, {
      isActive: false,
    });
    if (!affected) throw new NotFoundException(WAREHOUSE_NOT_FOUND);
  }

  private async save(warehouse: Warehouse): Promise<Warehouse> {
    try {
      return await this.warehouseRepository.save(warehouse);
    } catch (error) {
      rethrowUniqueViolation(
        error,
        { [UQ_WAREHOUSES_CODE]: WAREHOUSE_CODE_TAKEN },
        WAREHOUSE_CODE_TAKEN,
      );
    }
  }
}
