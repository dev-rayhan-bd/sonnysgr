import { Router } from "express";
import authRouter from "../module/auth/auth.routes";
import SourcingRouter from "../module/Sourcing/Sourcing.routes";
import userRouter from "../module/User/User.routes";
import BuyerRouter from "../module/Buyer/Buyer.routes";
import RetailerRouter from "../module/Retailer/Retailer.routes";
import EngagementRouter from "../module/Engagement/Engagement.routes";
import ResellerRouter from "../module/Reseller/Reseller.routes";
import ProductRouter from "../module/Product/Product.routes";
import CartRouter from "../module/Cart/Cart.routes";
import OrderRouter from "../module/Order/Order.routes";
import ReportRouter from "../module/Report/Report.routes";
import OrderPaymentRouter from "../module/OrderPayment/OrderPayment.routes";
import dashboardRouter from "../module/Dashboard/auth/Dashboard.routes";
import PairsRouter from "../module/Pairs/Pairs.routes";
import PromotionRouter from "../module/Promotion/Promotion.routes";
import notificationRouter from "../module/Notification/Notification.routes";
import ChatRouter from "../module/Chat/Chat.routes";
import settingsRouter from "../module/Settings/Settings.routes";
import adminUserRouter from "../module/Dashboard/users/users.route";
import BranchRouter from "../module/Branch/Branch.route";
import DropRouter from "../module/Drop/Drop.routes";
import ReviewManagementRouter from "../module/ReviewManagement/ReviewManagement.routes";
import SupportRouter from "../module/Support/Support.routes";

const allRouter = Router();

const moduleRoutes = [
  {
    path: "/review",
    router: ReviewManagementRouter,
  },
  {
    path: "/auth",
    router: authRouter,
  },
  {
    path: "/sourcing",
    router: SourcingRouter,
  },
  {
    path: "/user",
    router: userRouter,
  },
  {
    path: "/chat",
    router: ChatRouter,
  },
  {
    path: "/buyer",
    router: BuyerRouter,
  },
  {
    path: "/retailer",
    router: RetailerRouter,
  },
  {
    path: "/branch",
    router: BranchRouter,
  },
  {
    path: "/engagement",
    router: EngagementRouter,
  },
  {
    path: "/reseller",
    router: ResellerRouter,
  },
  {
    path: "/product",
    router: ProductRouter,
  },
  {
    path: "/cart",
    router: CartRouter,
  },
  {
    path: "/order",
    router: OrderRouter,
  },
  {
    path: "/report",
    router: ReportRouter,
  },
  {
    path: "/order-payment",
    router: OrderPaymentRouter,
  },
  {
    path: "/dashboard",
    router: dashboardRouter,
  },

  {
    path: "/pair",
    router: PairsRouter,
  },
  {
    path: "/promotion",
    router: PromotionRouter,
  },
  {
    path: "/dashboard/users",
    router: adminUserRouter,
  },
  {
    path: "/notification",
    router: notificationRouter,
  },
  {
    path: "/settings",
    router: settingsRouter,
  },
  {
    path: "/support",
    router: SupportRouter,
  },
  {
    path: "/drop",
    router: DropRouter,
  },
];

moduleRoutes.forEach((route) => allRouter.use(route.path, route.router));

export default allRouter;
