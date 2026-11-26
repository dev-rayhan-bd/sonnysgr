import { z } from "zod";
import {
  ENUM_PROMOTION_RECEIVER_TYPE,
  ENUM_PROMOTION_SEND_METHOD,
  ENUM_PROMOTION_TYPE,
} from "../../../utilities/enum";

const futureDate = z.coerce
  .date({ error: "scheduledAt must be a valid date." })
  .refine((d) => d.getTime() > Date.now(), "scheduledAt must be in the future.");

const createNewPromotionValidation = z.object({
  body: z.object({
    title: z.string().min(1, "Title is required"),
    content: z.string().min(1, "Content is required"),
    type: z.nativeEnum(ENUM_PROMOTION_TYPE),
    recepient: z.nativeEnum(ENUM_PROMOTION_RECEIVER_TYPE),
    sendMethod: z.nativeEnum(ENUM_PROMOTION_SEND_METHOD),
    duration: z.coerce.number().min(1, "Minimum 1 hour required."),
    scheduledAt: futureDate.optional(),
    // type: z.enum(Object.values(ENUM_PROMOTION_TYPE) as [string, ...string[]]),
    // recepient: z.enum(Object.values(ENUM_PROMOTION_RECEIVER_TYPE) as [string, ...string[]]),
    // sendMethod: z.enum(Object.values(ENUM_PROMOTION_SEND_METHOD) as [string, ...string[]]),
  }).refine(
    (b) => b.sendMethod !== ENUM_PROMOTION_SEND_METHOD.SCHEDULED || !!b.scheduledAt,
    { message: "scheduledAt is required for a scheduled promotion.", path: ["scheduledAt"] }
  ),
});

// Content fields only. Other fields (status, isActive, sendMethod…) are ignored by the service whitelist.
const editPromotionValidation = z.object({
  params: z.object({ id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid promotion id.") }),
  body: z
    .object({
      title: z.string().trim().min(1, "Title cannot be empty").optional(),
      content: z.string().trim().min(1, "Content cannot be empty").optional(),
      type: z.nativeEnum(ENUM_PROMOTION_TYPE).optional(),
      recepient: z.nativeEnum(ENUM_PROMOTION_RECEIVER_TYPE).optional(),
      duration: z.coerce.number().min(1, "Minimum 1 hour required.").optional(),
      scheduledAt: futureDate.optional(),
    }),
});

const validateLatLongSchema = z.object({
  query: z.object({
    latitude: z.coerce.number().refine((value) => value >= -90 && value <= 90, {
      message: "Latitude must be between -90 and 90",
    }),
    // .optional(),

    longitude: z.coerce.number().refine((value) => value >= -180 && value <= 180, {
      message: "Longitude must be between -180 and 180",
    }),
  }),
});

const PromotionValidations = {
  createNewPromotionValidation,
  editPromotionValidation,
  validateLatLongSchema,
};

export default PromotionValidations;
