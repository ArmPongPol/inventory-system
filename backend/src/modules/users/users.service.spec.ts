import { ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as argon2 from 'argon2';
import { QueryFailedError } from 'typeorm';
import { UserRoleEnum, UserStatusEnum } from '@/common/constants/enum';
import { SessionsService } from '../sessions/sessions.service';
import { CreateUserDto } from './dto/create-user.dto';
import {
  UQ_USERS_EMAIL,
  UQ_USERS_USERNAME,
  User,
} from './entities/user.entity';
import { PasswordService } from './password.service';
import { UserCacheService } from './user-cache.service';
import {
  EMAIL_TAKEN,
  LAST_ADMIN_MESSAGE,
  USERNAME_TAKEN,
  UsersService,
} from './users.service';

const dto: CreateUserDto = {
  username: 'test.user',
  email: 'user@example.com',
  password: 'Str0ng!Passw0rd',
  firstName: 'Test',
  lastName: 'User',
};

const uniqueViolation = (constraint = UQ_USERS_EMAIL) =>
  new QueryFailedError(
    'INSERT',
    [],
    Object.assign(new Error('duplicate key'), { code: '23505', constraint }),
  );

const admin = (overrides: Partial<User> = {}) =>
  ({
    id: 'a1',
    email: 'admin@example.com',
    role: UserRoleEnum.ADMIN,
    status: UserStatusEnum.ACTIVE,
    ...overrides,
  }) as User;

describe('UsersService', () => {
  let service: UsersService;

  const queryBuilder = {
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(null),
  };

  const repo = {
    createQueryBuilder: jest.fn(() => queryBuilder),
    exists: jest.fn<Promise<boolean>, [{ where: Partial<User> }]>(),
    create: jest.fn((entity: Partial<User>) => entity as User),
    save: jest.fn<Promise<User>, [User]>(),
    findOne: jest.fn<Promise<User | null>, []>(),
    preload: jest.fn<Promise<User | undefined>, [Partial<User>]>(),
    update: jest.fn<Promise<{ affected?: number }>, [unknown, Partial<User>]>(),
    find: jest.fn<Promise<User[]>, [Record<string, unknown>]>(),
    manager: {
      // Runs the callback with a manager whose repository is this mock.
      transaction: jest.fn(
        (work: (manager: { getRepository: () => unknown }) => unknown) =>
          work(transactionManager),
      ),
    },
  };
  const transactionManager = { getRepository: () => repo };

  const sessions = { revokeAllForUser: jest.fn() };
  const userCache = { invalidate: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    repo.exists.mockResolvedValue(false);
    repo.save.mockImplementation((user) =>
      Promise.resolve({ ...user, id: 'u1' }),
    );
    repo.findOne.mockResolvedValue({ id: 'u1', email: dto.email } as User);
    repo.preload.mockImplementation((changes) =>
      Promise.resolve(changes as User),
    );
    repo.update.mockResolvedValue({ affected: 1 });
    repo.find.mockResolvedValue([]);
    sessions.revokeAllForUser.mockResolvedValue(undefined);

    const config = new ConfigService({
      hashing: { concurrency: 2, queueMax: 10 },
    });
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repo },
        { provide: ConfigService, useValue: config },
        { provide: PasswordService, useValue: new PasswordService(config) },
        { provide: SessionsService, useValue: sessions },
        { provide: UserCacheService, useValue: userCache },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  describe('create', () => {
    it('stores an argon2 hash, not the plain password', async () => {
      await service.create(dto);

      const saved = repo.save.mock.calls[0][0];
      expect(saved.password).not.toBe(dto.password);
      expect(saved.password).toMatch(/^\$argon2id\$v=19\$m=19456,p=1,t=2\$/);
      await expect(argon2.verify(saved.password, dto.password)).resolves.toBe(
        true,
      );
    });

    it('defaults the role to USER when none is given', async () => {
      await service.create(dto);

      expect(repo.save.mock.calls[0][0].role).toBe(UserRoleEnum.USER);
    });

    it('keeps an explicitly given role', async () => {
      await service.create({ ...dto, role: UserRoleEnum.ADMIN });

      expect(repo.save.mock.calls[0][0].role).toBe(UserRoleEnum.ADMIN);
    });

    it('returns the re-read user, which has no password field', async () => {
      const result = await service.create(dto);

      expect(result).toEqual({ id: 'u1', email: dto.email });
    });

    it('rejects an email that already exists', async () => {
      repo.exists.mockImplementation(({ where }) =>
        Promise.resolve('email' in where),
      );

      await expect(service.create(dto)).rejects.toThrow(
        new ConflictException(EMAIL_TAKEN),
      );
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('rejects a username that already exists', async () => {
      repo.exists.mockImplementation(({ where }) =>
        Promise.resolve('username' in where),
      );

      await expect(service.create(dto)).rejects.toThrow(
        new ConflictException(USERNAME_TAKEN),
      );
      expect(repo.save).not.toHaveBeenCalled();
    });

    it.each([
      [UQ_USERS_EMAIL, EMAIL_TAKEN],
      [UQ_USERS_USERNAME, USERNAME_TAKEN],
    ])(
      'maps a %s violation on save to its ConflictException',
      async (constraint, message) => {
        repo.save.mockRejectedValue(uniqueViolation(constraint));

        await expect(service.create(dto)).rejects.toThrow(
          new ConflictException(message),
        );
      },
    );
  });

  describe('findByLoginWithPassword', () => {
    it.each([
      ['user@example.com', 'email'],
      ['test.user', 'username'],
    ])('looks %s up by %s, with the password', async (identifier, column) => {
      await service.findByLoginWithPassword(identifier);

      expect(queryBuilder.addSelect).toHaveBeenCalledWith('user.password');
      expect(queryBuilder.where).toHaveBeenCalledWith(
        `user.${column} = :identifier`,
        { identifier },
      );
    });
  });

  describe('update', () => {
    it('hashes a new password', async () => {
      await service.update('u1', { password: 'N3w!Passw0rd123' });

      const changes = repo.preload.mock.calls[0][0];
      await expect(
        argon2.verify(changes.password!, 'N3w!Passw0rd123'),
      ).resolves.toBe(true);
    });

    it('throws NotFoundException for an unknown id', async () => {
      repo.preload.mockResolvedValue(undefined);

      await expect(
        service.update('missing', { firstName: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFoundException when the user does not exist', async () => {
      repo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.update('missing', { firstName: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    describe('revoking refresh sessions', () => {
      it('revokes all sessions when the password changes', async () => {
        await service.update('u1', { password: 'N3w!Passw0rd123' });

        expect(sessions.revokeAllForUser).toHaveBeenCalledWith(
          'u1',
          transactionManager,
        );
      });

      it('revokes all sessions when the account is deactivated', async () => {
        await service.update('u1', { status: UserStatusEnum.INACTIVE });

        expect(sessions.revokeAllForUser).toHaveBeenCalledWith(
          'u1',
          transactionManager,
        );
      });

      it('revokes all sessions when the role changes', async () => {
        repo.findOne.mockResolvedValueOnce({
          id: 'u1',
          role: UserRoleEnum.USER,
          status: UserStatusEnum.ACTIVE,
        } as User);

        await service.update('u1', { role: UserRoleEnum.ADMIN });

        expect(sessions.revokeAllForUser).toHaveBeenCalledTimes(1);
      });

      it('keeps sessions for a same-role or name-only update', async () => {
        repo.findOne.mockResolvedValueOnce({
          id: 'u1',
          role: UserRoleEnum.USER,
          status: UserStatusEnum.ACTIVE,
        } as User);

        await service.update('u1', {
          firstName: 'New',
          role: UserRoleEnum.USER,
        });

        expect(sessions.revokeAllForUser).not.toHaveBeenCalled();
      });
    });

    it('invalidates the cached user', async () => {
      await service.update('u1', { firstName: 'New' });

      expect(userCache.invalidate).toHaveBeenCalledWith('u1');
    });

    describe('last administrator', () => {
      it('refuses to demote the last active administrator', async () => {
        repo.findOne.mockResolvedValueOnce(admin());
        repo.find.mockResolvedValueOnce([admin()]);

        await expect(
          service.update('a1', { role: UserRoleEnum.USER }),
        ).rejects.toThrow(new ConflictException(LAST_ADMIN_MESSAGE));
        expect(repo.save).not.toHaveBeenCalled();
        expect(sessions.revokeAllForUser).not.toHaveBeenCalled();
      });

      it('refuses to deactivate the last active administrator', async () => {
        repo.findOne.mockResolvedValueOnce(admin());
        repo.find.mockResolvedValueOnce([admin()]);

        await expect(
          service.update('a1', { status: UserStatusEnum.INACTIVE }),
        ).rejects.toThrow(new ConflictException(LAST_ADMIN_MESSAGE));
      });

      it('locks the active administrator rows while checking', async () => {
        repo.findOne.mockResolvedValueOnce(admin());
        repo.find.mockResolvedValueOnce([admin(), admin({ id: 'a2' })]);

        await service.update('a1', { role: UserRoleEnum.USER });

        expect(repo.find.mock.calls[0][0]).toMatchObject({
          where: { role: UserRoleEnum.ADMIN, status: UserStatusEnum.ACTIVE },
          lock: { mode: 'pessimistic_write' },
        });
        expect(repo.save).toHaveBeenCalled();
      });

      it('allows other updates to the last administrator', async () => {
        repo.findOne.mockResolvedValueOnce(admin());

        await service.update('a1', {
          firstName: 'Still',
          role: UserRoleEnum.ADMIN,
        });

        expect(repo.find).not.toHaveBeenCalled();
        expect(repo.save).toHaveBeenCalled();
      });

      it('refuses to remove the last active administrator', async () => {
        repo.findOne.mockResolvedValueOnce(admin());
        repo.find.mockResolvedValueOnce([admin()]);

        await expect(service.remove('a1')).rejects.toThrow(
          new ConflictException(LAST_ADMIN_MESSAGE),
        );
        expect(repo.update).not.toHaveBeenCalled();
      });

      it('removes an administrator when another one remains', async () => {
        repo.findOne.mockResolvedValueOnce(admin());
        repo.find.mockResolvedValueOnce([admin(), admin({ id: 'a2' })]);

        await service.remove('a1');

        expect(repo.update).toHaveBeenCalledWith('a1', {
          status: UserStatusEnum.INACTIVE,
        });
      });
    });
  });

  describe('remove', () => {
    it('deactivates the user instead of deleting the row', async () => {
      repo.update.mockResolvedValue({ affected: 1 });

      await service.remove('u1');

      expect(repo.update).toHaveBeenCalledWith('u1', {
        status: UserStatusEnum.INACTIVE,
      });
    });

    it('throws NotFoundException for an unknown id', async () => {
      repo.update.mockResolvedValue({ affected: 0 });

      await expect(service.remove('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('revokes all sessions and invalidates the cached user', async () => {
      await service.remove('u1');

      expect(sessions.revokeAllForUser).toHaveBeenCalledWith(
        'u1',
        transactionManager,
      );
      expect(userCache.invalidate).toHaveBeenCalledWith('u1');
    });
  });

  describe('replacePasswordHash', () => {
    it('only replaces the hash it was given', async () => {
      await expect(
        service.replacePasswordHash('u1', 'old', 'new'),
      ).resolves.toBe(true);

      expect(repo.update).toHaveBeenCalledWith(
        { id: 'u1', password: 'old' },
        { password: 'new' },
      );
    });
  });
});
