import { Entity, Column, Index, Unique } from 'typeorm';
import { UserRoleEnum, UserStatusEnum } from '../../../common/constants/enum';
import { BaseEntity } from '@/common/entities/base.entity';

export const UQ_USERS_EMAIL = 'UQ_users_email';
export const UQ_USERS_USERNAME = 'UQ_users_username';

// "user" is a reserved word in Postgres, so the table is named "users".
// email and username need no separate index: their unique constraints
// already create one. The constraints are named so UsersService can tell
// which one a duplicate violated.
@Entity({ name: 'users' })
@Unique(UQ_USERS_EMAIL, ['email'])
@Unique(UQ_USERS_USERNAME, ['username'])
export class User extends BaseEntity {
  // Unique: login accepts it in place of the email.
  @Column({
    name: 'username',
    type: 'varchar',
    length: 320,
  })
  username: string;

  // 320 = the maximum length of an email address (64 local + @ + 255 domain).
  @Column({
    name: 'email',
    type: 'varchar',
    length: 320,
  })
  email: string;

  // Excluded from queries by default so it never ends up in a response.
  // Select it explicitly where needed (e.g. login): addSelect('user.password').
  @Column({
    name: 'password',
    type: 'varchar',
    select: false,
  })
  password: string;

  @Column({
    name: 'first_name',
    type: 'varchar',
    length: 100,
  })
  firstName: string;

  @Column({
    name: 'last_name',
    type: 'varchar',
    length: 100,
  })
  lastName: string;

  // No database default: every insert states the role explicitly
  // (UsersService.create falls back to USER).
  @Index()
  @Column({
    name: 'role',
    type: 'enum',
    enum: UserRoleEnum,
  })
  role: UserRoleEnum;

  @Index()
  @Column({
    name: 'status',
    type: 'enum',
    enum: UserStatusEnum,
    default: UserStatusEnum.ACTIVE,
  })
  status: UserStatusEnum;
}
