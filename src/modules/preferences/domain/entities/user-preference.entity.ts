import { Channel } from '../enums/channel.enum';
import { NotificationType } from '../enums/notification-type.enum';

export interface UserPreferenceEntity {
  id: string;
  userId: string;
  notificationType: NotificationType;
  channel: Channel;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}
