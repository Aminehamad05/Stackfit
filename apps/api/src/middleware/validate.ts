import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodTypeAny } from 'zod';

interface ValidateSources {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
}

/**
 * Zod validation middleware. Parses body/params/query and replaces
 * `req.body` (etc.) with the *parsed* value so handlers get typed data.
 * Failures short-circuit with 400 + machine-readable details.
 */
export function validate(sources: ValidateSources) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (sources.body) req.body = sources.body.parse(req.body);
      if (sources.params) req.params = sources.params.parse(req.params) as Request['params'];
      if (sources.query) req.query = sources.query.parse(req.query) as Request['query'];
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({ error: 'validation_error', details: err.issues });
        return;
      }
      next(err);
    }
  };
}
