import { NextFunction, Request, Response } from 'express';

type AsyncHandler = (
  req: Request<Record<string, string>, any, any, any>,
  res: Response,
  next: NextFunction,
) => Promise<any> | any;

const catchAsync = (fn: AsyncHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req as any, res, next)).catch((err) => next(err));
  };
};

export default catchAsync;
