import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, QueryFailedError, Repository } from 'typeorm';
import { UserRoleEnum, UserStatusEnum } from '@/common/constants/enum';
import { SessionsService } from '../sessions/sessions.service';
import { CreateUserDto } from './dto/create-user.dto';
import { FindUsersQueryDto } from './dto/find-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  UQ_USERS_EMAIL,
  UQ_USERS_USERNAME,
  User,
} from './entities/user.entity';
import { PasswordService } from './password.service';
import { UserCacheService } from './user-cache.service';

const PG_UNIQUE_VIOLATION = '23505';
export const EMAIL_TAKEN = 'An account with that email already exists.';
export const USERNAME_TAKEN = 'An account with that username already exists.';
const TAKEN_BY_CONSTRAINT: Record<string, string> = {
  [UQ_USERS_EMAIL]: EMAIL_TAKEN,
  [UQ_USERS_USERNAME]: USERNAME_TAKEN,
};
export const LAST_ADMIN_MESSAGE = 'Cannot remove the last administrator';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionsService,
    private readonly userCache: UserCacheService,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    // Checked up front for a clear error; saveUnique still covers the race
    // where two requests pass this check at the same time.
    if (await this.userRepository.exists({ where: { email: dto.email } })) {
      throw new ConflictException(EMAIL_TAKEN);
    }
    if (
      await this.userRepository.exists({ where: { username: dto.username } })
    ) {
      throw new ConflictException(USERNAME_TAKEN);
    }

    const saved = await this.saveUnique(
      this.userRepository,
      this.userRepository.create({
        ...dto,
        role: dto.role ?? UserRoleEnum.USER,
        password: await this.passwords.hash(dto.password),
      }),
    );

    // Re-read so the response comes from a `select: false` query and never
    // carries the password hash.
    return this.findOneOrFail(saved.id);
  }

  async findAll({ page, limit }: FindUsersQueryDto) {
    const [items, total] = await this.userRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  findOne(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findOneOrFail(id: string): Promise<User> {
    const user = await this.findOne(id);
    if (!user) throw new NotFoundException('User not found');

    return user;
  }

  // The only lookup that returns the password hash; used by login. The
  // identifier is an email when it contains "@" (usernames can't), otherwise
  // a username. Expects it already normalized (lowercased), like LoginDto does.
  findByLoginWithPassword(identifier: string): Promise<User | null> {
    const column = identifier.includes('@') ? 'email' : 'username';
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where(`user.${column} = :identifier`, { identifier })
      .getOne();
  }

  /**
   * Replaces a password hash with a re-hash of the same password (login
   * upgrading old argon2 parameters). Conditional on the old hash, so it never
   * overwrites a password that was changed in the meantime.
   */
  async replacePasswordHash(
    id: string,
    currentHash: string,
    newHash: string,
  ): Promise<boolean> {
    const { affected } = await this.userRepository.update(
      { id, password: currentHash },
      { password: newHash },
    );
    return Boolean(affected);
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const { password, ...rest } = dto;
    const changes: DeepPartial<User> = { ...rest };
    if (password) {
      changes.password = await this.passwords.hash(password);
    }

    await this.userRepository.manager.transaction(async (manager) => {
      const repository = manager.getRepository(User);

      const before = await repository.findOne({ where: { id } });
      if (!before) throw new NotFoundException('User not found');

      const losesAdmin =
        (rest.role !== undefined && rest.role !== UserRoleEnum.ADMIN) ||
        (rest.status !== undefined && rest.status !== UserStatusEnum.ACTIVE);
      if (losesAdmin && this.isActiveAdmin(before)) {
        await this.assertNotLastActiveAdmin(repository, id);
      }

      const user = await repository.preload({ id, ...changes });
      if (!user) throw new NotFoundException('User not found');

      await this.saveUnique(repository, user);

      // Existing refresh sessions must not outlive a credential or
      // privilege change. Same transaction, so both happen or neither does.
      const revokeSessions =
        Boolean(password) ||
        rest.status === UserStatusEnum.INACTIVE ||
        (rest.role !== undefined && rest.role !== before.role);
      if (revokeSessions) {
        await this.sessions.revokeAllForUser(id, manager);
      }
    });
    this.userCache.invalidate(id);

    return this.findOneOrFail(id);
  }

  // Soft delete: the row stays for history, JwtStrategy rejects the account's
  // access tokens from the next request on, and its refresh sessions are revoked.
  async remove(id: string): Promise<void> {
    await this.userRepository.manager.transaction(async (manager) => {
      const repository = manager.getRepository(User);

      const user = await repository.findOne({ where: { id } });
      if (!user) throw new NotFoundException('User not found');

      if (this.isActiveAdmin(user)) {
        await this.assertNotLastActiveAdmin(repository, id);
      }

      const { affected } = await repository.update(id, {
        status: UserStatusEnum.INACTIVE,
      });
      if (!affected) throw new NotFoundException('User not found');

      await this.sessions.revokeAllForUser(id, manager);
    });
    this.userCache.invalidate(id);
  }

  private isActiveAdmin(user: User): boolean {
    return (
      user.role === UserRoleEnum.ADMIN && user.status === UserStatusEnum.ACTIVE
    );
  }

  // Locks every active administrator row (FOR UPDATE) before counting, so two
  // concurrent requests demoting the last two admins are serialized: the
  // second one waits, re-reads, and sees it would leave none.
  private async assertNotLastActiveAdmin(
    repository: Repository<User>,
    id: string,
  ): Promise<void> {
    const admins = await repository.find({
      select: { id: true },
      where: { role: UserRoleEnum.ADMIN, status: UserStatusEnum.ACTIVE },
      lock: { mode: 'pessimistic_write' },
    });

    const others = admins.filter((admin) => admin.id !== id);
    if (others.length === 0) {
      throw new ConflictException(LAST_ADMIN_MESSAGE);
    }
  }

  private async saveUnique(
    repository: Repository<User>,
    user: User,
  ): Promise<User> {
    try {
      return await repository.save(user);
    } catch (error) {
      const driverError =
        error instanceof QueryFailedError
          ? (error.driverError as { code?: string; constraint?: string })
          : undefined;
      if (driverError?.code === PG_UNIQUE_VIOLATION) {
        throw new ConflictException(
          TAKEN_BY_CONSTRAINT[driverError.constraint ?? ''] ??
            'An account with those details already exists.',
        );
      }
      throw error;
    }
  }
}
