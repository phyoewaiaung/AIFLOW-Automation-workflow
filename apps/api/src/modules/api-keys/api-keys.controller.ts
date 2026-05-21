import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApiKeysService } from './api-keys.service';
import { AuthGuard } from '../../common/guards/auth-combined.guard';

@ApiTags('API Keys')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Get()
  @ApiOperation({ summary: 'List API keys' })
  async list(@Query('organizationId') organizationId: string, @Request() req: any) {
    return this.apiKeysService.findAll(organizationId, req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create API key' })
  async create(@Body() data: { name: string }, @Request() req: any) {
    const orgId = req.user.memberships[0].organizationId;
    return this.apiKeysService.create(orgId, req.user.id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete API key' })
  async delete(@Param('id') id: string, @Request() req: any) {
    return this.apiKeysService.delete(id, req.user.id);
  }
}
