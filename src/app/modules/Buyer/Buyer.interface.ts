import { ObjectId, Types } from "mongoose";

// Buyer Interface
export interface IBuyer {
  auth: Types.ObjectId;
  name: string;
  email: string;
  image: string;
  phone: string;
  bio: string;
  membershipStatus: string;
  shoeSize: number;
  selectedShoeSize: {
    label: string;
    size: number;
  }[];
  brands: string[];
  type: "man" | "woman" | "kid" | "";
  location: {
    type: string;
    coordinates: number[];
  };
  address: string;
  notification: {
    isRestockInMyShoeSize: boolean;
    isNearbyStoreAlert: boolean;
    isFollowStoreDrops: boolean;
    isPriceDrop: boolean;
    isWantedPairAlert: boolean;
    isGoSneakerAnnouncement: boolean;
  };
  privacy: {
    isProfileVisiblityPublic: boolean;
    isWishListPublic: boolean;
    isPurchaseHistoryPublic: boolean;
    isLockerCollectionPublic: boolean;
    isVipStatusPublic: boolean;
    isActivityPublic: boolean;
  };
  myReviews: number;
  subscription: Types.ObjectId;
  subscriptionStartDate: Date;
  subscriptionEndDate: Date;
  discoveryRadius: number;
  isProfileCompleted: boolean;
  alertPreferences?: IBuyerAlertPreferences;
  createdAT: Date;
}

export interface IBuyerAlertPreferences {
  newArrivals: boolean;
  exclusiveDrops: boolean;
  flashSales: boolean;
  restocks: boolean;
  quietHours: {
    active: boolean;
    start: string;
    end: string;
  };
}

export interface IBuyerNotification {
  isRestockInMyShoeSize: boolean;
  isNearbyStoreAlert: boolean;
  isFollowStoreDrops: boolean;
  isPriceDrop: boolean;
  isWantedPairAlert: boolean;
  isGoSneakerAnnouncement: boolean;
}
// Reseller Interface
