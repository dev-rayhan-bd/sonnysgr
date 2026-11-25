import AggregationBuilder from "../../../builder/AggregationBuilder";
import OrderPaymentModel from "../../OrderPayment/OrderPayment.model";
import { OrderModel } from "../../Order/Order.model";
import BuyerModel from "../../Buyer/Buyer.model";
import RetailerModel from "../../Retailer/Retailer.model";
import PayoutModel from "../../Retailer/Payout.model";
import { SupportTicketModel } from "../../Support/Support.model";
import { RetailerFinancialSubService } from "../../Retailer/subServices/RetailerFinancialSubService";
import { dateRangeMatch, lookupOne } from "../dashboard.shared";

type TQuery = Record<string, unknown>;

const buyerLookup = () => lookupOne(BuyerModel.collection.name, "buyerId", "buyer", { name: 1, image: 1 });
const orderLookup = () =>
  lookupOne(OrderModel.collection.name, "orderId", "order", {
    orderNumber: 1,
    orderStatus: 1,
    paymentStatus: 1,
    totalAmount: 1,
  });

/** Stripe order payments ledger. `gatewayResponse` is never returned. */
const getTransactions = async (query: TQuery) =>
  new AggregationBuilder(OrderPaymentModel, query, dateRangeMatch(query))
    .filter({ status: "string", gateway: "string" })
    .search(["transactionId"])
    .sort()
    .execute([...buyerLookup(), ...orderLookup(), { $project: { gatewayResponse: 0, __v: 0 } }]);

/**
 * Refunds = support tickets that requested a refund and were resolved, or that carry a
 * recorded Stripe refund (refundAmount/refundReference set by the resolve flow).
 */
const getRefunds = async (query: TQuery) =>
  new AggregationBuilder(SupportTicketModel, query, {
    $or: [{ refundAmount: { $gt: 0 } }, { desiredResolution: { $in: ["Full refund", "Partial refund"] } }],
    ...dateRangeMatch(query),
  })
    .filter({ status: "string" })
    .search(["description", "refundReference"])
    .sort()
    .execute([
      ...buyerLookup(),
      ...orderLookup(),
      {
        $project: {
          buyer: 1,
          order: 1,
          category: 1,
          desiredResolution: 1,
          status: 1,
          refundAmount: 1,
          refundReference: 1,
          refundedAt: 1,
          adminResolutionDetails: 1,
          resolvedAt: 1,
          createdAt: 1,
        },
      },
    ]);

/** All retailer payout requests across the platform. */
const getPayouts = async (query: TQuery) =>
  new AggregationBuilder(PayoutModel, query, dateRangeMatch(query, "requestedAt"))
    .filter({ status: "string", payoutMethod: "string", retailerId: "objectId" })
    .search(["transactionReference", "adminNote"])
    .sort("-requestedAt")
    .execute(lookupOne(RetailerModel.collection.name, "retailerId", "retailer", { name: 1, email: 1, image: 1 }));

/** Approve / complete / reject a payout (same engine as PATCH /retailer/admin-process-payout/:id). */
const processPayout = async (
  payoutId: string,
  payload: { status: "COMPLETED" | "REJECTED" | "PROCESSING"; transactionReference?: string; adminNote?: string },
) => RetailerFinancialSubService.adminProcessPayout(payoutId, payload);

const AdminFinanceService = { getTransactions, getRefunds, getPayouts, processPayout };

export default AdminFinanceService;
