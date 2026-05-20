import { Module } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { WorkflowsController } from './workflows.controller';
import { ExecutionsModule } from '../executions/executions.module';
import { PrismaService } from '../../prisma.service';

@Module({
  imports: [ExecutionsModule],
  controllers: [WorkflowsController],
  providers: [WorkflowsService, PrismaService],
  exports: [WorkflowsService],
})
export class WorkflowsModule {}