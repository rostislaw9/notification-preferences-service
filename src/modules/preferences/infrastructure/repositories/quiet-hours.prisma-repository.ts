import { Injectable } from '@nestjs/common';
import { QuietHoursEntity } from '../../domain/entities/quiet-hours.entity';
import {
  QuietHoursRepository,
  UpsertQuietHoursInput,
} from '../../domain/ports/quiet-hours.repository';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QuietHoursPrismaRepository implements QuietHoursRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findForUser(userId: string): Promise<QuietHoursEntity[]> {
    const rows = await this.prisma.quietHours.findMany({ where: { userId } });
    return rows.map(this.toEntity);
  }

  async findGlobal(): Promise<QuietHoursEntity[]> {
    const rows = await this.prisma.quietHours.findMany({ where: { userId: null } });
    return rows.map(this.toEntity);
  }

  async upsertForUser(input: UpsertQuietHoursInput): Promise<QuietHoursEntity> {
    const existing = await this.prisma.quietHours.findFirst({
      where: { userId: input.userId },
    });

    const row = existing
      ? await this.prisma.quietHours.update({
          where: { id: existing.id },
          data: {
            timezone: input.timezone,
            startHour: input.startHour,
            startMin: input.startMin,
            endHour: input.endHour,
            endMin: input.endMin,
          },
        })
      : await this.prisma.quietHours.create({
          data: {
            userId: input.userId,
            timezone: input.timezone,
            startHour: input.startHour,
            startMin: input.startMin,
            endHour: input.endHour,
            endMin: input.endMin,
          },
        });

    return this.toEntity(row);
  }

  async deleteForUser(userId: string): Promise<void> {
    await this.prisma.quietHours.deleteMany({ where: { userId } });
  }

  private toEntity(row: import('@prisma/client').QuietHours): QuietHoursEntity {
    return {
      id: row.id,
      userId: row.userId,
      timezone: row.timezone,
      startHour: row.startHour,
      startMin: row.startMin,
      endHour: row.endHour,
      endMin: row.endMin,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
