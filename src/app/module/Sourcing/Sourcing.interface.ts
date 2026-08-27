import { Types } from "mongoose";

export interface ITrustedReseller {
  retailerId: Types.ObjectId;
  resellerId: Types.ObjectId;
  status: "active" | "inactive";
  createdAt?: Date;
  updatedAt?: Date;
}
