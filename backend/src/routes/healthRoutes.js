import { Router } from 'express';
import { healthCheck } from '../controllers/healthController.js';

const router = Router();

/**
 * GET /api/health
 * Server liveness probe. Safe to call without authentication.
 */
router.get('/', healthCheck);

export default router;
