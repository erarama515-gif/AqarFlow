import {
  Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

import { BookingService } from '../application/booking.service';
import {
  CancelBookingDto,
  CreateBookingDto,
  ListBookingsQueryDto,
  RecordPaymentDto,
} from './booking.dto';
import { RequirePermissions } from '../../iam/decorators/permissions.decorator';
import { PERMISSIONS } from '../../iam/domain/permissions.catalog';

@ApiTags('Bookings')
@Controller({ path: 'bookings', version: '1' })
export class BookingController {
  constructor(private readonly bookings: BookingService) {}

  @RequirePermissions(PERMISSIONS.BOOKING_CREATE)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new booking (unit becomes RESERVED)' })
  async create(@Body() dto: CreateBookingDto): Promise<{ id: string }> {
    return { id: await this.bookings.create(dto) };
  }

  @RequirePermissions(PERMISSIONS.BOOKING_READ_OWN)
  @Get()
  @ApiOperation({ summary: 'List bookings (own or all based on scope)' })
  async list(@Query() q: ListBookingsQueryDto, @Res({ passthrough: true }) res: Response) {
    const { items, total } = await this.bookings.list(q);
    res.setHeader('X-Total-Count', total.toString());
    return items;
  }

  @RequirePermissions(PERMISSIONS.BOOKING_READ_OWN)
  @Get(':id')
  @ApiOperation({ summary: 'Booking detail' })
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.bookings.findById(id);
  }

  @RequirePermissions(PERMISSIONS.BOOKING_UPDATE)
  @Post(':id/payment')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Record the booking fee payment (PENDING_PAYMENT → ACTIVE)' })
  async recordPayment(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: RecordPaymentDto,
  ): Promise<void> {
    await this.bookings.recordPayment(id, {
      method: dto.method,
      reference: dto.reference,
      receivedAt: dto.receivedAt ? new Date(dto.receivedAt) : undefined,
    });
  }

  @RequirePermissions(PERMISSIONS.BOOKING_SIGN_SPA)
  @Post(':id/sign-spa')
  @ApiOperation({ summary: 'Sign the SPA (ACTIVE → CONVERTED_TO_SALE, creates Deal, unit SOLD)' })
  async signSpa(@Param('id', new ParseUUIDPipe()) id: string): Promise<{ dealId: string }> {
    return this.bookings.signSpa(id);
  }

  @RequirePermissions(PERMISSIONS.BOOKING_UPDATE)
  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel — refundable inside cooling-off, otherwise forfeited' })
  async cancel(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CancelBookingDto,
  ): Promise<{ refundAmount: number }> {
    return this.bookings.cancel(id, dto.reason);
  }
}
