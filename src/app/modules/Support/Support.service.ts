import mongoose from "mongoose";
import ApiError from "../../../error/ApiError";
import { SupportTicketModel, SupportAuditLogModel } from "./Support.model";
import { OrderModel } from "../Order/Order.model";
import { s3 } from "../../../config/awsS3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import OrderPaymentFacadeService from "../OrderPayment/OrderPaymentFacadeService";
import { REFUND_REASON } from "../OrderPayment/OrderPayment.constant";
import { notifyAdmins } from "../Dashboard/notifications/adminNotification.service";

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

  await notifyAdmins({
    title: `New support ticket: ${result.category}`,
    description: String(result.description).slice(0, 200),
    type: result.category === "Refund/Dispute" ? "NEW_DISPUTE" : "NEW_SUPPORT_TICKET",
    referenceId: result._id,
    referenceModel: "SupportTicket",
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
  let refundPaymentId: mongoose.Types.ObjectId | undefined;

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

      // Queue the refund in this transaction (outbox); Stripe is called after commit.
      // refundKey per ticket: resolving the same ticket twice can never refund twice.
      const queued = await OrderPaymentFacadeService.queueRefund({
        orderId: order._id,
        amount: payload.refundAmount || undefined,
        reason: REFUND_REASON.DISPUTE_RESOLUTION,
        refundKey: `dispute:${ticket._id}`,
        session,
      });

      if (queued) {
        refundPaymentId = queued.paymentId;
        // Recorded on the ticket so the admin refunds ledger can list it
        ticket.refundAmount = queued.amount;
        ticket.refundReference = queued.refundKey;
        ticket.refundedAt = new Date();
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

    if (refundPaymentId) {
      await OrderPaymentFacadeService.processPaymentRefunds(refundPaymentId).catch((err) =>
        console.error("[REFUND] dispute refund will retry via cron:", err)
      );
    }
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
