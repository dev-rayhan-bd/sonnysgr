import mongoose from "mongoose";

/**
 * Run `work` in one MongoDB transaction (replica set required).
 * `withTransaction` retries on TransientTransactionError / UnknownTransactionCommitResult,
 * so `work` must only touch the database — never call Stripe or send notifications inside it.
 */
export const runInTransaction = async <T>(
  work: (session: mongoose.ClientSession) => Promise<T>
): Promise<T> => {
  const session = await mongoose.startSession();
  try {
    let result: T | undefined;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result as T;
  } finally {
    await session.endSession();
  }
};

/** Short, collision-resistant reference (orderNumber / transactionId suffix). */
export const shortRef = () =>
  `${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
