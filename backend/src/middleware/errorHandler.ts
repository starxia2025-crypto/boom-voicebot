import { NextFunction, Request, Response } from "express";

export function errorHandler(error: Error, _request: Request, response: Response, _next: NextFunction) {
  console.error(error);
  response.status(500).json({
    error: "InternalServerError",
    message: "Ha ocurrido un error interno. Revisa la configuracion del servidor.",
  });
}

