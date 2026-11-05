import { IJwtPayload } from "../../../interface/jwt.interface";
import { LockerCommandSubService } from "./subServices/LockerCommandSubService";
import { LockerQuerySubService } from "./subServices/LockerQuerySubService";
import { LockerCommunitySubService } from "./subServices/LockerCommunitySubService";

/**
 * Locker Facade Service: High-Level Orchestrator
 * Coordinates customer sneaker locker, collection statistics, and community showcase
 */
export class LockerFacadeService {
  // Command Operations
  static async addSneakerToLocker(
    userDetails: IJwtPayload,
    files: Express.Multer.File[] | undefined,
    payload: any
  ) {
    return LockerCommandSubService.addSneakerToLocker(userDetails, files, payload);
  }

  static async updateLockerItem(
    userDetails: IJwtPayload,
    lockerItemId: string,
    files: Express.Multer.File[] | undefined,
    payload: any
  ) {
    return LockerCommandSubService.updateLockerItem(
      userDetails,
      lockerItemId,
      files,
      payload
    );
  }

  static async toggleLockerPrivacy(
    userDetails: IJwtPayload,
    lockerItemId: string,
    isPublic: boolean
  ) {
    return LockerCommandSubService.toggleLockerPrivacy(
      userDetails,
      lockerItemId,
      isPublic
    );
  }

  static async toggleLockerCollectionPrivacy(
    userDetails: IJwtPayload,
    isPublic: boolean
  ) {
    return LockerCommandSubService.toggleLockerCollectionPrivacy(
      userDetails,
      isPublic
    );
  }

  static async deleteLockerItem(userDetails: IJwtPayload, lockerItemId: string) {
    return LockerCommandSubService.deleteLockerItem(userDetails, lockerItemId);
  }

  // Query Operations
  static async getMyLocker(userDetails: IJwtPayload, query: Record<string, unknown>) {
    return LockerQuerySubService.getMyLocker(userDetails, query);
  }

  static async getSingleLockerItem(lockerItemId: string) {
    return LockerQuerySubService.getSingleLockerItem(lockerItemId);
  }

  static async getNearbyCommunityLockers(query: Record<string, unknown>) {
    return LockerQuerySubService.getNearbyCommunityLockers(query);
  }

  // Community Showcase & Social Collector Graph
  static async getCommunityLockers(query: any) {
    return LockerCommunitySubService.getCommunityLockers(query);
  }

  static async getCollectorPublicLocker(targetBuyerId: string, currentUserId?: string) {
    return LockerCommunitySubService.getCollectorPublicLocker(targetBuyerId, currentUserId);
  }

  static async toggleFollowCollector(currentUser: IJwtPayload, targetBuyerId: string) {
    return LockerCommunitySubService.toggleFollowCollector(currentUser, targetBuyerId);
  }

  static async getFollowedCollectors(currentUser: IJwtPayload) {
    return LockerCommunitySubService.getFollowedCollectors(currentUser);
  }
}

export default LockerFacadeService;
