import TicketTypeRequest from './lib/TicketTypeRequest.js';
import InvalidPurchaseException from './lib/InvalidPurchaseException.js';

import TicketPaymentService from '../thirdparty/paymentgateway/TicketPaymentService.js';
import SeatReservationService from '../thirdparty/seatbooking/SeatReservationService.js';

export default class TicketService {
  #PRICES = { INFANT: 0, CHILD: 15, ADULT: 25 };

  /**
   * purchaseTickets(accountId: number, ...ticketTypeRequests: TicketTypeRequest[])
   */
  purchaseTickets(accountId, ...ticketTypeRequests) {
    if (!Number.isInteger(accountId) || accountId <= 0) {
      throw new InvalidPurchaseException('accountId must be a positive integer');
    }
    if (!ticketTypeRequests || ticketTypeRequests.length === 0) {
      throw new InvalidPurchaseException('At least one ticket request is required');
    }
    for (const r of ticketTypeRequests) {
      if (!(r instanceof TicketTypeRequest)) {
        throw new InvalidPurchaseException('All requests must be TicketTypeRequest instances');
      }
    }
    const counts = { ADULT: 0, CHILD: 0, INFANT: 0 };
    for (const req of ticketTypeRequests) {
      counts[req.getTicketType()] += req.getNoOfTickets();
    }

    const totalTickets = counts.ADULT + counts.CHILD + counts.INFANT;

    if (totalTickets === 0) {
      throw new InvalidPurchaseException('You must purchase at least 1 ticket');
    }
    if (totalTickets > 25) {
      throw new InvalidPurchaseException('Cannot purchase more than 25 tickets at a time');
    }
    if (counts.ADULT === 0 && (counts.CHILD > 0 || counts.INFANT > 0)) {
      throw new InvalidPurchaseException('Child/Infant tickets require at least one Adult');
    }
    if (counts.INFANT > counts.ADULT) {
      throw new InvalidPurchaseException('Each Infant must have an Adult (infants cannot exceed adults)');
    }
    const amountToPay =
      counts.ADULT * this.#PRICES.ADULT +
      counts.CHILD * this.#PRICES.CHILD;

    const seatsToReserve = counts.ADULT + counts.CHILD;

    new TicketPaymentService().makePayment(accountId, amountToPay);
    new SeatReservationService().reserveSeat(accountId, seatsToReserve);

    return { amountToPay, seatsToReserve, counts };
  }
}