import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Paginated } from '@/common/dto/pagination-query.dto';
import { containsPattern } from '@/common/utils/like-pattern';
import {
  PG_RESTRICT_VIOLATION,
  pgErrorOf,
  rethrowUniqueViolation,
} from '@/common/utils/pg-errors';
import { CreateUnitDto } from './dto/create-unit.dto';
import { FindUnitsQueryDto } from './dto/find-units-query.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { UQ_UNITS_NAME, UQ_UNITS_SYMBOL, Unit } from './entities/unit.entity';

export const UNIT_NAME_TAKEN = 'A unit with that name already exists.';
export const UNIT_SYMBOL_TAKEN = 'A unit with that symbol already exists.';
export const UNIT_NOT_FOUND = 'Unit not found';
export const UNIT_IN_USE = 'Unit is in use by one or more products';
const TAKEN_BY_CONSTRAINT: Record<string, string> = {
  [UQ_UNITS_NAME]: UNIT_NAME_TAKEN,
  [UQ_UNITS_SYMBOL]: UNIT_SYMBOL_TAKEN,
};

@Injectable()
export class UnitsService {
  constructor(
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
  ) {}

  create(dto: CreateUnitDto): Promise<Unit> {
    return this.save(this.unitRepository.create(dto));
  }

  async findAll({
    page,
    limit,
    search,
  }: FindUnitsQueryDto): Promise<Paginated<Unit>> {
    const pattern = search ? ILike(containsPattern(search)) : undefined;

    const [items, total] = await this.unitRepository.findAndCount({
      where: pattern ? [{ name: pattern }, { symbol: pattern }] : {},
      order: { name: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  async findOneOrFail(id: string): Promise<Unit> {
    const unit = await this.unitRepository.findOne({ where: { id } });
    if (!unit) throw new NotFoundException(UNIT_NOT_FOUND);

    return unit;
  }

  async update(id: string, dto: UpdateUnitDto): Promise<Unit> {
    const unit = await this.unitRepository.preload({ id, ...dto });
    if (!unit) throw new NotFoundException(UNIT_NOT_FOUND);

    return this.save(unit);
  }

  // Hard delete; the products foreign key (ON DELETE RESTRICT) refuses it
  // while any product still uses the unit.
  async remove(id: string): Promise<void> {
    try {
      const { affected } = await this.unitRepository.delete(id);
      if (!affected) throw new NotFoundException(UNIT_NOT_FOUND);
    } catch (error) {
      if (pgErrorOf(error)?.code === PG_RESTRICT_VIOLATION) {
        throw new ConflictException(UNIT_IN_USE);
      }
      throw error;
    }
  }

  private async save(unit: Unit): Promise<Unit> {
    try {
      return await this.unitRepository.save(unit);
    } catch (error) {
      rethrowUniqueViolation(
        error,
        TAKEN_BY_CONSTRAINT,
        'A unit with those details already exists.',
      );
    }
  }
}
