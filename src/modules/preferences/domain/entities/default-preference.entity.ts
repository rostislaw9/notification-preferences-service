import { Channel } from '../enums/channel.enum';
import { NotificationType } from '../enums/notification-type.enum';

export interface DefaultPreferenceEntity {
  id: string;
  notificationType: NotificationType;
  channel: Channel;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}
