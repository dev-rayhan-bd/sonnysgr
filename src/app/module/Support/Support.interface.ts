import { Types } from "mongoose";

export interface ISupportTicket {
  buyerId: Types.ObjectId;
  category: "Order Issue" | "Refund/Dispute" | "Hold Problem" | "Pickup Issue" | "Something else";
  orderId?: Types.ObjectId;
  description: string;
  attachments: string[];
  desiredResolution: "Full refund" | "Partial refund" | "Store credit" | "Just want it resolved";
  isTimeSensitive: boolean;
  status: "Open" | "In Progress" | "Resolved" | "Rejected";
  adminResolutionDetails?: string;
  resolvedAt?: Date;
  resolvedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISupportAuditLog {
  ticketId: Types.ObjectId;
  adminId: Types.ObjectId;
  action: string;
  previousStatus: string;
  newStatus: string;
  resolutionDetails?: string;
  createdAt: Date;
}
