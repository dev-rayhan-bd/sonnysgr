import mongoose, { Types } from "mongoose";
import { ConversationModel, MessageModel } from "../Chat.model";
import { IJwtPayload } from "../../../../interface/jwt.interface";
import AppError from "../../../errors/AppError";
import { StatusCodes } from "http-status-codes";
import { TContextType, TConversationType } from "../Chat.interface";
import { getIO } from "../../../utils/socket";

export class ChatConversationSubService {
  /**
   * Start or retrieve an existing conversation thread between 2 parties.
   */
  static async initiateOrGetConversation(
    user: IJwtPayload,
    payload: {
      counterpartyId: string;
      counterpartyRole: "Buyer" | "Retailer" | "Reseller";
      contextType?: TContextType;
      contextId?: string;
    }
  ) {
    const senderId = new Types.ObjectId(user.profileId);
    const counterpartyId = new Types.ObjectId(payload.counterpartyId);

    if (senderId.equals(counterpartyId)) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Cannot initiate conversation with yourself");
    }

    // Determine conversationType and roles
    let conversationType: TConversationType = "GENERAL";
    let buyerId: Types.ObjectId | undefined;
    let retailerId: Types.ObjectId | undefined;
    let resellerId: Types.ObjectId | undefined;

    if (user.role === "Buyer" && payload.counterpartyRole === "Retailer") {
      conversationType = "BUYER_RETAILER";
      buyerId = senderId;
      retailerId = counterpartyId;
    } else if (user.role === "Retailer" && payload.counterpartyRole === "Buyer") {
      conversationType = "BUYER_RETAILER";
      retailerId = senderId;
      buyerId = counterpartyId;
    } else if (user.role === "Reseller" && payload.counterpartyRole === "Retailer") {
      conversationType = "RESELLER_RETAILER";
      resellerId = senderId;
      retailerId = counterpartyId;
    } else if (user.role === "Retailer" && payload.counterpartyRole === "Reseller") {
      conversationType = "RESELLER_RETAILER";
      retailerId = senderId;
      resellerId = counterpartyId;
    }

    // Find existing thread
    let conversation = await ConversationModel.findOne({
      participants: { $all: [senderId, counterpartyId] },
    });

    if (!conversation) {
      conversation = await ConversationModel.create({
        participants: [senderId, counterpartyId],
        buyer: buyerId,
        retailer: retailerId,
        reseller: resellerId,
        conversationType,
        contextType: payload.contextType || "GENERAL",
        contextId: payload.contextId ? new Types.ObjectId(payload.contextId) : undefined,
        status: "Accepted",
        lastMessageAt: new Date(),
      });

      // Notify counterparty in real time
      try {
        const io = getIO();
        io.to(payload.counterpartyId).emit("new_conversation_created", {
          conversationId: conversation._id,
          initiatedBy: user.profileId,
        });
      } catch (e) {
        // Socket emit is non-blocking
      }
    }

    return conversation;
  }

  /**
   * Get all active conversation threads for authenticated user (Native Aggregation, No .populate())
   */
  static async getUserConversations(user: IJwtPayload) {
    const userObjectId = new Types.ObjectId(user.profileId);

    const conversations = await ConversationModel.aggregate([
      {
        $match: {
          participants: userObjectId,
        },
      },
      {
        $sort: { lastMessageAt: -1 },
      },
      // Determine counterparty ID
      {
        $addFields: {
          counterpartyId: {
            $arrayElemAt: [
              {
                $filter: {
                  input: "$participants",
                  as: "p",
                  cond: { $ne: ["$$p", userObjectId] },
                },
              },
              0,
            ],
          },
        },
      },
      // Lookup Retailer info
      {
        $lookup: {
          from: "retailers",
          localField: "counterpartyId",
          foreignField: "_id",
          as: "retailerProfile",
          pipeline: [{ $project: { storeName: 1, name: 1, logo: 1, isApproved: 1, rating: 1 } }],
        },
      },
      // Lookup Buyer info
      {
        $lookup: {
          from: "buyers",
          localField: "counterpartyId",
          foreignField: "_id",
          as: "buyerProfile",
          pipeline: [{ $project: { name: 1, avatar: 1, vipTier: 1 } }],
        },
      },
      // Lookup Reseller info
      {
        $lookup: {
          from: "resellers",
          localField: "counterpartyId",
          foreignField: "_id",
          as: "resellerProfile",
          pipeline: [{ $project: { storeName: 1, name: 1, profileImage: 1, trustScore: 1 } }],
        },
      },
      // Count unread messages for this user in this conversation
      {
        $lookup: {
          from: "messages",
          let: { convId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$conversationId", "$$convId"] },
                    { $eq: ["$receiver", userObjectId] },
                    { $eq: ["$seen", false] },
                  ],
                },
              },
            },
            { $count: "count" },
          ],
          as: "unreadMeta",
        },
      },
      {
        $addFields: {
          unreadCount: {
            $ifNull: [{ $arrayElemAt: ["$unreadMeta.count", 0] }, 0],
          },
          counterparty: {
            $switch: {
              branches: [
                {
                  case: { $gt: [{ $size: "$retailerProfile" }, 0] },
                  then: {
                    type: "Retailer",
                    profile: { $arrayElemAt: ["$retailerProfile", 0] },
                  },
                },
                {
                  case: { $gt: [{ $size: "$buyerProfile" }, 0] },
                  then: {
                    type: "Buyer",
                    profile: { $arrayElemAt: ["$buyerProfile", 0] },
                  },
                },
                {
                  case: { $gt: [{ $size: "$resellerProfile" }, 0] },
                  then: {
                    type: "Reseller",
                    profile: { $arrayElemAt: ["$resellerProfile", 0] },
                  },
                },
              ],
              default: { type: "Unknown", profile: null },
            },
          },
        },
      },
      {
        $project: {
          retailerProfile: 0,
          buyerProfile: 0,
          resellerProfile: 0,
          unreadMeta: 0,
        },
      },
    ]);

    return conversations;
  }
}
