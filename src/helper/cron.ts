import cron from "node-cron";
import { handleActivePromotion, handleExpiredPromotion } from "../app/modules/Promotion/Promotion.service";
import OrderFacadeService from "../app/modules/Order/OrderFacadeService";
import OfferFacadeService from "../app/modules/Offer/OfferFacadeService";
import { SourcingFacadeService } from "../app/modules/Sourcing/SourcingFacadeService";
import OrderPaymentFacadeService from "../app/modules/OrderPayment/OrderPaymentFacadeService";

// -------------------------------
// SAFE WRAPPER
// -------------------------------
const safeRun = async (label: string, cronServiceFunction: () => Promise<unknown>) => {
  try {
    console.log(`[CRON] Starting: ${label}`);
    await cronServiceFunction();
    console.log(`[CRON] Completed: ${label}`);
  } catch (err) {
    console.error(`[CRON ERROR] in "${label}":`, err);
  }
};

/**
 * Autonomous Background Schedulers (Phase 11 - Modules 9.5, 14, 17.5, 20.5, 21.4)
 */
export const runCronJobEverydatAtNight = () => {
  // 1. Every 10 minutes starting at minute 0: Active Promotions
  cron.schedule("0-59/10 * * * *", async () => {
    await safeRun("Active Promotion Job", handleActivePromotion);
  });

  // 2. Every 10 minutes starting at minute 5: Expired Promotions
  cron.schedule("5-59/10 * * * *", async () => {
    await safeRun("Expired Promotion Job", handleExpiredPromotion);
  });

  // 3. Every 5 minutes: Release Expired Hold Reservations & Return Stock (Module 9.5)
  cron.schedule("*/5 * * * *", async () => {
    await safeRun("Release Expired Holds Job", async () => {
      await OrderFacadeService.releaseExpiredHolds();
    });
  });

  // 4. Every 10 minutes: Expire Pending/Countered Offers past validity window (Module 14)
  cron.schedule("*/10 * * * *", async () => {
    await safeRun("Expire Stale Offers Job", async () => {
      await OfferFacadeService.handleExpiredOffers();
    });
  });

  // 5. Every 15 minutes: Auto-Expire Accepted Offers Past 24h Drop-Off Window & Restore Locker (Module 17.5)
  cron.schedule("*/15 * * * *", async () => {
    await safeRun("Expire Overdue In-Store Drop-offs Job", async () => {
      await OfferFacadeService.expireOverdueAcceptedOffers();
    });
  });

  // 6. Every 1 hour: Expire Outdated Community Sourcing Requests (Module 20.5)
  cron.schedule("0 * * * *", async () => {
    await safeRun("Expire Overdue Sourcing Requests Job", async () => {
      await SourcingFacadeService.expireOverdueSourcingRequests();
    });
  });

  // 7. Every 10 minutes: reconcile checkouts whose webhook never arrived (confirm or cancel + release stock)
  cron.schedule("2-59/10 * * * *", async () => {
    await safeRun("Reconcile Stale Checkouts Job", async () => {
      await OrderPaymentFacadeService.reconcileStaleCheckouts();
    });
  });

  // 8. Every 15 minutes: retry refunds Stripe has not confirmed yet (refund outbox)
  cron.schedule("7-59/15 * * * *", async () => {
    await safeRun("Retry Pending Refunds Job", async () => {
      await OrderPaymentFacadeService.retryPendingRefunds();
    });
  });

  console.log("⏰ Autonomous background cron schedulers registered successfully.");
};

export default runCronJobEverydatAtNight;
