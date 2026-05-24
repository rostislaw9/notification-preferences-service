import { Channel } from '../../../domain/enums/channel.enum';
import { Decision } from '../../../domain/enums/decision.enum';
import { NotificationType } from '../../../domain/enums/notification-type.enum';
import { DefaultPreferenceRepository } from '../../../domain/ports/default-preference.repository';
import { GlobalPolicyRepository } from '../../../domain/ports/global-policy.repository';
import { QuietHoursRepository } from '../../../domain/ports/quiet-hours.repository';
import { UserPreferenceRepository } from '../../../domain/ports/user-preference.repository';
import { NotificationPolicyEvaluator } from '../notification-policy-evaluator.service';

const makeRepos = (overrides: {
  globalPolicies?: Awaited<ReturnType<GlobalPolicyRepository['findMatching']>>;
  quietHoursForUser?: Awaited<ReturnType<QuietHoursRepository['findForUser']>>;
  quietHoursGlobal?: Awaited<ReturnType<QuietHoursRepository['findGlobal']>>;
  userPreference?: Awaited<ReturnType<UserPreferenceRepository['findOne']>>;
  defaultPreference?: Awaited<ReturnType<DefaultPreferenceRepository['findOne']>>;
}) => {
  const globalPolicyRepo: jest.Mocked<GlobalPolicyRepository> = {
    findMatching: jest.fn().mockResolvedValue(overrides.globalPolicies ?? []),
  };
  const quietHoursRepo: jest.Mocked<QuietHoursRepository> = {
    findForUser: jest.fn().mockResolvedValue(overrides.quietHoursForUser ?? []),
    findGlobal: jest.fn().mockResolvedValue(overrides.quietHoursGlobal ?? []),
    upsertForUser: jest.fn(),
    deleteForUser: jest.fn(),
  };
  const userPreferenceRepo: jest.Mocked<UserPreferenceRepository> = {
    findAllByUserId: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(overrides.userPreference ?? null),
    upsert: jest.fn(),
    upsertMany: jest.fn(),
  };
  const defaultPreferenceRepo: jest.Mocked<DefaultPreferenceRepository> = {
    findOne: jest.fn().mockResolvedValue(overrides.defaultPreference ?? null),
    findAll: jest.fn().mockResolvedValue([]),
  };

  return { globalPolicyRepo, quietHoursRepo, userPreferenceRepo, defaultPreferenceRepo };
};

const buildEvaluator = (repos: ReturnType<typeof makeRepos>): NotificationPolicyEvaluator => {
  return new NotificationPolicyEvaluator(
    repos.globalPolicyRepo,
    repos.quietHoursRepo,
    repos.userPreferenceRepo,
    repos.defaultPreferenceRepo,
  );
};

const baseInput = {
  userId: 'user-1',
  notificationType: NotificationType.Marketing,
  channel: Channel.Email,
  datetime: '2026-05-21T14:00:00Z',
};

