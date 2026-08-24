import { Types } from "mongoose";
import ApiError from "../../../../error/ApiError";
import ReportModel from "../../Report/Report.model";
import RetailerModel from "../../Retailer/Retailer.model";
import { OrderModel } from "../../Order/Order.model";
import { IReport } from "../../Report/Report.interface";

const createReportService = async (
  buyerId: string,
  files: Express.Multer.File[],
  payload: Partial<IReport>
) => {
  const { retailerId, orderId, title, content, contactMethod, isUrgent } = payload;

  if (!retailerId) {
    throw new ApiError(400, "Retailer ID is required.");
  }

  // Validate Retailer ID structure
  if (!Types.ObjectId.isValid(retailerId.toString())) {
    throw new ApiError(400, "Invalid Retailer ID format.");
  }

  // Check if retailer exists in database
  const retailer = await RetailerModel.findById(retailerId).lean();
  if (!retailer) {
    throw new ApiError(404, "Retailer not found.");
  }

  // Check order ID if provided
  if (orderId) {
    if (!Types.ObjectId.isValid(orderId.toString())) {
      throw new ApiError(400, "Invalid Order ID format.");
    }
    const order = (await OrderModel.findById(orderId).lean()) as any;
    if (!order) {
      throw new ApiError(404, "Order not found.");
    }
    // Verify that the order belongs to the buyer
    if (order.buyerId.toString() !== buyerId) {
      throw new ApiError(403, "You can only report issues for your own orders.");
    }
  }

  // Handle uploaded files/images if any
  let imageUrls: string[] = [];
  if (files && files.length > 0) {
    imageUrls = files.map((file) => {
      return `uploads/report-image/${file.filename}`;
    });
  }

  // Create the report
  const report = await ReportModel.create({
    buyerId: new Types.ObjectId(buyerId),
    retailerId: new Types.ObjectId(retailerId.toString()),
    orderId: orderId ? new Types.ObjectId(orderId.toString()) : null,
    title,
    content,
    images: imageUrls,
    contactMethod: contactMethod || "In-App",
    isUrgent: !!isUrgent,
    isSolved: false,
    resolution: "",
  });

  if (!report) {
    throw new ApiError(500, "Failed to submit report.");
  }

  return report;
};

export const ReportToStoreServices = {
  createReportService,
};

export default ReportToStoreServices;
