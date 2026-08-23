import { Types } from "mongoose";
import ApiError from "../../../../error/ApiError";
import BuyerModel from "../Buyer.model";
import { FollowModel } from "../../Engagement/Engagement.model";

const getAlertPreferencesService = async (buyerId: string) => {
  const buyer: any = await BuyerModel.findById(buyerId)
    .select("alertPreferences shoeSize selectedShoeSize")
    .lean();

  if (!buyer) {
    throw new ApiError(404, "Buyer not found");
  }

  // Get followed retailers and count active alerts on each
  const followedStores = await FollowModel.find({ buyerId: new Types.ObjectId(buyerId) })
    .populate({
      path: "retailerId",
      select: "name image",
    })
    .lean();

  const formattedStores = followedStores.map((follow: any) => {
    // If customized, use the customize object, otherwise count based on global preferences
    const preferences = follow.alertPreferences?.isCustomized
      ? follow.alertPreferences
      : (buyer.alertPreferences || { newArrivals: true, exclusiveDrops: true, flashSales: false, restocks: true });

    let activeAlertsCount = 0;
    if (preferences.newArrivals) activeAlertsCount++;
    if (preferences.exclusiveDrops) activeAlertsCount++;
    if (preferences.flashSales) activeAlertsCount++;
    if (preferences.restocks) activeAlertsCount++;

    return {
      retailerId: follow.retailerId?._id,
      name: follow.retailerId?.name || "Unknown Store",
      image: follow.retailerId?.image || "",
      activeAlertsCount,
      alertPreferences: follow.alertPreferences || {
        newArrivals: true,
        exclusiveDrops: true,
        flashSales: false,
        restocks: true,
        isCustomized: false,
      },
    };
  });

  return {
    alertPreferences: buyer.alertPreferences || {
      newArrivals: true,
      exclusiveDrops: true,
      flashSales: false,
      restocks: true,
      quietHours: { active: false, start: "10:00 PM", end: "08:00 AM" },
    },
    shoeSize: buyer.shoeSize,
    selectedShoeSize: buyer.selectedShoeSize,
    stores: formattedStores,
  };
};

const updateGlobalAlertsService = async (buyerId: string, payload: any) => {
  const buyer: any = await BuyerModel.findById(buyerId);
  if (!buyer) {
    throw new ApiError(404, "Buyer not found");
  }

  if (payload.quietHours) {
    buyer.alertPreferences = {
      ...(buyer.alertPreferences as any),
      ...payload,
      quietHours: {
        ...(buyer.alertPreferences?.quietHours as any),
        ...payload.quietHours,
      },
    };
  } else {
    buyer.alertPreferences = {
      ...(buyer.alertPreferences as any),
      ...payload,
    };
  }

  // Save changes
  await buyer.save();
  return buyer.alertPreferences;
};

const updateStoreAlertsService = async (buyerId: string, retailerId: string, payload: any) => {
  if (!Types.ObjectId.isValid(retailerId)) {
    throw new ApiError(400, "Invalid retailer ID format");
  }

  const follow = await FollowModel.findOne({
    buyerId: new Types.ObjectId(buyerId),
    retailerId: new Types.ObjectId(retailerId),
  });

  if (!follow) {
    throw new ApiError(400, "You must follow this retailer before customizing their alert preferences.");
  }

  // Merge payload onto follow alertPreferences
  follow.alertPreferences = {
    newArrivals: follow.alertPreferences?.newArrivals ?? true,
    exclusiveDrops: follow.alertPreferences?.exclusiveDrops ?? true,
    flashSales: follow.alertPreferences?.flashSales ?? false,
    restocks: follow.alertPreferences?.restocks ?? true,
    isCustomized: follow.alertPreferences?.isCustomized ?? false,
    ...payload,
  };

  await follow.save();
  return follow.alertPreferences;
};

export const AlertSettingsServices = {
  getAlertPreferencesService,
  updateGlobalAlertsService,
  updateStoreAlertsService,
};
export default AlertSettingsServices;
