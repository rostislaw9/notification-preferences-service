import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsISO8601, IsOptional, IsString } from 'class-validator';
import { Channel } from '../../domain/enums/channel.enum';
import { NotificationType } from '../../domain/enums/notification-type.enum';

export class EvaluateNotificationDto {
  @ApiProperty({ example: 'user-1' })
  @IsString()
  userId!: string;

  @ApiProperty({ enum: NotificationType, example: NotificationType.Marketing })
  @IsEnum(NotificationType)
  notificationType!: NotificationType;

  @ApiProperty({ enum: Channel, example: Channel.Email })
  @IsEnum(Channel)
  channel!: Channel;

  @ApiPropertyOptional({ example: 'EU' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiProperty({ example: '2026-05-21T21:30:00Z' })
  @IsISO8601()
  datetime!: string;
}
