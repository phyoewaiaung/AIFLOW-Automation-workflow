import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { AuthGuard } from '../../common/guards/auth-combined.guard';

@ApiTags('Organizations')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  @ApiOperation({ summary: 'List user organizations' })
  async list(@Request() req: any) {
    return this.organizationsService.findAll(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organization details' })
  async get(@Param('id') id: string, @Request() req: any) {
    return this.organizationsService.findById(id, req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new organization' })
  async create(@Body() data: { name: string }, @Request() req: any) {
    return this.organizationsService.create(req.user.id, data);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update organization' })
  async update(
    @Param('id') id: string,
    @Body() data: { name?: string; logo?: string },
    @Request() req: any
  ) {
    return this.organizationsService.update(id, req.user.id, data);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'List organization members' })
  async members(@Param('id') id: string, @Request() req: any) {
    return this.organizationsService.getMembers(id, req.user.id);
  }
}