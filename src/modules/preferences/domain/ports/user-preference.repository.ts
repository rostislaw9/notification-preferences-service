import { Channel } from '../enums/channel.enum';
import { NotificationType } from '../enums/notification-type.enum';
import { UserPreferenceEntity } from '../entities/user-preference.entity';

export interface UpsertUserPreferenceInput {
  userId: string;
  notificationType: NotificationType;
  channel: Channel;
  enabled: boolean;
}

export const USER_PREFERENCE_REPOSITORY = Symbol('USER_PREFERENCE_REPOSITORY');

export interface UserPreferenceRepository {
  findAllByUserId(userId: string): Promise<UserPreferenceEntity[]>;
  findOne(
    userId: string,
    notificationType: NotificationType,
    channel: Channel,
  ): Promise<UserPreferenceEntity | null>;
  upsert(input: UpsertUserPreferenceInput): Promise<UserPreferenceEntity>;
  upsertMany(inputs: UpsertUserPreferenceInput[]): Promise<UserPreferenceEntity[]>;
}
