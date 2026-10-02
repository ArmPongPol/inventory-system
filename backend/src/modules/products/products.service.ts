import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DeepPartial, EntityManager, Repository } from 'typeorm';
import { Paginated } from '@/common/dto/pagination-query.dto';
import { containsPattern } from '@/common/utils/like-pattern';
import {
  PG_FOREIGN_KEY_VIOLATION,
  pgErrorOf,
  rethrowUniqueViolation,
} from '@/common/utils/pg-errors';
import { CategoriesService } from '../categories/categories.service';
import { UNIT_NOT_FOUND, UnitsService } from '../units/units.service';
import { CreateProductDto } from './dto/create-product.dto';
import { FindProductsQueryDto } from './dto/find-products-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product, UQ_PRODUCTS_SKU } from './entities/product.entity';

export const SKU_TAKEN = 'A product with that SKU already exists.';
export const PRODUCT_NOT_FOUND = 'Product not found';
export const PRODUCT_INACTIVE = 'Product is inactive';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly categories: CategoriesService,
    private readonly units: UnitsService,
  ) {}

  async create(dto: CreateProductDto): Promise<Product> {
    if (dto.categoryId) await this.categories.findActiveOrFail(dto.categoryId);
    if (dto.unitId) await this.units.findOneOrFail(dto.unitId);

    const saved = await this.save(
      this.productRepository.create(this.toEntityFields(dto)),
    );

    return this.findOneOrFail(saved.id);
  }

  async findAll({
    page,
    limit,
    search,
    isActive,
    categoryId,
  }: FindProductsQueryDto): Promise<Paginated<Product>> {
    const query = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.unit', 'unit')
      .orderBy('product.sku', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      const pattern = containsPattern(search);
      query.andWhere(
        new Brackets((match) =>
          match
            .where('product.sku ILIKE :pattern', { pattern })
            .orWhere('product.name ILIKE :pattern', { pattern }),
        ),
      );
    }
    if (isActive !== undefined) {
      query.andWhere('product.isActive = :isActive', { isActive });
    }
    if (categoryId) {
      query.andWhere('product.categoryId = :categoryId', { categoryId });
    }

    const [items, total] = await query.getManyAndCount();
    return { items, total, page, limit };
  }

  async findOneOrFail(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: { category: true, unit: true },
    });
    if (!product) throw new NotFoundException(PRODUCT_NOT_FOUND);

    return product;
  }

  /**
   * For a stock movement: the product must exist and be active. Pass the
   * transaction's manager to read inside it.
   */
  async findActiveOrFail(
    id: string,
    manager?: EntityManager,
  ): Promise<Product> {
    const repository =
      manager?.getRepository(Product) ?? this.productRepository;
    const product = await repository.findOne({ where: { id } });
    if (!product) throw new NotFoundException(PRODUCT_NOT_FOUND);
    if (!product.isActive) throw new ConflictException(PRODUCT_INACTIVE);

    return product;
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) throw new NotFoundException(PRODUCT_NOT_FOUND);

    // Only a newly assigned category must be active; keeping an existing one
    // that was deactivated since is fine.
    if (dto.categoryId && dto.categoryId !== product.categoryId) {
      await this.categories.findActiveOrFail(dto.categoryId);
    }
    if (dto.unitId && dto.unitId !== product.unitId) {
      await this.units.findOneOrFail(dto.unitId);
    }

    await this.save(
      this.productRepository.merge(product, this.toEntityFields(dto)),
    );

    return this.findOneOrFail(id);
  }

  // Soft delete: inventory and movement history keep pointing at it.
  async remove(id: string): Promise<void> {
    const { affected } = await this.productRepository.update(id, {
      isActive: false,
    });
    if (!affected) throw new NotFoundException(PRODUCT_NOT_FOUND);
  }

  private toEntityFields({
    minimumStock,
    ...rest
  }: UpdateProductDto): DeepPartial<Product> {
    return minimumStock === undefined
      ? rest
      : { ...rest, minimumStock: String(minimumStock) };
  }

  private async save(product: Product): Promise<Product> {
    try {
      return await this.productRepository.save(product);
    } catch (error) {
      // The unit was deleted between the check above and this write
      // (categories are never deleted).
      if (pgErrorOf(error)?.code === PG_FOREIGN_KEY_VIOLATION) {
        throw new NotFoundException(UNIT_NOT_FOUND);
      }
      rethrowUniqueViolation(
        error,
        { [UQ_PRODUCTS_SKU]: SKU_TAKEN },
        SKU_TAKEN,
      );
    }
  }
}
