import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { SiteService } from './site.service';

@ApiTags('Site / CMS')
@Controller('site')
export class SiteController {
  constructor(private readonly site: SiteService) {}

  // Public — the marketing landing page reads its content from here.
  @Public() @Get('landing')
  landing() {
    return this.site.getLanding();
  }

  @ApiBearerAuth() @Put('landing') @Roles(Role.ADMIN)
  updateLanding(@Body() body: { value: unknown }) {
    return this.site.updateLanding(body?.value);
  }
}
