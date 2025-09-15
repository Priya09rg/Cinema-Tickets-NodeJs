import TicketTypeRequest from './lib/TicketTypeRequest.js';
import InvalidPurchaseException from './lib/InvalidPurchaseException.js';

import TicketPaymentService from '../thirdparty/paymentgateway/TicketPaymentService.js';
import SeatReservationService from '../thirdparty/seatbooking/SeatReservationService.js';

export default class TicketService {
  /**
   * Should only have private methods other than the one below.
   */

  purchaseTickets(accountId, ...ticketTypeRequests) {
    let totalRequestTickets=0;
    let INFANT=0;
    let CHILD=15;
    let ADULT=25;

    let ticketAndNoOfTicketsMap = new Map();  

    ticketTypeRequests.forEach(
      ticketTypeRequest=> {
        totalRequestTickets= totalRequestTickets + ticketTypeRequest.getNoOfTickets();
        ticketAndNoOfTicketsMap.set(ticketTypeRequest.getTicketType(),ticketTypeRequest.getNoOfTickets());
      }
    );

    //
    let conditions= this.#whetherAllConditionsSatisfied(accountId,totalRequestTickets,ticketAndNoOfTicketsMap);

    if(conditions) {
       let totalPurchaseAmount = 0;
       totalPurchaseAmount = totalPurchaseAmount + ticketAndNoOfTicketsMap.get("ADULT") * ADULT;
       this.#allocateSeat("ADULT", accountId, ticketAndNoOfTicketsMap);

       if(ticketAndNoOfTicketsMap.has("INFANT"))
         totalPurchaseAmount = totalPurchaseAmount + ticketAndNoOfTicketsMap.get("INFANT") * INFANT;

       if(ticketAndNoOfTicketsMap.has("CHILD")) {
         totalPurchaseAmount = totalPurchaseAmount + ticketAndNoOfTicketsMap.get("CHILD") * CHILD;
         this.#allocateSeat("CHILD", accountId, ticketAndNoOfTicketsMap);
       }
       this.#sendPaymentPurchase(accountId, totalPurchaseAmount);
    }
    else {
       throw new InvalidPurchaseException('Tickets cannot be purchased');
    }
  }

  #whetherAllConditionsSatisfied(accountId, totalRequestTickets,ticketAndNoOfTicketsMap) {
    if(!Number.isInteger(accountId))
      return false;
    else if(accountId<=0)
      return false;
    else if(totalRequestTickets==0||totalRequestTickets>25)
      return false;
    else if(!ticketAndNoOfTicketsMap.has("ADULT") || ticketAndNoOfTicketsMap.get("ADULT")==0)
      return false;
    else if(!(ticketAndNoOfTicketsMap.get("INFANT")<=ticketAndNoOfTicketsMap.get("ADULT")))
      return false; 
    else return true;
  }

  #sendPaymentPurchase(accountId, totalPurchaseAmount) {
    new TicketPaymentService(accountId,totalPurchaseAmount); 
  }

  #allocateSeat(type, accountId, ticketAndNoOfTicketsMap) {
    new SeatReservationService().reserveSeat(accountId,ticketAndNoOfTicketsMap.get(type));
  }
}

//Navigate to pairtest folder in command prompt, run using node .TicketServce.js in terminal
//Un comment below, only one purchaseTickets call at a time, 
let x=  new TicketService();

//Infants more than adults, so InvalidPurchaseException arises
//x.purchaseTickets(1,new TicketTypeRequest("ADULT",10), new TicketTypeRequest("INFANT",11), new TicketTypeRequest("CHILD",4));

//Here total tickets> 25 and Infants > Adults, so InvalidPurchaseException arises
//x.purchaseTickets(1,new TicketTypeRequest("ADULT",10), new TicketTypeRequest("INFANT",11), new TicketTypeRequest("CHILD",9));

//Account ID <=0, so InvalidPurchaseException arises
//x.purchaseTickets(0,new TicketTypeRequest("ADULT",10), new TicketTypeRequest("INFANT",11), new TicketTypeRequest("CHILD",9));

//Runs successfully without arising any InvalidPurchaseException
x.purchaseTickets(1,new TicketTypeRequest("ADULT",9), new TicketTypeRequest("INFANT",9), new TicketTypeRequest("CHILD",4));