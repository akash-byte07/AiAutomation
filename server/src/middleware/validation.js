import { validationResult } from 'express-validator';

export function reportValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ code: 'VALIDATION_ERROR', errors: errors.array() });
  next();
}