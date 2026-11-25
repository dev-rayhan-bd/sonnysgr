import mongoose from "mongoose";
import ApiError from "../../../../error/ApiError";
import AggregationBuilder from "../../../builder/AggregationBuilder";
import { ReviewModel, ReviewReplyModel } from "../../ReviewManagement/ReviewManagement.model";
import BuyerModel from "../../Buyer/Buyer.model";
import RetailerModel from "../../Retailer/Retailer.model";
import ResellerModel from "../../Reseller/Reseller.model";
import DropModel from "../../Drop/Drop.model";
import NotificationHelper from "../../../../helper/notification";
import { ENUM_NOTIFICATION_TYPE } from "../../../../utilities/enum";
import { dateRangeMatch, lookupOne } from "../dashboard.shared";

type TQuery = Record<string, unknown>;

/** Resolve a polymorphic ref (Buyer|Retailer|Reseller) into one `as` field. */
const polymorphicLookup = (localField: string, as: string, sources: { from: string; key: string }[]) => [
  ...sources.flatMap((s) => lookupOne(s.from, localField, `${as}_${s.key}`, { name: 1, image: 1 })),
  { $addFields: { [as]: { $ifNull: sources.map((s) => `$${as}_${s.key}`) as any } } },
  { $unset: sources.map((s) => `${as}_${s.key}`) },
];

// ---------------------------------------------------------------- reviews

const getReviews = async (query: TQuery) =>
  new AggregationBuilder(ReviewModel, query, dateRangeMatch(query))
    .filter({ reviewType: "string", reviewedId: "objectId", rating: "number", isVerifiedBuyer: "boolean" })
    .search(["content"])
    .sort()
    .execute([
      ...polymorphicLookup("reviewerId", "reviewer", [
        { from: BuyerModel.collection.name, key: "buyer" },
        { from: RetailerModel.collection.name, key: "retailer" },
      ]),
      ...polymorphicLookup("reviewedId", "reviewed", [
        { from: RetailerModel.collection.name, key: "retailer" },
        { from: ResellerModel.collection.name, key: "reseller" },
      ]),
      ...lookupOne(ReviewReplyModel.collection.name, "reply", "reply", { content: 1, createdAt: 1 }),
    ]);

/** Remove an abusive review (and its reply) and refresh the store's average rating. */
const deleteReview = async (id: string) => {
  const review = await ReviewModel.findById(id).lean<{ _id: mongoose.Types.ObjectId; reviewType: string; reviewedId: mongoose.Types.ObjectId; reviewerId: mongoose.Types.ObjectId }>();
  if (!review) throw new ApiError(404, "Review not found");

  await Promise.all([ReviewReplyModel.deleteOne({ reviewId: review._id }), ReviewModel.deleteOne({ _id: review._id })]);

  if (review.reviewType === "BuyerToRetailer") {
    const [stats] = await ReviewModel.aggregate([
      { $match: { reviewedId: review.reviewedId, reviewType: "BuyerToRetailer" } },
      { $group: { _id: null, avg: { $avg: "$rating" } } },
    ]);
    await Promise.all([
      RetailerModel.updateOne(
        { _id: review.reviewedId },
        { $set: { averageRating: stats ? parseFloat(stats.avg.toFixed(1)) : 0 } },
      ),
      BuyerModel.updateOne({ _id: review.reviewerId, myReviews: { $gt: 0 } }, { $inc: { myReviews: -1 } }),
    ]);
  }
  return null;
};

// ---------------------------------------------------------------- drops

const getDrops = async (query: TQuery) =>
  new AggregationBuilder(DropModel, query, dateRangeMatch(query))
    // Drops created before moderation existed have no approvalStatus → treat as Pending
    .addStages({ $addFields: { approvalStatus: { $ifNull: ["$approvalStatus", "Pending"] } } })
    .filter({ approvalStatus: "string", retailerId: "objectId", category: "string", brand: "string" })
    .search(["name", "brand", "category"])
    .sort()
    .execute(lookupOne(RetailerModel.collection.name, "retailerId", "store", { name: 1, image: 1, email: 1 }));

const reviewDrop = async (id: string, payload: { action: "Approve" | "Reject"; reason?: string }) => {
  const approvalStatus = payload.action === "Approve" ? "Approved" : "Rejected";
  const drop = await DropModel.findByIdAndUpdate(
    id,
    { $set: { approvalStatus, rejectionReason: payload.action === "Reject" ? payload.reason || "" : "" } },
    { new: true, runValidators: true },
  ).lean<{ _id: mongoose.Types.ObjectId; retailerId: mongoose.Types.ObjectId; name: string }>();
  if (!drop) throw new ApiError(404, "Drop not found");

  await NotificationHelper.createNotification({
    toId: String(drop.retailerId),
    toModel: "Retailer",
    title: `Your drop "${drop.name}" was ${approvalStatus.toLowerCase()}`,
    description: payload.action === "Reject" ? payload.reason : "Your drop has been approved by GoSNKR.",
    type: ENUM_NOTIFICATION_TYPE.DROP_REVIEW_UPDATE,
    referenceId: String(drop._id),
    referenceModel: "Drop",
  });

  return drop;
};

const AdminContentModerationService = { getReviews, deleteReview, getDrops, reviewDrop };

export default AdminContentModerationService;
