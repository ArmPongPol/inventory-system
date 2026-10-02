import { PASSWORD_MAX_LENGTH } from '@/common/decorators/is-strong-password.decorator';
import { normalizeEmail } from '@/common/transformers/string.transformers';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  // Emails and usernames are both stored lowercased, so one normalization
  // fits either.
  @ApiProperty({
    description: 'Username or email; treated as an email when it contains "@".',
    example: 'john.doe',
  })
  @Transform(normalizeEmail)
  @IsString()
  @IsNotEmpty()
  @MaxLength(320)
  identifier: string;

  // No strength rules here: they belong to setting a password, and a policy
  // change must not lock out accounts created under the old one.
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(PASSWORD_MAX_LENGTH)
  password: string;
}
