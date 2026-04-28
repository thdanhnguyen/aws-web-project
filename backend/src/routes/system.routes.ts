import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import {
  systemLogin,
  requireSuperAdmin,
  listTenants,
  createTenant,
  deleteTenant,
} from '../controllers/system.controller';

const router = Router();

router.post('/login', asyncHandler(systemLogin));

router.get('/tenants',        requireSuperAdmin, asyncHandler(listTenants));
router.post('/tenants',       requireSuperAdmin, asyncHandler(createTenant));
router.delete('/tenants/:id', requireSuperAdmin, asyncHandler(deleteTenant));

export default router;
