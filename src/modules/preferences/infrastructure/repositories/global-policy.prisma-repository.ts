import { Injectable } from '@nestjs/common';
import { GlobalPolicyEntity } from '../../domain/entities/global-policy.entity';
import { Channel } from '../../domain/enums/channel.enum';
import { NotificationType } from '../../domain/enums/notification-type.enum';
import { GlobalPolicyRepository } from '../../domain/ports/global-policy.repository';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GlobalPolicyPrismaRepository implements GlobalPolicyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMatching(
    notificationType: NotificationType,
    channel: Channel,
    region?: string,
  ): Promise<GlobalPolicyEntity[]> {
    const rows = await this.prisma.globalPolicy.findMany({
      where: {
        notificationType,
        channel,
        OR: [{ region: null }, { region: region ?? null }],
      },
    });
    return rows.map(this.toEntity);
  }

  private toEntity(row: import('@prisma/client').GlobalPolicy): GlobalPolicyEntity {
    return {
      id: row.id,
      notificationType: row.notificationType as NotificationType,
      channel: row.channel as Channel,
      region: row.region,
      enabled: row.enabled,
      reason: row.reason,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
