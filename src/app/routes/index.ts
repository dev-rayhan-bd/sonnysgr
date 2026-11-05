import { Router } from "express";
import authRouter from "../modules/auth/auth.routes";
import SourcingRouter from "../modules/Sourcing/Sourcing.routes";
import userRouter from "../modules/User/User.routes";
import BuyerRouter from "../modules/Buyer/Buyer.routes";
import RetailerRouter from "../modules/Retailer/Retailer.routes";
import EngagementRouter from "../modules/Engagement/Engagement.routes";
import ResellerRouter from "../modules/Reseller/Reseller.routes";
import ProductRouter from "../modules/Product/Product.routes";
import CartRouter from "../modules/Cart/Cart.routes";
import OrderRouter from "../modules/Order/Order.routes";
import ReportRouter from "../modules/Report/Report.routes";
import OrderPaymentRouter from "../modules/OrderPayment/OrderPayment.routes";
import dashboardRouter from "../modules/Dashboard/auth/Dashboard.routes";
import PairsRouter from "../modules/Pairs/Pairs.routes";
import PromotionRouter from "../modules/Promotion/Promotion.routes";
import notificationRouter from "../modules/Notification/Notification.routes";
import ChatRouter from "../modules/Chat/Chat.routes";
import settingsRouter from "../modules/Settings/Settings.routes";
import adminUserRouter from "../modules/Dashboard/users/users.route";
import BranchRouter from "../modules/Branch/Branch.route";
import DropRouter from "../modules/Drop/Drop.routes";
import ReviewManagementRouter from "../modules/ReviewManagement/ReviewManagement.routes";
import SupportRouter from "../modules/Support/Support.routes";
import DemandRouter from "../modules/Demand/Demand.routes";
import SubscriptionPaymentRouter from "../modules/SubscriptionPayment/SubscriptionPayment.routes";
import LockerRouter from "../modules/Locker/Locker.routes";
import OfferRouter from "../modules/Offer/Offer.routes";

const router = Router();

const moduleRoutes = [
  { path: "/auth", router: authRouter },
  { path: "/user", router: userRouter },
  { path: "/buyer", router: BuyerRouter },
  { path: "/retailer", router: RetailerRouter },
  { path: "/branch", router: BranchRouter },
  { path: "/reseller", router: ResellerRouter },
  { path: "/product", router: ProductRouter },
  { path: "/drop", router: DropRouter },
  { path: "/cart", router: CartRouter },
  { path: "/order", router: OrderRouter },
  { path: "/order-payment", router: OrderPaymentRouter },
  { path: "/pair", router: PairsRouter },
  { path: "/demand", router: DemandRouter },
  { path: "/sourcing", router: SourcingRouter },
  { path: "/engagement", router: EngagementRouter },
  { path: "/review", router: ReviewManagementRouter },
  { path: "/promotion", router: PromotionRouter },
  { path: "/notification", router: notificationRouter },
  { path: "/chat", router: ChatRouter },
  { path: "/dashboard", router: dashboardRouter },
  { path: "/dashboard/users", router: adminUserRouter },
  { path: "/settings", router: settingsRouter },
  { path: "/report", router: ReportRouter },
  { path: "/support", router: SupportRouter },
  { path: "/subscription-payment", router: SubscriptionPaymentRouter },
  { path: "/locker", router: LockerRouter },
  { path: "/offers", router: OfferRouter },
];

moduleRoutes.forEach((route) => router.use(route.path, route.router));

export default router;
