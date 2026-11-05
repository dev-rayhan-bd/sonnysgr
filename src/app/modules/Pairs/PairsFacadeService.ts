import { IJwtPayload } from "../../../interface/jwt.interface";
import { PairsCommandSubService } from "./subServices/PairsCommandSubService";
import { PairsQuerySubService } from "./subServices/PairsQuerySubService";
import PairsServices from "./Pairs.service";

export class PairsFacadeService {
  static async addNewPairs(user: IJwtPayload, files: Express.Multer.File[], payload: any) {
    return PairsCommandSubService.addNewPairs(user, files, payload);
  }

  static async editPairs(user: IJwtPayload, pairId: string, files: Express.Multer.File[] | undefined, payload: any) {
    return PairsCommandSubService.editPairs(user, pairId, files, payload);
  }

  static async getMyListedPairs(user: IJwtPayload, query: any) {
    return PairsQuerySubService.getMyListedPairs(user, query);
  }

  static async getSinglePairDetails(pairId: string) {
    return PairsQuerySubService.getSinglePairDetails(pairId);
  }

  static async browseB2BPairs(query: any) {
    return PairsQuerySubService.browseB2BPairs(query);
  }

  // Delegated pair request & negotiation workflows
  static async getAllPairRequestsForReseller(user: IJwtPayload, query: any) {
    return PairsServices.getAllPairRequestsForReseller(user, query);
  }

  static async getAllPairRequestsForRetailer(user: IJwtPayload, query: any) {
    return PairsServices.getAllPairRequestsForRetailer(user, query);
  }

  static async getSinglePairRequestDetails(requestId: string) {
    return PairsServices.getSInglePairRequestService(requestId);
  }

  static async acceptPairRequest(user: IJwtPayload, requestId: string) {
    return PairsServices.acceptPairRequest(user, requestId);
  }

  static async cancelPairRequest(user: IJwtPayload, requestId: string) {
    return PairsServices.cancelPairRequest(user, requestId);
  }

  static async rejectPairRequest(user: IJwtPayload, requestId: string) {
    return PairsServices.rejectPairRequest(user, requestId);
  }

  static async proposeCounterOfferToPairRequest(user: IJwtPayload, payload: any) {
    return PairsServices.proposeCounterOfferToPairRequest(user, payload);
  }

  static async retailerProposeCounterOfferToPairRequest(user: IJwtPayload, payload: any) {
    return PairsServices.retailerProposeCounterOfferToPairRequest(user, payload);
  }
}
