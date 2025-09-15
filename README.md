# Cinema Tickets – Node.js Implementation

This project is an implementation of the **TicketService** interface for the DWP coding exercise.

## Business Rules Implemented
- Three ticket types: **ADULT (£25)**, **CHILD (£15)**, **INFANT (£0)**.
- Up to **25 tickets** may be purchased in a single request.
- **Infants do not pay and are not allocated a seat** (they must sit on an Adult’s lap).
- **Child and Infant tickets require at least one Adult ticket**.
- **Infants cannot exceed Adults** (one lap per Adult).
- Payments are processed through the provided `TicketPaymentService`.
- Seats are reserved through the provided `SeatReservationService`.

## Constraints
- `TicketService` interface is unchanged.
- Classes in `thirdparty.*` are not modified.
- `TicketTypeRequest` is immutable.
- Invalid requests throw `InvalidPurchaseException`.

## Requirements
- Node.js 20+
- npm

## Installation & Tests
```bash
npm install
npm test
