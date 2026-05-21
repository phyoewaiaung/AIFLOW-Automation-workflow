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
import { WorkflowsService } from './workflows.service';
import { ExecutionsService } from '../executions/executions.service';
import { AuthGuard } from '../../common/guards/auth-combined.guard';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Workflows')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('workflows')
export class WorkflowsController {
  constructor(
    private readonly workflowsService: WorkflowsService,
    private readonly executionsService: ExecutionsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List workflows' })
  async list(
    @Query('organizationId') organizationId: string,
    @Request() req: any
  ) {
    return this.workflowsService.findAll(organizationId, req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get workflow details' })
  async get(@Param('id') id: string, @Request() req: any) {
    return this.workflowsService.findById(id, req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create workflow' })
  async create(
    @Body() data: { name: string; description?: string; triggerConfig?: any },
    @Request() req: any
  ) {
    return this.workflowsService.create(req.user.memberships[0].organizationId, req.user.id, data);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update workflow' })
  async update(
    @Param('id') id: string,
    @Body() data: any,
    @Request() req: any
  ) {
    return this.workflowsService.update(id, req.user.id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete workflow' })
  async delete(@Param('id') id: string, @Request() req: any) {
    return this.workflowsService.delete(id, req.user.id);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate workflow' })
  async activate(@Param('id') id: string, @Request() req: any) {
    return this.workflowsService.activate(id, req.user.id);
  }

  @Post(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate workflow' })
  async deactivate(@Param('id') id: string, @Request() req: any) {
    return this.workflowsService.deactivate(id, req.user.id);
  }

  @Post(':id/nodes')
  @ApiOperation({ summary: 'Add workflow node' })
  async addNode(
    @Param('id') id: string,
    @Body() nodeData: any,
    @Request() req: any
  ) {
    return this.workflowsService.addNode(id, req.user.id, nodeData);
  }

  @Patch(':id/nodes/:nodeId')
  @ApiOperation({ summary: 'Update workflow node' })
  async updateNode(
    @Param('id') id: string,
    @Param('nodeId') nodeId: string,
    @Body() data: any,
    @Request() req: any
  ) {
    return this.workflowsService.updateNode(id, nodeId, req.user.id, data);
  }

  @Delete(':id/nodes/:nodeId')
  @ApiOperation({ summary: 'Delete workflow node' })
  async deleteNode(
    @Param('id') id: string,
    @Param('nodeId') nodeId: string,
    @Request() req: any
  ) {
    return this.workflowsService.deleteNode(id, nodeId, req.user.id);
  }

  @Post(':id/edges')
  @ApiOperation({ summary: 'Add workflow edge' })
  async addEdge(
    @Param('id') id: string,
    @Body() edgeData: any,
    @Request() req: any
  ) {
    return this.workflowsService.addEdge(id, req.user.id, edgeData);
  }

  @Delete(':id/edges/:edgeId')
  @ApiOperation({ summary: 'Delete workflow edge' })
  async deleteEdge(
    @Param('id') id: string,
    @Param('edgeId') edgeId: string,
    @Request() req: any
  ) {
    return this.workflowsService.deleteEdge(id, edgeId, req.user.id);
  }

  @Post(':id/save')
  @ApiOperation({ summary: 'Save workflow nodes and edges' })
  async save(
    @Param('id') id: string,
    @Body() data: { nodes: any[]; edges: any[] },
    @Request() req: any
  ) {
    return this.workflowsService.saveNodesAndEdges(id, req.user.id, data);
  }

  @Public()
  @Post('webhook/:workflowId')
  @ApiOperation({ summary: 'Trigger workflow via webhook' })
  async webhook(
    @Param('workflowId') workflowId: string,
    @Body() data: any
  ) {
    const execution = await this.executionsService.startExecutionFromWebhook(workflowId, data);
    return { received: true, workflowId, executionId: execution.id, status: execution.status };
  }
}