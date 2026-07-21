const router = require('express').Router();
const { protect, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');
const ctrl = require('../controllers/driverController');

router.get('/me', protect, requireRole('driver'), ctrl.getMyProfile);
router.put('/vehicle', protect, requireRole('driver'), ctrl.updateVehicle);
router.post(
  '/documents',
  protect,
  requireRole('driver'),
  upload.fields([
    { name: 'license', maxCount: 1 },
    { name: 'registration', maxCount: 1 },
    { name: 'insurance', maxCount: 1 },
  ]),
  ctrl.uploadDocuments
);
router.patch('/status', protect, requireRole('driver'), ctrl.updateStatus);
router.patch('/location', protect, requireRole('driver'), ctrl.updateLocation);

module.exports = router;
