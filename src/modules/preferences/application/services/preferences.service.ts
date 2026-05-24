import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DefaultPreferenceEntity } from '../../domain/entities/default-preference.entity';
import { QuietHoursEntity } from '../../domain/entities/quiet-hours.entity';
import { UserPreferenceEntity } from '../../domain/entities/user-preference.entity';
import {
  DEFAULT_PREFERENCE_REPOSITORY,
  DefaultPreferenceRepository,
} from '../../domain/ports/default-preference.repository';
import {
  QUIET_HOURS_REPOSITORY,
  QuietHoursRepository,
} from '../../domain/ports/quiet-hours.repository';
import {
  USER_PREFERENCE_REPOSITORY,
  UserPreferenceRepository,
} from '../../domain/ports/user-preference.repository';
import { USER_REPOSITORY, UserRepository } from '../../domain/ports/user.repository';
import { UpsertPreferencesDto } from '../dto/upsert-preferences.dto';
import {
  GetPreferencesResult,
  UpsertPreferencesResult,
} from '../dto/user-preferences-response.dto';

@Injectable()
export class PreferencesService {
  private readonly logger = new Logger(PreferencesService.name);

  constructor(
    @Inject(USER_PREFERENCE_REPOSITORY)
    private readonly userPreferenceRepo: UserPreferenceRepository,
    @Inject(QUIET_HOURS_REPOSITORY)
    private readonly quietHoursRepo: QuietHoursRepository,
    @Inject(DEFAULT_PREFERENCE_REPOSITORY)
    private readonly defaultPreferenceRepo: DefaultPreferenceRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
  ) {}

  async getPreferences(userId: string): Promise<GetPreferencesResult> {
    this.logger.debug({ userId }, 'Fetching preferences for user');

    // Verify user exists
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    const [userPreferences, defaultPreferences, quietHoursRows] = await Promise.all([
      this.userPreferenceRepo.findAllByUserId(userId),
      this.defaultPreferenceRepo.findAll(),
      this.quietHoursRepo.findForUser(userId),
    ]);

    // Build effective preferences: user overrides take precedence, defaults fill the gaps
    const effectivePreferences = this.buildEffectivePreferences(
      userPreferences,
      defaultPreferences,
      userId,
    );

    return {
      preferences: effectivePreferences,
      quietHours: quietHoursRows[0] ?? null,
    };
  }

  private buildEffectivePreferences(
    userPrefs: UserPreferenceEntity[],
    defaultPrefs: DefaultPreferenceEntity[],
    userId: string,
  ): UserPreferenceEntity[] {
    // Create a map of user preferences by (type, channel)
    const userPrefsMap = new Map<string, UserPreferenceEntity>();
    for (const pref of userPrefs) {
      const key = `${pref.notificationType}:${pref.channel}`;
      userPrefsMap.set(key, pref);
    }

    // Build effective list: all combinations from defaults, with user overrides
    const effective: UserPreferenceEntity[] = [];
    for (const def of defaultPrefs) {
      const key = `${def.notificationType}:${def.channel}`;
      const userPref = userPrefsMap.get(key);

      if (userPref) {
        // User has explicit preference - use it
        effective.push(userPref);
      } else {
        // No user preference - use default but with placeholder userId
        effective.push({
          id: `default-${key}`,
          userId,
          notificationType: def.notificationType,
          channel: def.channel,
          enabled: def.enabled,
          createdAt: def.createdAt,
          updatedAt: def.updatedAt,
        });
      }
    }

    return effective;
  }

  async upsertPreferences(
    userId: string,
    dto: UpsertPreferencesDto,
  ): Promise<UpsertPreferencesResult> {
    // Verify user exists
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    const updates: Promise<unknown>[] = [];

    let preferences: UserPreferenceEntity[] = [];
    if (dto.preferences && dto.preferences.length > 0) {
      this.logger.log(
        { userId, count: dto.preferences.length },
        'Upserting notification preferences for user',
      );
      preferences = await this.userPreferenceRepo.upsertMany(
        dto.preferences.map((p) => ({
          userId,
          notificationType: p.notificationType,
          channel: p.channel,
          enabled: p.enabled,
        })),
      );
    } else {
      preferences = await this.userPreferenceRepo.findAllByUserId(userId);
    }

    let quietHours: QuietHoursEntity | null = null;

    if (dto.quietHours === null) {
      this.logger.log({ userId }, 'Removing quiet hours for user');
      updates.push(this.quietHoursRepo.deleteForUser(userId));
      await Promise.all(updates);
    } else if (dto.quietHours !== undefined) {
      this.logger.log({ userId, quietHours: dto.quietHours }, 'Upserting quiet hours for user');
      quietHours = await this.quietHoursRepo.upsertForUser({
        userId,
        timezone: dto.quietHours.timezone,
        startHour: dto.quietHours.startHour,
        startMin: dto.quietHours.startMin ?? 0,
        endHour: dto.quietHours.endHour,
        endMin: dto.quietHours.endMin ?? 0,
      });
    } else {
      const rows = await this.quietHoursRepo.findForUser(userId);
      quietHours = rows[0] ?? null;
    }

    return { preferences, quietHours };
  }
}
