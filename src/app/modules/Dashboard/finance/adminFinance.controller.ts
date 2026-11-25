import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../../utilities/catchasync";
import sendResponse from "../../../../utilities/sendResponse";
import AdminFinanceService from "./adminFinance.service";

type TListFn = (query: Record<string, unknown>) => Promise<{ meta: any; data: unknown }>;

const list = (fn: TListFn, message: string) =>
  catchAsync(async (req, res) => {
    const result = await fn(req.query as Record<string, unknown>);
    sendResponse(res, { statusCode: StatusCodes.OK, success: true, message, meta: result.meta, data: result.data });
  });

const processPayout = catchAsync(async (req, res) => {
  const result = await AdminFinanceService.processPayout(req.params.id as string, req.body);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: `Payout marked as ${result.status} successfully.`,
    data: result,
  });
});

const AdminFinanceController = {
  getTransactions: list(AdminFinanceService.getTransactions, "Transactions retrieved successfully."),
  getRefunds: list(AdminFinanceService.getRefunds, "Refunds retrieved successfully."),
  getPayouts: list(AdminFinanceService.getPayouts, "Payouts retrieved successfully."),
  processPayout,
};

export default AdminFinanceController;
