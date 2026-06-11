import { NextFunction, Request, Response } from "express";

export function asyncHandler<T extends Request>(
  handler: (request: T, response: Response, next: NextFunction) => Promise<unknown>,
) {
  return (request: T, response: Response, next: NextFunction) => {
    void handler(request, response, next).catch(next);
  };
}

