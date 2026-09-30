import { Router } from 'express';
import { body, param } from 'express-validator';
import { workflowController } from '../controllers/workflowController.js';
import { requireAuth } from '../middleware/auth.js';
import { reportValidationErrors } from '../middleware/validation.js';

const router = Router();
router.use(requireAuth);
router.get('/', workflowController.list);
router.post('/generate', body('prompt').trim().isLength({ min: 4, max: 2000 }), reportValidationErrors, workflowController.generate);
router.post('/', body('name').trim().isLength({ min: 1, max: 120 }), body('prompt').optional().isString().isLength({ max: 2000 }), body('nodes').optional().isArray(), body('edges').optional().isArray(), reportValidationErrors, workflowController.create);
router.get('/:id', param('id').isString().notEmpty(), reportValidationErrors, workflowController.get);
router.patch('/:id', param('id').isString().notEmpty(), body('name').optional().trim().isLength({ min: 1, max: 120 }), body('prompt').optional().isString().isLength({ max: 2000 }), body('nodes').optional().isArray(), body('edges').optional().isArray(), reportValidationErrors, workflowController.update);
router.delete('/:id', param('id').isString().notEmpty(), reportValidationErrors, workflowController.remove);
router.post('/:id/run', param('id').isString().notEmpty(), reportValidationErrors, workflowController.run);
export default router;