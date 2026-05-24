import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { LoggerModule } from 'nestjs-pino';
import configuration from './config/configuration';
import { HealthController } from './health/health.controller';
import { PrismaService } from './modules/preferences/infrastructure/prisma/prisma.service';
import { PreferencesModule } from './modules/preferences/preferences.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        autoLogging: true,
        redact: ['req.headers.authorization'],
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
      },
    }),
    TerminusModule,
    PreferencesModule,
  ],
  controllers: [HealthController],
  providers: [PrismaService],
})
export class AppModule {}
