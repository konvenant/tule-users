import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'reset_token_from_email',
    description: 'The reset token received via email',
  })
  @IsString()
  token: string;

  @ApiProperty({
    example: 'newpassword123',
    description: 'The new password (min 6 characters)',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  newPassword: string;
}