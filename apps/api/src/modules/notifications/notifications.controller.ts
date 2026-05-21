import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { AuthGuard } from '../../common/guards/auth-combined.guard';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List notifications' })
  async list(@Query('organizationId') organizationId: string, @Request() req: any) {
    return this.notificationsService.findAll(organizationId, req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create notification' })
  async create(@Body() data: any, @Request() req: any) {
    const orgId = req.user.memberships[0].organizationId;
    return this.notificationsService.create(orgId, req.user.id, data);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markRead(@Param('id') id: string, @Request() req: any) {
    return this.notificationsService.markRead(id, req.user.id);
  }

  @Post('mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllRead(@Query('organizationId') organizationId: string, @Request() req: any) {
    return this.notificationsService.markAllRead(organizationId, req.user.id);
  }
}
