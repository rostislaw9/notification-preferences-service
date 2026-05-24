import { Injectable } from '@nestjs/common';
import { DefaultPreferenceEntity } from '../../domain/entities/default-preference.entity';
import { Channel } from '../../domain/enums/channel.enum';
import { NotificationType } from '../../domain/enums/notification-type.enum';
import { DefaultPreferenceRepository } from '../../domain/ports/default-preference.repository';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DefaultPreferencePrismaRepository implements DefaultPreferenceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(
    notificationType: NotificationType,
    channel: Channel,
  ): Promise<DefaultPreferenceEntity | null> {
    const row = await this.prisma.defaultPreference.findUnique({
      where: { notificationType_channel: { notificationType, channel } },
    });
    return row ? this.toEntity(row) : null;
  }

  async findAll(): Promise<DefaultPreferenceEntity[]> {
    const rows = await this.prisma.defaultPreference.findMany();
    return rows.map(this.toEntity);
  }

  private toEntity(row: import('@prisma/client').DefaultPreference): DefaultPreferenceEntity {
    return {
      id: row.id,
      notificationType: row.notificationType as NotificationType,
      channel: row.channel as Channel,
      enabled: row.enabled,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
