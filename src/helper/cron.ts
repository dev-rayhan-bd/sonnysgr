import cron from "node-cron";
import { handleActivePromotion, handleExpiredPromotion } from "../app/module/Promotion/Promotion.service";




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

// const runCronJobEverydatAtNight = () => {
//     // Schedule the task
//     // “50 23 * * *” means every day at 23:50 (11:50 PM)
    
//     // cron.schedule("50 23 * * *", async () => {
    
//     //   console.log("Running daily inventory generation…");
    
//     //   await generateDailyInventoryService();
//     //   await resetSupplierDailyFieldsService();
//     // });

//     //run cron at every minute
//     cron.schedule("* * * * *", async () => {

//         await handleActivePromotion();
//         console.log("handled active promotion");

//         await handleExpiredPromotion();
//         console.log("handled expired promotion");

//     });

    
// }

const runCronJobEverydatAtNight = () => {

    // Every 10 minutes starting at minute 0
    cron.schedule("0-59/10 * * * *", async () => {
        console.log("Running Active Promotion Job...");
        await handleActivePromotion();
    });

    // Every 10 minutes starting at minute 5
    cron.schedule("5-59/10 * * * *", async () => {
        console.log("Running Expired Promotion Job...");
        await handleExpiredPromotion();
    });

    
}

// const runCronJobEverydatAtNight = () => {

//     let runActiveJob = true;

//     cron.schedule("*/5 * * * *", async () => {
//         try {
//             if (runActiveJob) {
//             console.log("Running Active Promotion Job...");
//             await handleActivePromotion();
//             } else {
//             console.log("Running Expired Promotion Job...");
//             await handleExpiredPromotion();
//             }

//             // Toggle for next execution
//             runActiveJob = !runActiveJob;
//         } catch (error) {
//             console.error("Cron Error:", error);
//         }
//     });
// }

// {
//     timezone: "Asia/Dhaka"
// }

export default runCronJobEverydatAtNight;