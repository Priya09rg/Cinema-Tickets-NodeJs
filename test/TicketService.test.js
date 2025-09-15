import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import TicketService from '../src/pairtest/TicketService.js';
import TicketTypeRequest from '../src/pairtest/lib/TicketTypeRequest.js';
import TicketPaymentService from '../src/thirdparty/paymentgateway/TicketPaymentService.js';
import SeatReservationService from '../src/thirdparty/seatbooking/SeatReservationService.js';
import InvalidPurchaseException from '../src/pairtest/lib/InvalidPurchaseException.js';

const spy3rdParty = () => {
  const paymentSpy = vi
    .spyOn(TicketPaymentService.prototype, 'makePayment')
    .mockImplementation(() => {});
  const seatSpy = vi
    .spyOn(SeatReservationService.prototype, 'reserveSeat')
    .mockImplementation(() => {});
  return { paymentSpy, seatSpy };
};

describe('TicketService', () => {
  let paymentSpy;
  let seatSpy;

  beforeEach(() => {
    ({ paymentSpy, seatSpy } = spy3rdParty());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Positive cases first (business rules satisfied)
  describe('Business rules satisfied', () => {
    it('1 Adult only → £25, 1 seat', () => {
      const svc = new TicketService();
      expect(() =>
        svc.purchaseTickets(1, new TicketTypeRequest('ADULT', 1)),
      ).not.toThrow();

      expect(paymentSpy).toHaveBeenCalledWith(1, 25);
      expect(seatSpy).toHaveBeenCalledWith(1, 1);
    });

    it('1 Adult + many Children (up to 25 total) → allowed', () => {
      const svc = new TicketService();
      // 1 Adult + 24 Children = 25 total
      svc.purchaseTickets(
        2,
        new TicketTypeRequest('ADULT', 1),
        new TicketTypeRequest('CHILD', 24),
      );

      expect(paymentSpy).toHaveBeenCalledWith(2, 25 + 24 * 15); // £385
      expect(seatSpy).toHaveBeenCalledWith(2, 25);
    });

    it('Adults + Children + Infants, infants ≤ adults, total ≤ 25', () => {
      const svc = new TicketService();
      svc.purchaseTickets(
        3,
        new TicketTypeRequest('ADULT', 3),
        new TicketTypeRequest('CHILD', 5),
        new TicketTypeRequest('INFANT', 2),
      );
      expect(paymentSpy).toHaveBeenCalledWith(3, 3 * 25 + 5 * 15); // £150
      expect(seatSpy).toHaveBeenCalledWith(3, 8);
    });

    it('Same-type requests aggregate correctly', () => {
      const svc = new TicketService();
      svc.purchaseTickets(
        4,
        new TicketTypeRequest('ADULT', 1),
        new TicketTypeRequest('CHILD', 2),
        new TicketTypeRequest('ADULT', 2),
        new TicketTypeRequest('CHILD', 1),
      );
      expect(paymentSpy).toHaveBeenCalledWith(4, 3 * 25 + 3 * 15); // £120
      expect(seatSpy).toHaveBeenCalledWith(4, 6);
    });

    it('Infants are free and get no seats', () => {
      const svc = new TicketService();
      svc.purchaseTickets(
        5,
        new TicketTypeRequest('ADULT', 2),
        new TicketTypeRequest('INFANT', 2),
      );
      expect(paymentSpy).toHaveBeenCalledWith(5, 50);
      expect(seatSpy).toHaveBeenCalledWith(5, 2);
    });

    it('Boundary: total exactly 25 is allowed', () => {
      const svc = new TicketService();
      svc.purchaseTickets(
        6,
        new TicketTypeRequest('ADULT', 10),
        new TicketTypeRequest('CHILD', 15),
      );
      expect(paymentSpy).toHaveBeenCalledWith(6, 10 * 25 + 15 * 15);
      expect(seatSpy).toHaveBeenCalledWith(6, 25);
    });

    it('Infants equal to adults is allowed', () => {
      const svc = new TicketService();
      svc.purchaseTickets(
        7,
        new TicketTypeRequest('ADULT', 7),
        new TicketTypeRequest('INFANT', 7),
      );
      expect(paymentSpy).toHaveBeenCalledWith(7, 7 * 25);
      expect(seatSpy).toHaveBeenCalledWith(7, 7);
    });
  });

  // Invalid / edge cases
  describe('Invalid / edge cases', () => {
    it('Children without an Adult → reject', () => {
      const svc = new TicketService();
      expect(() =>
        svc.purchaseTickets(1, new TicketTypeRequest('CHILD', 1)),
      ).toThrow(InvalidPurchaseException);
      expect(paymentSpy).not.toHaveBeenCalled();
      expect(seatSpy).not.toHaveBeenCalled();
    });

    it('Infants without an Adult → reject', () => {
      const svc = new TicketService();
      expect(() =>
        svc.purchaseTickets(1, new TicketTypeRequest('INFANT', 1)),
      ).toThrow(InvalidPurchaseException);
    });

    it('Infants greater than Adults (e.g., 2A + 3I) → reject', () => {
      const svc = new TicketService();
      expect(() =>
        svc.purchaseTickets(
          1,
          new TicketTypeRequest('ADULT', 2),
          new TicketTypeRequest('INFANT', 3),
        ),
      ).toThrow(InvalidPurchaseException);
    });

    it('Total tickets > 25 → reject', () => {
      const svc = new TicketService();
      expect(() =>
        svc.purchaseTickets(
          1,
          new TicketTypeRequest('ADULT', 1),
          new TicketTypeRequest('CHILD', 25), // total 26
        ),
      ).toThrow(InvalidPurchaseException);
    });

    it('Zero total tickets (all zeros) → reject', () => {
      const svc = new TicketService();
      expect(() =>
        svc.purchaseTickets(
          1,
          new TicketTypeRequest('ADULT', 0),
          new TicketTypeRequest('CHILD', 0),
          new TicketTypeRequest('INFANT', 0),
        ),
      ).toThrow(InvalidPurchaseException);
    });

    it('No requests passed → reject', () => {
      const svc = new TicketService();
      expect(() => svc.purchaseTickets(1)).toThrow(InvalidPurchaseException);
    });

    it('Invalid accountId (0) → reject', () => {
      const svc = new TicketService();
      expect(() =>
        svc.purchaseTickets(0, new TicketTypeRequest('ADULT', 1)),
      ).toThrow(InvalidPurchaseException);
    });

    it('Invalid accountId (negative) → reject', () => {
      const svc = new TicketService();
      expect(() =>
        svc.purchaseTickets(-5, new TicketTypeRequest('ADULT', 1)),
      ).toThrow(InvalidPurchaseException);
    });

    it('Invalid accountId (non-integer) → reject', () => {
      const svc = new TicketService();
      expect(() =>
        svc.purchaseTickets(1.25, new TicketTypeRequest('ADULT', 1)),
      ).toThrow(InvalidPurchaseException);
    });

    it('Non-TicketTypeRequest argument → reject', () => {
      const svc = new TicketService();
      // @ts-expect-error – intentionally wrong argument
      expect(() => svc.purchaseTickets(1, { type: 'ADULT', n: 1 })).toThrow(
        InvalidPurchaseException,
      );
    });
  });
});
