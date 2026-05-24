import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: 'EU', description: 'User region (optional)' })
  @IsOptional()
  @IsString()
  region?: string;
}
