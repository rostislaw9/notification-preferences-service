import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuietHoursEntity } from '../../domain/entities/quiet-hours.entity';
import { UserPreferenceEntity } from '../../domain/entities/user-preference.entity';
import { Channel } from '../../domain/enums/channel.enum';
import { NotificationType } from '../../domain/enums/notification-type.enum';

export class UserPreferencesResponseDto {
  @ApiProperty({ type: () => [Object] })
  preferences!: UserPreferenceEntity[];

  @ApiPropertyOptional({ description: 'User-specific quiet hours, if set' })
  quietHours!: QuietHoursEntity | null;
}

export interface GetPreferencesResult {
  preferences: UserPreferenceEntity[];
  quietHours: QuietHoursEntity | null;
}

export interface UpsertPreferencesResult {
  preferences: UserPreferenceEntity[];
  quietHours: QuietHoursEntity | null;
}

export { Channel, NotificationType };
