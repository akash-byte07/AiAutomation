import { Router } from 'express';
import { body } from 'express-validator';
import { authController } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { reportValidationErrors } from '../middleware/validation.js';

const router = Router();
router.post('/register', body('name').trim().isLength({ min: 2, max: 80 }), body('email').isEmail().normalizeEmail(), body('password').isLength({ min: 8, max: 128 }), reportValidationErrors, authController.register);
router.post('/login', body('email').isEmail().normalizeEmail(), body('password').isString().notEmpty(), reportValidationErrors, authController.login);
router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.me);
export default router;