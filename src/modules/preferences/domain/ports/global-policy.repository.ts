import { Channel } from '../enums/channel.enum';
import { NotificationType } from '../enums/notification-type.enum';
import { GlobalPolicyEntity } from '../entities/global-policy.entity';

export const GLOBAL_POLICY_REPOSITORY = Symbol('GLOBAL_POLICY_REPOSITORY');

export interface GlobalPolicyRepository {
  findMatching(
    notificationType: NotificationType,
    channel: Channel,
    region?: string,
  ): Promise<GlobalPolicyEntity[]>;
}
