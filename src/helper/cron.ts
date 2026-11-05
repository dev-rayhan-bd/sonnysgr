import cron from "node-cron";
import { handleActivePromotion, handleExpiredPromotion } from "../app/modules/Promotion/Promotion.service";
import OrderFacadeService from "../app/modules/Order/OrderFacadeService";

// -------------------------------
// SAFE WRAPPER
// -------------------------------
const safeRun = async (label: string, cronServiceFunction: any) => {
  try {
    console.log(`[CRON] Starting: ${label}`);
    await cronServiceFunction();
    console.log(`[CRON] Completed: ${label}`);
  } catch (err) {
    console.error(`[CRON ERROR] in "${label}":`, err);
  }
};

const runCronJobEverydatAtNight = () => {
  // Every 10 minutes starting at minute 0: Active Promotions
  cron.schedule("0-59/10 * * * *", async () => {
    await safeRun("Active Promotion Job", handleActivePromotion);
  });

  // Every 10 minutes starting at minute 5: Expired Promotions
  cron.schedule("5-59/10 * * * *", async () => {
    await safeRun("Expired Promotion Job", handleExpiredPromotion);
  });

  // Every 5 minutes: Release Expired Hold Reservations & Return Stock (Module 9.5)
  cron.schedule("*/5 * * * *", async () => {
    await safeRun("Release Expired Holds Job", async () => {
      await OrderFacadeService.releaseExpiredHolds();
    });
  });
};

export default runCronJobEverydatAtNight;
