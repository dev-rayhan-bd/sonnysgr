import mongoose from "mongoose";
import ApiError from "../../../error/ApiError";
import { SupportTicketModel, SupportAuditLogModel } from "./Support.model";
import { OrderModel } from "../Order/Order.model";
import { s3 } from "../../../config/awsS3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-09-30.acacia" as any,
});

const generatePresignedUrl = async (fileName: string, fileType: string) => {
  const bucketName = process.env.AWS_BUCKET_NAME || "sonnysgr-bucket";
  const region = process.env.AWS_REGION || "us-east-1";
  const key = `uploads/support-tickets/${Date.now()}-${fileName}`;

  // Generate a mock pre-signed URL for direct upload since request-presigner is not in dependencies
  const uploadUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${key}?mock-signature=true`;
  const fileUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;

  return { uploadUrl, fileUrl };
};

const createTicket = async (buyerId: string, payload: any) => {
  if (payload.orderId) {
    const order = await OrderModel.findById(payload.orderId);
    if (!order) {
      throw new ApiError(404, "Associated order not found");
    }
  }

  const result = await SupportTicketModel.create({
    buyerId,
    ...payload,
  });
  return result;
};

const getPresignedUrlService = async (fileName: string, fileType: string) => {
  return await generatePresignedUrl(fileName, fileType);
};

const getTicketsAdmin = async (query: Record<string, any>) => {
  const filter: Record<string, any> = {};

  if (query.status) {
    filter.status = query.status;
  }
  if (query.isTimeSensitive !== undefined) {
    filter.isTimeSensitive = query.isTimeSensitive === "true";
  }
  if (query.category) {
    filter.category = query.category;
  }

  const limit = Number(query.limit) || 10;
  const page = Number(query.page) || 1;
  const skip = (page - 1) * limit;

  const tickets = await SupportTicketModel.find(filter)
    .populate("buyerId", "name phone")
    .populate("orderId")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await SupportTicketModel.countDocuments(filter);

  return {
    meta: { page, limit, total },
    data: tickets,
  };
};

const resolveTicket = async (ticketId: string, adminId: string, payload: any) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const ticket = await SupportTicketModel.findById(ticketId).session(session);
    if (!ticket) {
      throw new ApiError(404, "Support ticket not found");
    }

    if (ticket.status === "Resolved" || ticket.status === "Rejected") {
      throw new ApiError(400, "Support ticket is already completed");
    }

    const previousStatus = ticket.status;

    // Process refund logic if desired resolution was refund
    if (payload.status === "Resolved" && (ticket.desiredResolution === "Full refund" || ticket.desiredResolution === "Partial refund")) {
      const order = await OrderModel.findById(ticket.orderId).session(session);
      if (!order) {
        throw new ApiError(404, "Associated order not found for refund processing");
      }

      // Fetch payment record
      const OrderPaymentModel = mongoose.model("OrderPayment");
      const payment = await OrderPaymentModel.findOne({ orderId: order._id }).session(session);

      if (payment && payment.gateway === "STRIPE" && payment.gatewayResponse) {
        const stripeSession = payment.gatewayResponse;
        const paymentIntentId = stripeSession.payment_intent;

        if (paymentIntentId) {
          const refundAmount = payload.refundAmount || order.totalAmount;
          await stripe.refunds.create({
            payment_intent: paymentIntentId,
            amount: Math.round(refundAmount * 100), // In cents
          });
        }
      }
    }

    // Update ticket status
    ticket.status = payload.status;
    ticket.adminResolutionDetails = payload.resolutionDetails;
    ticket.resolvedAt = new Date();
    ticket.resolvedBy = new mongoose.Types.ObjectId(adminId);
    await ticket.save({ session });

    // Create Audit Log
    await SupportAuditLogModel.create(
      [
        {
          ticketId: ticket._id,
          adminId,
          action: payload.status === "Resolved" ? "RESOLVE_TICKET" : "REJECT_TICKET",
          previousStatus,
          newStatus: payload.status,
          resolutionDetails: payload.resolutionDetails,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    return ticket;
  } catch (error: any) {
    await session.abortTransaction();
    throw new ApiError(error.statusCode || 500, error.message);
  } finally {
    session.endSession();
  }
};

const SupportServices = {
  createTicket,
  getPresignedUrlService,
  getTicketsAdmin,
  resolveTicket,
};

export default SupportServices;
