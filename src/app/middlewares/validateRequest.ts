import { NextFunction, Request, Response } from 'express';
import { ZodObject } from 'zod';
import catchAsync from '../../utilities/catchasync';

const validateRequest = (schema: ZodObject<any, any> | any) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    // if everything is alright next()=>
    await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
      cookies: req.cookies,
    });
    return next();
  });
};

export default validateRequest;
