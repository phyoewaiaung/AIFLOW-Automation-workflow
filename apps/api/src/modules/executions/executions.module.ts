import { Module } from '@nestjs/common';
import { ExecutionsService } from './executions.service';
import { ExecutionsController } from './executions.controller';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [ExecutionsController],
  providers: [ExecutionsService, PrismaService],
  exports: [ExecutionsService],
})
export class ExecutionsModule {}