import { IJwtPayload } from "../../../interface/jwt.interface";
import { ResellerProfileSubService } from "./subServices/ResellerProfileSubService";
import { ResellerDashboardSubService } from "./subServices/ResellerDashboardSubService";
import { IVisibilityControls } from "./Reseller.interface";
import ResellerService from "./Reseller.service";

export class ResellerFacadeService {
  static async getDashboardMetrics(user: IJwtPayload) {
    return ResellerDashboardSubService.getDashboardMetrics(user);
  }

  static async getProfileStatData(user: IJwtPayload) {
    return ResellerDashboardSubService.getProfileStatData(user);
  }

  static async getMyProfile(user: IJwtPayload) {
    return ResellerProfileSubService.getMyProfile(user);
  }

  static async getPublicResellerProfile(resellerId: string) {
    return ResellerProfileSubService.getPublicResellerProfile(resellerId);
  }

  static async updateProfile(
    user: IJwtPayload,
    files: { profileImage?: Express.Multer.File[]; coverImage?: Express.Multer.File[] } | undefined,
    payload: any
  ) {
    return ResellerProfileSubService.updateProfile(user, files, payload);
  }

  static async updateVisibilityControls(
    user: IJwtPayload,
    controls: Partial<IVisibilityControls>
  ) {
    return ResellerProfileSubService.updateVisibilityControls(user, controls);
  }

  static async makeRequestForPair(user: IJwtPayload, payload: any) {
    return ResellerService.makeRequestForPairService(user, payload);
  }
}
