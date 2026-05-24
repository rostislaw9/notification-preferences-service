import { Inject, Injectable, Logger } from '@nestjs/common';
import { DateTime } from 'luxon';
import { QuietHoursEntity } from '../../domain/entities/quiet-hours.entity';
import { Decision } from '../../domain/enums/decision.enum';
import { NotificationType } from '../../domain/enums/notification-type.enum';
import {
  DEFAULT_PREFERENCE_REPOSITORY,
  DefaultPreferenceRepository,
} from '../../domain/ports/default-preference.repository';
import {
  GLOBAL_POLICY_REPOSITORY,
  GlobalPolicyRepository,
} from '../../domain/ports/global-policy.repository';
import {
  QUIET_HOURS_REPOSITORY,
  QuietHoursRepository,
} from '../../domain/ports/quiet-hours.repository';
import {
  USER_PREFERENCE_REPOSITORY,
  UserPreferenceRepository,
} from '../../domain/ports/user-preference.repository';
import { EvaluateNotificationDto } from '../dto/evaluate-notification.dto';
import { EvaluationResultDto } from '../dto/evaluation-result.dto';

@Injectable()
export class NotificationPolicyEvaluator {
  private readonly logger = new Logger(NotificationPolicyEvaluator.name);

  constructor(
    @Inject(GLOBAL_POLICY_REPOSITORY)
    private readonly globalPolicyRepo: GlobalPolicyRepository,
    @Inject(QUIET_HOURS_REPOSITORY)
    private readonly quietHoursRepo: QuietHoursRepository,
    @Inject(USER_PREFERENCE_REPOSITORY)
    private readonly userPreferenceRepo: UserPreferenceRepository,
    @Inject(DEFAULT_PREFERENCE_REPOSITORY)
    private readonly defaultPreferenceRepo: DefaultPreferenceRepository,
  ) {}

  async evaluate(dto: EvaluateNotificationDto): Promise<EvaluationResultDto> {
    const { userId, notificationType, channel, region, datetime } = dto;

    this.logger.debug(
      { userId, notificationType, channel, region, datetime },
      'Evaluating notification',
    );

    // 1. Global policies — highest priority, hard blocks/allows
    const policies = await this.globalPolicyRepo.findMatching(notificationType, channel, region);

    for (const policy of policies) {
      if (!policy.enabled) {
        const reason =
          policy.reason ??
          `Global policy denies ${notificationType} via ${channel}${region ? ` in ${region}` : ''}`;
        this.logger.debug({ reason }, 'Decision: deny (global policy)');
        return { decision: Decision.Deny, reason };
      }
    }

    // 2. Quiet hours — only blocks marketing notifications; transactional/system always pass through
    const quietHoursExempt =
      notificationType === NotificationType.Transactional ||
      notificationType === NotificationType.System;

    if (!quietHoursExempt) {
      const quietHoursEntries = await this.resolveQuietHours(userId);
      if (quietHoursEntries.length > 0) {
        const inQuiet = this.isInQuietHours(datetime, quietHoursEntries);
        if (inQuiet) {
          const reason = 'Quiet hours are active; marketing notifications are suppressed';
          this.logger.debug({ reason }, 'Decision: deny (quiet hours)');
          return { decision: Decision.Deny, reason };
        }
      }
    }

    // 3. User preferences
    const userPreference = await this.userPreferenceRepo.findOne(userId, notificationType, channel);

    if (userPreference !== null) {
      const decision = userPreference.enabled ? Decision.Allow : Decision.Deny;
      const reason = userPreference.enabled
        ? `User preference explicitly allows ${notificationType} via ${channel}`
        : `User preference explicitly denies ${notificationType} via ${channel}`;
      this.logger.debug({ decision, reason }, 'Decision from user preference');
      return { decision, reason };
    }

    // 4. Default preferences
    const defaultPreference = await this.defaultPreferenceRepo.findOne(notificationType, channel);

    if (defaultPreference !== null) {
      const decision = defaultPreference.enabled ? Decision.Allow : Decision.Deny;
      const reason = defaultPreference.enabled
        ? `Default preference allows ${notificationType} via ${channel}`
        : `Default preference denies ${notificationType} via ${channel}`;
      this.logger.debug({ decision, reason }, 'Decision from default preference');
      return { decision, reason };
    }

    // 5. Fallback — allow
    const reason = 'No preference or policy found; defaulting to allow';
    this.logger.debug({ reason }, 'Decision: allow (fallback)');
    return { decision: Decision.Allow, reason };
  }

  private async resolveQuietHours(userId: string): Promise<QuietHoursEntity[]> {
    const [userSpecific, global] = await Promise.all([
      this.quietHoursRepo.findForUser(userId),
      this.quietHoursRepo.findGlobal(),
    ]);
    return userSpecific.length > 0 ? userSpecific : global;
  }

  private isInQuietHours(datetime: string, entries: QuietHoursEntity[]): boolean {
    for (const entry of entries) {
      const dt = DateTime.fromISO(datetime, { zone: entry.timezone });
      if (!dt.isValid) continue;

      const currentMinutes = dt.hour * 60 + dt.minute;
      const startMinutes = entry.startHour * 60 + entry.startMin;
      const endMinutes = entry.endHour * 60 + entry.endMin;

      let inWindow: boolean;
      if (startMinutes < endMinutes) {
        // Same-day window e.g. 08:00–22:00
        inWindow = currentMinutes >= startMinutes && currentMinutes < endMinutes;
      } else {
        // Overnight window e.g. 22:00–08:00
        inWindow = currentMinutes >= startMinutes || currentMinutes < endMinutes;
      }

      if (inWindow) return true;
    }
    return false;
  }
}
