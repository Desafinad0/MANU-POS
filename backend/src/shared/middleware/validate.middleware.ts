import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { ApiResponse } from '../utils/api-response';

export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const errors: Record<string, string[]> = {};
      result.error.errors.forEach((e) => {
        const path = e.path.join('.') || source;
        if (!errors[path]) errors[path] = [];
        errors[path].push(e.message);
      });
      return ApiResponse.badRequest(res, 'Error de validación', errors);
    }
    req[source] = result.data;
    next();
  };
}
