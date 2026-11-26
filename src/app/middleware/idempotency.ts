import { createHash } from "crypto";
import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import AppError from "../errors/AppError";
import { IdempotencyRecordModel } from "../modules/OrderPayment/OrderPayment.model";
import { AuthRequest } from "../../interface/authRequest";

const KEY_PATTERN = /^[A-Za-z0-9_\-:.]{8,128}$/;

const hashRequest = (req: Request) =>
  createHash("sha256")
    .update(`${req.method}|${req.originalUrl}|${JSON.stringify(req.body ?? {})}`)
    .digest("hex");

const isDuplicateKeyError = (error: unknown) =>
  typeof error === "object" && error !== null && (error as { code?: number }).code === 11000;

/**
 * Client idempotency for money-moving POSTs (Stripe-style `Idempotency-Key` header).
 *
 * - First request with a key: runs normally. A 2xx response is stored for 24h.
 * - Same key + same body again: the stored response is replayed. No second order/charge is made.
 * - Same key + different body: 422.
 * - Same key while the first request is still running: 409, client should retry shortly.
 * - A failed (non-2xx) request releases the key so the client can retry with it.
 *
 * Mount AFTER `auth(...)` so the key is scoped per user.
 */
const idempotency = (options: { required?: boolean } = { required: true }) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = req.header("Idempotency-Key")?.trim();

      if (!key) {
        if (options.required) {
          throw new AppError(
            StatusCodes.BAD_REQUEST,
            "Idempotency-Key header is required. Send a new UUID for each new payment attempt."
          );
        }
        return next();
      }
      if (!KEY_PATTERN.test(key)) {
        throw new AppError(StatusCodes.BAD_REQUEST, "Idempotency-Key must be 8-128 characters [A-Za-z0-9_-:.].");
      }

      const userId = (req as AuthRequest).user?.profileId || "anonymous";
      const scope = `${userId}|${req.method}|${req.baseUrl}${req.route?.path ?? req.path}|${key}`;
      const requestHash = hashRequest(req);

      try {
        await IdempotencyRecordModel.create({ scope, requestHash, status: "PROCESSING" });
      } catch (error) {
        if (!isDuplicateKeyError(error)) throw error;

        const existing = await IdempotencyRecordModel.findOne({ scope }).lean();
        if (!existing) {
          throw new AppError(StatusCodes.CONFLICT, "Request with this Idempotency-Key is being retried. Try again.");
        }
        if (existing.requestHash !== requestHash) {
          throw new AppError(
            StatusCodes.UNPROCESSABLE_ENTITY,
            "This Idempotency-Key was already used with a different request body."
          );
        }
        if (existing.status === "PROCESSING") {
          throw new AppError(StatusCodes.CONFLICT, "The original request is still being processed. Retry shortly.");
        }

        res.setHeader("Idempotent-Replayed", "true");
        return res.status(existing.responseStatus || StatusCodes.OK).json(existing.responseBody);
      }

      // Capture the body the controller sends so it can be replayed
      let responseBody: unknown;
      const originalJson = res.json.bind(res);
      res.json = (body: unknown) => {
        responseBody = body;
        return originalJson(body);
      };

      res.on("finish", () => {
        const succeeded = res.statusCode >= 200 && res.statusCode < 300;
        const persist = succeeded
          ? IdempotencyRecordModel.updateOne(
              { scope },
              { $set: { status: "COMPLETED", responseStatus: res.statusCode, responseBody } }
            )
          : IdempotencyRecordModel.deleteOne({ scope });

        persist.exec().catch((err) => console.error("[IDEMPOTENCY] failed to persist record:", err));
      });

      return next();
    } catch (error) {
      return next(error);
    }
  };
};

export default idempotency;
