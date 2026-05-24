import { Module } from '@nestjs/common';
import { NotificationPolicyEvaluator } from './application/services/notification-policy-evaluator.service';
import { PreferencesService } from './application/services/preferences.service';
import { UserService } from './application/services/user.service';
import { DEFAULT_PREFERENCE_REPOSITORY } from './domain/ports/default-preference.repository';
import { GLOBAL_POLICY_REPOSITORY } from './domain/ports/global-policy.repository';
import { QUIET_HOURS_REPOSITORY } from './domain/ports/quiet-hours.repository';
import { USER_PREFERENCE_REPOSITORY } from './domain/ports/user-preference.repository';
import { USER_REPOSITORY } from './domain/ports/user.repository';
import { PrismaService } from './infrastructure/prisma/prisma.service';
import { DefaultPreferencePrismaRepository } from './infrastructure/repositories/default-preference.prisma-repository';
import { GlobalPolicyPrismaRepository } from './infrastructure/repositories/global-policy.prisma-repository';
import { QuietHoursPrismaRepository } from './infrastructure/repositories/quiet-hours.prisma-repository';
import { UserPreferencePrismaRepository } from './infrastructure/repositories/user-preference.prisma-repository';
import { UserPrismaRepository } from './infrastructure/repositories/user.prisma-repository';
import { PreferencesController } from './presentation/preferences.controller';
import { UserController } from './presentation/user.controller';

@Module({
  controllers: [PreferencesController, UserController],
  providers: [
    PrismaService,
    PreferencesService,
    UserService,
    NotificationPolicyEvaluator,
    { provide: USER_PREFERENCE_REPOSITORY, useClass: UserPreferencePrismaRepository },
    { provide: DEFAULT_PREFERENCE_REPOSITORY, useClass: DefaultPreferencePrismaRepository },
    { provide: GLOBAL_POLICY_REPOSITORY, useClass: GlobalPolicyPrismaRepository },
    { provide: QUIET_HOURS_REPOSITORY, useClass: QuietHoursPrismaRepository },
    { provide: USER_REPOSITORY, useClass: UserPrismaRepository },
  ],
})
export class PreferencesModule {}
