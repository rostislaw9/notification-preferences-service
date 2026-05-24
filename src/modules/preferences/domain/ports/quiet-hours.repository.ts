import { QuietHoursEntity } from '../entities/quiet-hours.entity';

export interface UpsertQuietHoursInput {
  userId: string;
  timezone: string;
  startHour: number;
  startMin: number;
  endHour: number;
  endMin: number;
}

export const QUIET_HOURS_REPOSITORY = Symbol('QUIET_HOURS_REPOSITORY');

export interface QuietHoursRepository {
  findForUser(userId: string): Promise<QuietHoursEntity[]>;
  findGlobal(): Promise<QuietHoursEntity[]>;
  upsertForUser(input: UpsertQuietHoursInput): Promise<QuietHoursEntity>;
  deleteForUser(userId: string): Promise<void>;
}
