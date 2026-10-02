import * as argon2 from 'argon2';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ARGON2_OPTIONS } from '../../common/constants/argon2';
import { UserRoleEnum } from '../../common/constants/enum';
import { CreateUserDto } from '../../modules/users/dto/create-user.dto';
import { User } from '../../modules/users/entities/user.entity';
import dataSource from '../data-source';

// Creates the first administrator (npm run seed:admin). Self-registration only
// creates USER accounts, so without this nobody could reach POST /users.
// Safe to re-run: does nothing if the email already exists.
async function main(): Promise<void> {
  // Goes through CreateUserDto so the seed obeys the same email normalization
  // and password policy as the API.
  const dto = plainToInstance(CreateUserDto, {
    username: process.env.ADMIN_USERNAME || 'admin',
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    firstName: process.env.ADMIN_FIRST_NAME ?? 'System',
    lastName: process.env.ADMIN_LAST_NAME ?? 'Administrator',
    role: UserRoleEnum.ADMIN,
  });

  const errors = await validate(dto);
  if (errors.length) {
    const messages = errors.flatMap((e) => Object.values(e.constraints ?? {}));
    throw new Error(
      `Set ADMIN_USERNAME, ADMIN_EMAIL and ADMIN_PASSWORD in .env:\n- ${messages.join('\n- ')}`,
    );
  }

  await dataSource.initialize();
  try {
    const users = dataSource.getRepository(User);

    const existing = await users.findOne({
      where: [{ email: dto.email }, { username: dto.username }],
    });
    if (existing) {
      console.log(
        `An account with email ${dto.email} or username ${dto.username} already exists, nothing to do.`,
      );
      return;
    }

    await users.insert({
      ...dto,
      password: await argon2.hash(dto.password, ARGON2_OPTIONS),
    });
    console.log(`Created admin ${dto.username} (${dto.email}).`);
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
