import { IsValidTimezone } from '@/common/validators/is-valid-timezone.validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Channel } from '../../domain/enums/channel.enum';
import { NotificationType } from '../../domain/enums/notification-type.enum';

export class PreferenceItemDto {
  @ApiProperty({ enum: NotificationType, example: NotificationType.Marketing })
  @IsEnum(NotificationType)
  notificationType!: NotificationType;

  @ApiProperty({ enum: Channel, example: Channel.Email })
  @IsEnum(Channel)
  channel!: Channel;

  @ApiProperty({ example: true })
  @IsBoolean()
  enabled!: boolean;
}

export class QuietHoursDto {
  @ApiProperty({ example: 'America/New_York', description: 'IANA timezone name' })
  @IsString()
  @IsValidTimezone()
  timezone!: string;

  @ApiProperty({ example: 22, description: 'Start hour (0–23)' })
  @IsInt()
  @Min(0)
  @Max(23)
  startHour!: number;

  @ApiPropertyOptional({ example: 0, description: 'Start minute (0–59)', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(59)
  startMin?: number;

  @ApiProperty({ example: 8, description: 'End hour (0–23)' })
  @IsInt()
  @Min(0)
  @Max(23)
  endHour!: number;

  @ApiPropertyOptional({ example: 0, description: 'End minute (0–59)', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(59)
  endMin?: number;
}

export class UpsertPreferencesDto {
  @ApiPropertyOptional({ type: [PreferenceItemDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PreferenceItemDto)
  preferences?: PreferenceItemDto[];

  @ApiPropertyOptional({
    type: QuietHoursDto,
    description: 'Set quiet hours for this user. Pass null to remove.',
    nullable: true,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => QuietHoursDto)
  quietHours?: QuietHoursDto | null;
}
