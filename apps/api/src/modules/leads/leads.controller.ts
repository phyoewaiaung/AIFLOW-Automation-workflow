import { Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LeadStatus } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';
import { AuthGuard } from '../../common/guards/auth-combined.guard';
import { LeadsService } from './leads.service';

@ApiTags('Leads')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  @ApiOperation({ summary: 'List leads' })
  async list(
    @Query('organizationId') organizationId: string,
    @Query('status') status: LeadStatus | undefined,
    @Request() req: any
  ) {
    return this.leadsService.findAll(organizationId, req.user.id, status);
  }

  @Post()
  @ApiOperation({ summary: 'Create and qualify a lead' })
  async create(@Body() data: any, @Request() req: any) {
    const organizationId = data.organizationId || req.user.memberships[0].organizationId;
    return this.leadsService.create(organizationId, req.user.id, data);
  }

  @Public()
  @Post('webhook/:organizationId')
  @ApiOperation({ summary: 'Capture a lead from a website form' })
  async webhook(@Param('organizationId') organizationId: string, @Body() data: any) {
    const lead = await this.leadsService.createFromWebhook(organizationId, data);
    return {
      received: true,
      leadId: lead.id,
      score: lead.score,
      status: lead.status,
    };
  }

  @Get('setup/status')
  @ApiOperation({ summary: 'Get lead capture setup status' })
  async setupStatus(@Query('organizationId') organizationId: string, @Request() req: any) {
    return this.leadsService.getSetupStatus(organizationId, req.user.id);
  }

  @Post(':id/send-email')
  @ApiOperation({ summary: 'Send generated follow-up email to a lead' })
  async sendEmail(@Param('id') id: string, @Request() req: any) {
    return this.leadsService.sendEmail(id, req.user.id);
  }

  @Patch(':id/contact')
  @ApiOperation({ summary: 'Update lead contact details' })
  async updateContact(@Param('id') id: string, @Body() data: any, @Request() req: any) {
    return this.leadsService.updateContact(id, req.user.id, data);
  }

  @Patch(':id/draft')
  @ApiOperation({ summary: 'Update generated lead email draft' })
  async updateDraft(@Param('id') id: string, @Body() data: any, @Request() req: any) {
    return this.leadsService.updateDraft(id, req.user.id, data);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get lead details' })
  async get(@Param('id') id: string, @Request() req: any) {
    return this.leadsService.findById(id, req.user.id);
  }
}