describe('NotificationPolicyEvaluator', () => {
  describe('Fallback', () => {
    it('allows when no policies, quiet hours, user prefs, or defaults exist', async () => {
      const repos = makeRepos({});
      const evaluator = buildEvaluator(repos);

      const result = await evaluator.evaluate(baseInput);

      expect(result.decision).toBe(Decision.Allow);
      expect(result.reason).toMatch(/defaulting to allow/i);
    });
  });

  describe('Default preferences', () => {
    it('allows when default preference is enabled', async () => {
      const repos = makeRepos({
        defaultPreference: {
          id: 'd1',
          notificationType: NotificationType.Marketing,
          channel: Channel.Email,
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      const evaluator = buildEvaluator(repos);

      const result = await evaluator.evaluate(baseInput);

      expect(result.decision).toBe(Decision.Allow);
      expect(result.reason).toMatch(/default preference allows/i);
    });

    it('denies when default preference is disabled', async () => {
      const repos = makeRepos({
        defaultPreference: {
          id: 'd1',
          notificationType: NotificationType.Marketing,
          channel: Channel.Email,
          enabled: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      const evaluator = buildEvaluator(repos);

      const result = await evaluator.evaluate(baseInput);

      expect(result.decision).toBe(Decision.Deny);
      expect(result.reason).toMatch(/default preference denies/i);
    });
  });

  describe('User preference overrides', () => {
    it('user enabled overrides disabled default', async () => {
      const repos = makeRepos({
        defaultPreference: {
          id: 'd1',
          notificationType: NotificationType.Marketing,
          channel: Channel.Email,
          enabled: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        userPreference: {
          id: 'u1',
          userId: 'user-1',
          notificationType: NotificationType.Marketing,
          channel: Channel.Email,
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      const evaluator = buildEvaluator(repos);

      const result = await evaluator.evaluate(baseInput);

      expect(result.decision).toBe(Decision.Allow);
      expect(result.reason).toMatch(/user preference explicitly allows/i);
    });

    it('user disabled overrides enabled default', async () => {
      const repos = makeRepos({
        defaultPreference: {
          id: 'd1',
          notificationType: NotificationType.Marketing,
          channel: Channel.Email,
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        userPreference: {
          id: 'u1',
          userId: 'user-1',
          notificationType: NotificationType.Marketing,
          channel: Channel.Email,
          enabled: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      const evaluator = buildEvaluator(repos);

      const result = await evaluator.evaluate(baseInput);

      expect(result.decision).toBe(Decision.Deny);
      expect(result.reason).toMatch(/user preference explicitly denies/i);
    });
  });

  describe('Global policies', () => {
    it('denies when a global policy is disabled (no region)', async () => {
      const repos = makeRepos({
        globalPolicies: [
          {
            id: 'gp1',
            notificationType: NotificationType.Marketing,
            channel: Channel.Email,
            region: null,
            enabled: false,
            reason: 'Marketing email blocked globally',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });
      const evaluator = buildEvaluator(repos);

      const result = await evaluator.evaluate(baseInput);

      expect(result.decision).toBe(Decision.Deny);
      expect(result.reason).toBe('Marketing email blocked globally');
    });

    it('denies with region-specific policy', async () => {
      const repos = makeRepos({
        globalPolicies: [
          {
            id: 'gp1',
            notificationType: NotificationType.Marketing,
            channel: Channel.Email,
            region: 'EU',
            enabled: false,
            reason: 'GDPR marketing opt-in required in EU',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });
      const evaluator = buildEvaluator(repos);

      const result = await evaluator.evaluate({ ...baseInput, region: 'EU' });

      expect(result.decision).toBe(Decision.Deny);
      expect(result.reason).toBe('GDPR marketing opt-in required in EU');
    });

    it('global policy deny takes priority over user preference allow', async () => {
      const repos = makeRepos({
        globalPolicies: [
          {
            id: 'gp1',
            notificationType: NotificationType.Marketing,
            channel: Channel.Email,
            region: null,
            enabled: false,
            reason: 'Hard block',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        userPreference: {
          id: 'u1',
          userId: 'user-1',
          notificationType: NotificationType.Marketing,
          channel: Channel.Email,
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      const evaluator = buildEvaluator(repos);

      const result = await evaluator.evaluate(baseInput);

      expect(result.decision).toBe(Decision.Deny);
      expect(result.reason).toBe('Hard block');
    });
  });

  describe('Quiet hours', () => {
    it('denies when datetime falls inside overnight quiet hours window (user-specific)', async () => {
      const repos = makeRepos({
        quietHoursForUser: [
          {
            id: 'qh1',
            userId: 'user-1',
            timezone: 'America/New_York',
            startHour: 22,
            startMin: 0,
            endHour: 8,
            endMin: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });
      const evaluator = buildEvaluator(repos);

      // 2026-05-21T23:30:00 UTC = 19:30 EDT — NOT in quiet hours
      // 2026-05-22T04:00:00 UTC = 00:00 EDT — IN quiet hours (22:00–08:00)
      const result = await evaluator.evaluate({
        ...baseInput,
        datetime: '2026-05-22T04:00:00Z',
      });

      expect(result.decision).toBe(Decision.Deny);
      expect(result.reason).toMatch(/quiet hours are active/i);
    });

    it('allows when datetime falls outside quiet hours', async () => {
      const repos = makeRepos({
        quietHoursForUser: [
          {
            id: 'qh1',
            userId: 'user-1',
            timezone: 'America/New_York',
            startHour: 22,
            startMin: 0,
            endHour: 8,
            endMin: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });
      const evaluator = buildEvaluator(repos);

      // 2026-05-21T14:00:00 UTC = 10:00 EDT — outside quiet hours
      const result = await evaluator.evaluate({
        ...baseInput,
        datetime: '2026-05-21T14:00:00Z',
      });

      expect(result.decision).toBe(Decision.Allow);
    });

    it('uses global quiet hours when no user-specific quiet hours', async () => {
      const repos = makeRepos({
        quietHoursForUser: [],
        quietHoursGlobal: [
          {
            id: 'global-qh',
            userId: null,
            timezone: 'UTC',
            startHour: 0,
            startMin: 0,
            endHour: 6,
            endMin: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });
      const evaluator = buildEvaluator(repos);

      // 03:00 UTC — in global quiet hours
      const result = await evaluator.evaluate({
        ...baseInput,
        datetime: '2026-05-21T03:00:00Z',
      });

      expect(result.decision).toBe(Decision.Deny);
    });

    it('quiet hours takes priority over user preferences (marketing)', async () => {
      const repos = makeRepos({
        quietHoursForUser: [
          {
            id: 'qh1',
            userId: 'user-1',
            timezone: 'UTC',
            startHour: 22,
            startMin: 0,
            endHour: 8,
            endMin: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        userPreference: {
          id: 'u1',
          userId: 'user-1',
          notificationType: NotificationType.Marketing,
          channel: Channel.Email,
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      const evaluator = buildEvaluator(repos);

      const result = await evaluator.evaluate({
        ...baseInput,
        datetime: '2026-05-21T23:30:00Z',
      });

      expect(result.decision).toBe(Decision.Deny);
      expect(result.reason).toMatch(/quiet hours are active/i);
    });

    it('transactional notifications are NOT blocked by quiet hours', async () => {
      const repos = makeRepos({
        quietHoursForUser: [
          {
            id: 'qh1',
            userId: 'user-1',
            timezone: 'UTC',
            startHour: 22,
            startMin: 0,
            endHour: 8,
            endMin: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });
      const evaluator = buildEvaluator(repos);

      // Inside quiet hours, but transactional — should NOT be blocked
      const result = await evaluator.evaluate({
        ...baseInput,
        notificationType: NotificationType.Transactional,
        datetime: '2026-05-21T23:30:00Z',
      });

      expect(result.decision).toBe(Decision.Allow);
    });
  });

  describe('Idempotency', () => {
    it('returns the same result when called multiple times with same input', async () => {
      const repos = makeRepos({
        userPreference: {
          id: 'u1',
          userId: 'user-1',
          notificationType: NotificationType.Marketing,
          channel: Channel.Email,
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      const evaluator = buildEvaluator(repos);

      const result1 = await evaluator.evaluate(baseInput);
      const result2 = await evaluator.evaluate(baseInput);
      const result3 = await evaluator.evaluate(baseInput);

      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });
  });
});
