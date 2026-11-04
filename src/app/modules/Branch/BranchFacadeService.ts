import { IJwtPayload } from '../../../interface/jwt.interface';
import { BranchCommandSubService } from './subServices/BranchCommandSubService';
import { BranchQuerySubService } from './subServices/BranchQuerySubService';

/**
 * Branch Facade Service: High-Level Orchestrator
 * Coordinates branch lifecycle, multi-cloud media, query builder, and branch switcher
 */
export class BranchFacadeService {
  // Command Operations
  static async createBranch(
    userDetails: IJwtPayload,
    profileImage: Express.Multer.File | undefined,
    coverImage: Express.Multer.File | undefined,
    payload: any
  ) {
    return await BranchCommandSubService.createBranch(userDetails, profileImage, coverImage, payload);
  }

  static async updateBranch(
    userDetails: IJwtPayload,
    branchId: string,
    profileImage: Express.Multer.File | undefined,
    coverImage: Express.Multer.File | undefined,
    payload: any
  ) {
    return await BranchCommandSubService.updateBranch(userDetails, branchId, profileImage, coverImage, payload);
  }

  static async deleteBranch(userDetails: IJwtPayload, branchId: string) {
    return await BranchCommandSubService.deleteBranch(userDetails, branchId);
  }

  // Query Operations
  static async getRetailerBranches(userDetails: IJwtPayload, query: Record<string, unknown>) {
    return await BranchQuerySubService.getRetailerBranches(userDetails, query);
  }

  static async getSingleBranch(userDetails: IJwtPayload, branchId: string) {
    return await BranchQuerySubService.getSingleBranch(userDetails, branchId);
  }

  static async getBranchSwitcherFeed(userDetails: IJwtPayload) {
    return await BranchQuerySubService.getBranchSwitcherFeed(userDetails);
  }

  static async getAllBranchesForAdmin(query: Record<string, unknown>) {
    return await BranchQuerySubService.getAllBranchesForAdmin(query);
  }

  static async getSingleBranchForAdmin(branchId: string) {
    return await BranchQuerySubService.getSingleBranchForAdmin(branchId);
  }
}

export default BranchFacadeService;

