const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  registerUser,
  loginUser,
  updateProfile,
  changePassword,
  deleteAccount,
} = require('../controllers/authController');

router.post('/signup', registerUser);
router.post('/login', loginUser);

router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);
router.delete('/account', protect, deleteAccount);

module.exports = router;
