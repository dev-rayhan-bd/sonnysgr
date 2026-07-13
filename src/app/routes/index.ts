import { Router } from "express";
import authRouter from "../module/auth/auth.routes";
import userRouter from "../module/User/User.routes";
import BuyerRouter from "../module/Buyer/Buyer.routes";
import RetailerRouter from "../module/Retailer/Retailer.routes";
import EngagementRouter from "../module/Engagement/Engagement.routes";
import ResellerRouter from "../module/Reseller/Reseller.routes";
import ProductRouter from "../module/Product/Product.routes";
import CartRouter from "../module/Cart/Cart.routes";
import OrderRouter from "../module/Order/Order.routes";
import ReportRouter from "../module/Report/Report.routes";
import PairsRouter from "../module/Pairs/Pairs.routes";
import PromotionRouter from "../module/Promotion/Promotion.routes";
import dashboardRouter from "../module/Dashboard/Dashboard.routes";
import notificationRouter from "../module/Notification/Notification.routes";
import ChatRouter from "../module/Chat/Chat.routes";


const allRouter = Router();


const moduleRoutes = [
    {
        path: '/auth',
        router: authRouter,
    },
    {
        path: '/user',
        router: userRouter,
    },
    {
        path: '/chat',
        router: ChatRouter,
    },
    {
        path: '/buyer',
        router: BuyerRouter,
    },
    {
        path: '/retailer',
        router: RetailerRouter,
    },
    {
        path: '/engagement',
        router: EngagementRouter,
    },
    {
        path: '/reseller',
        router: ResellerRouter,
    },
    {
        path: '/product',
        router: ProductRouter,
    },
    {
        path: '/cart',
        router: CartRouter,
    },
    {
        path: '/order',
        router: OrderRouter,
    },
    {
        path: '/report',
        router: ReportRouter,
    },
    {
        path: '/pair',
        router: PairsRouter,
    },
    {
        path: '/promotion',
        router: PromotionRouter,
    },
    {
        path: '/dashboard',
        router: dashboardRouter,
    },
    {
        path: '/notification',
        router: notificationRouter,
    },
  
];

moduleRoutes.forEach((route) => allRouter.use(route.path, route.router));

export default allRouter;