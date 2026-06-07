import { Controller, Post, Get, Param, Body, UseGuards, Res, HttpCode, Patch, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { InvoicesService } from '../services/invoices.service';
import { CreateInvoiceDto } from '../dto/create-invoice.dto';
import { JwtAuthGuard } from '../../jwt-auth.guard';
import { CurrentUser } from '../../current-user.decorator';
import { InvoiceStatus } from '../types/invoice.types';

@Controller('invoices')
@UseGuards(JwtAuthGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  async create(@Body() dto: CreateInvoiceDto, @CurrentUser() user: any) {
    const result = await this.invoicesService.createInvoice(dto, user.sub, true);
    return result;
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    const invoice = await this.invoicesService.findOne(id, user);
    return invoice;
  }

  @Get(':id/pdf')
  async streamPdf(@Param('id') id: string, @CurrentUser() user: any, @Res() res: Response) {
    const pdf = await this.invoicesService.generatePdf(id);
    if (!pdf || !pdf.buffer) throw new BadRequestException('PDF introuvable');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${pdf.filename}"`);
    return res.send(pdf.buffer);
  }

  @Get(':id/download')
  async downloadPdf(@Param('id') id: string, @CurrentUser() user: any, @Res() res: Response) {
    const pdf = await this.invoicesService.generatePdf(id);
    if (!pdf || !pdf.buffer) throw new BadRequestException('PDF introuvable');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${pdf.filename}"`);
    return res.send(pdf.buffer);
  }

  @Post('bulk-pdf')
  @HttpCode(200)
  async bulkPdf(@Body() body: { invoiceIds: string[] }, @CurrentUser() user: any, @Res() res: Response) {
    const zip = await this.invoicesService.bulkGeneratePdf(body.invoiceIds || []);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zip.filename}"`);
    return res.send(zip.buffer);
  }

  @Patch(':id/status')
  async changeStatus(@Param('id') id: string, @Body() body: { status: InvoiceStatus }, @CurrentUser() user: any) {
    const updated = await this.invoicesService.changeStatus(id, body.status, user.sub);
    return updated;
  }
}
