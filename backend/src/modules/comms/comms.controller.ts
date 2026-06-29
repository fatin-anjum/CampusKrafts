import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CommsService } from './comms.service';
import { CreateAnnouncementDto, DeviceTokenDto } from './dto/comms.dto';

@ApiTags('Announcements & Notifications')
@ApiBearerAuth()
@Controller()
export class CommsController {
  constructor(private readonly comms: CommsService) {}

  @Get('announcements')
  announcements() {
    return this.comms.listAnnouncements();
  }

  @Post('announcements') @Roles(Role.ADMIN, Role.TEACHER, Role.MODERATOR)
  create(@Body() dto: CreateAnnouncementDto, @CurrentUser('id') userId: string) {
    return this.comms.createAnnouncement(dto, userId);
  }

  @Get('notifications')
  notifications(@CurrentUser('id') userId: string) {
    return this.comms.myNotifications(userId);
  }

  @Patch('notifications/:id/read')
  read(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.comms.markRead(userId, id);
  }

  @Post('notifications/device-tokens')
  device(@Body() dto: DeviceTokenDto, @CurrentUser('id') userId: string) {
    return this.comms.registerDeviceToken(userId, dto.token, dto.platform);
  }
}
