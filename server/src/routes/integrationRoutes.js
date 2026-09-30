import { Router } from 'express';
import { body, param } from 'express-validator';
import { integrationController } from '../controllers/integrationController.js';
import { requireAuth } from '../middleware/auth.js';
import { reportValidationErrors } from '../middleware/validation.js';

const router = Router();
router.get('/oauth/error', integrationController.oauthError);
router.get('/oauth/:provider/callback', param('provider').isIn(['google', 'google-sheets', 'slack', 'discord']), reportValidationErrors, integrationController.callback);
router.use(requireAuth);
router.get('/', integrationController.list);
router.get('/status', integrationController.status);
router.get('/oauth/:provider/start', param('provider').isIn(['google', 'google-sheets', 'slack', 'discord']), reportValidationErrors, integrationController.start);
router.post('/', body('provider').isIn(['gmail', 'slack', 'discord', 'google-sheets']), body('credentials').isObject({ strict: true }), body('account').optional().isString().isLength({ max: 160 }), reportValidationErrors, integrationController.manual);
export default router;