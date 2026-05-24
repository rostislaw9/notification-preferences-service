import { Channel } from '../enums/channel.enum';
import { NotificationType } from '../enums/notification-type.enum';
import { DefaultPreferenceEntity } from '../entities/default-preference.entity';

export const DEFAULT_PREFERENCE_REPOSITORY = Symbol('DEFAULT_PREFERENCE_REPOSITORY');

export interface DefaultPreferenceRepository {
  findOne(
    notificationType: NotificationType,
    channel: Channel,
  ): Promise<DefaultPreferenceEntity | null>;
  findAll(): Promise<DefaultPreferenceEntity[]>;
}
