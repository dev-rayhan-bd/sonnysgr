import { model, Schema, models } from "mongoose";
import { IReport } from "./Report.interface";

const ReportSchema = new Schema<IReport>({
    buyerId: { type: Schema.Types.ObjectId, required: true, ref: "Buyer" },
    retailerId: { type: Schema.Types.ObjectId, required: true, ref: "Retailer" },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", default: null },
    title: { type: String, required: true },
    content: { type: String , required: true},
    resolution: { type: String , default: ''},
    images: [{ type: String, default: "" }],
    contactMethod: { type: String, default: "Email" },
    isUrgent: { type: Boolean, default: false },
    isSolved: { type: Boolean, default: false },
    
}, { timestamps: true });

const ReportModel = models.Report || model<IReport>("Report", ReportSchema);

export default ReportModel;