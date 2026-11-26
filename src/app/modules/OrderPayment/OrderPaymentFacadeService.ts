import Stripe from "stripe";
import { IBuyNowPayload, IHoldDepositPayload, IPlaceOrderPayload } from "./OrderPayment.interface";
import { OrderPaymentCheckoutSubService } from "./subServices/OrderPaymentCheckoutSubService";
import { PaymentWebhookSubService } from "./subServices/PaymentWebhookSubService";
import { PaymentQuerySubService } from "./subServices/PaymentQuerySubService";
import { PaymentReconciliationSubService } from "./subServices/PaymentReconciliationSubService";
import { PaymentRefundSubService } from "./subServices/PaymentRefundSubService";
import { PaymentSettlementSubService } from "./subServices/PaymentSettlementSubService";
import { StripeCheckoutSubService } from "./subServices/StripeCheckoutSubService";

/**
 * Order Payment Facade: buyer checkouts (cart, buy now, hold deposit), Stripe webhooks,
 * refunds, reconciliation and payment queries.
 */
export class OrderPaymentFacadeService {
  // --- Checkout (each returns a Stripe paymentLink) ---
  static async placeOrder(buyerId: string, payload: IPlaceOrderPayload) {
    return await OrderPaymentCheckoutSubService.placeOrder(buyerId, payload);
  }

  static async buyNow(buyerId: string, payload: IBuyNowPayload) {
    return await OrderPaymentCheckoutSubService.buyNow(buyerId, payload);
  }

  static async holdDeposit(buyerId: string, payload: IHoldDepositPayload) {
    return await OrderPaymentCheckoutSubService.holdDeposit(buyerId, payload);
  }

  // --- Stripe webhook ---
  static async handleWebhookEvent(event: Stripe.Event) {
    return await PaymentWebhookSubService.handleEvent(event);
  }

  // --- Queries ---
  static async getPaymentStatus(buyerId: string, orderId: string) {
    return await PaymentQuerySubService.getPaymentStatus(buyerId, orderId);
  }

  static async getMyPayments(buyerId: string, query: Record<string, unknown>) {
    return await PaymentQuerySubService.getMyPayments(buyerId, query);
  }

  // --- Used by Order / Support flows ---
  static queueRefund = PaymentRefundSubService.queueRefund.bind(PaymentRefundSubService);
  static processPaymentRefunds = PaymentRefundSubService.processPaymentRefunds.bind(PaymentRefundSubService);
  static cancelUnpaidOrderInTx = PaymentSettlementSubService.cancelUnpaidOrderInTx.bind(PaymentSettlementSubService);
  static expireCheckoutSession = StripeCheckoutSubService.expireSession.bind(StripeCheckoutSubService);

  // --- Cron ---
  static async reconcileStaleCheckouts() {
    return await PaymentReconciliationSubService.reconcileStaleCheckouts();
  }

  static async retryPendingRefunds() {
    return await PaymentReconciliationSubService.retryPendingRefunds();
  }
}

export default OrderPaymentFacadeService;
