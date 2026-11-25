import mongoose from "mongoose";
import ApiError from "../../../../error/ApiError";
import AggregationBuilder from "../../../builder/AggregationBuilder";
import { SupportAuditLogModel, SupportTicketModel } from "../../Support/Support.model";
import SupportServices from "../../Support/Support.service";
import BuyerModel from "../../Buyer/Buyer.model";
import RetailerModel from "../../Retailer/Retailer.model";
import { OrderItemModel, OrderModel } from "../../Order/Order.model";
import { DISPUTE_MATCH, dateRangeMatch, lookupOne } from "../dashboard.shared";

type TQuery = Record<string, unknown>;

const buyerLookup = () =>
  lookupOne(BuyerModel.collection.name, "buyerId", "buyer", { name: 1, image: 1, phone: 1, email: 1 });

const getDisputes = async (query: TQuery) =>
  new AggregationBuilder(SupportTicketModel, query, { ...DISPUTE_MATCH, ...dateRangeMatch(query) })
    .filter({ status: "string", category: "string", isTimeSensitive: "boolean", isEscalated: "boolean" })
    .search(["description", "adminResolutionDetails", "escalationNote"])
    .sort()
    .execute([
      ...buyerLookup(),
      ...lookupOne(OrderModel.collection.name, "orderId", "order", {
        orderNumber: 1,
        orderStatus: 1,
        totalAmount: 1,
      }),
    ]);

/** Full dispute file: ticket, buyer, order + items (with store), and the admin audit trail. */
const getDisputeDetails = async (id: string) => {
  const [ticket] = await SupportTicketModel.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(id) } },
    ...buyerLookup(),
    ...lookupOne(OrderModel.collection.name, "orderId", "order", {
      orderNumber: 1,
      orderStatus: 1,
      paymentStatus: 1,
      orderType: 1,
      totalAmount: 1,
      pickupTime: 1,
      createdAt: 1,
    }),
    {
      $lookup: {
        from: OrderItemModel.collection.name,
        localField: "orderId",
        foreignField: "orderId",
        as: "orderItems",
        pipeline: [
          ...lookupOne(RetailerModel.collection.name, "retailerId", "store", { name: 1, phone: 1, address: 1 }),
          { $project: { productSnapshot: 1, selectedSize: 1, quantity: 1, totalPrice: 1, status: 1, store: 1 } },
        ],
      },
    },
    {
      $lookup: {
        from: SupportAuditLogModel.collection.name,
        localField: "_id",
        foreignField: "ticketId",
        as: "auditLog",
        pipeline: [{ $sort: { createdAt: 1 } }, { $project: { ticketId: 0, __v: 0 } }],
      },
    },
  ]);

  if (!ticket) throw new ApiError(404, "Dispute not found");
  return ticket;
};

const resolveDispute = async (id: string, adminId: string, payload: unknown) =>
  SupportServices.resolveTicket(id, adminId, payload);

/** Escalate a ticket for senior review; it then appears in the disputes queue. */
const escalateDispute = async (id: string, adminId: string, note: string) => {
  const session = await mongoose.startSession();
  try {
    let updated: unknown;
    await session.withTransaction(async () => {
      const ticket = await SupportTicketModel.findById(id).session(session);
      if (!ticket) throw new ApiError(404, "Dispute not found");
      if (["Resolved", "Rejected"].includes(ticket.status)) {
        throw new ApiError(400, "A closed dispute cannot be escalated");
      }
      if (ticket.status === "Escalated") throw new ApiError(409, "Dispute is already escalated");

      const previousStatus = ticket.status;
      ticket.status = "Escalated";
      ticket.isEscalated = true;
      ticket.escalatedAt = new Date();
      ticket.escalationNote = note;
      await ticket.save({ session });

      await SupportAuditLogModel.create(
        [
          {
            ticketId: ticket._id,
            adminId,
            action: "ESCALATE_TICKET",
            previousStatus,
            newStatus: "Escalated",
            resolutionDetails: note,
          },
        ],
        { session },
      );
      updated = ticket;
    });
    return updated;
  } finally {
    await session.endSession();
  }
};

const AdminDisputeService = { getDisputes, getDisputeDetails, resolveDispute, escalateDispute };

export default AdminDisputeService;
