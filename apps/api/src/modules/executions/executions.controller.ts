import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ExecutionsService } from './executions.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';

@ApiTags('Executions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('executions')
export class ExecutionsController {
  constructor(private readonly executionsService: ExecutionsService) {}

  @Get()
  @ApiOperation({ summary: 'List executions' })
  async list(
    @Request() req: any,
    @Query('organizationId') organizationId: string,
    @Query('workflowId') workflowId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number
  ) {
    return this.executionsService.findAll(organizationId, req.user.id, {
      workflowId,
      status,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get execution details' })
  async get(@Param('id') id: string, @Request() req: any) {
    return this.executionsService.findById(id, req.user.id);
  }

  @Get(':id/logs')
  @ApiOperation({ summary: 'Get execution logs' })
  async logs(@Param('id') id: string, @Request() req: any) {
    return this.executionsService.findLogs(id, req.user.id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel execution' })
  async cancel(@Param('id') id: string, @Request() req: any) {
    return this.executionsService.cancel(id, req.user.id);
  }

  @Post(':id/retry')
  @ApiOperation({ summary: 'Retry failed execution' })
  async retry(@Param('id') id: string, @Request() req: any) {
    return this.executionsService.retry(id, req.user.id);
  }

  @Post('trigger/:workflowId')
  @ApiOperation({ summary: 'Trigger workflow execution' })
  async trigger(
    @Param('workflowId') workflowId: string,
    @Body() data: any,
    @Request() req: any
  ) {
    return this.executionsService.startExecution(workflowId, req.user.id, data);
  }
}