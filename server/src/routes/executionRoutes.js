import { Router } from 'express';
import { param } from 'express-validator';
import { executionController } from '../controllers/executionController.js';
import { requireAuth } from '../middleware/auth.js';
import { reportValidationErrors } from '../middleware/validation.js';

const router = Router();
router.use(requireAuth);
router.get('/', executionController.list);
router.get('/:id', param('id').isString().notEmpty(), reportValidationErrors, executionController.get);
router.post('/:id/:action', param('id').isString().notEmpty(), param('action').isIn(['pause', 'resume', 'cancel']), reportValidationErrors, executionController.control);
export default router;