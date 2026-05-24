import { Injectable } from '@nestjs/common';
import { UserPreferenceEntity } from '../../domain/entities/user-preference.entity';
import { Channel } from '../../domain/enums/channel.enum';
import { NotificationType } from '../../domain/enums/notification-type.enum';
import {
  UpsertUserPreferenceInput,
  UserPreferenceRepository,
} from '../../domain/ports/user-preference.repository';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserPreferencePrismaRepository implements UserPreferenceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByUserId(userId: string): Promise<UserPreferenceEntity[]> {
    const rows = await this.prisma.userPreference.findMany({ where: { userId } });
    return rows.map(this.toEntity);
  }

  async findOne(
    userId: string,
    notificationType: NotificationType,
    channel: Channel,
  ): Promise<UserPreferenceEntity | null> {
    const row = await this.prisma.userPreference.findUnique({
      where: { userId_notificationType_channel: { userId, notificationType, channel } },
    });
    return row ? this.toEntity(row) : null;
  }

  async upsert(input: UpsertUserPreferenceInput): Promise<UserPreferenceEntity> {
    const row = await this.prisma.userPreference.upsert({
      where: {
        userId_notificationType_channel: {
          userId: input.userId,
          notificationType: input.notificationType,
          channel: input.channel,
        },
      },
      update: { enabled: input.enabled },
      create: {
        userId: input.userId,
        notificationType: input.notificationType,
        channel: input.channel,
        enabled: input.enabled,
      },
    });
    return this.toEntity(row);
  }

  async upsertMany(inputs: UpsertUserPreferenceInput[]): Promise<UserPreferenceEntity[]> {
    return Promise.all(inputs.map((input) => this.upsert(input)));
  }

  private toEntity(row: import('@prisma/client').UserPreference): UserPreferenceEntity {
    return {
      id: row.id,
      userId: row.userId,
      notificationType: row.notificationType as NotificationType,
      channel: row.channel as Channel,
      enabled: row.enabled,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
