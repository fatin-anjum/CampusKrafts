import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdaptiveService } from './adaptive.service';

@ApiTags('Adaptive Learning')
@ApiBearerAuth()
@Roles(Role.STUDENT)
@Controller('adaptive')
export class AdaptiveController {
  constructor(private readonly adaptive: AdaptiveService) {}

  @Get('recommendations')
  recommend(@CurrentUser('id') userId: string) {
    return this.adaptive.recommendations(userId);
  }

  @Get('mastery')
  mastery(@CurrentUser('id') userId: string) {
    return this.adaptive.masteryMap(userId);
  }

  @Get('revision-today')
  revision(@CurrentUser('id') userId: string) {
    return this.adaptive.revisionToday(userId);
  }
}
