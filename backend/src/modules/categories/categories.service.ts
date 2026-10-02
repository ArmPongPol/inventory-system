import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { MasterDataQueryDto } from '@/common/dto/master-data-query.dto';
import { Paginated } from '@/common/dto/pagination-query.dto';
import { containsPattern } from '@/common/utils/like-pattern';
import { rethrowUniqueViolation } from '@/common/utils/pg-errors';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category, UQ_CATEGORIES_NAME } from './entities/category.entity';

export const CATEGORY_NAME_TAKEN = 'A category with that name already exists.';
export const CATEGORY_NOT_FOUND = 'Category not found';
export const CATEGORY_INACTIVE = 'Category is inactive';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  create(dto: CreateCategoryDto): Promise<Category> {
    return this.save(this.categoryRepository.create(dto));
  }

  async findAll({
    page,
    limit,
    search,
    isActive,
  }: MasterDataQueryDto): Promise<Paginated<Category>> {
    const where: FindOptionsWhere<Category> = {};
    if (search) where.name = ILike(containsPattern(search));
    if (isActive !== undefined) where.isActive = isActive;

    const [items, total] = await this.categoryRepository.findAndCount({
      where,
      order: { name: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  async findOneOrFail(id: string): Promise<Category> {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) throw new NotFoundException(CATEGORY_NOT_FOUND);

    return category;
  }

  /** For assigning a category to a product: it must exist and be active. */
  async findActiveOrFail(id: string): Promise<Category> {
    const category = await this.findOneOrFail(id);
    if (!category.isActive) throw new ConflictException(CATEGORY_INACTIVE);

    return category;
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const category = await this.categoryRepository.preload({ id, ...dto });
    if (!category) throw new NotFoundException(CATEGORY_NOT_FOUND);

    return this.save(category);
  }

  // Soft delete: products keep their category for history.
  async remove(id: string): Promise<void> {
    const { affected } = await this.categoryRepository.update(id, {
      isActive: false,
    });
    if (!affected) throw new NotFoundException(CATEGORY_NOT_FOUND);
  }

  private async save(category: Category): Promise<Category> {
    try {
      return await this.categoryRepository.save(category);
    } catch (error) {
      rethrowUniqueViolation(
        error,
        { [UQ_CATEGORIES_NAME]: CATEGORY_NAME_TAKEN },
        CATEGORY_NAME_TAKEN,
      );
    }
  }
}
