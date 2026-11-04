import BranchFacadeService from './BranchFacadeService';

/**
 * Branch Services Entry Point
 * Proxies calls through BranchFacadeService for clean architectural decoupling
 */
const createBranchInDB = BranchFacadeService.createBranch;
const updateBranchInDB = BranchFacadeService.updateBranch;
const deleteBranchFromDB = BranchFacadeService.deleteBranch;
const getRetailerBranches = BranchFacadeService.getRetailerBranches;
const getSingleBranch = BranchFacadeService.getSingleBranch;
const getBranchSwitcherFeed = BranchFacadeService.getBranchSwitcherFeed;
const getAllBranchesForAdmin = BranchFacadeService.getAllBranchesForAdmin;
const getSingleBranchForAdmin = BranchFacadeService.getSingleBranchForAdmin;

export const BranchServices = {
  createBranchInDB,
  updateBranchInDB,
  deleteBranchFromDB,
  getRetailerBranches,
  getSingleBranch,
  getBranchSwitcherFeed,
  getAllBranchesForAdmin,
  getSingleBranchForAdmin,
};

export default BranchServices;
export { BranchFacadeService };
