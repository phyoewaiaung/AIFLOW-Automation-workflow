import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IntegrationsService } from './integrations.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';

@ApiTags('Integrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get()
  @ApiOperation({ summary: 'List integrations' })
  async list(@Query('organizationId') organizationId: string, @Request() req: any) {
    return this.integrationsService.findAll(organizationId, req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get integration details' })
  async get(@Param('id') id: string, @Request() req: any) {
    return this.integrationsService.findById(id, req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create integration' })
  async create(@Body() data: any, @Request() req: any) {
    return this.integrationsService.create(
      req.user.memberships[0].organizationId,
      req.user.id,
      data
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update integration' })
  async update(
    @Param('id') id: string,
    @Body() data: any,
    @Request() req: any
  ) {
    return this.integrationsService.update(id, req.user.id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete integration' })
  async delete(@Param('id') id: string, @Request() req: any) {
    return this.integrationsService.delete(id, req.user.id);
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Test integration connection' })
  async test(@Param('id') id: string, @Request() req: any) {
    return this.integrationsService.testConnection(id, req.user.id);
  }
}