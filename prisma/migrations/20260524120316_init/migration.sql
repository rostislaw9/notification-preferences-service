-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('marketing', 'transactional', 'system');

-- CreateEnum
CREATE TYPE "Channel" AS ENUM ('email', 'sms', 'push', 'messenger');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "region" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notificationType" "NotificationType" NOT NULL,
    "channel" "Channel" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "default_preferences" (
    "id" TEXT NOT NULL,
    "notificationType" "NotificationType" NOT NULL,
    "channel" "Channel" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "default_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "global_policies" (
    "id" TEXT NOT NULL,
    "notificationType" "NotificationType" NOT NULL,
    "channel" "Channel" NOT NULL,
    "region" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "global_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiet_hours" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "timezone" TEXT NOT NULL,
    "startHour" INTEGER NOT NULL,
    "startMin" INTEGER NOT NULL DEFAULT 0,
    "endHour" INTEGER NOT NULL,
    "endMin" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quiet_hours_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_userId_notificationType_channel_key" ON "user_preferences"("userId", "notificationType", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "default_preferences_notificationType_channel_key" ON "default_preferences"("notificationType", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "global_policies_notificationType_channel_region_key" ON "global_policies"("notificationType", "channel", "region");

-- CreateIndex
CREATE UNIQUE INDEX "quiet_hours_userId_key" ON "quiet_hours"("userId");

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiet_hours" ADD CONSTRAINT "quiet_hours_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
