import { resolveClientEndpointParameters } from "@aws-sdk/client-s3/dist-types/endpoint/EndpointParameters";
import { z } from "zod";
import {
  ENUM_PROMOTION_RECEIVER_TYPE,
  ENUM_PROMOTION_SEND_METHOD,
  ENUM_PROMOTION_TYPE,
} from "../../../utilities/enum";

const createNewPromotionValidation = z.object({
  body: z.object({
    title: z.string().min(1, "Title is required"),
    content: z.string().min(1, "Content is required"),
    type: z.nativeEnum(ENUM_PROMOTION_TYPE),
    recepient: z.nativeEnum(ENUM_PROMOTION_RECEIVER_TYPE),
    sendMethod: z.nativeEnum(ENUM_PROMOTION_SEND_METHOD),
    duration: z.coerce.number().min(1, "Minimum 1 hour required."),
    // type: z.enum(Object.values(ENUM_PROMOTION_TYPE) as [string, ...string[]]),
    // recepient: z.enum(Object.values(ENUM_PROMOTION_RECEIVER_TYPE) as [string, ...string[]]),
    // sendMethod: z.enum(Object.values(ENUM_PROMOTION_SEND_METHOD) as [string, ...string[]]),
  }),
});

const validateLatLongSchema = z.object({
  query: z.object({
    latitude: z.number().refine((value) => value >= -90 && value <= 90, {
      message: "Latitude must be between -90 and 90",
    }),
    // .optional(),

    longitude: z.number().refine((value) => value >= -180 && value <= 180, {
      message: "Longitude must be between -180 and 180",
    }),
  }),
});

const PromotionValidations = {
  createNewPromotionValidation,
  validateLatLongSchema,
};

export default PromotionValidations;
