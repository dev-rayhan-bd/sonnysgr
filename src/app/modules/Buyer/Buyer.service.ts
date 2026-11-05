import BuyerFacadeService from "./BuyerFacadeService";

/**
 * Backward-compatible BuyerServices wrapper forwarding directly to BuyerFacadeService.
 * Follows Rule 3 (SRP & Facade Pattern) to eliminate giant monolithic files.
 */
const BuyerServices = BuyerFacadeService;

export default BuyerServices;
