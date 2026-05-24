import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  await prisma.defaultPreference.upsert({
    where: { notificationType_channel: { notificationType: 'marketing', channel: 'email' } },
    update: {},
    create: { notificationType: 'marketing', channel: 'email', enabled: true },
  });
  await prisma.defaultPreference.upsert({
    where: { notificationType_channel: { notificationType: 'marketing', channel: 'sms' } },
    update: {},
    create: { notificationType: 'marketing', channel: 'sms', enabled: false },
  });
  await prisma.defaultPreference.upsert({
    where: { notificationType_channel: { notificationType: 'marketing', channel: 'push' } },
    update: {},
    create: { notificationType: 'marketing', channel: 'push', enabled: true },
  });
  await prisma.defaultPreference.upsert({
    where: { notificationType_channel: { notificationType: 'marketing', channel: 'messenger' } },
    update: {},
    create: { notificationType: 'marketing', channel: 'messenger', enabled: false },
  });

  await prisma.defaultPreference.upsert({
    where: {
      notificationType_channel: { notificationType: 'transactional', channel: 'email' },
    },
    update: {},
    create: { notificationType: 'transactional', channel: 'email', enabled: true },
  });
  await prisma.defaultPreference.upsert({
    where: { notificationType_channel: { notificationType: 'transactional', channel: 'sms' } },
    update: {},
    create: { notificationType: 'transactional', channel: 'sms', enabled: true },
  });
  await prisma.defaultPreference.upsert({
    where: { notificationType_channel: { notificationType: 'transactional', channel: 'push' } },
    update: {},
    create: { notificationType: 'transactional', channel: 'push', enabled: true },
  });
  await prisma.defaultPreference.upsert({
    where: {
      notificationType_channel: { notificationType: 'transactional', channel: 'messenger' },
    },
    update: {},
    create: { notificationType: 'transactional', channel: 'messenger', enabled: false },
  });

  await prisma.defaultPreference.upsert({
    where: { notificationType_channel: { notificationType: 'system', channel: 'email' } },
    update: {},
    create: { notificationType: 'system', channel: 'email', enabled: true },
  });
  await prisma.defaultPreference.upsert({
    where: { notificationType_channel: { notificationType: 'system', channel: 'sms' } },
    update: {},
    create: { notificationType: 'system', channel: 'sms', enabled: false },
  });
  await prisma.defaultPreference.upsert({
    where: { notificationType_channel: { notificationType: 'system', channel: 'push' } },
    update: {},
    create: { notificationType: 'system', channel: 'push', enabled: true },
  });
  await prisma.defaultPreference.upsert({
    where: { notificationType_channel: { notificationType: 'system', channel: 'messenger' } },
    update: {},
    create: { notificationType: 'system', channel: 'messenger', enabled: false },
  });

  await prisma.globalPolicy.upsert({
    where: {
      notificationType_channel_region: {
        notificationType: 'marketing',
        channel: 'email',
        region: 'EU',
      },
    },
    update: {},
    create: {
      notificationType: 'marketing',
      channel: 'email',
      region: 'EU',
      enabled: false,
      reason: 'GDPR marketing opt-in required in EU',
    },
  });

  await prisma.quietHours.upsert({
    where: { id: 'global-quiet-hours' },
    update: {},
    create: {
      id: 'global-quiet-hours',
      userId: null,
      timezone: 'America/New_York',
      startHour: 22,
      startMin: 0,
      endHour: 8,
      endMin: 0,
    },
  });

  console.log('Seeding complete - defaults and global policies created.');
  console.log('Users should be created via POST /users API');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
