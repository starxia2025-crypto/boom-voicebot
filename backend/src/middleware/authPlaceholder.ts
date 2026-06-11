import { NextFunction, Request, Response } from "express";

export function authPlaceholder(request: Request, _response: Response, next: NextFunction) {
  request.headers["x-auth-placeholder"] = "anonymous-internal-mode";
  next();
}

