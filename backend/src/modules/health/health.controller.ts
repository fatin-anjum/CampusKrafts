import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService, private readonly redis: RedisService) {}

  @Public() @Get()
  async check() {
    const checks: Record<string, string> = { api: 'ok' };
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.postgres = 'ok';
    } catch {
      checks.postgres = 'down';
    }
    checks.redis = (await this.redis.ping()) ? 'ok' : 'down';

    // Redis is optional in dev — Postgres + API healthy is enough to serve traffic.
    const healthy = checks.api === 'ok' && checks.postgres === 'ok';
    return { status: healthy ? 'healthy' : 'degraded', checks, ts: new Date().toISOString() };
  }
}
