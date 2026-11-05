import { IJwtPayload } from "../../../interface/jwt.interface";
import { LockerCommandSubService } from "./subServices/LockerCommandSubService";
import { LockerQuerySubService } from "./subServices/LockerQuerySubService";

/**
 * Locker Facade Service: High-Level Orchestrator
 * Coordinates customer sneaker locker, trade-in submissions, and hyper-local discovery
 */
export class LockerFacadeService {
  // Command Operations
  static async addSneakerToLocker(
    userDetails: IJwtPayload,
    files: Express.Multer.File[] | undefined,
    payload: any
  ) {
    return await LockerCommandSubService.addSneakerToLocker(userDetails, files, payload);
  }

  static async updateLockerItem(
    userDetails: IJwtPayload,
    lockerItemId: string,
    files: Express.Multer.File[] | undefined,
    payload: any
  ) {
    return await LockerCommandSubService.updateLockerItem(
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
    return await LockerCommandSubService.toggleLockerPrivacy(
      userDetails,
      lockerItemId,
      isPublic
    );
  }

  static async deleteLockerItem(userDetails: IJwtPayload, lockerItemId: string) {
    return await LockerCommandSubService.deleteLockerItem(userDetails, lockerItemId);
  }

  // Query Operations
  static async getMyLocker(userDetails: IJwtPayload, query: Record<string, unknown>) {
    return await LockerQuerySubService.getMyLocker(userDetails, query);
  }

  static async getSingleLockerItem(lockerItemId: string) {
    return await LockerQuerySubService.getSingleLockerItem(lockerItemId);
  }

  static async getNearbyCommunityLockers(query: Record<string, unknown>) {
    return await LockerQuerySubService.getNearbyCommunityLockers(query);
  }
}

export default LockerFacadeService;

