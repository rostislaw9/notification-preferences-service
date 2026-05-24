import { Channel } from '../enums/channel.enum';
import { NotificationType } from '../enums/notification-type.enum';

export interface GlobalPolicyEntity {
  id: string;
  notificationType: NotificationType;
  channel: Channel;
  region: string | null;
  enabled: boolean;
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
}
