import { Types } from "mongoose";

export interface IOrderPayment {
  orderId: Types.ObjectId;
  buyerId: Types.ObjectId;
  amount: number;
  gateway: "STRIPE" | "SSL_COMMERZ" | "BKASH" | "COD";
  transactionId: string;
  status: "PENDING" | "SUCCESS" | "FAILED";
  gatewayResponse?: any;
}
