import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get analytics overview' })
  async overview(@Query('organizationId') organizationId: string, @Request() req: any) {
    return this.analyticsService.getOverview(organizationId, req.user.id);
  }

  @Get('executions')
  @ApiOperation({ summary: 'Get execution statistics' })
  async executions(
    @Request() req: any,
    @Query('organizationId') organizationId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string
  ) {
    return this.analyticsService.getExecutionStats(
      organizationId,
      req.user.id,
      dateFrom ? new Date(dateFrom) : undefined,
      dateTo ? new Date(dateTo) : undefined
    );
  }

  @Get('workflows')
  @ApiOperation({ summary: 'Get workflow statistics' })
  async workflows(@Query('organizationId') organizationId: string, @Request() req: any) {
    return this.analyticsService.getWorkflowStats(organizationId, req.user.id);
  }
}