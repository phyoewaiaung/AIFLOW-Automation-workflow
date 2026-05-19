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
import { AgentsService } from './agents.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';

@ApiTags('Agents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get()
  @ApiOperation({ summary: 'List AI agents' })
  async list(@Query('organizationId') organizationId: string, @Request() req: any) {
    return this.agentsService.findAll(organizationId, req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get agent details' })
  async get(@Param('id') id: string, @Request() req: any) {
    return this.agentsService.findById(id, req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create AI agent' })
  async create(
    @Body() data: any,
    @Request() req: any
  ) {
    return this.agentsService.create(
      req.user.memberships[0].organizationId,
      req.user.id,
      data
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update AI agent' })
  async update(
    @Param('id') id: string,
    @Body() data: any,
    @Request() req: any
  ) {
    return this.agentsService.update(id, req.user.id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete AI agent' })
  async delete(@Param('id') id: string, @Request() req: any) {
    return this.agentsService.delete(id, req.user.id);
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Test AI agent' })
  async test(
    @Param('id') id: string,
    @Body() data: { input: string },
    @Request() req: any
  ) {
    return this.agentsService.execute(id, req.user.id, data.input);
  }
}