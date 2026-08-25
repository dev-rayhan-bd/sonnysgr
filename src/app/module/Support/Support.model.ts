import { model, Schema, models } from "mongoose";
import { ISupportTicket, ISupportAuditLog } from "./Support.interface";

const SupportTicketSchema = new Schema<ISupportTicket>(
  {
    buyerId: { type: Schema.Types.ObjectId, ref: "Buyer", required: true },
    category: {
      type: String,
      enum: ["Order Issue", "Refund/Dispute", "Hold Problem", "Pickup Issue", "Something else"],
      required: true,
    },
    orderId: { type: Schema.Types.ObjectId, ref: "Order" },
    description: { type: String, required: true, maxlength: 1000 },
    attachments: [{ type: String }],
    desiredResolution: {
      type: String,
      enum: ["Full refund", "Partial refund", "Store credit", "Just want it resolved"],
      required: true,
    },
    isTimeSensitive: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["Open", "In Progress", "Resolved", "Rejected"],
      default: "Open",
    },
    adminResolutionDetails: { type: String },
    resolvedAt: { type: Date },
    resolvedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

const SupportAuditLogSchema = new Schema<ISupportAuditLog>(
  {
    ticketId: { type: Schema.Types.ObjectId, ref: "SupportTicket", required: true },
    adminId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true },
    previousStatus: { type: String, required: true },
    newStatus: { type: String, required: true },
    resolutionDetails: { type: String },
  },
  { timestamps: true }
);

export const SupportTicketModel = models.SupportTicket || model<ISupportTicket>("SupportTicket", SupportTicketSchema);
export const SupportAuditLogModel = models.SupportAuditLog || model<ISupportAuditLog>("SupportAuditLog", SupportAuditLogSchema);
