import { Router } from 'express';
import { getCustomers, createCustomer, deleteCustomer } from '../controllers/customer.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', getCustomers);
router.post('/', createCustomer);
router.delete('/:id', deleteCustomer);

export default router;
