import { Module } from '@nestjs/common';
import { InvoicesController } from './controllers/invoices.controller';
import { InvoicesService } from './services/invoices.service';
import { PdfGeneratorService } from './services/pdf-generator.service';
import { PrismaModule } from '../config/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [InvoicesController],
  providers: [InvoicesService, PdfGeneratorService],
  exports: [InvoicesService, PdfGeneratorService],
})
export class InvoicesModule {}
