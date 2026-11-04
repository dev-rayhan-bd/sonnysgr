import { Types } from "mongoose";

export type ENUM_PAYOUT_STATUS = "PENDING" | "PROCESSING" | "COMPLETED" | "REJECTED";
export type ENUM_PAYOUT_METHOD = "Bank" | "Stripe" | "StoreCash";

export interface IPayoutAccountDetails {
  accountHolderName?: string;
  bankName?: string;
  accountNumberMasked?: string;
  routingNumber?: string;
  stripeAccountId?: string;
}

export interface IPayout {
  _id?: Types.ObjectId;
  retailerId: Types.ObjectId;
  amount: number;
  currency: string;
  payoutMethod: ENUM_PAYOUT_METHOD;
  accountDetails: IPayoutAccountDetails;
  status: ENUM_PAYOUT_STATUS;
  transactionReference?: string;
  adminNote?: string;
  requestedAt: Date;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

