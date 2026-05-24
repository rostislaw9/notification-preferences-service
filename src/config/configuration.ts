export interface AppConfig {
  nodeEnv: string;
  port: number;
  logLevel: string;
  databaseUrl: string;
}

export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  logLevel: process.env.LOG_LEVEL ?? 'debug',
  databaseUrl: process.env.DATABASE_URL ?? '',
});
