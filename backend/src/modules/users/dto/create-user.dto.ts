import { UserRoleEnum, UserStatusEnum } from '@/common/constants/enum';
import { IsStrongPassword } from '@/common/decorators/is-strong-password.decorator';
import {
  normalizeEmail,
  normalizeUsername,
  trim,
} from '@/common/transformers/string.transformers';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

// No "@": login treats an identifier with "@" as an email, so a username
// can never be mistaken for one.
export const USERNAME_PATTERN = /^[a-z0-9._-]+$/;

export class CreateUserDto {
  @ApiProperty({
    example: 'john.doe',
    minLength: 3,
    maxLength: 320,
    description:
      'Letters, digits, ".", "_" and "-". Stored lowercased, unique ignoring case.',
  })
  @Transform(normalizeUsername)
  @IsString()
  @MinLength(3)
  @MaxLength(320)
  @Matches(USERNAME_PATTERN, {
    message: 'username may only contain letters, digits, ".", "_" and "-"',
  })
  username: string;

  @ApiProperty({ example: 'test@gmail.com' })
  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(320)
  email: string;

  @ApiProperty({ minLength: 12 })
  @IsStrongPassword()
  password: string;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @ApiPropertyOptional({ enum: UserRoleEnum, default: UserRoleEnum.USER })
  @IsOptional()
  @IsEnum(UserRoleEnum)
  role?: UserRoleEnum;

  @ApiPropertyOptional({ enum: UserStatusEnum, default: UserStatusEnum.ACTIVE })
  @IsOptional()
  @IsEnum(UserStatusEnum)
  status?: UserStatusEnum;
}
