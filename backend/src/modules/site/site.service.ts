import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const LANDING_KEY = 'landing';

/**
 * Admin-editable site content (CMS). Currently backs the public landing page.
 * Content is stored as JSON in the `site_settings` table keyed by document.
 */
@Injectable()
export class SiteService {
  private readonly logger = new Logger(SiteService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Cast keeps the backend compiling before `prisma generate` regenerates the
  // client with the SiteSetting delegate. After generate it is the typed model.
  private get store(): any {
    return (this.prisma as any).siteSetting;
  }

  async getLanding(): Promise<unknown | null> {
    try {
      const row = await this.store.findUnique({ where: { key: LANDING_KEY } });
      return row?.value ?? null;
    } catch {
      // Table may not exist yet (migration pending) — let callers use defaults.
      this.logger.warn('site_settings table unavailable; returning null landing content');
      return null;
    }
  }

  async updateLanding(value: unknown) {
    const row = await this.store.upsert({
      where: { key: LANDING_KEY },
      create: { key: LANDING_KEY, value },
      update: { value },
    });
    return row.value;
  }
}
