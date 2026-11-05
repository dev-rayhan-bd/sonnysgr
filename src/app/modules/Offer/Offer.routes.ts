import express from "express";
import { auth, authorizeUser } from "../../middleware/auth";
import OfferController from "./Offer.controller";

const OfferRouter = express.Router();

// Retailer: Submit purchase offer on customer locker item with 5% transparent fee deduction
OfferRouter.post(
  "/send-offer",
  auth(["Retailer"]),
  OfferController.sendOffer
);

// Retailer: Retract pending offer prior to seller acceptance
OfferRouter.post(
  "/withdraw-offer/:id",
  auth(["Retailer"]),
  OfferController.withdrawOffer
);

// Multi-round negotiation: Submit counter-offer with transparent 5% fee recalculation
OfferRouter.post(
  "/counter-offer/:id",
  authorizeUser,
  OfferController.counterOffer
);

// Accept deal: Generates 6-digit drop-off verification code and locks locker item
OfferRouter.post(
  "/accept-offer/:id",
  authorizeUser,
  OfferController.acceptOffer
);

// Decline offer
OfferRouter.post(
  "/decline-offer/:id",
  authorizeUser,
  OfferController.declineOffer
);

// In-Store Drop-off: Retailer verifies 6-digit code, credits seller payout, and optionally syncs store inventory
OfferRouter.post(
  "/verify-dropoff",
  auth(["Retailer"]),
  OfferController.verifyDropoffAndSettle
);

// Retailer: View sent offers tabbed by status
OfferRouter.get(
  "/my-sent-offers",
  auth(["Retailer"]),
  OfferController.getMySentOffers
);

// Buyer: View inbound store purchase offers on locker items
OfferRouter.get(
  "/inbound-requests",
  auth(["Buyer"]),
  OfferController.getInboundOffers
);

// Offer Details with 5% fee calculation, price comparison and timeline
OfferRouter.get(
  "/details/:id",
  authorizeUser,
  OfferController.getOfferDetailsById
);

export default OfferRouter;
