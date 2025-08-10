import { Router } from 'express';
import { 
  getProfile, 
  updateProfile, 
  changePassword, 
  deleteAccount 
} from '../controllers/userController';
import { authenticateToken, requireVerifiedEmail } from '../middleware/auth';

const router = Router();

/**
 * @route GET /api/users/profile
 * @desc Get current user profile
 * @access Private
 */
router.get('/profile', authenticateToken, getProfile);

/**
 * @route PUT /api/users/profile
 * @desc Update user profile information
 * @access Private
 */
router.put('/profile', authenticateToken, requireVerifiedEmail, updateProfile);

/**
 * @route PUT /api/users/password
 * @desc Change user password
 * @access Private
 */
router.put('/password', authenticateToken, requireVerifiedEmail, changePassword);

/**
 * @route DELETE /api/users/account
 * @desc Delete user account
 * @access Private
 */
router.delete('/account', authenticateToken, requireVerifiedEmail, deleteAccount);

export default router;