import { BookingStatus } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

/**
 * Allowed transitions for the Booking lifecycle. Anything not listed here is
 * rejected with a typed error, so the API surface never accepts an illegal
 * state change (e.g., reactivating a CONVERTED_TO_SALE booking).
 */
const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING_PAYMENT:    ['ACTIVE', 'CANCELLED', 'EXPIRED'],
  ACTIVE:             ['CONVERTED_TO_SALE', 'CANCELLED', 'EXPIRED', 'FORFEITED'],
  CONVERTED_TO_SALE:  [], // terminal
  CANCELLED:          [], // terminal
  EXPIRED:            [], // terminal
  FORFEITED:          [], // terminal
};

export function assertBookingTransition(
  current: BookingStatus,
  next: BookingStatus,
): void {
  if (current === next) return;
  if (!TRANSITIONS[current].includes(next)) {
    throw new BadRequestException(
      `Cannot move booking from ${current} to ${next}. ` +
        `Allowed transitions: ${TRANSITIONS[current].join(', ') || '(none — terminal state)'}`,
    );
  }
}

export function isTerminal(status: BookingStatus): boolean {
  return TRANSITIONS[status].length === 0;
}
