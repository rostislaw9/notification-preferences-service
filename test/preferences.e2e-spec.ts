import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { EvaluationResultDto } from '../src/modules/preferences/application/dto/evaluation-result.dto';
import { NotificationPolicyEvaluator } from '../src/modules/preferences/application/services/notification-policy-evaluator.service';
import { Decision } from '../src/modules/preferences/domain/enums/decision.enum';
import { PrismaService } from '../src/modules/preferences/infrastructure/prisma/prisma.service';

describe('Preferences API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let mockEvaluator: jest.Mocked<Pick<NotificationPolicyEvaluator, 'evaluate'>>;

  beforeAll(async () => {
    mockEvaluator = { evaluate: jest.fn() };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(NotificationPolicyEvaluator)
      .useValue(mockEvaluator)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    // Connect to database
    await prisma.$connect();
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
    await app.close();
  });

  beforeEach(async () => {
    // Clean up test user and their data
    await prisma.userPreference.deleteMany({ where: { userId: 'e2e-user' } });
    await prisma.quietHours.deleteMany({ where: { userId: 'e2e-user' } });
    await prisma.user.deleteMany({ where: { email: 'e2e-user@test.com' } });
  });

  // Helper to create test user
  const createTestUser = async (email = 'e2e-user@test.com', region?: string) => {
    const res = await request(app.getHttpServer())
      .post('/users')
      .send({ email, region })
      .expect(201);
    return res.body.id;
  };

  // ─── Scenario 1: User Management ─────────────────────────────────────────

  describe('GET /users', () => {
    it('returns empty list when no users exist', async () => {
      const res = await request(app.getHttpServer()).get('/users').expect(200);
      expect(res.body).toEqual([]);
    });

    it('returns list of all users', async () => {
      await createTestUser('user1@test.com');
      await createTestUser('user2@test.com');

      const res = await request(app.getHttpServer()).get('/users').expect(200);
      expect(res.body).toHaveLength(2);
      expect(res.body.map((u: { email: string }) => u.email)).toEqual(
        expect.arrayContaining(['user2@test.com', 'user1@test.com']),
      );
    });
  });

  describe('GET /users/:id/preferences', () => {
    it('returns 404 for non-existent user', async () => {
      await request(app.getHttpServer()).get('/users/non-existent-user/preferences').expect(404);
    });

    it('returns default preferences for newly created user', async () => {
      const userId = await createTestUser();

      const res = await request(app.getHttpServer())
        .get(`/users/${userId}/preferences`)
        .expect(200);

      // User should have all default preferences copied on creation
      expect(res.body.preferences.length).toBeGreaterThan(0);
      expect(res.body.quietHours).toBeNull();
      // All preferences should have the user's id
      expect(res.body.preferences.every((p: { userId: string }) => p.userId === userId)).toBe(true);
    });

    it('returns effective preferences and quietHours after upsert', async () => {
      const userId = await createTestUser();

      await request(app.getHttpServer())
        .post(`/users/${userId}/preferences`)
        .send({
          preferences: [{ notificationType: 'marketing', channel: 'email', enabled: false }],
          quietHours: { timezone: 'Europe/Berlin', startHour: 22, endHour: 8 },
        })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`/users/${userId}/preferences`)
        .expect(200);

      // User's explicit preference should override default
      const userMarketingEmail = res.body.preferences.find(
        (p: { notificationType: string; channel: string }) =>
          p.notificationType === 'marketing' && p.channel === 'email',
      );
      expect(userMarketingEmail).toBeDefined();
      expect(userMarketingEmail.enabled).toBe(false); // Changed from default true
      expect(res.body.quietHours).toMatchObject({
        userId: userId,
        timezone: 'Europe/Berlin',
        startHour: 22,
        endHour: 8,
      });
    });
  });

  // ─── Scenario 2: User preference changes ──────────────────────────────────

  describe('POST /users/:id/preferences — notification preferences', () => {
    it('creates preferences and returns { preferences, quietHours }', async () => {
      const userId = await createTestUser();

      const res = await request(app.getHttpServer())
        .post(`/users/${userId}/preferences`)
        .send({
          preferences: [
            { notificationType: 'marketing', channel: 'email', enabled: false },
            { notificationType: 'transactional', channel: 'sms', enabled: true },
          ],
        })
        .expect(200);

      // Now has defaults (from user creation) + 2 new preferences
      expect(res.body.preferences.length).toBeGreaterThanOrEqual(2);
      expect(res.body.quietHours).toBeNull();
    });

    it('transactional stays allowed when marketing is disabled', async () => {
      const userId = await createTestUser();

      await request(app.getHttpServer())
        .post(`/users/${userId}/preferences`)
        .send({
          preferences: [
            { notificationType: 'marketing', channel: 'email', enabled: false },
            { notificationType: 'transactional', channel: 'email', enabled: true },
          ],
        })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`/users/${userId}/preferences`)
        .expect(200);

      const marketing = res.body.preferences.find(
        (p: { notificationType: string; channel: string }) =>
          p.notificationType === 'marketing' && p.channel === 'email',
      );
      const transactional = res.body.preferences.find(
        (p: { notificationType: string; channel: string }) =>
          p.notificationType === 'transactional' && p.channel === 'email',
      );

      expect(marketing.enabled).toBe(false);
      expect(transactional.enabled).toBe(true);
    });

    // ─── Scenario 5: Idempotency ─────────────────────────────────────────────

    it('is idempotent — same upsert twice returns same id and value', async () => {
      const userId = await createTestUser();
      const payload = {
        preferences: [{ notificationType: 'marketing', channel: 'email', enabled: false }],
      };

      const res1 = await request(app.getHttpServer())
        .post(`/users/${userId}/preferences`)
        .send(payload)
        .expect(200);

      const res2 = await request(app.getHttpServer())
        .post(`/users/${userId}/preferences`)
        .send(payload)
        .expect(200);

      expect(res1.body.preferences[0].id).toBe(res2.body.preferences[0].id);
      expect(res1.body.preferences[0].enabled).toBe(res2.body.preferences[0].enabled);
    });

    it('updates enabled flag on repeated call with different value', async () => {
      const userId = await createTestUser();

      await request(app.getHttpServer())
        .post(`/users/${userId}/preferences`)
        .send({ preferences: [{ notificationType: 'marketing', channel: 'email', enabled: true }] })
        .expect(200);

      const res = await request(app.getHttpServer())
        .post(`/users/${userId}/preferences`)
        .send({
          preferences: [{ notificationType: 'marketing', channel: 'email', enabled: false }],
        })
        .expect(200);

      expect(res.body.preferences[0].enabled).toBe(false);
    });

    it('returns 400 for invalid notificationType value', async () => {
      const userId = await createTestUser();

      await request(app.getHttpServer())
        .post(`/users/${userId}/preferences`)
        .send({
          preferences: [{ notificationType: 'newsletter', channel: 'email', enabled: true }],
        })
        .expect(400);
    });

    it('returns 400 for empty preferences array', async () => {
      const userId = await createTestUser();

      await request(app.getHttpServer())
        .post(`/users/${userId}/preferences`)
        .send({ preferences: [] })
        .expect(400);
    });
  });

  // ─── Scenario 3: Quiet hours via API ──────────────────────────────────────

  describe('POST /users/:id/preferences — quiet hours', () => {
    it('sets quiet hours for a user', async () => {
      const userId = await createTestUser();

      const res = await request(app.getHttpServer())
        .post(`/users/${userId}/preferences`)
        .send({
          quietHours: {
            timezone: 'America/New_York',
            startHour: 22,
            startMin: 0,
            endHour: 8,
            endMin: 0,
          },
        })
        .expect(200);

      expect(res.body.quietHours).toMatchObject({
        timezone: 'America/New_York',
        startHour: 22,
        startMin: 0,
        endHour: 8,
        endMin: 0,
      });
    });

    it('quiet hours upsert is idempotent', async () => {
      const userId = await createTestUser();
      const payload = {
        quietHours: { timezone: 'UTC', startHour: 23, endHour: 7 },
      };

      const res1 = await request(app.getHttpServer())
        .post(`/users/${userId}/preferences`)
        .send(payload)
        .expect(200);

      const res2 = await request(app.getHttpServer())
        .post(`/users/${userId}/preferences`)
        .send(payload)
        .expect(200);

      expect(res1.body.quietHours.id).toBe(res2.body.quietHours.id);
      expect(res1.body.quietHours.timezone).toBe(res2.body.quietHours.timezone);
    });

    it('removes quiet hours when null is passed', async () => {
      const userId = await createTestUser();

      await request(app.getHttpServer())
        .post(`/users/${userId}/preferences`)
        .send({ quietHours: { timezone: 'UTC', startHour: 22, endHour: 8 } })
        .expect(200);

      const res = await request(app.getHttpServer())
        .post(`/users/${userId}/preferences`)
        .send({ quietHours: null })
        .expect(200);

      expect(res.body.quietHours).toBeNull();
    });

    it('returns 400 for invalid startHour', async () => {
      const userId = await createTestUser();

      await request(app.getHttpServer())
        .post(`/users/${userId}/preferences`)
        .send({ quietHours: { timezone: 'UTC', startHour: 25, endHour: 8 } })
        .expect(400);
    });
  });

  // ─── Scenario 4: POST /evaluate ───────────────────────────────────────────

  describe('POST /evaluate', () => {
    it('returns allow decision', async () => {
      const mockResult: EvaluationResultDto = {
        decision: Decision.Allow,
        reason: 'User preference allows',
      };
      mockEvaluator.evaluate.mockResolvedValueOnce(mockResult);

      const res = await request(app.getHttpServer())
        .post('/evaluate')
        .send({
          userId: 'user-1',
          notificationType: 'marketing',
          channel: 'email',
          region: 'US',
          datetime: '2026-05-21T14:00:00Z',
        })
        .expect(200);

      expect(res.body).toEqual(mockResult);
    });

    it('returns deny decision for global policy (EU)', async () => {
      const mockResult: EvaluationResultDto = {
        decision: Decision.Deny,
        reason: 'GDPR marketing opt-in required in EU',
      };
      mockEvaluator.evaluate.mockResolvedValueOnce(mockResult);

      const res = await request(app.getHttpServer())
        .post('/evaluate')
        .send({
          userId: 'user-1',
          notificationType: 'marketing',
          channel: 'email',
          region: 'EU',
          datetime: '2026-05-21T21:30:00Z',
        })
        .expect(200);

      expect(res.body).toEqual(mockResult);
    });

    it('returns 400 for invalid notificationType', async () => {
      await request(app.getHttpServer())
        .post('/evaluate')
        .send({
          userId: 'u',
          notificationType: 'newsletter',
          channel: 'email',
          datetime: '2026-05-21T14:00:00Z',
        })
        .expect(400);
    });

    it('returns 400 for invalid channel', async () => {
      await request(app.getHttpServer())
        .post('/evaluate')
        .send({
          userId: 'u',
          notificationType: 'marketing',
          channel: 'telegram',
          datetime: '2026-05-21T14:00:00Z',
        })
        .expect(400);
    });

    it('returns 400 for non-ISO datetime', async () => {
      await request(app.getHttpServer())
        .post('/evaluate')
        .send({
          userId: 'u',
          notificationType: 'marketing',
          channel: 'email',
          datetime: 'not-a-date',
        })
        .expect(400);
    });
  });

  // ─── Health ───────────────────────────────────────────────────────────────

  describe('GET /health', () => {
    it('returns status ok', async () => {
      const res = await request(app.getHttpServer()).get('/health').expect(200);
      expect(res.body.status).toBe('ok');
    });
  });

  // ─── Real Evaluator Integration (no mock) ─────────────────────────────────

  describe('POST /evaluate — real evaluator integration', () => {
    let realApp: INestApplication;
    let realPrisma: PrismaService;

    beforeAll(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      realApp = moduleFixture.createNestApplication();
      realApp.useGlobalPipes(
        new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
      );
      await realApp.init();

      realPrisma = moduleFixture.get<PrismaService>(PrismaService);
      // Connect to database
      await realPrisma.$connect();
    });

    afterAll(async () => {
      if (realPrisma) {
        await realPrisma.$disconnect();
      }
      await realApp.close();
    });

    beforeEach(async () => {
      // Clean up test users
      await realPrisma.user.deleteMany({ where: { email: { startsWith: 'integration-' } } });
    });

    // Helper for creating user in real app
    const createIntegrationUser = async (email: string, region?: string) => {
      const res = await request(realApp.getHttpServer())
        .post('/users')
        .send({ email, region })
        .expect(201);
      return res.body.id;
    };

    it('evaluates using real evaluator with real user', async () => {
      const userId = await createIntegrationUser('integration-test@example.com', 'US');

      // User was created with default preferences (transactional/email enabled)
      const res = await request(realApp.getHttpServer())
        .post('/evaluate')
        .send({
          userId,
          notificationType: 'transactional',
          channel: 'email',
          region: 'US',
          datetime: '2026-05-21T14:00:00Z',
        })
        .expect(200);

      expect(res.body.decision).toBe('allow');
      expect(res.body.reason).toMatch(
        /user preference explicitly allows|default preference allows/i,
      );
    });

    it('denies marketing in EU due to global policy', async () => {
      const userId = await createIntegrationUser('integration-eu@example.com', 'EU');

      const res = await request(realApp.getHttpServer())
        .post('/evaluate')
        .send({
          userId,
          notificationType: 'marketing',
          channel: 'email',
          region: 'EU',
          datetime: '2026-05-21T14:00:00Z',
        })
        .expect(200);

      expect(res.body.decision).toBe('deny');
      expect(res.body.reason).toMatch(/GDPR|global policy/i);
    });
  });
});
