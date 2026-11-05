import { z } from "zod";

const initiateChatZodSchema = z.object({
  body: z.object({
    counterpartyId: z.string().min(24, "Valid 24-character Counterparty ID is required"),
    counterpartyRole: z.enum(["Buyer", "Retailer", "Reseller"], {
      message: "Counterparty role must be Buyer, Retailer, or Reseller",
    }),
    contextType: z
      .enum(["PRODUCT", "ORDER", "OFFER", "STORE_INQUIRY", "GENERAL"])
      .optional(),
    contextId: z.string().min(24).optional(),
  }),
});

const sendMessageZodSchema = z.object({
  body: z.object({
    conversationId: z.string().min(24, "Valid Conversation ID is required"),
    text: z.string().optional(),
    attachments: z.array(z.string()).optional(),
    messageType: z
      .enum(["TEXT", "IMAGE", "OFFER_CARD", "PRODUCT_CARD", "ORDER_STATUS", "SYSTEM"])
      .optional(),
    offerPayload: z
      .object({
        offerId: z.string().min(24),
        amount: z.number().positive(),
        counterAmount: z.number().positive().optional(),
        status: z.enum([
          "Pending",
          "Countered",
          "Accepted",
          "Declined",
          "Expired",
          "Completed",
        ]),
        expiresAt: z.string().or(z.date()).optional(),
        itemTitle: z.string().optional(),
        itemImage: z.string().optional(),
        size: z.string().optional(),
      })
      .optional(),
    productPayload: z
      .object({
        productId: z.string().min(24),
        name: z.string().min(1),
        brand: z.string().optional(),
        image: z.string().optional(),
        price: z.number().nonnegative(),
        size: z.string().optional(),
        sku: z.string().optional(),
      })
      .optional(),
    orderPayload: z
      .object({
        orderId: z.string().min(24),
        orderNumber: z.string().min(1),
        orderType: z.string(),
        orderStatus: z.string(),
        totalAmount: z.number().nonnegative(),
      })
      .optional(),
  }),
});

const getMessagesQueryZodSchema = z.object({
  params: z.object({
    conversationId: z.string().min(24, "Valid 24-character Conversation ID is required"),
  }),
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

const ChatValidations = {
  initiateChatZodSchema,
  sendMessageZodSchema,
  getMessagesQueryZodSchema,
};

export default ChatValidations;
