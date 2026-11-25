import { PipelineStage } from "mongoose";
import { z } from "zod";

/** Roles allowed on every admin-panel route. */
export const ADMIN_ROLES = ["Admin", "Super_Admin"];

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

/** `{ params: { <name>: ObjectId } }` validator for `/:id`-style routes. */
export const idParamSchema = (name = "id") => z.object({ params: z.object({ [name]: objectId }) });

/** Optional `from` / `to` (ISO date) query params shared by list and analytics endpoints. */
export const dateRangeQuery = {
  from: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
  to: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
};

/** Build a `{ createdAt: { $gte, $lte } }` match from `from` / `to` query params. */
export const dateRangeMatch = (query: Record<string, unknown>, field = "createdAt") => {
  const range: Record<string, Date> = {};
  if (query.from) range.$gte = new Date(String(query.from));
  if (query.to) {
    const to = new Date(String(query.to));
    // A bare date (YYYY-MM-DD) means "through the end of that day"
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(query.to))) to.setUTCHours(23, 59, 59, 999);
    range.$lte = to;
  }
  return Object.keys(range).length ? { [field]: range } : {};
};

/**
 * `$lookup` + `$unwind` of a single related document with a whitelisted projection.
 * Uses localField/foreignField so the join is index-backed.
 */
export const lookupOne = (
  from: string,
  localField: string,
  as: string,
  project: Record<string, 0 | 1>,
  foreignField = "_id",
): PipelineStage.FacetPipelineStage[] => [
  { $lookup: { from, localField, foreignField, as, pipeline: [{ $project: project }] } },
  { $unwind: { path: `$${as}`, preserveNullAndEmptyArrays: true } },
];

/** Positive integer `limit` for top-N analytics (default 10, max 50). */
export const topLimit = (query: Record<string, unknown>) =>
  Math.min(Math.max(Number(query.limit) || 10, 1), 50);

/** Order-item statuses that count as a realised sale (revenue, units sold, rankings). */
export const SOLD_ITEM_STATUSES = ["Completed", "Delivered"];

/** Orders that count toward GMV: fully paid and not cancelled/rejected. */
export const GMV_ORDER_MATCH = {
  paymentStatus: "Paid",
  orderStatus: { $nin: ["Cancelled", "Rejected"] },
};

/** Support tickets still awaiting an admin decision. */
export const OPEN_TICKET_STATUSES = ["Open", "In Progress", "Escalated"];

/** A dispute is a "Refund/Dispute" support ticket, or any ticket an admin escalated (Module 22.2). */
export const DISPUTE_MATCH = { $or: [{ category: "Refund/Dispute" }, { isEscalated: true }] };

/** Report titles (see Buyer/reportToStore validation) that are surfaced as fraud alerts. */
export const FRAUD_REPORT_TITLES = ["Fraud or Scam", "Fake or Counterfeit Product"];
