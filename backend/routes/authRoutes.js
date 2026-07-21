const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { register, login, me, updateMe, changePassword, sendOtp } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Anti-spam limiters: maximum 5 requests per hour per IP address
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { message: 'Too many registration attempts from this IP, please try again after an hour' },
  standardHeaders: true,
  legacyHeaders: false,
});

const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { message: 'Too many verification codes requested from this IP, please try again after an hour' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/send-otp', otpLimiter, sendOtp);
router.post('/register', registerLimiter, register);
router.post('/login', login);
router.get('/me', protect, me);
router.patch('/me', protect, updateMe);
router.post('/change-password', protect, changePassword);

module.exports = router;
