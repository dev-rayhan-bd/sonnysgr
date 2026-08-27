import { Types } from "mongoose";

export interface IOrderPayment {
  orderId: Types.ObjectId;
  buyerId: Types.ObjectId;
  amount: number;
  gateway: "STRIPE"
  transactionId: string;
  status: "PENDING" | "SUCCESS" | "FAILED";
  gatewayResponse?: any;
}


