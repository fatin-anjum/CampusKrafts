import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CoursesModule } from './modules/courses/courses.module';
import { LiveClassesModule } from './modules/live-classes/live-classes.module';
import { ContentModule } from './modules/content/content.module';
import { ExamsModule } from './modules/exams/exams.module';
import { MocksModule } from './modules/mocks/mocks.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { ForumModule } from './modules/forum/forum.module';
import { CommsModule } from './modules/comms/comms.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { SupportModule } from './modules/support/support.module';
import { AdaptiveModule } from './modules/adaptive/adaptive.module';
import { AdminModule } from './modules/admin/admin.module';
import { SiteModule } from './modules/site/site.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    // Global rate limit: 120 requests / 60s per IP (overridable per route)
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),

    PrismaModule,
    RedisModule,

    AuthModule,
    UsersModule,
    CoursesModule,
    LiveClassesModule,
    ContentModule,
    ExamsModule,
    MocksModule,
    AssignmentsModule,
    ForumModule,
    CommsModule,
    PaymentsModule,
    SupportModule,
    AdaptiveModule,
    AdminModule,
    SiteModule,
    UploadsModule,
    HealthModule,
  ],
  providers: [
    // Order matters: authenticate → throttle → authorize by role
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
